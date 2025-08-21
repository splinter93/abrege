import { useFileSystemStore } from '@/store/useFileSystemStore';

import { simpleLogger as logger } from '@/utils/logger';
import type { Folder, Note, Classeur } from '@/store/useFileSystemStore';


// Types pour les données d'API (compatibles avec V1)
export interface CreateNoteData {
  source_title: string;
  notebook_id: string;
  markdown_content?: string;
  header_image?: string;
  folder_id?: string | null;
  description?: string;
}

export interface UpdateNoteData {
  source_title?: string;
  markdown_content?: string;
  html_content?: string;
  header_image?: string | null;
  header_image_offset?: number;
  header_image_blur?: number;
  header_image_overlay?: number;
  header_title_in_image?: boolean;
  wide_mode?: boolean;
  a4_mode?: boolean;
  slash_lang?: 'fr' | 'en';
  font_family?: string;
  folder_id?: string | null;
  description?: string;
}

export interface CreateFolderData {
  name: string;
  notebook_id: string;
  parent_id?: string | null;
}

export interface UpdateFolderData {
  name?: string;
  parent_id?: string | null;
}

export interface CreateClasseurData {
  name: string;
  description?: string;
  icon?: string;
}

export interface UpdateClasseurData {
  name?: string;
  description?: string;
  icon?: string;
  position?: number;
}

/**
 * Service API V2 unifié qui utilise les endpoints API V2 avec les mécanismes de V1
 * - Appels HTTP vers les endpoints V2 (pas d'accès direct DB côté client)
 * - Mise à jour optimiste du store Zustand
 * - Polling intelligent déclenché par API
 * - Compatible avec l'architecture existante
 */
export class V2UnifiedApi {
  private static instance: V2UnifiedApi;

  private constructor() {}

  static getInstance(): V2UnifiedApi {
    if (!V2UnifiedApi.instance) {
      V2UnifiedApi.instance = new V2UnifiedApi();
    }
    return V2UnifiedApi.instance;
  }

  /**
   * Récupérer les headers d'authentification
   */
  private async getAuthHeaders(): Promise<HeadersInit> {
    try {
      // Utiliser le client Supabase côté client
      const { supabase } = await import('@/supabaseClient');
      const { data: { session } } = await supabase.auth.getSession();
      const headers: HeadersInit = { 
        'Content-Type': 'application/json',
        'X-Client-Type': 'V2UnifiedApi'
      };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
      return headers;
    } catch {
      return { 
        'Content-Type': 'application/json',
        'X-Client-Type': 'V2UnifiedApi'
      };
    }
  }



