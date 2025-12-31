/**
 * API pour les classeurs
 * Extrait de V2UnifiedApi pour respecter limite 300 lignes
 */

import { useFileSystemStore, type Note, type Classeur, type Folder } from '@/store/useFileSystemStore';
import { simpleLogger as logger } from '@/utils/logger';
import { ApiClient } from '../core/ApiClient';
import type { CreateClasseurData, UpdateClasseurData } from '../types';

export class ClasseurApi {
  private apiClient: ApiClient;

  constructor(apiClient: ApiClient) {
    this.apiClient = apiClient;
  }

  /**
   * Créer un classeur
   */
  async createClasseur(classeurData: CreateClasseurData) {
    const startTime = Date.now();
    
    try {
      const headers = await this.apiClient.getAuthHeaders();
      const response = await fetch(this.apiClient.buildUrl('/api/v2/classeur/create'), {
        method: 'POST',
        headers,
        body: JSON.stringify(classeurData)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Erreur lors de la création du classeur');
      }

      if (result.classeur) {
        const mappedClasseur = {
          ...result.classeur,
          icon: result.classeur.icon || result.classeur.emoji || '📁'
        };
        
        const store = useFileSystemStore.getState();
        store.addClasseur(mappedClasseur);
        
        try {
          const { triggerPollingAfterClasseurAction } = await import('@/services/uiActionPolling');
          await triggerPollingAfterClasseurAction('classeur_created');
        } catch (error) {
          logger.warn('[ClasseurApi] ⚠️ Erreur déclenchement polling ciblé:', error);
        }
        
        return {
          success: true,
          classeur: mappedClasseur,
          duration: Date.now() - startTime
        };
      }

      return {
        success: false,
        error: 'Aucun classeur retourné par l\'API',
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Mettre à jour un classeur
   */
  async updateClasseur(classeurId: string, updateData: UpdateClasseurData) {
    const startTime = Date.now();
    
    try {
      const cleanClasseurId = this.apiClient.cleanAndValidateId(classeurId, 'classeur');
      
      const mappedData = {
        ...updateData,
        icon: updateData.icon || updateData.emoji
      };

      const headers = await this.apiClient.getAuthHeaders();
      const response = await fetch(this.apiClient.buildUrl(`/api/v2/classeur/${cleanClasseurId}/update`), {
        method: 'PUT',
        headers,
        body: JSON.stringify(mappedData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur mise à jour classeur: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();

      const store = useFileSystemStore.getState();
      store.updateClasseur(cleanClasseurId, result.classeur);
      
      try {
        const { triggerPollingAfterClasseurAction } = await import('@/services/uiActionPolling');
        await triggerPollingAfterClasseurAction('classeur_updated');
      } catch (error) {
        logger.warn('[ClasseurApi] ⚠️ Erreur déclenchement polling ciblé:', error);
      }

      return {
        success: true,
        classeur: result.classeur,
        duration: Date.now() - startTime
      };
    } catch (error) {
      logger.error('[ClasseurApi] ❌ Erreur mise à jour classeur', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Supprimer un classeur
   */
  async deleteClasseur(classeurId: string) {
    const startTime = Date.now();
    
    try {
      const cleanClasseurId = this.apiClient.cleanAndValidateId(classeurId, 'classeur');
      
      const headers = await this.apiClient.getAuthHeaders();
      const response = await fetch(this.apiClient.buildUrl(`/api/v2/delete/classeur/${cleanClasseurId}`), {
        method: 'DELETE',
        headers
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur suppression classeur: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const { useFileSystemStore } = await import('@/store/useFileSystemStore');
      const store = useFileSystemStore.getState();
      
      const remainingClasseurs = { ...store.classeurs };
      delete remainingClasseurs[cleanClasseurId];
      store.setClasseurs(Object.values(remainingClasseurs));
      
      const remainingFolders = Object.fromEntries(
        Object.entries(store.folders).filter(([, folder]) => folder.classeur_id !== cleanClasseurId)
      );
      store.setFolders(Object.values(remainingFolders));
      
      const remainingNotes = Object.fromEntries(
        Object.entries(store.notes).filter(([, note]) => note.classeur_id !== cleanClasseurId)
      );
      store.setNotes(Object.values(remainingNotes));
      
      try {
        const { triggerPollingAfterClasseurAction } = await import('@/services/uiActionPolling');
        await triggerPollingAfterClasseurAction('classeur_deleted');
      } catch (error) {
        logger.warn('[ClasseurApi] ⚠️ Erreur déclenchement polling ciblé:', error);
      }
      
      return { success: true };
    } catch (error) {
      logger.error('[ClasseurApi] ❌ Erreur suppression classeur', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Récupérer l'arbre d'un classeur
   */
  async getClasseurTree(classeurId: string) {
    try {
      const cleanClasseurId = this.apiClient.cleanAndValidateId(classeurId, 'classeur');
      
      const headers = await this.apiClient.getAuthHeaders();
      const response = await fetch(this.apiClient.buildUrl(`/api/v2/classeur/${cleanClasseurId}/tree`), {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur récupération arbre classeur: ${response.status} ${response.statusText} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      logger.error('[ClasseurApi] ❌ Erreur récupération arbre classeur', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Récupérer la liste des classeurs
   */
  async getClasseurs() {
    try {
      const headers = await this.apiClient.getAuthHeaders();
      const response = await fetch(this.apiClient.buildUrl('/api/v2/classeurs'), {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur récupération classeurs: ${response.status} ${response.statusText} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      logger.error('[ClasseurApi] ❌ Erreur récupération classeurs', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Réorganiser les classeurs
   */
  async reorderClasseurs(classeurs: Array<{ id: string; position: number }>) {
    try {
      const headers = await this.apiClient.getAuthHeaders();
      const response = await fetch(this.apiClient.buildUrl('/api/v2/classeur/reorder'), {
        method: 'PUT',
        headers,
        body: JSON.stringify({ classeurs })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur réorganisation classeurs: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      
      if (result && Array.isArray(result.classeurs)) {
        const store = useFileSystemStore.getState();
        result.classeurs.forEach((classeur: Classeur) => {
          store.updateClasseur(classeur.id, classeur);
        });
      } else {
        logger.warn('[ClasseurApi] ⚠️ Réponse API invalide pour reorderClasseurs:', result);
      }
      
      return result;
    } catch (error) {
      logger.error('[ClasseurApi] ❌ Erreur réorganisation classeurs', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

}

