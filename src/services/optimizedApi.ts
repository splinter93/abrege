import { useFileSystemStore } from '@/store/useFileSystemStore';
import { clientPollingTrigger } from './clientPollingTrigger';
import { ErrorHandler } from './errorHandler';
import { logApi, logStore, logPolling } from '@/utils/logger';
import { supabase } from '@/supabaseClient';
import { simpleLogger as logger } from '@/utils/logger';

// Types pour les données d'API
interface CreateNoteData {
  source_title: string;
  notebook_id: string;
  markdown_content?: string;
  header_image?: string;
  folder_id?: string | null;
}

interface UpdateNoteData {
  source_title?: string;
  markdown_content?: string;
  html_content?: string;
  header_image?: string;
  folder_id?: string | null;
}

interface CreateFolderData {
  name: string;
  notebook_id: string;
  parent_id?: string | null;
}

interface UpdateFolderData {
  name?: string;
  parent_id?: string | null;
}

interface CreateClasseurData {
  name: string;
  description?: string;
  icon?: string;
}

interface UpdateClasseurData {
  name?: string;
  description?: string;
  icon?: string;
  position?: number;
}

interface ApiError extends Error {
  status?: number;
  statusText?: string;
}

interface PublishNoteResponse {
  success: boolean;
  url?: string;
  message?: string;
}

/**
 * Service API optimisé pour une latence minimale
 * Met à jour directement Zustand et déclenche le polling côté client
 */
export class OptimizedApi {
  private static instance: OptimizedApi;

  private constructor() {}

  static getInstance(): OptimizedApi {
    if (!OptimizedApi.instance) {
      OptimizedApi.instance = new OptimizedApi();
    }
    return OptimizedApi.instance;
  }

  /**
   * Récupère le token d'authentification pour les appels API
   */
  private async getAuthHeaders(): Promise<HeadersInit> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
      
