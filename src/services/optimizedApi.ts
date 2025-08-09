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
  header_image_offset?: number;
  header_image_blur?: number;
  header_image_overlay?: number;
  header_title_in_image?: boolean;
  wide_mode?: boolean;
  font_family?: string;
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
    if (process.env.NODE_ENV === 'development') {
    logger.dev('[OptimizedApi] 📝 Création note optimisée');
    }
    const startTime = Date.now();
    
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
        const errorText = await response.text();
        logger.error(`[OptimizedApi] ❌ Réponse API: ${response.status} ${response.statusText}`);
        logger.error(`[OptimizedApi] ❌ Contenu erreur: ${errorText}`);
        throw new Error(`Erreur création note: ${response.status} ${response.statusText} - ${errorText}`);
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
        logger.dev(`[OptimizedApi] 🔄 Ajout note à Zustand:`, result.note);
        }
        store.addNote(result.note);
      } catch (storeError) {
        logger.error('[OptimizedApi] ⚠️ Erreur accès store Zustand:', storeError);
        if (process.env.NODE_ENV === 'development') {
        logger.dev('[OptimizedApi] ⚠️ Store non disponible, mise à jour différée');
        }
      }
      
      // 🚀 Déclencher le polling côté client immédiatement
      await clientPollingTrigger.triggerArticlesPolling('INSERT');
      
      const totalTime = Date.now() - startTime;
      if (process.env.NODE_ENV === 'development') {
      logger.dev(`[OptimizedApi] ✅ Note ajoutée à Zustand + polling déclenché en ${totalTime}ms total`);
      }
      
      return result;
    } catch (error) {
      logger.error('[OptimizedApi] ❌ Erreur création note:', error);
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
   * Charger tous les classeurs avec leur contenu (dossiers et notes)
   * Met à jour directement Zustand avec toutes les données
   */
  async loadClasseursWithContent() {
    if (process.env.NODE_ENV === 'development') {
    logger.dev('[OptimizedApi] 📚 Chargement classeurs avec contenu optimisé');
    }
    const startTime = Date.now();
    
    try {
      // 1. Charger les classeurs via API v1 (sans authentification pour le moment)
      const classeursResponse = await fetch('/api/v1/classeurs');
      
      if (!classeursResponse.ok) {
        throw new Error(`Erreur chargement classeurs: ${classeursResponse.statusText}`);
      }
      
      const classeursData = await classeursResponse.json();
      const store = useFileSystemStore.getState();
      store.setClasseurs(classeursData);
      logger.dev('[OptimizedApi] ✅ Classeurs chargés via API v1:', classeursData.length);
      logger.dev('[OptimizedApi] 📋 Données classeurs:', classeursData);

      // 2. Pour chaque classeur, charger les dossiers et notes
      const classeurs = Object.values(useFileSystemStore.getState().classeurs);
      logger.dev('[OptimizedApi] 🔍 Classeurs dans le store après setClasseurs:', classeurs.length);
      
      for (const classeur of classeurs) {
        logger.dev(`[OptimizedApi] 📁 Chargement contenu pour classeur: ${classeur.name} (${classeur.id})`);
        try {
          // Charger les dossiers du classeur (sans authentification)
          const foldersResponse = await fetch(`/api/v1/dossiers?classeurId=${classeur.id}`);
          logger.dev(`[OptimizedApi] 📊 Réponse dossiers pour ${classeur.name}:`, foldersResponse.status, foldersResponse.statusText);
          
          if (foldersResponse.status === 304) {
            logger.dev(`[OptimizedApi] ⏭️ Dossiers non modifiés (304) pour ${classeur.name}`);
          } else if (foldersResponse.ok) {
            const foldersData = await foldersResponse.json();
            logger.dev(`[OptimizedApi] 📋 Données dossiers brutes pour ${classeur.name}:`, foldersData);
            
            if (foldersData.dossiers && Array.isArray(foldersData.dossiers)) {
              // Fusionner avec l'état ACTUEL (toujours lire le state frais)
              const currentFolders = Object.values(useFileSystemStore.getState().folders);
              const existingIds = new Set(currentFolders.map(f => f.id));
              const newFolders = foldersData.dossiers.filter((f: any) => !existingIds.has(f.id));
              const allFolders = [...currentFolders, ...newFolders];
              
              useFileSystemStore.getState().setFolders(allFolders);
              logger.dev(`[OptimizedApi] ✅ Dossiers chargés pour classeur ${classeur.name}:`, foldersData.dossiers.length);
              logger.dev(`[OptimizedApi] 📊 Total dossiers dans le store après fusion:`, allFolders.length);
            } else {
              logger.warn(`[OptimizedApi] ⚠️ Pas de dossiers dans la réponse pour ${classeur.name}:`, foldersData);
            }
          } else {
            const errorText = await foldersResponse.text();
            logger.warn(`[OptimizedApi] ⚠️ Erreur chargement dossiers classeur ${classeur.name}:`, foldersResponse.status, errorText);
          }

          // Charger les notes du classeur (sans authentification)
          const notesResponse = await fetch(`/api/v1/notes?classeurId=${classeur.id}`);
          logger.dev(`[OptimizedApi] 📊 Réponse notes pour ${classeur.name}:`, notesResponse.status, notesResponse.statusText);
          
          if (notesResponse.status === 304) {
            logger.dev(`[OptimizedApi] ⏭️ Notes non modifiées (304) pour ${classeur.name}`);
          } else if (notesResponse.ok) {
            const notesData = await notesResponse.json();
            logger.dev(`[OptimizedApi] 📋 Données notes brutes pour ${classeur.name}:`, notesData);
            
            if (notesData.notes && Array.isArray(notesData.notes)) {
              // Fusionner avec l'état ACTUEL (toujours lire le state frais)
              const currentNotes = Object.values(useFileSystemStore.getState().notes);
              const existingIds = new Set(currentNotes.map(n => n.id));
              const newNotes = notesData.notes.filter((n: any) => !existingIds.has(n.id));
              const allNotes = [...currentNotes, ...newNotes];
              
              useFileSystemStore.getState().setNotes(allNotes);
              logger.dev(`[OptimizedApi] ✅ Notes chargées pour classeur ${classeur.name}:`, notesData.notes.length);
              logger.dev(`[OptimizedApi] 📊 Total notes dans le store après fusion:`, allNotes.length);
            } else {
              logger.warn(`[OptimizedApi] ⚠️ Pas de notes dans la réponse pour ${classeur.name}:`, notesData);
            }
          } else {
            const errorText = await notesResponse.text();
            logger.warn(`[OptimizedApi] ⚠️ Erreur chargement notes classeur ${classeur.name}:`, notesResponse.status, errorText);
          }
        } catch (error) {
          logger.error(`[OptimizedApi] ⚠️ Erreur chargement contenu classeur ${classeur.name}:`, error);
        }
      }

      const totalTime = Date.now() - startTime;
      if (process.env.NODE_ENV === 'development') {
      logger.dev(`[OptimizedApi] ✅ Tous les classeurs et leur contenu chargés en ${totalTime}ms`);
      }
      
      // Log final de l'état du store
      const finalStore = useFileSystemStore.getState();
      logger.dev('[OptimizedApi] 📊 État final du store:', {
        classeursCount: Object.values(finalStore.classeurs).length,
        foldersCount: Object.values(finalStore.folders).length,
        notesCount: Object.values(finalStore.notes).length,
        classeurs: Object.values(finalStore.classeurs).map(c => ({ id: c.id, name: c.name })),
        folders: Object.values(finalStore.folders).map(f => ({ id: f.id, name: f.name, classeur_id: f.classeur_id })),
        notes: Object.values(finalStore.notes).map(n => ({ id: n.id, title: n.source_title, classeur_id: n.classeur_id }))
      });
      
      return { success: true, classeursCount: classeurs.length };
    } catch (error) {
      logger.error('[OptimizedApi] ❌ Erreur chargement classeurs avec contenu:', error);
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