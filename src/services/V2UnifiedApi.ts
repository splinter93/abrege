import { useFileSystemStore } from '@/store/useFileSystemStore';

import { simpleLogger as logger } from '@/utils/logger';
import type { Folder, Note, Classeur } from '@/store/useFileSystemStore';
import { triggerUnifiedRealtimePolling } from './unifiedRealtimeService';


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
  header_image_overlay?: string; // 🔧 CORRECTION: Changer de number à string pour correspondre au type Note
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
  emoji?: string; // Ajouter le support pour emoji pour la compatibilité
}

export interface UpdateClasseurData {
  name?: string;
  description?: string;
  icon?: string;
  emoji?: string; // Ajouter le support pour emoji pour la compatibilité
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
  private baseUrl: string;

  private constructor() {
    // 🔧 CORRECTION : Construire l'URL de base pour les appels fetch
    if (typeof window !== 'undefined') {
      // Côté client : utiliser l'origin de la page
      this.baseUrl = window.location.origin;
    } else {
      // Côté serveur : utiliser les variables d'environnement ou un fallback
      if (process.env.NEXT_PUBLIC_APP_URL) {
        this.baseUrl = process.env.NEXT_PUBLIC_APP_URL;
      } else if (process.env.VERCEL_URL) {
        this.baseUrl = `https://${process.env.VERCEL_URL}`;
      } else {
        this.baseUrl = 'http://localhost:3000'; // Fallback pour le développement local
      }
    }
    
    console.log('🔧 [V2UnifiedApi] Base URL configurée:', {
      baseUrl: this.baseUrl,
      isClient: typeof window !== 'undefined',
      env: {
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
        VERCEL_URL: process.env.VERCEL_URL,
        NODE_ENV: process.env.NODE_ENV
      }
    });
  }

  static getInstance(): V2UnifiedApi {
    if (!V2UnifiedApi.instance) {
      V2UnifiedApi.instance = new V2UnifiedApi();
    }
    return V2UnifiedApi.instance;
  }

  /**
   * Construire une URL absolue à partir d'un chemin relatif
   * @param path Le chemin relatif (ex: /api/v2/note/create)
   * @returns L'URL absolue
   */
  private buildUrl(path: string): string {
    const fullUrl = `${this.baseUrl}${path}`;
    console.log('🔗 [V2UnifiedApi] buildUrl:', { path, baseUrl: this.baseUrl, fullUrl });
    return fullUrl;
  }

  /**
   * Nettoyer et valider un ID (remplacer les tirets longs par des tirets courts)
   * @param id L'ID à nettoyer et valider
   * @param resourceType Le type de ressource (pour les messages d'erreur)
   * @returns L'ID nettoyé
   */
  private cleanAndValidateId(id: string, resourceType: string): string {
    // ✅ 1. Nettoyer l'ID (remplacer les tirets longs par des tirets courts)
    const cleanId = id.replace(/‑/g, '-'); // Remplace les em-dash (‑) par des hyphens (-)
    
    // ✅ 2. Valider que c'est un UUID valide
    if (!this.isUUID(cleanId)) {
      throw new Error(`ID de ${resourceType} invalide: ${id}`);
    }
    
    return cleanId;
  }

  /**
   * Vérifie si un ID est un UUID valide.
   * @param id L'ID à vérifier.
   * @returns true si c'est un UUID, false sinon.
   */
  private isUUID(id: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  }

