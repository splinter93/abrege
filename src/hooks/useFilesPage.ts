import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/supabaseClient';
import { FileItem, FileStatus } from '@/types/files';
import { simpleLogger as logger } from '@/utils/logger';

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

      // Récupérer les fichiers avec compatibilité pour les anciennes et nouvelles colonnes
      const { data: filesData, error: filesError } = await supabase
        .from('files')
        .select(`
          id,
          filename,
          mime_type,
          size_bytes,
          s3_key,
          s3_bucket,
          s3_region,
          url,
          thumbnail_url,
          user_id,
          note_id,
          folder_id,
          notebook_id,
          created_at,
          updated_at
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (filesError) {
        throw new Error(`Erreur lors de la récupération des fichiers: ${filesError.message}`);
      }

      // Pour l'instant, tous les fichiers sont considérés comme valides
      // Une fois la migration appliquée, on pourra filtrer par status
      const validFiles = (filesData || []).map(file => ({
        ...file,
        original_name: file.filename, // Utiliser filename comme original_name
        status: 'ready' as const, // Valeur par défaut
        sha256: undefined,
        request_id: undefined,
        deleted_at: undefined,
        etag: undefined
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
        .select('s3_key, filename')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (fetchError || !fileData) {
        throw new Error('Fichier non trouvé ou accès non autorisé');
      }

      // Suppression directe (sera remplacée par soft delete après migration)
      const { error: deleteError } = await supabase
        .from('files')
        .delete()
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
        .single();

      if (fetchError || !existingFile) {
        throw new Error('Fichier non trouvé ou accès non autorisé');
      }

      // Mettre à jour le nom en base de données
      const { error: updateError } = await supabase
        .from('files')
        .update({ 
          filename: newName
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
            ? { ...file, filename: newName }
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

      // Calculer l'usage actuel depuis les fichiers existants
      const { data: filesData, error: filesError } = await supabase
        .from('files')
        .select('size_bytes')
        .eq('user_id', user.id);

      if (filesError) {
        logger.warn(`⚠️ Erreur calcul usage: ${filesError.message}`, { userId: user.id });
        return;
      }

      const usedBytes = (filesData || []).reduce((sum, file) => sum + (file.size_bytes || 0), 0);
      const quotaBytes = 1073741824; // 1GB par défaut

      setQuotaInfo({
        usedBytes,
        quotaBytes,
        remainingBytes: quotaBytes - usedBytes
      });

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