      return headers;
    } catch (error) {
      logger.error('[OptimizedApi] ❌ Erreur récupération token:', error);
      return { 'Content-Type': 'application/json' };
    }
  }

  /**
   * Créer une note avec mise à jour directe de Zustand + polling côté client
   */
  async createNote(noteData: CreateNoteData) {
    const startTime = Date.now();
    const context = { operation: 'create_note', component: 'OptimizedApi' };
    
    logApi('create_note', '🚀 Début création note', context);
    
    try {
      // Récupérer les headers d'authentification
      const headers = await this.getAuthHeaders();
      
      // Appel API
      const response = await fetch('/api/v1/note/create', {
        method: 'POST',
        headers,
        body: JSON.stringify(noteData)
      });

      if (!response.ok) {
        const error = new Error(`Erreur création note: ${response.statusText}`) as ApiError;
        error.status = response.status;
        error.statusText = response.statusText;
        throw error;
      }

      const result = await response.json();
      const apiTime = Date.now() - startTime;
      logApi('create_note', `✅ API terminée en ${apiTime}ms`, context);

      // 🚀 Mise à jour directe de Zustand (instantanée)
      const store = useFileSystemStore.getState();
      store.addNote(result.note);
      logStore('add_note', `Note ajoutée: ${result.note.source_title}`, context);
      
      // 🚀 Déclencher le polling côté client immédiatement
      await clientPollingTrigger.triggerArticlesPolling('INSERT');
      logPolling('trigger', 'Polling INSERT déclenché', context);
      
      const totalTime = Date.now() - startTime;
      logApi('create_note', `✅ Opération complète en ${totalTime}ms`, context);
      
      return result;
    } catch (error) {
      ErrorHandler.handleApiError(error, context);
      throw error;
    }
  }

  /**
   * Mettre à jour une note avec mise à jour directe de Zustand + polling côté client
   */
  async updateNote(noteId: string, updateData: UpdateNoteData) {
    if (process.env.NODE_ENV === 'development') {
    logger.dev('[OptimizedApi] 🔄 Mise à jour note optimisée');
    }
    const startTime = Date.now();
    
    try {
      // Récupérer les headers d'authentification
      const headers = await this.getAuthHeaders();
      
      // Appel API avec [ref] au lieu de noteId direct
      const response = await fetch(`/api/v1/note/${noteId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur mise à jour note: ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      const apiTime = Date.now() - startTime;
      if (process.env.NODE_ENV === 'development') {
      logger.dev(`[OptimizedApi] ✅ API terminée en ${apiTime}ms`);
      }

      // 🚀 Mise à jour directe de Zustand (instantanée)
      const store = useFileSystemStore.getState();
      store.updateNote(noteId, result.note);
      
      // 🚀 Déclencher le polling côté client immédiatement
      await clientPollingTrigger.triggerArticlesPolling('UPDATE');
      
      const totalTime = Date.now() - startTime;
      if (process.env.NODE_ENV === 'development') {
      logger.dev(`[OptimizedApi] ✅ Note mise à jour dans Zustand + polling déclenché en ${totalTime}ms total`);
      }
      
      return result;
    } catch (error) {
      logger.error('[OptimizedApi] ❌ Erreur mise à jour note:', error);
      throw error;
    }
  }

  /**
   * Supprimer une note avec mise à jour directe de Zustand + polling côté client
   */
  async deleteNote(noteId: string) {
    if (process.env.NODE_ENV === 'development') {
    logger.dev('[OptimizedApi] 🗑️ Suppression note optimisée');
    }
    const startTime = Date.now();
    
    try {
      // Récupérer les headers d'authentification
      const headers = await this.getAuthHeaders();
      
      // Appel API
      const response = await fetch(`/api/v1/note/${noteId}`, {
        method: 'DELETE',
        headers
      });

      if (!response.ok) {
        throw new Error(`Erreur suppression note: ${response.statusText}`);
      }

      const apiTime = Date.now() - startTime;
      if (process.env.NODE_ENV === 'development') {
      logger.dev(`[OptimizedApi] ✅ API terminée en ${apiTime}ms`);
      }

      // 🚀 Mise à jour directe de Zustand (instantanée)
      const store = useFileSystemStore.getState();
      store.removeNote(noteId);
      
      // 🚀 Déclencher le polling côté client immédiatement
      await clientPollingTrigger.triggerArticlesPolling('DELETE');
      
      const totalTime = Date.now() - startTime;
      if (process.env.NODE_ENV === 'development') {
      logger.dev(`[OptimizedApi] ✅ Note supprimée de Zustand + polling déclenché en ${totalTime}ms total`);
      }
      
      return { success: true };
    } catch (error) {
      logger.error('[OptimizedApi] ❌ Erreur suppression note:', error);
      throw error;
    }
  }

  /**
   * Créer un dossier avec mise à jour directe de Zustand + polling côté client
   */
  async createFolder(folderData: CreateFolderData) {
    if (process.env.NODE_ENV === 'development') {
    logger.dev('[OptimizedApi] 📁 Création dossier optimisée');
    }
    const startTime = Date.now();
    
    try {
      // Récupérer les headers d'authentification
      const headers = await this.getAuthHeaders();
      
      // Appel API
      const response = await fetch('/api/v1/folder/create', {
        method: 'POST',
        headers,
        body: JSON.stringify(folderData)
      });

      if (!response.ok) {
        throw new Error(`Erreur création dossier: ${response.statusText}`);
      }

      const result = await response.json();
      const apiTime = Date.now() - startTime;
      if (process.env.NODE_ENV === 'development') {
      logger.dev(`[OptimizedApi] ✅ API terminée en ${apiTime}ms`);
      }

      // 🚀 Mise à jour directe de Zustand (instantanée)
      const store = useFileSystemStore.getState();
      store.addFolder(result.folder);
      
      // 🚀 Déclencher le polling côté client immédiatement
      await clientPollingTrigger.triggerFoldersPolling('INSERT');
      
      const totalTime = Date.now() - startTime;
      if (process.env.NODE_ENV === 'development') {
      logger.dev(`[OptimizedApi] ✅ Dossier ajouté à Zustand + polling déclenché en ${totalTime}ms total`);
      }
      
      return result;
    } catch (error) {
      logger.error('[OptimizedApi] ❌ Erreur création dossier:', error);
      throw error;
    }
  }

  /**
   * Mettre à jour un dossier avec mise à jour directe de Zustand + polling côté client
   */
  async updateFolder(folderId: string, updateData: UpdateFolderData) {
    if (process.env.NODE_ENV === 'development') {
    logger.dev('[OptimizedApi] 🔄 Mise à jour dossier optimisée');
    }
    const startTime = Date.now();
    
    try {
      // Récupérer les headers d'authentification
      const headers = await this.getAuthHeaders();
      
      // Appel API
      const response = await fetch(`/api/v1/folder/${folderId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        throw new Error(`Erreur mise à jour dossier: ${response.statusText}`);
      }

      const result = await response.json();
      const apiTime = Date.now() - startTime;
      if (process.env.NODE_ENV === 'development') {
      logger.dev(`[OptimizedApi] ✅ API terminée en ${apiTime}ms`);
      }

      // 🚀 Mise à jour directe de Zustand (instantanée)
      const store = useFileSystemStore.getState();
      store.updateFolder(folderId, result.folder);
      
      // 🚀 Déclencher le polling côté client immédiatement
      await clientPollingTrigger.triggerFoldersPolling('UPDATE');
      
      const totalTime = Date.now() - startTime;
      if (process.env.NODE_ENV === 'development') {
      logger.dev(`[OptimizedApi] ✅ Dossier mis à jour dans Zustand + polling déclenché en ${totalTime}ms total`);
      }
      
      return result;
    } catch (error) {
      logger.error('[OptimizedApi] ❌ Erreur mise à jour dossier:', error);
      throw error;
    }
  }

  /**
   * Supprimer un dossier avec mise à jour directe de Zustand + polling côté client
   */
  async deleteFolder(folderId: string) {
    if (process.env.NODE_ENV === 'development') {
    logger.dev('[OptimizedApi] 🗑️ Suppression dossier optimisée');
    }
    const startTime = Date.now();
    
    try {
      // Récupérer les headers d'authentification
      const headers = await this.getAuthHeaders();
      
      // Appel API
      const response = await fetch(`/api/v1/folder/${folderId}`, {
        method: 'DELETE',
        headers
      });

      if (!response.ok) {
        throw new Error(`Erreur suppression dossier: ${response.statusText}`);
      }

      const apiTime = Date.now() - startTime;
      if (process.env.NODE_ENV === 'development') {
      logger.dev(`[OptimizedApi] ✅ API terminée en ${apiTime}ms`);
      }

      // 🚀 Mise à jour directe de Zustand (instantanée)
      const store = useFileSystemStore.getState();
      store.removeFolder(folderId);
      
      // 🚀 Déclencher le polling côté client immédiatement
      await clientPollingTrigger.triggerFoldersPolling('DELETE');
      
      const totalTime = Date.now() - startTime;
      if (process.env.NODE_ENV === 'development') {
      logger.dev(`[OptimizedApi] ✅ Dossier supprimé de Zustand + polling déclenché en ${totalTime}ms total`);
      }
      
      return { success: true };
    } catch (error) {
      logger.error('[OptimizedApi] ❌ Erreur suppression dossier:', error);
      throw error;
    }
  }

  /**
   * Déplacer une note avec mise à jour directe de Zustand + polling côté client
   */
  async moveNote(noteId: string, targetFolderId: string | null, targetClasseurId?: string) {
    if (process.env.NODE_ENV === 'development') {
    logger.dev('[OptimizedApi] 📦 Déplacement note optimisée');
    }
    const startTime = Date.now();
    
    try {
      // Récupérer les headers d'authentification
      const headers = await this.getAuthHeaders();
      
      // Préparer le payload
      const payload: any = {};
      if (targetFolderId !== undefined) payload.target_folder_id = targetFolderId;
      if (targetClasseurId) payload.target_classeur_id = targetClasseurId;
      
      // Appel API
      const response = await fetch(`/api/v1/note/${noteId}/move`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Erreur déplacement note: ${response.statusText}`);
      }

      const result = await response.json();
      const apiTime = Date.now() - startTime;
      if (process.env.NODE_ENV === 'development') {
      logger.dev(`[OptimizedApi] ✅ API terminée en ${apiTime}ms`);
      }

      // 🚀 Mise à jour directe de Zustand (instantanée)
      const store = useFileSystemStore.getState();
      store.moveNote(noteId, targetFolderId, targetClasseurId);
      
      // 🚀 Déclencher le polling côté client immédiatement
      await clientPollingTrigger.triggerArticlesPolling('UPDATE');
      
      const totalTime = Date.now() - startTime;
      if (process.env.NODE_ENV === 'development') {
      logger.dev(`[OptimizedApi] ✅ Note déplacée dans Zustand + polling déclenché en ${totalTime}ms total`);
      }
      
      return result;
    } catch (error) {
      logger.error('[OptimizedApi] ❌ Erreur déplacement note:', error);
      throw error;
    }
  }

  /**
   * Déplacer un dossier avec mise à jour directe de Zustand + polling côté client
   */
  async moveFolder(folderId: string, targetParentId: string | null, targetClasseurId?: string) {
    if (process.env.NODE_ENV === 'development') {
    logger.dev('[OptimizedApi] 📦 Déplacement dossier optimisé');
    }
    const startTime = Date.now();
    
    try {
      // Récupérer les headers d'authentification
      const headers = await this.getAuthHeaders();
      
      // Préparer le payload
      const payload: any = {};
      if (targetParentId !== undefined) payload.target_parent_id = targetParentId;
      if (targetClasseurId) payload.target_classeur_id = targetClasseurId;
      
      // Appel API
      const response = await fetch(`/api/v1/dossier/${folderId}/move`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Erreur déplacement dossier: ${response.statusText}`);
      }

      const result = await response.json();
      const apiTime = Date.now() - startTime;
      if (process.env.NODE_ENV === 'development') {
      logger.dev(`[OptimizedApi] ✅ API terminée en ${apiTime}ms`);
      }

      // 🚀 Mise à jour directe de Zustand (instantanée)
      const store = useFileSystemStore.getState();
      store.moveFolder(folderId, targetParentId, targetClasseurId);
      
      // 🚀 Déclencher le polling côté client immédiatement
      await clientPollingTrigger.triggerFoldersPolling('UPDATE');
      
      const totalTime = Date.now() - startTime;
      if (process.env.NODE_ENV === 'development') {
      logger.dev(`[OptimizedApi] ✅ Dossier déplacé dans Zustand + polling déclenché en ${totalTime}ms total`);
      }
      
      return result;
    } catch (error) {
      logger.error('[OptimizedApi] ❌ Erreur déplacement dossier:', error);
      throw error;
    }
  }

  /**
   * Créer un classeur avec mise à jour directe de Zustand + polling côté client
   */
  async createClasseur(classeurData: CreateClasseurData) {
    if (process.env.NODE_ENV === 'development') {
    logger.dev('[OptimizedApi] 📚 Création classeur optimisée');
    }
    const startTime = Date.now();
    
    try {
      // Récupérer les headers d'authentification
      const headers = await this.getAuthHeaders();
      
      // Appel API
      const response = await fetch('/api/v1/classeur/create', {
        method: 'POST',
        headers,
        body: JSON.stringify(classeurData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`[OptimizedApi] ❌ Réponse API: ${response.status} ${response.statusText}`);
        logger.error(`[OptimizedApi] ❌ Contenu erreur: ${errorText}`);
        throw new Error(`Erreur création classeur: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      const apiTime = Date.now() - startTime;
      if (process.env.NODE_ENV === 'development') {
      logger.dev(`[OptimizedApi] ✅ API terminée en ${apiTime}ms`);
      logger.dev(`[OptimizedApi] 📋 Réponse API:`, result);
      }

      // 🚀 Mise à jour directe de Zustand (instantanée)
      try {
        const store = useFileSystemStore.getState();
        if (process.env.NODE_ENV === 'development') {
        logger.dev(`[OptimizedApi] 🔄 Ajout classeur à Zustand:`, result.classeur);
        }
        store.addClasseur(result.classeur);
      } catch (storeError) {
        logger.error('[OptimizedApi] ⚠️ Erreur accès store Zustand:', storeError);
        if (process.env.NODE_ENV === 'development') {
        logger.dev('[OptimizedApi] ⚠️ Store non disponible, mise à jour différée');
        }
      }
      
      // 🚀 Déclencher le polling côté client immédiatement
      await clientPollingTrigger.triggerClasseursPolling('INSERT');
      
      const totalTime = Date.now() - startTime;
      if (process.env.NODE_ENV === 'development') {
      logger.dev(`[OptimizedApi] ✅ Classeur ajouté à Zustand + polling déclenché en ${totalTime}ms total`);
      }
      
      return result;
    } catch (error) {
      logger.error('[OptimizedApi] ❌ Erreur création classeur:', error);
      throw error;
    }
  }

  /**
   * Mettre à jour un classeur avec mise à jour directe de Zustand + polling côté client
   */
  async updateClasseur(classeurId: string, updateData: UpdateClasseurData) {
    if (process.env.NODE_ENV === 'development') {
    logger.dev('[OptimizedApi] 🔄 Mise à jour classeur optimisée');
    }
    const startTime = Date.now();
    
    try {
      // Récupérer les headers d'authentification
      const headers = await this.getAuthHeaders();
      
      // Appel API
      const response = await fetch(`/api/v1/classeur/${classeurId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        throw new Error(`Erreur mise à jour classeur: ${response.statusText}`);
      }

      const result = await response.json();
      const apiTime = Date.now() - startTime;
      if (process.env.NODE_ENV === 'development') {
      logger.dev(`[OptimizedApi] ✅ API terminée en ${apiTime}ms`);
      }

      // 🚀 Mise à jour directe de Zustand (instantanée)
      const store = useFileSystemStore.getState();
      store.updateClasseur(classeurId, result.classeur);
      
      // 🚀 Déclencher le polling côté client immédiatement
      await clientPollingTrigger.triggerClasseursPolling('UPDATE');
      
      const totalTime = Date.now() - startTime;
      if (process.env.NODE_ENV === 'development') {
      logger.dev(`[OptimizedApi] ✅ Classeur mis à jour dans Zustand + polling déclenché en ${totalTime}ms total`);
      }
      
      return result;
    } catch (error) {
      logger.error('[OptimizedApi] ❌ Erreur mise à jour classeur:', error);
      throw error;
    }
  }

  /**
   * Supprimer un classeur avec mise à jour directe de Zustand + polling côté client
   */
  async deleteClasseur(classeurId: string) {
    if (process.env.NODE_ENV === 'development') {
    logger.dev('[OptimizedApi] 🗑️ Suppression classeur optimisée');
    }
    const startTime = Date.now();
    
    try {
      // Récupérer les headers d'authentification
      const headers = await this.getAuthHeaders();
      
      // Appel API
      const response = await fetch(`/api/v1/classeur/${classeurId}`, {
        method: 'DELETE',
        headers
      });

      if (!response.ok) {
        throw new Error(`Erreur suppression classeur: ${response.statusText}`);
      }

      const apiTime = Date.now() - startTime;
      if (process.env.NODE_ENV === 'development') {
      logger.dev(`[OptimizedApi] ✅ API terminée en ${apiTime}ms`);
      }

      // 🚀 Mise à jour directe de Zustand (instantanée)
      const store = useFileSystemStore.getState();
      store.removeClasseur(classeurId);
      
      // 🚀 Déclencher le polling côté client immédiatement
      await clientPollingTrigger.triggerClasseursPolling('DELETE');
      
      const totalTime = Date.now() - startTime;
      if (process.env.NODE_ENV === 'development') {
      logger.dev(`[OptimizedApi] ✅ Classeur supprimé de Zustand + polling déclenché en ${totalTime}ms total`);
      }
      
      return { success: true };
    } catch (error) {
      logger.error('[OptimizedApi] ❌ Erreur suppression classeur:', error);
      throw error;
    }
  }

  /**
   * Réorganiser les classeurs avec mise à jour directe de Zustand + polling côté client
   */
  async reorderClasseurs(updatedClasseurs: { id: string; position: number }[]) {
    if (process.env.NODE_ENV === 'development') {
    logger.dev('[OptimizedApi] 🔄 Réorganisation classeurs optimisée');
    }
    const startTime = Date.now();
    
    try {
      // Appel API avec authentification
      const headers = await this.getAuthHeaders();
      const response = await fetch('/api/v1/classeur/reorder', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ classeurs: updatedClasseurs })
      });

      if (!response.ok) {
        throw new Error(`Erreur réorganisation classeurs: ${response.statusText}`);
      }

      const result = await response.json();
      const apiTime = Date.now() - startTime;
      if (process.env.NODE_ENV === 'development') {
      logger.dev(`[OptimizedApi] ✅ API terminée en ${apiTime}ms`);
      }

      // 🚀 Mise à jour directe de Zustand (instantanée)
      const store = useFileSystemStore.getState();
      updatedClasseurs.forEach(({ id, position }) => {
        store.updateClasseur(id, { position });
        if (process.env.NODE_ENV === 'development') {
          logger.dev(`[OptimizedApi] 📍 Position mise à jour pour classeur ${id}: ${position}`);
        }
      });
      
      // 🚀 Déclencher le polling côté client immédiatement
      await clientPollingTrigger.triggerClasseursPolling('UPDATE');
      
      const totalTime = Date.now() - startTime;
      if (process.env.NODE_ENV === 'development') {
      logger.dev(`[OptimizedApi] ✅ Classeurs réorganisés dans Zustand + polling déclenché en ${totalTime}ms total`);
      }
      
      return result;
    } catch (error) {
      logger.error('[OptimizedApi] ❌ Erreur réorganisation classeurs:', error);
      throw error;
    }
  }

  /**
   * Publier/dépublier une note
   */
  async publishNoteREST(noteId: string, isPublished: boolean): Promise<PublishNoteResponse> {
    const startTime = Date.now();
    const context = { operation: 'publish_note', component: 'OptimizedApi' };
    
    logApi('publish_note', `🚀 Début publication note ${noteId}`, context);
    
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`/api/v1/note/${noteId}/publish`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ ispublished: isPublished })
      });

      if (!response.ok) {
        const error = new Error(`Erreur publication note: ${response.statusText}`) as ApiError;
        error.status = response.status;
        error.statusText = response.statusText;
        throw error;
      }

      const result = await response.json();
      const apiTime = Date.now() - startTime;
      logApi('publish_note', `✅ Publication terminée en ${apiTime}ms`, context);

      return result;
    } catch (error) {
      logApi('publish_note', `❌ Erreur publication: ${error}`, context);
      throw error;
    }
  }
}

// Export de l'instance singleton
export const optimizedApi = OptimizedApi.getInstance(); 