  /**
   * Créer une note avec mise à jour optimiste 
   */
  async createNote(noteData: CreateNoteData, userId: string) {
    if (process.env.NODE_ENV === 'development') {
      logger.dev('[V2UnifiedApi] 📝 Création note unifiée V2 avec optimisme');
    }
    const startTime = Date.now();
    
    try {
      // 🚀 1. Mise à jour optimiste immédiate
      const tempId = `temp_note_${Date.now()}`;
      const optimisticNote: Note = {
        id: tempId,
        source_title: noteData.source_title,
        markdown_content: noteData.markdown_content || '',
        classeur_id: noteData.notebook_id,
        folder_id: noteData.folder_id || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        _optimistic: true
      };

      const store = useFileSystemStore.getState();
      store.addNoteOptimistic(optimisticNote, tempId);

      if (process.env.NODE_ENV === 'development') {
        logger.dev(`[V2UnifiedApi] 🚀 Note optimiste ajoutée avec ID temporaire: ${tempId}`);
      }

      // 🚀 2. Appel vers l'endpoint API V2
      const headers = await this.getAuthHeaders();
      const response = await fetch('/api/v2/note/create', {
        method: 'POST',
        headers,
        body: JSON.stringify(noteData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        // ❌ En cas d'erreur, annuler l'optimiste
        store.removeNoteOptimistic(tempId);
        throw new Error(`Erreur création note: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      const apiTime = Date.now() - startTime;

      // 🚀 3. Remplacer l'optimiste par la vraie note
      store.updateNoteOptimistic(tempId, result.note);

      if (process.env.NODE_ENV === 'development') {
        logger.dev(`[V2UnifiedApi] ✅ API terminée en ${apiTime}ms, note optimiste remplacée`);
      }
      
      // 🚀 4. Déclencher le polling intelligent immédiatement
      
      const totalTime = Date.now() - startTime;
      if (process.env.NODE_ENV === 'development') {
        logger.dev(`[V2UnifiedApi] ✅ Note créée avec optimisme  en ${totalTime}ms total`);
      }
      
      return result;
    } catch (error) {
      logger.error('[V2UnifiedApi] ❌ Erreur création note:', error);
      throw error;
    }
  }

  /**
   * Mettre à jour une note avec mise à jour directe de Zustand + polling côté client
   */
  async updateNote(noteId: string, updateData: UpdateNoteData, userId: string) {
    if (process.env.NODE_ENV === 'development') {
      logger.dev('[V2UnifiedApi] 🔄 Mise à jour note unifiée V2');
    }
    const startTime = Date.now();
    
    try {
      // 🚀 Appel vers l'endpoint API V2
      const headers = await this.getAuthHeaders();
      const response = await fetch(`/api/v2/note/${noteId}/update`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur mise à jour note: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      const apiTime = Date.now() - startTime;
      if (process.env.NODE_ENV === 'development') {
        logger.dev(`[V2UnifiedApi] ✅ API terminée en ${apiTime}ms`);
      }

      // 🚀 Mise à jour directe de Zustand (instantanée)
      const store = useFileSystemStore.getState();
      store.updateNote(noteId, result.note);
      
      // 🚀 Déclencher le polling côté client immédiatement
      
      const totalTime = Date.now() - startTime;
      if (process.env.NODE_ENV === 'development') {
        logger.dev(`[V2UnifiedApi] ✅ Note mise à jour dans Zustand  en ${totalTime}ms total`);
      }
      
      return result;
    } catch (error) {
      logger.error('[V2UnifiedApi] ❌ Erreur mise à jour note:', error);
      throw error;
    }
  }

  /**
   * Supprimer une note avec mise à jour directe de Zustand + polling côté client
   */
  async deleteNote(noteId: string, userId: string) {
    if (process.env.NODE_ENV === 'development') {
      logger.dev('[V2UnifiedApi] 🗑️ Suppression note unifiée V2');
    }
    const startTime = Date.now();
    
    try {
      // 🚀 Appel vers l'endpoint API V2
      const headers = await this.getAuthHeaders();
      const response = await fetch(`/api/v2/note/${noteId}/delete`, {
        method: 'DELETE',
        headers
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur suppression note: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const apiTime = Date.now() - startTime;
      if (process.env.NODE_ENV === 'development') {
        logger.dev(`[V2UnifiedApi] ✅ API terminée en ${apiTime}ms`);
      }

      // 🚀 Mise à jour directe de Zustand (instantanée)
      const store = useFileSystemStore.getState();
      store.removeNote(noteId);
      
      // 🚀 Déclencher le polling côté client immédiatement
      
      const totalTime = Date.now() - startTime;
      if (process.env.NODE_ENV === 'development') {
        logger.dev(`[V2UnifiedApi] ✅ Note supprimée de Zustand  en ${totalTime}ms total`);
      }
      
      return { success: true };
    } catch (error) {
      logger.error('[V2UnifiedApi] ❌ Erreur suppression note:', error);
      throw error;
    }
  }

  /**
   * Créer un dossier avec mise à jour optimiste 
   */
  async createFolder(folderData: CreateFolderData, userId: string) {
    if (process.env.NODE_ENV === 'development') {
      logger.dev('[V2UnifiedApi] 📁 Création dossier unifié V2 avec optimisme');
    }
    const startTime = Date.now();
    
    try {
      // 🚀 1. Mise à jour optimiste immédiate
      const tempId = `temp_folder_${Date.now()}`;
      const optimisticFolder: Folder = {
        id: tempId,
        name: folderData.name,
        parent_id: folderData.parent_id || null,
        classeur_id: folderData.notebook_id,
        position: 0,
        created_at: new Date().toISOString(),
        _optimistic: true
      };

      const store = useFileSystemStore.getState();
      store.addFolderOptimistic(optimisticFolder);

      if (process.env.NODE_ENV === 'development') {
        logger.dev(`[V2UnifiedApi] 🚀 Dossier optimiste ajouté avec ID temporaire: ${tempId}`);
      }

      // 🚀 2. Appel vers l'endpoint API V2
      const headers = await this.getAuthHeaders();
      const response = await fetch('/api/v2/folder/create', {
        method: 'POST',
        headers,
        body: JSON.stringify(folderData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        // ❌ En cas d'erreur, annuler l'optimiste
        store.removeFolderOptimistic(tempId);
        throw new Error(`Erreur création dossier: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      const apiTime = Date.now() - startTime;

      // 🚀 3. Remplacer l'optimiste par le vrai dossier
      store.updateFolderOptimistic(tempId, result.folder);

      if (process.env.NODE_ENV === 'development') {
        logger.dev(`[V2UnifiedApi] ✅ API terminée en ${apiTime}ms, dossier optimiste remplacé`);
      }

      // 🚀 4. Déclencher le polling intelligent immédiatement
      
      const totalTime = Date.now() - startTime;
      if (process.env.NODE_ENV === 'development') {
        logger.dev(`[V2UnifiedApi] ✅ Dossier créé avec optimisme  en ${totalTime}ms total`);
      }
      
      return result;
    } catch (error) {
      logger.error('[V2UnifiedApi] ❌ Erreur création dossier:', error);
      throw error;
    }
  }

  /**
   * Mettre à jour un dossier avec mise à jour directe de Zustand + polling côté client
   */
  async updateFolder(folderId: string, updateData: UpdateFolderData, userId: string) {
    if (process.env.NODE_ENV === 'development') {
      logger.dev('[V2UnifiedApi] 🔄 Mise à jour dossier unifié V2');
    }
    const startTime = Date.now();
    
    try {
      // 🚀 Appel vers l'endpoint API V2
      const headers = await this.getAuthHeaders();
      const response = await fetch(`/api/v2/folder/${folderId}/update`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur mise à jour dossier: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      const apiTime = Date.now() - startTime;
      if (process.env.NODE_ENV === 'development') {
        logger.dev(`[V2UnifiedApi] ✅ API terminée en ${apiTime}ms`);
      }

      // 🚀 Mise à jour directe de Zustand (instantanée)
      const store = useFileSystemStore.getState();
      store.updateFolder(folderId, result.folder);
      
      // 🚀 Déclencher le polling côté client immédiatement
      
      const totalTime = Date.now() - startTime;
      if (process.env.NODE_ENV === 'development') {
        logger.dev(`[V2UnifiedApi] ✅ Dossier mis à jour dans Zustand  en ${totalTime}ms total`);
      }
      
      return result;
    } catch (error) {
      logger.error('[V2UnifiedApi] ❌ Erreur mise à jour dossier:', error);
      throw error;
    }
  }

  /**
   * Supprimer un dossier avec mise à jour directe de Zustand + polling côté client
   */
  async deleteFolder(folderId: string, userId: string) {
    if (process.env.NODE_ENV === 'development') {
      logger.dev('[V2UnifiedApi] 🗑️ Suppression dossier unifié V2');
    }
    const startTime = Date.now();
    
    try {
      // 🚀 Appel vers l'endpoint API V2
      const headers = await this.getAuthHeaders();
      const response = await fetch(`/api/v2/folder/${folderId}/delete`, {
        method: 'DELETE',
        headers
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur suppression dossier: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const apiTime = Date.now() - startTime;
      if (process.env.NODE_ENV === 'development') {
        logger.dev(`[V2UnifiedApi] ✅ API terminée en ${apiTime}ms`);
      }

      // 🚀 Mise à jour directe de Zustand (instantanée)
      const store = useFileSystemStore.getState();
      store.removeFolder(folderId);
      
      // 🚀 Déclencher le polling côté client immédiatement
      
      const totalTime = Date.now() - startTime;
      if (process.env.NODE_ENV === 'development') {
        logger.dev(`[V2UnifiedApi] ✅ Dossier supprimé de Zustand  en ${totalTime}ms total`);
      }
      
      return { success: true };
    } catch (error) {
      logger.error('[V2UnifiedApi] ❌ Erreur suppression dossier:', error);
      throw error;
    }
  }

  /**
   * Déplacer une note avec mise à jour directe de Zustand + polling côté client
   */
  async moveNote(noteId: string, targetFolderId: string | null, userId: string) {
    if (process.env.NODE_ENV === 'development') {
      logger.dev('[V2UnifiedApi] 📦 Déplacement note unifié V2');
    }
    const startTime = Date.now();
    
    try {
      // 🚀 Appel vers l'endpoint API V2
      const headers = await this.getAuthHeaders();
      const response = await fetch(`/api/v2/note/${noteId}/move`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ folder_id: targetFolderId }) // 🔧 CORRECTION: Utiliser folder_id au lieu de target_folder_id
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur déplacement note: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      const apiTime = Date.now() - startTime;
      if (process.env.NODE_ENV === 'development') {
        logger.dev(`[V2UnifiedApi] ✅ API terminée en ${apiTime}ms`);
      }

      // 🔧 CORRECTION: Récupérer le classeur_id de la note avant de la déplacer
      const store = useFileSystemStore.getState();
      const currentNote = store.notes[noteId];
      const noteClasseurId = currentNote?.classeur_id;
      
      if (process.env.NODE_ENV === 'development') {
        logger.dev(`[V2UnifiedApi] 📝 Note ${noteId} - classeur_id: ${noteClasseurId}, targetFolderId: ${targetFolderId}`);
      }

      // 🚀 Mise à jour directe de Zustand (instantanée)
      store.moveNote(noteId, targetFolderId, noteClasseurId);
      
      // 🚀 Déclencher le polling côté client immédiatement
      
      const totalTime = Date.now() - startTime;
      if (process.env.NODE_ENV === 'development') {
        logger.dev(`[V2UnifiedApi] ✅ Note déplacée dans Zustand  en ${totalTime}ms total`);
      }
      
      return result;
    } catch (error) {
      logger.error('[V2UnifiedApi] ❌ Erreur déplacement note:', error);
      throw error;
    }
  }

  /**
   * Déplacer un dossier avec mise à jour directe de Zustand + polling côté client
   */
  async moveFolder(folderId: string, targetParentId: string | null, userId: string) {
    if (process.env.NODE_ENV === 'development') {
      logger.dev('[V2UnifiedApi] 📦 Déplacement dossier unifié V2');
    }
    const startTime = Date.now();
    
    try {
      // 🚀 Appel vers l'endpoint API V2
      const headers = await this.getAuthHeaders();
      const response = await fetch(`/api/v2/folder/${folderId}/move`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ parent_id: targetParentId }) // 🔧 CORRECTION: Utiliser parent_id au lieu de target_parent_id
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur déplacement dossier: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      const apiTime = Date.now() - startTime;
      if (process.env.NODE_ENV === 'development') {
        logger.dev(`[V2UnifiedApi] ✅ API terminée en ${apiTime}ms`);
      }

      // 🔧 CORRECTION: Récupérer le classeur_id du dossier avant de le déplacer
      const store = useFileSystemStore.getState();
      const currentFolder = store.folders[folderId];
      const folderClasseurId = currentFolder?.classeur_id;
      
      if (process.env.NODE_ENV === 'development') {
        logger.dev(`[V2UnifiedApi] 📁 Dossier ${folderId} - classeur_id: ${folderClasseurId}, targetParentId: ${targetParentId}`);
      }

      // 🚀 Mise à jour directe de Zustand (instantanée)
      store.moveFolder(folderId, targetParentId, folderClasseurId);
      
      // 🚀 Déclencher le polling côté client immédiatement
      
      const totalTime = Date.now() - startTime;
      if (process.env.NODE_ENV === 'development') {
        logger.dev(`[V2UnifiedApi] ✅ Dossier déplacé dans Zustand  en ${totalTime}ms total`);
      }
      
      return result;
    } catch (error) {
      logger.error('[V2UnifiedApi] ❌ Erreur déplacement dossier:', error);
      throw error;
    }
  }

  /**
   * Créer un classeur avec mise à jour optimiste 
   */
  async createClasseur(classeurData: CreateClasseurData, userId: string) {
    if (process.env.NODE_ENV === 'development') {
      logger.dev('[V2UnifiedApi] 📚 Création classeur unifié V2 avec optimisme');
    }
    const startTime = Date.now();
    
    try {
      // 🚀 1. Mise à jour optimiste immédiate
      const tempId = `temp_classeur_${Date.now()}`;
      const optimisticClasseur: Classeur = {
        id: tempId,
        name: classeurData.name,
        description: classeurData.description,
        icon: classeurData.icon || '📁',
        position: 0,
        created_at: new Date().toISOString(),
        _optimistic: true
      };

      const store = useFileSystemStore.getState();
      store.addClasseurOptimistic(optimisticClasseur);

      if (process.env.NODE_ENV === 'development') {
        logger.dev(`[V2UnifiedApi] 🚀 Classeur optimiste ajouté avec ID temporaire: ${tempId}`);
      }

      // 🚀 2. Appel vers l'endpoint API V2
      const headers = await this.getAuthHeaders();
      const response = await fetch('/api/v2/classeur/create', {
        method: 'POST',
        headers,
        body: JSON.stringify(classeurData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        // ❌ En cas d'erreur, annuler l'optimiste
        store.removeClasseurOptimistic(tempId);
        throw new Error(`Erreur création classeur: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      const apiTime = Date.now() - startTime;

      // 🚀 3. Remplacer l'optimiste par le vrai classeur
      store.updateClasseurOptimistic(tempId, result.classeur);

      if (process.env.NODE_ENV === 'development') {
        logger.dev(`[V2UnifiedApi] ✅ API terminée en ${apiTime}ms, classeur optimiste remplacé`);
      }
      
      // 🚀 4. Déclencher le polling intelligent immédiatement
      
      const totalTime = Date.now() - startTime;
      if (process.env.NODE_ENV === 'development') {
        logger.dev(`[V2UnifiedApi] ✅ Classeur créé avec optimisme  en ${totalTime}ms total`);
      }
      
      return result;
    } catch (error) {
      logger.error('[V2UnifiedApi] ❌ Erreur création classeur:', error);
      throw error;
    }
  }

  /**
   * Mettre à jour un classeur avec mise à jour directe de Zustand + polling côté client
   */
  async updateClasseur(classeurId: string, updateData: UpdateClasseurData, userId: string) {
    if (process.env.NODE_ENV === 'development') {
      logger.dev('[V2UnifiedApi] 🔄 Mise à jour classeur unifié V2');
    }
    const startTime = Date.now();
    
    try {
      // 🚀 Appel vers l'endpoint API V2
      const headers = await this.getAuthHeaders();
      const response = await fetch(`/api/v2/classeur/${classeurId}/update`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur mise à jour classeur: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      const apiTime = Date.now() - startTime;
      if (process.env.NODE_ENV === 'development') {
        logger.dev(`[V2UnifiedApi] ✅ API terminée en ${apiTime}ms`);
      }

      // 🚀 Mise à jour directe de Zustand (instantanée)
      const store = useFileSystemStore.getState();
      store.updateClasseur(classeurId, result.classeur);
      
      // 🚀 Déclencher le polling côté client immédiatement
      
      const totalTime = Date.now() - startTime;
      if (process.env.NODE_ENV === 'development') {
        logger.dev(`[V2UnifiedApi] ✅ Classeur mis à jour dans Zustand  en ${totalTime}ms total`);
      }
      
      return result;
    } catch (error) {
      logger.error('[V2UnifiedApi] ❌ Erreur mise à jour classeur:', error);
      throw error;
    }
  }

  /**
   * Supprimer un classeur avec mise à jour directe de Zustand + polling côté client
   */
  async deleteClasseur(classeurId: string, userId: string) {
    if (process.env.NODE_ENV === 'development') {
      logger.dev('[V2UnifiedApi] 🗑️ Suppression classeur unifié V2');
    }
    const startTime = Date.now();
    
    try {
      // 🚀 Appel vers l'endpoint API V2
      const headers = await this.getAuthHeaders();
      const response = await fetch(`/api/v2/classeur/${classeurId}/delete`, {
        method: 'DELETE',
        headers
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur suppression classeur: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const apiTime = Date.now() - startTime;
      if (process.env.NODE_ENV === 'development') {
        logger.dev(`[V2UnifiedApi] ✅ API terminée en ${apiTime}ms`);
      }

      // 🚀 Mise à jour directe de Zustand (instantanée)
      const store = useFileSystemStore.getState();
      store.removeClasseur(classeurId);
      
      // 🚀 Déclencher le polling côté client immédiatement
      
      const totalTime = Date.now() - startTime;
      if (process.env.NODE_ENV === 'development') {
        logger.dev(`[V2UnifiedApi] ✅ Classeur supprimé de Zustand  en ${totalTime}ms total`);
      }
      
      return { success: true };
    } catch (error) {
      logger.error('[V2UnifiedApi] ❌ Erreur suppression classeur:', error);
      throw error;
    }
  }

  /**
   * Ajouter du contenu à une note
   */
  async addContentToNote(ref: string, content: string, userId: string) {
    if (process.env.NODE_ENV === 'development') {
      logger.dev('[V2UnifiedApi] ➕ Ajout contenu note unifié V2');
    }
    
    try {
      // 🚀 Appel vers l'endpoint API V2
      const headers = await this.getAuthHeaders();
      const response = await fetch(`/api/v2/note/${ref}/add-content`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ content })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur ajout contenu note: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      
      // 🚀 Mise à jour directe de Zustand (instantanée)
      const store = useFileSystemStore.getState();
      store.updateNote(ref, { markdown_content: result.note.markdown_content });
      
      // 🚀 Déclencher le polling côté client immédiatement
      
      return result;
    } catch (error) {
      logger.error('[V2UnifiedApi] ❌ Erreur ajout contenu note:', error);
      throw error;
    }
  }

  /**
   * Récupérer le contenu d'une note
   */
  async getNoteContent(ref: string, userId: string) {
    if (process.env.NODE_ENV === 'development') {
      logger.dev('[V2UnifiedApi] 📖 Récupération contenu note unifié V2');
    }
    
    try {
      // 🚀 Appel vers l'endpoint API V2
      const headers = await this.getAuthHeaders();
      const response = await fetch(`/api/v2/note/${ref}/content`, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur récupération contenu note: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      logger.error('[V2UnifiedApi] ❌ Erreur récupération contenu note:', error);
      throw error;
    }
  }

  /**
   * Récupérer l'arbre d'un classeur
   */
  async getClasseurTree(classeurId: string, userId: string) {
    if (process.env.NODE_ENV === 'development') {
      logger.dev('[V2UnifiedApi] 🌳 Récupération arbre classeur unifié V2');
      logger.dev(`[V2UnifiedApi] 📋 Paramètres: classeurId=${classeurId}, userId=${userId}`);
    }
    
    try {
      // 🚀 Appel vers l'endpoint API V2
      const headers = await this.getAuthHeaders();
      const url = `/api/v2/classeur/${classeurId}/tree`;
      
      if (process.env.NODE_ENV === 'development') {
        logger.dev(`[V2UnifiedApi] 🌐 Appel API: ${url}`);
        logger.dev(`[V2UnifiedApi] 🔑 Headers:`, headers);
      }
      
      const response = await fetch(url, {
        method: 'GET',
        headers
      });

      if (process.env.NODE_ENV === 'development') {
        logger.dev(`[V2UnifiedApi] 📡 Réponse API: ${response.status} ${response.statusText}`);
      }

      if (!response.ok) {
        const errorText = await response.text();
        if (process.env.NODE_ENV === 'development') {
          logger.dev(`[V2UnifiedApi] ❌ Erreur API: ${errorText}`);
        }
        throw new Error(`Erreur récupération arbre classeur: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      
      if (process.env.NODE_ENV === 'development') {
        logger.dev(`[V2UnifiedApi] ✅ Réponse API reçue:`, result);
      }
      
      return result;
    } catch (error) {
      logger.error('[V2UnifiedApi] ❌ Erreur récupération arbre classeur:', error);
      throw error;
    }
  }

  /**
   * Récupérer la liste des classeurs
   */
  async getClasseurs(userId: string) {
    if (process.env.NODE_ENV === 'development') {
      logger.dev('[V2UnifiedApi] 📚 Récupération classeurs unifié V2');
    }
    
    try {
      // 🚀 Appel vers l'endpoint API V2
      const headers = await this.getAuthHeaders();
      const response = await fetch('/api/v2/classeurs', {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur récupération classeurs: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      logger.error('[V2UnifiedApi] ❌ Erreur récupération classeurs:', error);
      throw error;
    }
  }

  /**
   * Réorganiser les classeurs
   */
  async reorderClasseurs(classeurs: Array<{ id: string; position: number }>, userId: string) {
    if (process.env.NODE_ENV === 'development') {
      logger.dev('[V2UnifiedApi] 🔄 Réorganisation classeurs unifié V2');
    }
    
    try {
      // 🚀 Appel vers l'endpoint API V2
      const headers = await this.getAuthHeaders();
      const response = await fetch('/api/v2/classeur/reorder', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ classeurs })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur réorganisation classeurs: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      
      // 🚀 Mise à jour directe de Zustand (instantanée)
      const store = useFileSystemStore.getState();
      result.classeurs.forEach(classeur => {
        store.updateClasseur(classeur.id, classeur);
      });
      
      // 🚀 Déclencher le polling côté client immédiatement
      
      return result;
    } catch (error) {
      logger.error('[V2UnifiedApi] ❌ Erreur réorganisation classeurs:', error);
      throw error;
    }
  }

  /**
   * Charger les classeurs avec leur contenu (remplace loadClasseursWithContent de V1)
   */
  async loadClasseursWithContent(userId: string) {
    if (process.env.NODE_ENV === 'development') {
      logger.dev('[V2UnifiedApi] 📚 Chargement classeurs avec contenu unifié V2');
    }
    
    try {
      // 🚀 Récupérer les classeurs
      const classeursResult = await this.getClasseurs(userId);
      
      if (process.env.NODE_ENV === 'development') {
        logger.dev(`[V2UnifiedApi] 📊 ${classeursResult.classeurs?.length || 0} classeurs récupérés`);
      }
      
      // 🚀 Mettre à jour le store Zustand avec les classeurs
      const store = useFileSystemStore.getState();
      store.setClasseurs(classeursResult.classeurs || []);
      
      // 🚀 Si aucun classeur, retourner immédiatement
      if (!classeursResult.classeurs || classeursResult.classeurs.length === 0) {
        if (process.env.NODE_ENV === 'development') {
          logger.dev('[V2UnifiedApi] ℹ️ Aucun classeur trouvé, pas de contenu à charger');
        }
        return { success: true, classeurs: [] };
      }
      
      // 🚀 Accumuler tous les dossiers et notes de tous les classeurs
      const allDossiers: any[] = [];
      const allNotes: any[] = [];
      
      // 🚀 Pour chaque classeur, récupérer l'arbre complet
      for (const classeur of classeursResult.classeurs) {
        try {
          if (process.env.NODE_ENV === 'development') {
            logger.dev(`[V2UnifiedApi] 🌳 Chargement arbre classeur: ${classeur.id} (${classeur.name})`);
          }
          
          // 🚀 Utiliser l'ID du classeur pour l'endpoint tree
          const treeResult = await this.getClasseurTree(classeur.id, userId);
          
          // 🚀 Accumuler les dossiers et notes de ce classeur
          if (treeResult.success && treeResult.tree) {
            // 🚀 L'endpoint retourne { tree: { classeur, folders, notes } }
            const dossiers = treeResult.tree.folders || [];
            const notes = treeResult.tree.notes || [];
            
            if (process.env.NODE_ENV === 'development') {
              logger.dev(`[V2UnifiedApi] 📁 ${dossiers.length} dossiers et ${notes.length} notes trouvés pour ${classeur.name}`);
            }
            
            // 🚀 Ajouter les dossiers et notes à nos collections accumulées
            allDossiers.push(...dossiers);
            allNotes.push(...notes);
          }
        } catch (treeError) {
          logger.warn(`[V2UnifiedApi] ⚠️ Erreur chargement arbre classeur ${classeur.id} (${classeur.name}):`, treeError);
          // Continuer avec les autres classeurs même si un échoue
        }
      }
      
      // 🚀 Maintenant mettre à jour le store avec TOUT le contenu accumulé
      if (process.env.NODE_ENV === 'development') {
        logger.dev(`[V2UnifiedApi] 📊 Mise à jour store avec ${allDossiers.length} dossiers et ${allNotes.length} notes au total`);
      }
      
      store.setFolders(allDossiers);
      store.setNotes(allNotes);
      
      if (process.env.NODE_ENV === 'development') {
        logger.dev('[V2UnifiedApi] ✅ Chargement classeurs avec contenu terminé');
      }
      
      return { success: true, classeurs: classeursResult.classeurs };
    } catch (error) {
      logger.error('[V2UnifiedApi] ❌ Erreur chargement classeurs avec contenu:', error);
      throw error;
    }
  }
}

// Export de l'instance singleton
export const v2UnifiedApi = V2UnifiedApi.getInstance(); 