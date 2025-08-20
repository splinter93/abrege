import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/supabaseClient';
import { FileItem, FileStatus } from '@/types/files';
import { simpleLogger as logger } from '@/utils/logger';
import { STORAGE_CONFIG, calculateUsagePercentage, getUsageAlertLevel } from '@/config/storage';
import SubscriptionService from '@/services/subscriptionService';

// ========================================
// TYPES LOCAUX
// ========================================

interface UseFilesPageState {
  files: FileItem[];
  loading: boolean;
  error: string | null;
  quotaInfo: {
    usedBytes: number;
    quotaBytes: number;
    remainingBytes: number;
  } | null;
}

interface UseFilesPageActions {
  fetchFiles: () => Promise<void>;
  deleteFile: (id: string) => Promise<void>;
  renameFile: (id: string, newName: string) => Promise<void>;
  refreshQuota: () => Promise<void>;
  clearError: () => void;
}

type UseFilesPageResult = UseFilesPageState & UseFilesPageActions;

// ========================================
// HOOK PRINCIPAL
// ========================================

export function useFilesPage(): UseFilesPageResult {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quotaInfo, setQuotaInfo] = useState<UseFilesPageState['quotaInfo']>(null);

  // ========================================
  // FONCTIONS UTILITAIRES
  // ========================================

  /**
   * Récupération des fichiers de l'utilisateur
   */
  const fetchFiles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Récupérer l'utilisateur authentifié
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('Utilisateur non authentifié');
      }

      // Récupérer les fichiers avec les vraies colonnes de la table
      const { data: filesData, error: filesError } = await supabase
        .from('files')
        .select(`
          id,
          user_id,
          note_id,
          folder_id,
          filename,
          slug,
          mime_type,
          size,
          url,
          preview_url,
          extension,
          description,
          created_at,
          updated_at,
          is_deleted,
          visibility,
          s3_key,
          etag,
          visibility_mode,
          owner_id,
          deleted_at,
          status,
          sha256,
          request_id
        `)
        .eq('user_id', user.id)
        .is('deleted_at', null) // Seulement les fichiers non supprimés
        .order('created_at', { ascending: false });

      if (filesError) {
        throw new Error(`Erreur lors de la récupération des fichiers: ${filesError.message}`);
      }

      // Mapper les données de la DB vers le format attendu par l'interface
      const validFiles = (filesData || []).map(file => ({
        id: file.id,
        user_id: file.user_id,
        note_id: file.note_id,
        folder_id: file.folder_id,
        filename: file.filename,
        slug: file.slug,
        mime_type: file.mime_type,
        size: file.size, // ✅ Utilise directement la colonne 'size'
        url: file.url,
        preview_url: file.preview_url,
        extension: file.extension,
        description: file.description,
        created_at: file.created_at,
        updated_at: file.updated_at,
        is_deleted: file.is_deleted,
        visibility: file.visibility,
        s3_key: file.s3_key,
        etag: file.etag,
        visibility_mode: file.visibility_mode,
        owner_id: file.owner_id,
        deleted_at: file.deleted_at,
        status: file.status as FileStatus,
        sha256: file.sha256,
        request_id: file.request_id
      })) as FileItem[];

      setFiles(validFiles);
      
      logger.info(`📁 ${validFiles.length} fichiers récupérés`, {
        userId: user.id,
        totalFiles: filesData?.length || 0,
        validFiles: validFiles.length
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMessage);
      logger.error(`❌ Erreur récupération fichiers: ${errorMessage}`, { error: err });
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Suppression sécurisée d'un fichier
   */
  const deleteFile = useCallback(async (id: string) => {
    try {
      setError(null);

      // Récupérer l'utilisateur authentifié
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('Utilisateur non authentifié');
      }

      // Récupérer les informations du fichier avant suppression
      const { data: fileData, error: fetchError } = await supabase
        .from('files')
        .select('s3_key, filename, size')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (fetchError || !fileData) {
        throw new Error('Fichier non trouvé ou accès non autorisé');
      }

      // Soft delete : marquer comme supprimé
      const { error: deleteError } = await supabase
        .from('files')
        .update({ 
          deleted_at: new Date().toISOString(),
          is_deleted: true
        })
        .eq('id', id)
        .eq('user_id', user.id);

      if (deleteError) {
        throw new Error(`Erreur lors de la suppression: ${deleteError.message}`);
      }

      // Supprimer de S3 (optionnel - peut être fait par un job de nettoyage)
      try {
        // Note: La suppression S3 sera gérée par le service sécurisé
        // await secureS3Service.secureDelete(fileData.s3_key, user.id);
      } catch (s3Error) {
        logger.warn(`⚠️ Erreur suppression S3 (ignorée): ${s3Error}`, {
          fileId: id,
          s3Key: fileData.s3_key
        });
      }

      // Mettre à jour l'état local
      setFiles(prevFiles => prevFiles.filter(file => file.id !== id));

      // Mettre à jour l'usage de stockage
      await refreshQuota();

      logger.info(`🗑️ Fichier supprimé: ${fileData.filename}`, {
        userId: user.id,
        fileId: id
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMessage);
      logger.error(`❌ Erreur suppression fichier: ${errorMessage}`, { 
        fileId: id, 
        error: err 
      });
      throw err;
    }
  }, []);

  /**
   * Renommage sécurisé d'un fichier
   */
  const renameFile = useCallback(async (id: string, newName: string) => {
    try {
      setError(null);

      // Validation du nouveau nom
      if (!newName || newName.trim().length === 0) {
        throw new Error('Le nom de fichier ne peut pas être vide');
      }

      if (newName.length > 255) {
        throw new Error('Le nom de fichier est trop long (max 255 caractères)');
      }

      // Récupérer l'utilisateur authentifié
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('Utilisateur non authentifié');
      }

      // Vérifier que le fichier existe et appartient à l'utilisateur
      const { data: existingFile, error: fetchError } = await supabase
        .from('files')
        .select('filename')
        .eq('id', id)
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .single();

      if (fetchError || !existingFile) {
        throw new Error('Fichier non trouvé ou accès non autorisé');
      }

      // Mettre à jour le nom en base de données
      const { error: updateError } = await supabase
        .from('files')
        .update({ 
          filename: newName,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('user_id', user.id);

      if (updateError) {
        throw new Error(`Erreur lors du renommage: ${updateError.message}`);
      }

      // Mettre à jour l'état local
      setFiles(prevFiles => 
        prevFiles.map(file => 
          file.id === id 
            ? { ...file, filename: newName, updated_at: new Date().toISOString() }
            : file
        )
      );

      logger.info(`✏️ Fichier renommé: ${existingFile.filename} → ${newName}`, {
        userId: user.id,
        fileId: id
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMessage);
      logger.error(`❌ Erreur renommage fichier: ${errorMessage}`, { 
        fileId: id, 
        newName,
        error: err 
      });
      throw err;
    }
  }, []);

  /**
   * Récupération des informations de quota
   */
  const refreshQuota = useCallback(async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return;
      }

      // Utiliser le service d'abonnements pour récupérer le quota dynamique
      const quotaInfo = await SubscriptionService.getUserStorageQuota(user.id);
      
      if (quotaInfo) {
        setQuotaInfo({
          usedBytes: quotaInfo.usedBytes,
          quotaBytes: quotaInfo.quotaBytes,
          remainingBytes: quotaInfo.remainingBytes
        });
      } else {
        // Fallback : calculer depuis les fichiers si le service échoue
        const { data: filesData, error: filesError } = await supabase
          .from('files')
          .select('size')
          .eq('user_id', user.id)
          .is('deleted_at', null);

        if (filesError) {
          logger.warn(`⚠️ Erreur calcul usage: ${filesError.message}`, { userId: user.id });
          return;
        }

        const usedBytes = (filesData || []).reduce((sum, file) => sum + (file.size || 0), 0);
        const quotaBytes = STORAGE_CONFIG.DEFAULT_QUOTA_BYTES; // Utilise la config centralisée

        setQuotaInfo({
          usedBytes,
          quotaBytes,
          remainingBytes: quotaBytes - usedBytes
        });
      }

    } catch (err) {
      logger.warn(`⚠️ Erreur refresh quota: ${err}`, { error: err });
    }
  }, []);

  /**
   * Effacement des erreurs
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // ========================================
  // EFFETS
  // ========================================

  // Chargement initial
  useEffect(() => {
    fetchFiles();
    refreshQuota();
  }, [fetchFiles, refreshQuota]);

  // ========================================
  // RETOUR
  // ========================================

  return {
    // État
    files,
    loading,
    error,
    quotaInfo,
    
    // Actions
    fetchFiles,
    deleteFile,
    renameFile,
    refreshQuota,
    clearError
  };
} 