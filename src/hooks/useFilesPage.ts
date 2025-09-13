import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/supabaseClient';
import { FileItem } from '@/types/files';
import { simpleLogger as logger } from '@/utils/logger';
import { STORAGE_CONFIG } from '@/config/storage';
import SubscriptionService from '@/services/subscriptionService';
import { TrashService } from '@/services/trashService';

// ==========================================================================
// TYPES
// ==========================================================================

interface QuotaInfo {
  usedBytes: number;
  quotaBytes: number;
  remainingBytes: number;
}

interface Folder {
  id: string;
  name: string;
}

// ==========================================================================
// HOOK PRINCIPAL
// ==========================================================================

export function useFilesPage() {
  // ========================================
  // ÉTAT
  // ========================================
  
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quotaInfo, setQuotaInfo] = useState<QuotaInfo | null>(null);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string | undefined>();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // ========================================
  // CALCULS DÉRIVÉS
  // ========================================
  
  const filteredFiles = useCallback(() => {
    let filtered = files;
    
    // Filtrage par dossier
    if (selectedFolderId) {
      filtered = filtered.filter(file => file.folder_id === selectedFolderId);
    }
    
    // Filtrage par recherche
    if (searchTerm) {
      filtered = filtered.filter(file => 
        file.filename.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filtered;
  }, [files, selectedFolderId, searchTerm]);

  // ========================================
  // ACTIONS
  // ========================================
  
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
          .eq('is_deleted', false);

        if (filesError) {
          logger.warn(`⚠️ Erreur calcul usage: ${filesError.message}`, { userId: user.id });
          return;
        }

        const usedBytes = (filesData || []).reduce((sum, file) => sum + (file.size || 0), 0);
        const quotaBytes = STORAGE_CONFIG.DEFAULT_QUOTA_BYTES;

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
   * Récupération des fichiers
   */
  const fetchFiles = useCallback(async () => {
    try {
      setLoading(true);
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        setError('Utilisateur non authentifié');
        return;
      }

      // Récupérer les fichiers
      const { data: filesData, error: filesError } = await supabase
        .from('files')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (filesError) {
        logger.warn(`⚠️ Erreur récupération fichiers: ${filesError.message}`, { userId: user.id });
        setError('Erreur lors de la récupération des fichiers');
        return;
      }

      setFiles(filesData || []);

      // Récupérer les dossiers
      const { data: foldersData, error: foldersError } = await supabase
        .from('folders')
        .select('id, name')
        .eq('user_id', user.id);

      if (foldersError) {
        logger.warn(`⚠️ Erreur récupération dossiers: ${foldersError.message}`, { userId: user.id });
      } else {
        setFolders(foldersData || []);
      }

    } catch (err) {
      logger.error('❌ Erreur fetchFiles:', { error: err });
      setError('Erreur inattendue lors de la récupération des fichiers');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Suppression d'un fichier
   */
  const deleteFile = useCallback(async (fileId: string) => {
    try {
      // Utiliser l'endpoint unifié delete-resource
      await TrashService.moveToTrash('file', fileId);

      // Mettre à jour l'état local
      setFiles(prevFiles => prevFiles.filter(f => f.id !== fileId));
      
      // Rafraîchir le quota
      refreshQuota();

      logger.info(`✅ Fichier supprimé avec succès: ${fileId}`);

    } catch (err) {
      logger.error('❌ Erreur suppression fichier:', { 
        fileId, 
        error: err instanceof Error ? err.message : String(err) 
      });
      throw err;
    }
  }, [refreshQuota]);

  /**
   * Renommage d'un fichier
   */
  const renameFile = useCallback(async (fileId: string, newName: string) => {
    try {
      const { error } = await supabase
        .from('files')
        .update({ 
          filename: newName,
          updated_at: new Date().toISOString()
        })
        .eq('id', fileId);

      if (error) {
        logger.warn(`⚠️ Erreur renommage fichier: ${error.message}`, { fileId, newName });
        throw new Error('Erreur lors du renommage du fichier');
      }

      // Mettre à jour l'état local
      setFiles(prevFiles => 
        prevFiles.map(f => 
          f.id === fileId ? { ...f, filename: newName } : f
        )
      );

    } catch (err) {
      logger.error('❌ Erreur renommage fichier:', { fileId, newName, error: err });
      throw err;
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
    folders,
    searchTerm,
    selectedFolderId,
    viewMode,
    filteredFiles: filteredFiles(),
    
    // Actions
    fetchFiles,
    deleteFile,
    renameFile,
    refreshQuota,
    clearError,
    setSearchTerm,
    setSelectedFolderId,
    setViewMode
  };
} 