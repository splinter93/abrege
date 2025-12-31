/**
 * API pour les dossiers
 * Extrait de V2UnifiedApi pour respecter limite 300 lignes
 */

import { useFileSystemStore } from '@/store/useFileSystemStore';
import { simpleLogger as logger } from '@/utils/logger';
import { ApiClient } from '../core/ApiClient';
import type { CreateFolderData, UpdateFolderData } from '../types';

export class FolderApi {
  private apiClient: ApiClient;

  constructor(apiClient: ApiClient) {
    this.apiClient = apiClient;
  }

  /**
   * Créer un dossier
   */
  async createFolder(folderData: CreateFolderData) {
    const startTime = Date.now();
    
    try {
      logger.info('[FolderApi] 🚀 Création dossier', {
        name: folderData.name,
        classeurId: folderData.classeur_id
      });
      
      const headers = await this.apiClient.getAuthHeaders();
      const response = await fetch(this.apiClient.buildUrl('/api/v2/folder/create'), {
        method: 'POST',
        headers,
        body: JSON.stringify(folderData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Erreur lors de la création du dossier');
      }

      const { useFileSystemStore } = await import('@/store/useFileSystemStore');
      const store = useFileSystemStore.getState();
      store.addFolder(result.folder);
      
      if (process.env.NODE_ENV === 'development') {
        logger.dev(`[FolderApi] ✅ Dossier créé et ajouté au store:`, {
          realId: result.folder.id,
          name: result.folder.name
        });
      }

      const duration = Date.now() - startTime;
      return {
        success: true,
        folder: result.folder,
        duration
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('[FolderApi] ❌ Erreur création dossier', {
        folderData,
        duration,
        error: error instanceof Error ? error.message : String(error)
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
        duration
      };
    }
  }

  /**
   * Mettre à jour un dossier avec mise à jour optimiste
   */
  async updateFolder(folderId: string, updateData: UpdateFolderData) {
    if (process.env.NODE_ENV === 'development') {
      logger.dev('[FolderApi] 🔄 Mise à jour dossier');
    }
    const startTime = Date.now();
    
    try {
      const cleanFolderId = this.apiClient.cleanAndValidateId(folderId, 'folder');
      
      const { useFileSystemStore } = await import('@/store/useFileSystemStore');
      const store = useFileSystemStore.getState();
      
      const originalFolder = store.folders[cleanFolderId];
      if (!originalFolder) {
        throw new Error('Dossier non trouvé dans le store');
      }
      
      store.updateFolder(cleanFolderId, updateData);
      
      if (process.env.NODE_ENV === 'development') {
        logger.dev(`[FolderApi] ⚡ Dossier mis à jour optimiste:`, {
          folderId: cleanFolderId,
          updateData
        });
      }
      
      const headers = await this.apiClient.getAuthHeaders();
      const response = await fetch(this.apiClient.buildUrl(`/api/v2/folder/${cleanFolderId}/update`), {
        method: 'PUT',
        headers,
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        store.updateFolder(cleanFolderId, originalFolder);
        
        const errorText = await response.text();
        throw new Error(`Erreur mise à jour dossier: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      
      store.updateFolder(cleanFolderId, result.folder);
      
      return result;
    } catch (error) {
      logger.error('[FolderApi] ❌ Erreur mise à jour dossier', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Supprimer un dossier
   */
  async deleteFolder(folderId: string) {
    if (process.env.NODE_ENV === 'development') {
      logger.dev('[FolderApi] 🗑️ Suppression dossier');
    }
    const startTime = Date.now();
    
    try {
      const cleanFolderId = this.apiClient.cleanAndValidateId(folderId, 'folder');
      
      const { useFileSystemStore } = await import('@/store/useFileSystemStore');
      const store = useFileSystemStore.getState();
      
      const originalFolders = { ...store.folders };
      const originalNotes = { ...store.notes };
      
      const remainingFolders = { ...store.folders };
      delete remainingFolders[cleanFolderId];
      store.setFolders(Object.values(remainingFolders));
      
      const remainingNotes = Object.fromEntries(
        Object.entries(store.notes).filter(([, note]) => note.folder_id !== cleanFolderId)
      );
      store.setNotes(Object.values(remainingNotes));
      
      if (process.env.NODE_ENV === 'development') {
        logger.dev(`[FolderApi] ⚡ Dossier retiré du store (optimistic):`, {
          folderId: cleanFolderId
        });
      }
      
      const headers = await this.apiClient.getAuthHeaders();
      const response = await fetch(this.apiClient.buildUrl(`/api/v2/delete/folder/${cleanFolderId}`), {
        method: 'DELETE',
        headers
      });

      if (!response.ok) {
        store.setFolders(Object.values(originalFolders));
        store.setNotes(Object.values(originalNotes));
        
        const errorText = await response.text();
        throw new Error(`Erreur suppression dossier: ${response.status} ${response.statusText} - ${errorText}`);
      }

      return { success: true };
    } catch (error) {
      logger.error('[FolderApi] ❌ Erreur suppression dossier', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Déplacer un dossier
   */
  async moveFolder(folderId: string, targetParentId: string | null, targetClasseurId?: string) {
    if (process.env.NODE_ENV === 'development') {
      logger.dev('[FolderApi] 📦 Déplacement dossier');
    }
    const startTime = Date.now();
    
    try {
      const cleanFolderId = this.apiClient.cleanAndValidateId(folderId, 'folder');
      
      const headers = await this.apiClient.getAuthHeaders();
      const payload: { target_folder_id: string | null; target_classeur_id?: string } = { 
        target_folder_id: targetParentId 
      };
      if (targetClasseurId) {
        payload.target_classeur_id = targetClasseurId;
      }
      
      const response = await fetch(this.apiClient.buildUrl(`/api/v2/folder/${cleanFolderId}/move`), {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur déplacement dossier: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();

      const store = useFileSystemStore.getState();
      const currentFolder = store.folders[cleanFolderId];
      const folderClasseurId = currentFolder?.classeur_id;
      
      const finalClasseurId = targetClasseurId || folderClasseurId;
      store.moveFolder(cleanFolderId, targetParentId, finalClasseurId);
      
      if (targetClasseurId) {
        const { syncFolderHierarchy } = await import('@/utils/folderSyncUtils');
        const notesCount = syncFolderHierarchy(cleanFolderId, targetClasseurId);
        
        if (process.env.NODE_ENV === 'development') {
          logger.dev(`[FolderApi] 🔄 Synchronisation hiérarchie: ${notesCount} notes mises à jour`);
        }
        
        try {
          const { triggerPollingAfterNoteAction } = await import('@/services/uiActionPolling');
          await triggerPollingAfterNoteAction('folder_moved');
        } catch (error) {
          logger.warn('[FolderApi] ⚠️ Erreur déclenchement polling ciblé:', error);
        }
      }
      
      return result;
    } catch (error) {
      logger.error('[FolderApi] ❌ Erreur déplacement dossier', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
}