  /**
   * Récupère les headers d'authentification
   */
  private async getAuthHeaders(): Promise<HeadersInit> {
    try {
      console.log('🔐 [V2UnifiedApi] Début récupération headers...');
      
      const { supabase } = await import('@/supabaseClient');
      console.log('✅ [V2UnifiedApi] Supabase importé');
      
      const { data: { session } } = await supabase.auth.getSession();
      console.log('📋 [V2UnifiedApi] Session récupérée:', {
        hasSession: !!session,
        hasAccessToken: !!session?.access_token,
        tokenLength: session?.access_token?.length || 0,
        tokenStart: session?.access_token ? session.access_token.substring(0, 20) + '...' : 'N/A'
      });
      
      const headers: HeadersInit = { 
        'Content-Type': 'application/json',
        'X-Client-Type': 'v2_unified_api'
      };
      
      // Ajouter le token d'authentification si disponible
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
        console.log('✅ [V2UnifiedApi] Token ajouté aux headers');
      } else {
        console.warn('⚠️ [V2UnifiedApi] Pas de token disponible - authentification échouera probablement');
      }
      
      console.log('🔐 [V2UnifiedApi] Headers finaux:', {
        hasContentType: !!headers['Content-Type'],
        hasClientType: !!headers['X-Client-Type'],
        hasAuth: !!headers['Authorization'],
        authHeader: headers['Authorization'] ? 'Bearer ***' : 'ABSENT'
      });
      
      return headers;
      
    } catch (error) {
      console.error('❌ [V2UnifiedApi] Erreur récupération headers:', {
        error,
        message: error instanceof Error ? error.message : 'Erreur inconnue',
        stack: error instanceof Error ? error.stack : 'Pas de stack trace'
      });
      
      // En cas d'erreur, retourner les headers de base
      const fallbackHeaders = { 
        'Content-Type': 'application/json',
        'X-Client-Type': 'v2_unified_api'
      };
      
      console.log('🔄 [V2UnifiedApi] Utilisation headers de fallback:', fallbackHeaders);
      return fallbackHeaders;
    }
  }

  /**
   * Créer une note
   */
  async createNote(noteData: CreateNoteData) {
    const startTime = Date.now();
    
    try {
      // 🚀 Appel vers l'endpoint API V2
      const headers = await this.getAuthHeaders();
      const response = await fetch(this.buildUrl('/api/v2/note/create'), {
        method: 'POST',
        headers,
        body: JSON.stringify(noteData)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Erreur lors de la création de la note');
      }

      // 🚀 Déclencher le polling intelligent pour synchronisation
      await triggerUnifiedRealtimePolling('notes', 'CREATE');

      const duration = Date.now() - startTime;
      return {
        success: true,
        note: result.note,
        duration
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
        duration
      };
    }
  }

  /**
   * Mettre à jour une note avec mise à jour optimiste
   */
  async updateNote(noteId: string, updateData: UpdateNoteData, _userId?: string) {
    const startTime = Date.now();
    
    try {
      // ✅ 1. Nettoyer et valider l'ID
      const cleanNoteId = this.cleanAndValidateId(noteId, 'note');
      
      // 🚀 2. Mise à jour optimiste immédiate
      const store = useFileSystemStore.getState();
      const currentNote = store.notes[cleanNoteId];
      
      if (!currentNote) {
        throw new Error('Note non trouvée');
      }

      // 🔧 CORRECTION: Nettoyer les données avant mise à jour
      const sanitizedUpdateData = {
        ...updateData,
        header_image: updateData.header_image === null ? undefined : updateData.header_image,
        // S'assurer que header_image_overlay est une string
        header_image_overlay: updateData.header_image_overlay !== undefined ? String(updateData.header_image_overlay) : undefined
      };
      
      const updatedNote = { ...currentNote, ...sanitizedUpdateData, updated_at: new Date().toISOString() };
      store.updateNote(cleanNoteId, updatedNote);

      // 🚀 4. Appel vers l'endpoint API V2
      const headers = await this.getAuthHeaders();
      const response = await fetch(this.buildUrl(`/api/v2/note/${cleanNoteId}/update`), {
        method: 'PUT',
        headers,
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Erreur lors de la mise à jour de la note');
      }

      // 🚀 3. Déclencher le polling intelligent immédiatement
      await triggerUnifiedRealtimePolling('notes', 'UPDATE');

      const duration = Date.now() - startTime;
      return {
        success: true,
        note: result.note,
        duration
      };

    } catch (error) {
      // En cas d'erreur, restaurer l'état précédent
      const store = useFileSystemStore.getState();
      const currentNote = store.notes[noteId];
      if (currentNote) {
        store.updateNote(noteId, currentNote);
      }

      const duration = Date.now() - startTime;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
        duration
      };
    }
  }

  /**
   * Supprimer une note
   */
  async deleteNote(noteId: string, externalToken?: string) {
    const startTime = Date.now();

    console.log('🚀 [V2UnifiedApi] Début suppression note:', { noteId, hasExternalToken: !!externalToken });

    try {
      // ✅ 1. Nettoyer et valider l'ID (supporte UUID ET slug)
      console.log('🧹 [V2UnifiedApi] Nettoyage et validation ID...');

      let cleanNoteId = noteId;

      // 🔧 CORRECTION : Nettoyer le ref (enlever les slashes au début/fin)
      cleanNoteId = cleanNoteId.replace(/^\/+|\/+$/g, '');
      console.log('🧹 [V2UnifiedApi] Ref nettoyé:', { original: noteId, cleaned: cleanNoteId });

      // Si c'est un UUID, le nettoyer et valider
      if (this.isUUID(cleanNoteId)) {
        cleanNoteId = this.cleanAndValidateId(cleanNoteId, 'note');
        console.log('✅ [V2UnifiedApi] UUID nettoyé et validé:', { original: noteId, cleaned: cleanNoteId });
      } else {
        // Si c'est un slug, l'utiliser tel quel
        console.log('✅ [V2UnifiedApi] Slug détecté, utilisation directe:', cleanNoteId);
      }

      // ✅ 2. Appel vers l'endpoint API V2 DIRECT (pas de modification du store)
      console.log('📡 [V2UnifiedApi] Appel endpoint DELETE...');
      
      let headers: HeadersInit;
      if (externalToken) {
        // 🔧 CORRECTION : Utiliser le token externe fourni
        console.log('🔐 [V2UnifiedApi] Utilisation token externe');
        headers = {
          'Content-Type': 'application/json',
          'X-Client-Type': 'v2_unified_api',
          'Authorization': `Bearer ${externalToken}`
        };
      } else {
        // Fallback vers getAuthHeaders si pas de token externe
        console.log('🔐 [V2UnifiedApi] Fallback vers getAuthHeaders');
        headers = await this.getAuthHeaders();
      }
      
      console.log('🔐 [V2UnifiedApi] Headers préparés:', {
        hasContentType: !!headers['Content-Type'],
        hasAuth: !!headers['Authorization'],
        hasClientType: !!headers['X-Client-Type']
      });
      
      const deleteUrl = this.buildUrl(`/api/v2/note/${cleanNoteId}/delete`);
      console.log('🔗 [V2UnifiedApi] URL construite:', deleteUrl);
      
      const response = await fetch(deleteUrl, {
        method: 'DELETE',
        headers
      });

      console.log('📥 [V2UnifiedApi] Réponse reçue:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [V2UnifiedApi] Erreur HTTP:', {
          status: response.status,
          statusText: response.statusText,
          errorText,
          containsFailedToParse: errorText.includes('Failed to parse'),
          containsURL: errorText.includes('URL')
        });
        
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ [V2UnifiedApi] Réponse JSON:', result);

      if (!result.success) {
        throw new Error(result.error || 'Erreur lors de la suppression de la note');
      }

      // ✅ 2. Pas de polling manuel (le realtime naturel s'en charge)
      // ✅ 3. Pas de restauration complexe (pas de modification du store)

      const duration = Date.now() - startTime;
      console.log('✅ [V2UnifiedApi] Suppression réussie en', duration, 'ms');
      
      return {
        success: true,
        duration
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error('💥 [V2UnifiedApi] Erreur complète:', {
        error,
        message: error instanceof Error ? error.message : 'Erreur inconnue',
        stack: error instanceof Error ? error.stack : 'Pas de stack trace',
        noteId,
        duration
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
        duration
      };
    }
  }

  /**
   * Créer un dossier
   */
  async createFolder(folderData: CreateFolderData) {
    const startTime = Date.now();
    
    try {
      // 🚀 Appel vers l'endpoint API V2
      const headers = await this.getAuthHeaders();
      const response = await fetch(this.buildUrl('/api/v2/folder/create'), {
        method: 'POST',
        headers,
        body: JSON.stringify(folderData)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Erreur lors de la création du dossier');
      }

      // 🚀 Déclencher le polling intelligent pour synchronisation
      await triggerUnifiedRealtimePolling('folders', 'CREATE');

      const duration = Date.now() - startTime;
      return {
        success: true,
        folder: result.folder,
        duration
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
        duration
      };
    }
  }

  /**
   * Mettre à jour un dossier avec mise à jour directe de Zustand + polling côté client
   */
  async updateFolder(folderId: string, updateData: UpdateFolderData) {
    if (process.env.NODE_ENV === 'development') {
      logger.dev('[V2UnifiedApi] 🔄 Mise à jour dossier unifié V2');
    }
    const startTime = Date.now();
    
    try {
      // ✅ 1. Nettoyer et valider l'ID
      const cleanFolderId = this.cleanAndValidateId(folderId, 'folder');
      
      // 🚀 2. Appel vers l'endpoint API V2
      const headers = await this.getAuthHeaders();
      const response = await fetch(this.buildUrl(`/api/v2/folder/${cleanFolderId}/update`), {
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
      store.updateFolder(cleanFolderId, result.folder);
      
      // 🚀 Déclencher le polling intelligent immédiatement
      await triggerUnifiedRealtimePolling('folders', 'UPDATE');
      
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
   * Supprimer un dossier (version simplifiée)
   */
  async deleteFolder(folderId: string) {
    if (process.env.NODE_ENV === 'development') {
      logger.dev('[V2UnifiedApi] 🗑️ Suppression dossier unifié V2');
    }
    const startTime = Date.now();
    
    try {
      // ✅ 1. Nettoyer et valider l'ID
      const cleanFolderId = this.cleanAndValidateId(folderId, 'folder');
      
      // ✅ 2. Appel vers l'endpoint API V2 DIRECT (pas de modification du store)
      const headers = await this.getAuthHeaders();
      const response = await fetch(this.buildUrl(`/api/v2/folder/${cleanFolderId}/delete`), {
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

      // ✅ 2. Pas de modification du store (le realtime naturel s'en charge)
      // ✅ 3. Pas de polling manuel (le realtime naturel s'en charge)
      
      const totalTime = Date.now() - startTime;
      if (process.env.NODE_ENV === 'development') {
        logger.dev(`[V2UnifiedApi] ✅ Dossier supprimé en ${totalTime}ms total`);
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
  async moveNote(noteId: string, targetFolderId: string | null) {
    if (process.env.NODE_ENV === 'development') {
      logger.dev('[V2UnifiedApi] 📦 Déplacement note unifié V2');
    }
    const startTime = Date.now();
    
    try {
      // ✅ 1. Nettoyer et valider l'ID
      const cleanNoteId = this.cleanAndValidateId(noteId, 'note');
      
      // 🚀 2. Appel vers l'endpoint API V2
      const headers = await this.getAuthHeaders();
      const response = await fetch(this.buildUrl(`/api/v2/note/${cleanNoteId}/move`), {
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
      const currentNote = store.notes[cleanNoteId];
      const noteClasseurId = currentNote?.classeur_id;
      
      if (process.env.NODE_ENV === 'development') {
        logger.dev(`[V2UnifiedApi] 📝 Note ${cleanNoteId} - classeur_id: ${noteClasseurId}, targetFolderId: ${targetFolderId}`);
      }

      // 🚀 Mise à jour directe de Zustand (instantanée)
      store.moveNote(cleanNoteId, targetFolderId, noteClasseurId);
      
      // 🚀 5. Déclencher le polling intelligent immédiatement
      await triggerUnifiedRealtimePolling('notes', 'UPDATE');
      
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
  async moveFolder(folderId: string, targetParentId: string | null) {
    if (process.env.NODE_ENV === 'development') {
      logger.dev('[V2UnifiedApi] 📦 Déplacement dossier unifié V2');
    }
    const startTime = Date.now();
    
    try {
      // ✅ 1. Nettoyer et valider l'ID
      const cleanFolderId = this.cleanAndValidateId(folderId, 'folder');
      
      // 🚀 2. Appel vers l'endpoint API V2
      const headers = await this.getAuthHeaders();
      const response = await fetch(this.buildUrl(`/api/v2/folder/${cleanFolderId}/move`), {
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
      const currentFolder = store.folders[cleanFolderId];
      const folderClasseurId = currentFolder?.classeur_id;
      
      if (process.env.NODE_ENV === 'development') {
        logger.dev(`[V2UnifiedApi] 📁 Dossier ${cleanFolderId} - classeur_id: ${folderClasseurId}, targetParentId: ${targetParentId}`);
      }

      // 🚀 Mise à jour directe de Zustand (instantanée)
      store.moveFolder(cleanFolderId, targetParentId, folderClasseurId);
      
      // 🚀 Déclencher le polling intelligent immédiatement
      await triggerUnifiedRealtimePolling('folders', 'UPDATE');
      
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
   * Créer un classeur
   */
  async createClasseur(classeurData: CreateClasseurData) {
    const startTime = Date.now();
    
    try {
      // 🚀 Appel vers l'endpoint API V2
      const headers = await this.getAuthHeaders();
      const response = await fetch(this.buildUrl('/api/v2/classeur/create'), {
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

      // 🚀 Déclencher le polling intelligent pour synchronisation
      await triggerUnifiedRealtimePolling('classeurs', 'CREATE');

      const duration = Date.now() - startTime;
      return {
        success: true,
        classeur: result.classeur,
        duration
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
        duration
      };
    }
  }

  /**
   * Mettre à jour un classeur avec mise à jour directe de Zustand + polling côté client
   */
  async updateClasseur(classeurId: string, updateData: UpdateClasseurData) {
    if (process.env.NODE_ENV === 'development') {
      logger.dev('[V2UnifiedApi] 🔄 Mise à jour classeur unifié V2');
    }
    const startTime = Date.now();
    
    try {
      // ✅ 1. Nettoyer et valider l'ID
      const cleanClasseurId = this.cleanAndValidateId(classeurId, 'classeur');
      
      // 🔧 CORRECTION: Mapper emoji vers icon si nécessaire
      const mappedData = {
        ...updateData,
        icon: updateData.icon || updateData.emoji
      };

      // 🚀 2. Appel vers l'endpoint API V2
      const headers = await this.getAuthHeaders();
      const response = await fetch(this.buildUrl(`/api/v2/classeur/${cleanClasseurId}/update`), {
        method: 'PUT',
        headers,
        body: JSON.stringify(mappedData)
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
      store.updateClasseur(cleanClasseurId, result.classeur);
      
      // 🚀 4. Déclencher le polling intelligent immédiatement
      await triggerUnifiedRealtimePolling('classeurs', 'UPDATE');

      const duration = Date.now() - startTime;
      return {
        success: true,
        classeur: result.classeur,
        duration
      };
    } catch (error) {
      logger.error('[V2UnifiedApi] ❌ Erreur mise à jour classeur:', error);
      throw error;
    }
  }

  /**
   * Supprimer un classeur (version simplifiée)
   */
  async deleteClasseur(classeurId: string) {
    if (process.env.NODE_ENV === 'development') {
      logger.dev('[V2UnifiedApi] 🗑️ Suppression classeur unifié V2');
    }
    const startTime = Date.now();
    
    try {
      // ✅ 1. Nettoyer et valider l'ID
      const cleanClasseurId = this.cleanAndValidateId(classeurId, 'classeur');
      
      // ✅ 2. Appel vers l'endpoint API V2 DIRECT (pas de modification du store)
      const headers = await this.getAuthHeaders();
      const response = await fetch(this.buildUrl(`/api/v2/classeur/${cleanClasseurId}/delete`), {
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

      // ✅ 2. Pas de modification du store (le realtime naturel s'en charge)
      // ✅ 3. Pas de polling manuel (le realtime naturel s'en charge)
      
      const totalTime = Date.now() - startTime;
      if (process.env.NODE_ENV === 'development') {
        logger.dev(`[V2UnifiedApi] ✅ Classeur supprimé en ${totalTime}ms total`);
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
  async addContentToNote(ref: string, content: string) {
    if (process.env.NODE_ENV === 'development') {
      logger.dev('[V2UnifiedApi] ➕ Ajout contenu note unifié V2');
    }
    
    try {
      // ✅ 1. Nettoyer et valider l'ID
      const cleanRef = this.cleanAndValidateId(ref, 'note');
      
      // 🚀 2. Appel vers l'endpoint API V2
      const headers = await this.getAuthHeaders();
      const response = await fetch(this.buildUrl(`/api/v2/note/${cleanRef}/add-content`), {
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
      store.updateNote(cleanRef, { markdown_content: result.note.markdown_content });
      
      // 🚀 Déclencher le polling intelligent immédiatement
      await triggerUnifiedRealtimePolling('notes', 'UPDATE');
      
      return result;
    } catch (error) {
      logger.error('[V2UnifiedApi] ❌ Erreur ajout contenu note:', error);
      throw error;
    }
  }

  /**
   * Récupérer le contenu d'une note
   */
  async getNoteContent(ref: string) {
    if (process.env.NODE_ENV === 'development') {
      logger.dev('[V2UnifiedApi] 📖 Récupération contenu note unifié V2');
    }
    
    try {
      // ✅ 1. Nettoyer et valider l'ID
      const cleanRef = this.cleanAndValidateId(ref, 'note');
      
      // 🚀 2. Appel vers l'endpoint API V2
      const headers = await this.getAuthHeaders();
      const response = await fetch(this.buildUrl(`/api/v2/note/${cleanRef}/content`), {
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
  async getClasseurTree(classeurId: string) {
    if (process.env.NODE_ENV === 'development') {
      logger.dev('[V2UnifiedApi] 🌳 Récupération arbre classeur unifié V2');
      logger.dev(`[V2UnifiedApi] 📋 Paramètres: classeurId=${classeurId}`);
    }
    
    try {
      // ✅ 1. Nettoyer et valider l'ID
      const cleanClasseurId = this.cleanAndValidateId(classeurId, 'classeur');
      
      // 🚀 2. Appel vers l'endpoint API V2
      const headers = await this.getAuthHeaders();
      const url = `/api/v2/classeur/${cleanClasseurId}/tree`;
      
      if (process.env.NODE_ENV === 'development') {
        logger.dev(`[V2UnifiedApi] 🌐 Appel API: ${url}`);
        logger.dev(`[V2UnifiedApi] 🔑 Headers:`, headers);
      }
      
      const response = await fetch(this.buildUrl(url), {
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
  async getClasseurs() {
    if (process.env.NODE_ENV === 'development') {
      logger.dev('[V2UnifiedApi] 📚 Récupération classeurs unifié V2');
    }
    
    try {
      // 🚀 Appel vers l'endpoint API V2
      const headers = await this.getAuthHeaders();
      const response = await fetch(this.buildUrl('/api/v2/classeurs'), {
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
  async reorderClasseurs(classeurs: Array<{ id: string; position: number }>) {
    if (process.env.NODE_ENV === 'development') {
      logger.dev('[V2UnifiedApi] 🔄 Réorganisation classeurs unifié V2');
    }
    
    try {
      // 🚀 Appel vers l'endpoint API V2
      const headers = await this.getAuthHeaders();
      const response = await fetch(this.buildUrl('/api/v2/classeur/reorder'), {
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
      await triggerUnifiedRealtimePolling('classeurs', 'UPDATE');
      
      return result;
    } catch (error) {
      logger.error('[V2UnifiedApi] ❌ Erreur réorganisation classeurs:', error);
      throw error;
    }
  }

  /**
   * Charger les classeurs avec leur contenu (remplace loadClasseursWithContent de V1)
   */
  async loadClasseursWithContent() {
    if (process.env.NODE_ENV === 'development') {
      logger.dev('[V2UnifiedApi] 📚 Chargement classeurs avec contenu unifié V2');
    }
    
    try {
      // 🚀 Récupérer les classeurs
      const classeursResult = await this.getClasseurs();
      
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
          const treeResult = await this.getClasseurTree(classeur.id);
          
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