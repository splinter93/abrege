import { useFileSystemStore, type Note, type Classeur, type Folder } from '@/store/useFileSystemStore';

import { simpleLogger as logger } from '@/utils/logger';
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
  header_image_overlay?: number; // Type number pour correspondre au schéma de validation
  header_title_in_image?: boolean;
  wide_mode?: boolean;
  a4_mode?: boolean;
  slash_lang?: 'fr' | 'en';
  font_family?: string;
  folder_id?: string | null;
  description?: string;
  classeur_id?: string | null;
  is_canva_draft?: boolean;
}

export interface CreateFolderData {
  name: string;
  classeur_id: string;
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
    // Construire l'URL de base pour les appels fetch
    if (typeof window !== 'undefined') {
      // Côté client : utiliser l'origin de la page
      this.baseUrl = window.location.origin;
    } else {
      // Côté serveur : utiliser les variables d'environnement ou un fallback
      if (process.env.VERCEL_URL) {
        this.baseUrl = `https://${process.env.VERCEL_URL}`;
      } else {
        this.baseUrl = 'http://localhost:3000'; // Fallback pour le développement local
      }
    }
    
    if (process.env.NODE_ENV === 'development') {
      logger.dev(`[V2UnifiedApi] Base URL configurée: ${this.baseUrl}`);
    }
  }

  static getInstance(): V2UnifiedApi {
    if (!V2UnifiedApi.instance) {
      V2UnifiedApi.instance = new V2UnifiedApi();
    }
    return V2UnifiedApi.instance;
  }

  /**
   * Construire l'URL complète pour les appels API
   * Gère automatiquement les slashes et la base URL
   */
  private buildUrl(path: string): string {
    // Nettoyer le chemin (enlever les slashes au début/fin)
    const cleanPath = path.replace(/^\/+|\/+$/g, '');
    
    // Construire l'URL complète
    const fullUrl = `${this.baseUrl}/${cleanPath}`;
    
    if (process.env.NODE_ENV === 'development') {
      logger.dev(`[V2UnifiedApi] buildUrl: ${path} -> ${fullUrl}`);
    }
    
    return fullUrl;
  }

  /**
   * Nettoyer et valider un ID ou slug
   * Supprime les slashes au début/fin et valide le format
   */
  private cleanAndValidateId(id: string, type: 'note' | 'folder' | 'classeur'): string {
    // ✅ 1. Nettoyer l'ID (remplacer les tirets longs par des tirets courts)
    const cleanId = id.replace(/‑/g, '-'); // Remplace les em-dash (‑) par des hyphens (-)
    
    // ✅ 2. Valider que c'est un UUID valide
    if (!this.isUUID(cleanId)) {
      throw new Error(`ID de ${type} invalide: ${id}`);
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
   * Récupérer les headers d'authentification pour les appels API
   * Gère automatiquement l'importation de Supabase et la récupération de session
   */
  private async getAuthHeaders(): Promise<HeadersInit> {
    try {
      if (process.env.NODE_ENV === 'development') {
        logger.dev(`[V2UnifiedApi] Début récupération headers...`);
      }
      
      // Importer Supabase dynamiquement (évite les erreurs SSR)
      const { createClient } = await import('@supabase/supabase-js');
      
      if (process.env.NODE_ENV === 'development') {
        logger.dev(`[V2UnifiedApi] Supabase importé`);
      }
      
      // Récupérer la session depuis le localStorage (côté client uniquement)
      if (typeof window !== 'undefined') {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        
        const { data: { session } } = await supabase.auth.getSession();
        
        if (process.env.NODE_ENV === 'development') {
          logger.dev(`[V2UnifiedApi] Session récupérée:`, {
            hasSession: !!session,
            userId: session?.user?.id,
            email: session?.user?.email
          });
        }
        
        if (session?.access_token) {
          // Ajouter le token d'authentification si disponible
          const headers: HeadersInit = {
            'Content-Type': 'application/json',
            'X-Client-Type': 'v2_unified_api',
            'Authorization': `Bearer ${session.access_token}`
          };
          
          if (process.env.NODE_ENV === 'development') {
            logger.dev(`[V2UnifiedApi] Token ajouté aux headers`);
          }
          
          if (process.env.NODE_ENV === 'development') {
            logger.dev(`[V2UnifiedApi] Headers finaux:`, {
              hasContentType: !!headers['Content-Type'],
              hasAuth: !!headers['Authorization'],
              hasClientType: !!headers['X-Client-Type']
            });
          }
          
          return headers;
        } else {
          if (process.env.NODE_ENV === 'development') {
            logger.warn(`[V2UnifiedApi] Pas de token disponible - authentification échouera probablement`);
          }
        }
      }
      
      // En cas d'erreur, retourner les headers de base
      const fallbackHeaders: HeadersInit = {
        'Content-Type': 'application/json',
        'X-Client-Type': 'v2_unified_api'
      };
      
      if (process.env.NODE_ENV === 'development') {
        logger.dev(`[V2UnifiedApi] Utilisation headers de fallback:`, fallbackHeaders);
      }
      
      return fallbackHeaders;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        logger.error(
          `[V2UnifiedApi] Erreur récupération headers`,
          error
        );
      }
      
      // En cas d'erreur, retourner les headers de base
      const fallbackHeaders: HeadersInit = {
        'Content-Type': 'application/json',
        'X-Client-Type': 'v2_unified_api'
      };
      
      if (process.env.NODE_ENV === 'development') {
        logger.dev(`[V2UnifiedApi] Utilisation headers de fallback:`, fallbackHeaders);
      }
      
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

      // 🎯 Déclencher le polling ciblé pour synchronisation
      try {
        const { triggerPollingAfterNoteAction } = await import('@/services/uiActionPolling');
        await triggerPollingAfterNoteAction('note_created');
      } catch (error) {
        console.warn('[V2UnifiedApi] ⚠️ Erreur déclenchement polling ciblé:', error);
      }

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
  async updateNote(noteId: string, updateData: UpdateNoteData) {
    const startTime = Date.now();
    const store = useFileSystemStore.getState();
    let cleanNoteId = noteId;
    let previousNote: Note | null = null;
    let optimisticNote: Note | null = null;
    
    try {
      // ✅ 1. Nettoyer et valider l'ID
      cleanNoteId = this.cleanAndValidateId(noteId, 'note');
      
      // Nettoyer les données avant mise à jour (supprimer les champs undefined)
      const cleanData = Object.fromEntries(
        Object.entries(updateData).filter(([, value]) => value !== undefined)
      );
      
      // 🚀 2. Mise à jour optimiste immédiate
      const currentNote = store.notes[cleanNoteId];
      previousNote = currentNote ? { ...currentNote } : null;
      
      // 🔧 FIX FLICKER: Préserver header_image si non présent dans cleanData
      // pour éviter qu'il devienne undefined temporairement
      const sanitizedUpdateData: Partial<Note> = {
        ...cleanData,
      };
      
      // Si header_image n'est pas dans cleanData, préserver la valeur actuelle
      if (!('header_image' in cleanData) && currentNote?.header_image !== undefined) {
        // Ne pas inclure header_image dans sanitizedUpdateData pour préserver la valeur actuelle
        delete sanitizedUpdateData.header_image;
      } else if (cleanData.header_image === null) {
        // Si explicitement null, convertir en undefined pour la suppression
        sanitizedUpdateData.header_image = undefined;
      }
      
      optimisticNote = {
        ...currentNote,
        ...sanitizedUpdateData,
        updated_at: new Date().toISOString()
      } as Note;
      store.updateNote(cleanNoteId, optimisticNote);

      // 🚀 4. Appel vers l'endpoint API V2
      const headers = await this.getAuthHeaders();
      const response = await fetch(this.buildUrl(`/api/v2/note/${cleanNoteId}/update`), {
        method: 'PUT',
        headers,
        body: JSON.stringify(cleanData)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Erreur lors de la mise à jour de la note');
      }

      // ✅ CRITIQUE: Synchroniser le store avec la réponse serveur (source de vérité)
      // Ceci prévient les problèmes de désynchronisation (ex: share_settings qui reviennent à l'ancien état)
      // 
      // 🔧 FIX FLICKER: Ne pas sync les champs qui n'ont pas changé côté serveur
      // pour éviter les re-renders inutiles (notamment header_image pendant CMD+S)
      if (result.note) {
        logger.dev('[V2UnifiedApi] Synchronisation store avec réponse serveur');
        
        // Filtrer les champs qui ont réellement changé
        const keysToSync = new Set<string>([
          ...Object.keys(cleanData),
          'updated_at'
        ]);

        const changedFields: Partial<typeof result.note> = {};
        for (const key in result.note) {
          if (!keysToSync.has(key)) {
            continue;
          }
          const keyName = key as Extract<keyof typeof result.note, string>;
          const nextValue = result.note[keyName];
          const optimisticValue =
            optimisticNote && typeof optimisticNote === 'object'
              ? (optimisticNote as unknown as Record<string, unknown>)[key]
              : undefined;
          const valuesAreEqual =
            nextValue === optimisticValue ||
            (nextValue === null && optimisticValue === undefined) ||
            (nextValue === undefined && optimisticValue === null);

          if (!valuesAreEqual) {
            changedFields[keyName] = nextValue;
          }
        }
        
        // 🔧 FIX FLICKER: Si header_image n'était pas dans cleanData, préserver la valeur actuelle
        // pour éviter qu'elle devienne undefined lors de la synchronisation
        if (!('header_image' in cleanData) && optimisticNote?.header_image !== undefined) {
          // Ne pas inclure header_image dans changedFields si elle n'a pas été modifiée
          delete changedFields.header_image;
        }
        
        // Ne sync que si des champs ont changé (évite re-render inutile)
        if (Object.keys(changedFields).length > 0) {
          store.updateNote(cleanNoteId, changedFields);
        }
      }

      // 🎯 Le polling ciblé est maintenant géré par le système ciblé

      // 🔧 FIX CACHE: Invalider le cache du service de chargement après sauvegarde
      // Pour éviter que la note réouverte charge une version obsolète du cache
      try {
        const { OptimizedNoteService } = await import('@/services/optimizedNoteService');
        const noteService = OptimizedNoteService.getInstance();
        
        // Récupérer userId depuis la session Supabase (même méthode que getAuthHeaders)
        let userId: string | null = null;
        if (typeof window !== 'undefined') {
          const { createClient } = await import('@supabase/supabase-js');
          const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
          );
          const { data: { session } } = await supabase.auth.getSession();
          userId = session?.user?.id || null;
        }
        
        if (userId) {
          noteService.invalidateNoteCache(cleanNoteId, userId);
          // Aussi invalider par slug si la note en a un
          if (result.note?.slug) {
            noteService.invalidateNoteCache(result.note.slug, userId);
          }
          logger.dev('[V2UnifiedApi] ✅ Cache invalidé après sauvegarde', { noteId: cleanNoteId, userId });
        } else {
          logger.warn('[V2UnifiedApi] ⚠️ Impossible de récupérer userId pour invalidation cache');
        }
      } catch (cacheError) {
        // Non-bloquant : logger mais continuer
        logger.warn('[V2UnifiedApi] ⚠️ Erreur invalidation cache (non-bloquant)', cacheError);
      }

      const duration = Date.now() - startTime;
      return {
        success: true,
        note: result.note,
        duration
      };

    } catch (error) {
      // En cas d'erreur, restaurer l'état précédent
      if (previousNote) {
        store.updateNote(cleanNoteId, previousNote);
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
   * Supprimer une note (version simplifiée)
   */
  async deleteNote(noteId: string, externalToken?: string) {
    if (process.env.NODE_ENV === 'development') {
      logger.dev('[V2UnifiedApi] 🗑️ Suppression note unifié V2');
    }
    const startTime = Date.now();
    
    try {
      // ✅ 1. Nettoyer et valider l'ID
      const cleanNoteId = this.cleanAndValidateId(noteId, 'note');
      
      if (process.env.NODE_ENV === 'development') {
        logger.dev(`[V2UnifiedApi] 🧹 ID nettoyé:`, { original: noteId, cleaned: cleanNoteId });
      }

      // ✅ 2. Appel vers l'endpoint API V2 DIRECT (pas de modification du store)
      if (process.env.NODE_ENV === 'development') {
        logger.dev(`[V2UnifiedApi] 📡 Appel endpoint DELETE...`);
      }
      
      let headers: HeadersInit;
      if (externalToken) {
        // Utiliser le token externe fourni
        if (process.env.NODE_ENV === 'development') {
          logger.dev(`[V2UnifiedApi] 🔐 Utilisation token externe`);
        }
        headers = {
          'Content-Type': 'application/json',
          'X-Client-Type': 'v2_unified_api',
          'Authorization': `Bearer ${externalToken}`
        };
      } else {
        // Fallback vers getAuthHeaders si pas de token externe
        if (process.env.NODE_ENV === 'development') {
          logger.dev(`[V2UnifiedApi] 🔐 Fallback vers getAuthHeaders`);
        }
        headers = await this.getAuthHeaders();
      }
      
      if (process.env.NODE_ENV === 'development') {
        const headersRecord = headers as Record<string, string>;
        logger.dev(`[V2UnifiedApi] 🔐 Headers préparés:`, {
          hasContentType: !!headersRecord['Content-Type'],
          hasAuth: !!headersRecord['Authorization'],
          hasClientType: !!headersRecord['X-Client-Type']
        });
      }
      
              const deleteUrl = this.buildUrl(`/api/v2/delete/note/${cleanNoteId}`);
      if (process.env.NODE_ENV === 'development') {
        logger.dev(`[V2UnifiedApi] 🔗 URL construite:`, deleteUrl);
      }
      
      const response = await fetch(deleteUrl, {
        method: 'DELETE',
        headers
      });

      if (process.env.NODE_ENV === 'development') {
        logger.dev(`[V2UnifiedApi] 📥 Réponse reçue:`, {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok
        });
      }

      if (!response.ok) {
        const errorText = await response.text();
        if (process.env.NODE_ENV === 'development') {
          logger.error(
            `[V2UnifiedApi] ❌ Erreur HTTP lors de la suppression de note`,
            {
              status: response.status,
              statusText: response.statusText,
              errorText,
              containsFailedToParse: errorText.includes('Failed to parse'),
              containsURL: errorText.includes('URL')
            }
          );
        }
        
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (process.env.NODE_ENV === 'development') {
        logger.dev(`[V2UnifiedApi] ✅ Réponse JSON:`, result);
      }

      if (!result.success) {
        throw new Error(result.error || 'Erreur lors de la suppression de la note');
      }

      // ✅ 2. Mettre à jour le store pour retirer l'élément de l'interface
      // (l'élément est maintenant en corbeille, donc il ne doit plus être visible)
      const { useFileSystemStore } = await import('@/store/useFileSystemStore');
      const store = useFileSystemStore.getState();
      
      // Retirer la note du store
      const remainingNotes = { ...store.notes };
      delete remainingNotes[cleanNoteId];
      store.setNotes(Object.values(remainingNotes));
      
      if (process.env.NODE_ENV === 'development') {
        logger.dev(`[V2UnifiedApi] 🗑️ Note retirée du store (mise en corbeille):`, {
          noteId: cleanNoteId
        });
      }

      // ⚡ OPTIMISTIC UI: Pas de polling nécessaire après suppression
      // Le store est déjà à jour, et le polling pourrait réajouter la note
      // si l'API n'a pas encore propagé la suppression (timing issue)
      // Le polling sera déclenché automatiquement par le système de temps réel si nécessaire
      if (process.env.NODE_ENV === 'development') {
        logger.dev(`[V2UnifiedApi] ⚡ Suppression optimiste: pas de polling (évite réapparition)`);
      }

      const duration = Date.now() - startTime;
      if (process.env.NODE_ENV === 'development') {
        logger.dev(`[V2UnifiedApi] ✅ Note mise en corbeille en ${duration}ms`);
      }
      
      return {
        success: true,
        duration
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      if (process.env.NODE_ENV === 'development') {
        // Convertir l'erreur en objet Error standard si ce n'est pas déjà le cas
        const errorObj = error instanceof Error ? error : new Error(String(error));
        
        logger.error(`[V2UnifiedApi] 💥 Erreur complète lors de la suppression de note - ${errorObj.message}`, errorObj);
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
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
      logger.info('[V2UnifiedApi] 🚀 Création dossier (pas d\'optimistic UI)', {
        name: folderData.name,
        classeurId: folderData.classeur_id
      });
      
      // 🚀 Appel direct vers l'endpoint API V2
      const headers = await this.getAuthHeaders();
      const response = await fetch(this.buildUrl('/api/v2/folder/create'), {
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

      // ✅ SUCCÈS: Ajouter le dossier au store
      const { useFileSystemStore } = await import('@/store/useFileSystemStore');
      const store = useFileSystemStore.getState();
      store.addFolder(result.folder);
      
      if (process.env.NODE_ENV === 'development') {
        logger.dev(`[V2UnifiedApi] ✅ Dossier créé et ajouté au store:`, {
          realId: result.folder.id,
          name: result.folder.name,
          storeFolders: Object.keys(store.folders)
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
      logger.error('[V2UnifiedApi] ❌ Erreur création dossier', {
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
      
      // ⚡ OPTIMISTIC UI: Mettre à jour le dossier IMMÉDIATEMENT dans le store
      const { useFileSystemStore } = await import('@/store/useFileSystemStore');
      const store = useFileSystemStore.getState();
      
      // Sauvegarder les données originales pour rollback
      const originalFolder = store.folders[cleanFolderId];
      if (!originalFolder) {
        throw new Error('Dossier non trouvé dans le store');
      }
      
      // Mettre à jour le dossier IMMÉDIATEMENT (optimistic)
      store.updateFolder(cleanFolderId, updateData);
      
      if (process.env.NODE_ENV === 'development') {
        logger.dev(`[V2UnifiedApi] ⚡ Dossier mis à jour optimiste:`, {
          folderId: cleanFolderId,
          updateData
        });
      }
      
      // 🚀 2. Appel vers l'endpoint API V2 (en arrière-plan)
      const headers = await this.getAuthHeaders();
      const response = await fetch(this.buildUrl(`/api/v2/folder/${cleanFolderId}/update`), {
        method: 'PUT',
        headers,
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        // 🔄 ROLLBACK: Restaurer le dossier original en cas d'erreur
        store.updateFolder(cleanFolderId, originalFolder);
        
        const errorText = await response.text();
        throw new Error(`Erreur mise à jour dossier: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      const apiTime = Date.now() - startTime;
      if (process.env.NODE_ENV === 'development') {
        logger.dev(`[V2UnifiedApi] ✅ API terminée en ${apiTime}ms`);
      }

      // ✅ SUCCÈS: Mettre à jour avec les données finales de l'API
      store.updateFolder(cleanFolderId, result.folder);
      
      // ⚡ OPTIMISTIC UI: Pas de polling nécessaire, le store est déjà à jour
      if (process.env.NODE_ENV === 'development') {
        logger.dev(`[V2UnifiedApi] ✅ Dossier mis à jour avec optimistic UI (pas de polling)`);
      }
      
      const totalTime = Date.now() - startTime;
      if (process.env.NODE_ENV === 'development') {
        logger.dev(`[V2UnifiedApi] ✅ Dossier mis à jour dans Zustand  en ${totalTime}ms total`);
      }
      
      return result;
    } catch (error) {
      logger.error('[V2UnifiedApi] ❌ Erreur mise à jour dossier', {
        error: error instanceof Error ? error.message : String(error)
      });
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
      
      // ⚡ OPTIMISTIC UI: Mettre à jour le store IMMÉDIATEMENT
      const { useFileSystemStore } = await import('@/store/useFileSystemStore');
      const store = useFileSystemStore.getState();
      
      // Sauvegarder les données pour rollback en cas d'erreur
      const originalFolders = { ...store.folders };
      const originalNotes = { ...store.notes };
      
      // Retirer le dossier du store IMMÉDIATEMENT (optimistic)
      const remainingFolders = { ...store.folders };
      delete remainingFolders[cleanFolderId];
      store.setFolders(Object.values(remainingFolders));
      
      // Retirer toutes les notes de ce dossier du store IMMÉDIATEMENT
      const remainingNotes = Object.fromEntries(
        Object.entries(store.notes).filter(([, note]) => note.folder_id !== cleanFolderId)
      );
      store.setNotes(Object.values(remainingNotes));
      
      if (process.env.NODE_ENV === 'development') {
        logger.dev(`[V2UnifiedApi] ⚡ Dossier retiré du store (optimistic):`, {
          folderId: cleanFolderId,
          notesRetirées: Object.keys(originalNotes).length - Object.keys(remainingNotes).length
        });
      }
      
      // ✅ 2. Appel vers l'endpoint API V2 (en arrière-plan)
      const headers = await this.getAuthHeaders();
      const response = await fetch(this.buildUrl(`/api/v2/delete/folder/${cleanFolderId}`), {
        method: 'DELETE',
        headers
      });

      if (!response.ok) {
        // 🔄 ROLLBACK: Restaurer le store en cas d'erreur
        store.setFolders(Object.values(originalFolders));
        store.setNotes(Object.values(originalNotes));
        
        const errorText = await response.text();
        throw new Error(`Erreur suppression dossier: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const apiTime = Date.now() - startTime;
      if (process.env.NODE_ENV === 'development') {
        logger.dev(`[V2UnifiedApi] ✅ API terminée en ${apiTime}ms`);
      }
      
      // ⚡ OPTIMISTIC UI: Pas de polling nécessaire, le store est déjà à jour
      if (process.env.NODE_ENV === 'development') {
        logger.dev(`[V2UnifiedApi] ✅ Dossier supprimé avec optimistic UI (pas de polling)`);
      }

      const totalTime = Date.now() - startTime;
      if (process.env.NODE_ENV === 'development') {
        logger.dev(`[V2UnifiedApi] ✅ Dossier mis en corbeille en ${totalTime}ms total`);
      }
      
      return { success: true };
    } catch (error) {
      logger.error('[V2UnifiedApi] ❌ Erreur suppression dossier', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Déplacer une note avec mise à jour directe de Zustand + polling côté client
   */
  async moveNote(noteId: string, targetFolderId: string | null, targetClasseurId?: string) {
    if (process.env.NODE_ENV === 'development') {
      logger.dev('[V2UnifiedApi] 📦 Déplacement note unifié V2');
    }
    const startTime = Date.now();
    
    try {
      // ✅ 1. Nettoyer et valider l'ID
      const cleanNoteId = this.cleanAndValidateId(noteId, 'note');
      
      // Utiliser l'API V2 pour tous les déplacements (même classeur et cross-classeur)
      if (process.env.NODE_ENV === 'development') {
        logger.dev(`[V2UnifiedApi] 🚀 Déplacement note via API V2`);
        if (targetClasseurId) {
          logger.dev(`[V2UnifiedApi] 🚀 Déplacement cross-classeur: ${targetClasseurId}`);
        }
      }
      
      const headers = await this.getAuthHeaders();
      const payload: { target_folder_id: string | null; target_notebook_id?: string } = { 
        target_folder_id: targetFolderId 
      };
      if (targetClasseurId) {
        payload.target_notebook_id = targetClasseurId;
      }
      
      if (process.env.NODE_ENV === 'development') {
        logger.dev(`[V2UnifiedApi] 🔧 Appel API V2: /api/v2/note/${cleanNoteId}/move`);
        logger.dev(`[V2UnifiedApi] 🔧 Payload:`, payload);
      }
      
      const response = await fetch(this.buildUrl(`/api/v2/note/${cleanNoteId}/move`), {
        method: 'PUT', // Utilise PUT pour l'API V2
        headers,
        body: JSON.stringify(payload)
      });

      if (process.env.NODE_ENV === 'development') {
        logger.dev(`[V2UnifiedApi] 🔧 Réponse API V2: ${response.status} ${response.statusText}`);
      }

      if (!response.ok) {
        const errorText = await response.text();
        if (process.env.NODE_ENV === 'development') {
          logger.dev(`[V2UnifiedApi] ❌ Erreur API V2: ${errorText}`);
        }
        throw new Error(`Erreur déplacement note: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      const apiTime = Date.now() - startTime;
      if (process.env.NODE_ENV === 'development') {
        logger.dev(`[V2UnifiedApi] ✅ API V2 terminée en ${apiTime}ms`);
      }

      /**
       * Récupérer le classeur_id de la note avant de la déplacer
       * Assure la cohérence des données dans Zustand
       */
      const store = useFileSystemStore.getState();
      const currentNote = store.notes[cleanNoteId];
      const noteClasseurId = targetClasseurId || currentNote?.classeur_id;
      const normalizedClasseurId = noteClasseurId ?? undefined;
      
      if (process.env.NODE_ENV === 'development') {
        logger.dev(`[V2UnifiedApi] 📝 Note ${cleanNoteId} - targetClasseurId: ${targetClasseurId}, noteClasseurId: ${noteClasseurId}, targetFolderId: ${targetFolderId}`);
      }

      // 🚀 Mise à jour directe de Zustand (instantanée)
      store.moveNote(cleanNoteId, targetFolderId, normalizedClasseurId);
      
      // 🎯 Déclencher le polling ciblé pour le déplacement
      try {
        const { triggerPollingAfterNoteAction } = await import('@/services/uiActionPolling');
        await triggerPollingAfterNoteAction('note_moved');
      } catch (error) {
        console.warn('[V2UnifiedApi] ⚠️ Erreur déclenchement polling ciblé:', error);
      }
      
      const totalTime = Date.now() - startTime;
      if (process.env.NODE_ENV === 'development') {
        logger.dev(`[V2UnifiedApi] ✅ Note déplacée dans Zustand en ${totalTime}ms total`);
      }

      return result;
    } catch (error) {
      logger.error('[V2UnifiedApi] ❌ Erreur déplacement note', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Déplacer un dossier avec mise à jour directe de Zustand + polling côté client
   */
  async moveFolder(folderId: string, targetParentId: string | null, targetClasseurId?: string) {
    if (process.env.NODE_ENV === 'development') {
      logger.dev('[V2UnifiedApi] 📦 Déplacement dossier unifié V2');
    }
    const startTime = Date.now();
    
    try {
      // ✅ 1. Nettoyer et valider l'ID
      const cleanFolderId = this.cleanAndValidateId(folderId, 'folder');
      
      // 🚀 2. Appel vers l'endpoint API V2
      const headers = await this.getAuthHeaders();
      const payload: { target_folder_id: string | null; target_classeur_id?: string } = { 
        target_folder_id: targetParentId 
      };
      if (targetClasseurId) {
        payload.target_classeur_id = targetClasseurId;
      }
      
      const response = await fetch(this.buildUrl(`/api/v2/folder/${cleanFolderId}/move`), {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload)
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

      /**
       * Récupérer le classeur_id du dossier avant de le déplacer
       * Assure la cohérence des données dans Zustand
       */
      const store = useFileSystemStore.getState();
      const currentFolder = store.folders[cleanFolderId];
      const folderClasseurId = currentFolder?.classeur_id;
      
      if (process.env.NODE_ENV === 'development') {
        logger.dev(`[V2UnifiedApi] 📁 Dossier ${cleanFolderId} - classeur_id: ${folderClasseurId}, targetParentId: ${targetParentId}`);
      }

      // 🚀 Mise à jour directe de Zustand (instantanée)
      const finalClasseurId = targetClasseurId || folderClasseurId;
      store.moveFolder(cleanFolderId, targetParentId, finalClasseurId);
      
      // 🔄 Mettre à jour aussi toutes les notes et dossiers enfants du dossier dans Zustand
      if (targetClasseurId) {
        // Utiliser la fonction utilitaire pour synchroniser toute la hiérarchie
        const { syncFolderHierarchy } = await import('@/utils/folderSyncUtils');
        const notesCount = syncFolderHierarchy(cleanFolderId, targetClasseurId);
        
        if (process.env.NODE_ENV === 'development') {
          logger.dev(`[V2UnifiedApi] 🔄 Synchronisation hiérarchie: ${notesCount} notes mises à jour`);
        }
        
        // 🎯 Déclencher le polling ciblé pour les notes et dossiers déplacés
        try {
          const { triggerPollingAfterNoteAction } = await import('@/services/uiActionPolling');
          await triggerPollingAfterNoteAction('folder_moved');
        } catch (error) {
          console.warn('[V2UnifiedApi] ⚠️ Erreur déclenchement polling ciblé pour dossiers enfants:', error);
        }
      }
      
      const totalTime = Date.now() - startTime;
      if (process.env.NODE_ENV === 'development') {
        logger.dev(`[V2UnifiedApi] ✅ Dossier et notes déplacés dans Zustand en ${totalTime}ms total`);
      }
      
      return result;
    } catch (error) {
      logger.error('[V2UnifiedApi] ❌ Erreur déplacement dossier', {
        error: error instanceof Error ? error.message : String(error)
      });
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

      if (result.classeur) {
        // Mapper emoji vers icon si nécessaire pour la compatibilité
        const mappedClasseur = {
          ...result.classeur,
          icon: result.classeur.icon || result.classeur.emoji || '📁'
        };
        
        // 🚀 Mise à jour directe de Zustand (instantanée)
        const store = useFileSystemStore.getState();
        store.addClasseur(mappedClasseur);
        
        // 🎯 Déclencher le polling ciblé pour la création
        try {
          const { triggerPollingAfterClasseurAction } = await import('@/services/uiActionPolling');
          await triggerPollingAfterClasseurAction('classeur_created');
        } catch (error) {
          console.warn('[V2UnifiedApi] ⚠️ Erreur déclenchement polling ciblé:', error);
        }
        
        const totalTime = Date.now() - startTime;
        if (process.env.NODE_ENV === 'development') {
          logger.dev(`[V2UnifiedApi] ✅ Classeur ajouté dans Zustand en ${totalTime}ms total`);
        }
        
        return {
          success: true,
          classeur: mappedClasseur,
          duration: totalTime
        };
      }

      const duration = Date.now() - startTime;
      return {
        success: false,
        error: 'Aucun classeur retourné par l\'API',
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
      
      // Mapper emoji vers icon si nécessaire pour la compatibilité
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
      
      // 🎯 Déclencher le polling ciblé pour la mise à jour
      try {
        const { triggerPollingAfterClasseurAction } = await import('@/services/uiActionPolling');
        await triggerPollingAfterClasseurAction('classeur_updated');
      } catch (error) {
        console.warn('[V2UnifiedApi] ⚠️ Erreur déclenchement polling ciblé:', error);
      }

      const duration = Date.now() - startTime;
      return {
        success: true,
        classeur: result.classeur,
        duration
      };
    } catch (error) {
      logger.error('[V2UnifiedApi] ❌ Erreur mise à jour classeur', {
        error: error instanceof Error ? error.message : String(error)
      });
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
      
      // ✅ 2. Appel vers l'endpoint API V2 unifié (pas de modification du store)
      const headers = await this.getAuthHeaders();
              const response = await fetch(this.buildUrl(`/api/v2/delete/classeur/${cleanClasseurId}`), {
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

      // ✅ 2. Mettre à jour le store pour retirer l'élément de l'interface
      // (l'élément est maintenant en corbeille, donc il ne doit plus être visible)
      const { useFileSystemStore } = await import('@/store/useFileSystemStore');
      const store = useFileSystemStore.getState();
      
      // Retirer le classeur du store
      const remainingClasseurs = { ...store.classeurs };
      delete remainingClasseurs[cleanClasseurId];
      store.setClasseurs(Object.values(remainingClasseurs));
      
      // Retirer tous les dossiers et notes de ce classeur du store
      const remainingFolders = Object.fromEntries(
        Object.entries(store.folders).filter(([, folder]) => folder.classeur_id !== cleanClasseurId)
      );
      store.setFolders(Object.values(remainingFolders));
      
      const remainingNotes = Object.fromEntries(
        Object.entries(store.notes).filter(([, note]) => note.classeur_id !== cleanClasseurId)
      );
      store.setNotes(Object.values(remainingNotes));
      
      if (process.env.NODE_ENV === 'development') {
        logger.dev(`[V2UnifiedApi] 🗑️ Classeur retiré du store (mis en corbeille):`, {
          classeurId: cleanClasseurId,
          dossiersRetirés: Object.keys(store.folders).length - Object.keys(remainingFolders).length,
          notesRetirées: Object.keys(store.notes).length - Object.keys(remainingNotes).length
        });
      }
      
      // 🎯 Déclencher le polling ciblé pour la suppression
      try {
        const { triggerPollingAfterClasseurAction } = await import('@/services/uiActionPolling');
        await triggerPollingAfterClasseurAction('classeur_deleted');
      } catch (error) {
        console.warn('[V2UnifiedApi] ⚠️ Erreur déclenchement polling ciblé:', error);
      }

      const totalTime = Date.now() - startTime;
      if (process.env.NODE_ENV === 'development') {
        logger.dev(`[V2UnifiedApi] ✅ Classeur mis en corbeille en ${totalTime}ms total`);
      }
      
      return { success: true };
    } catch (error) {
      logger.error('[V2UnifiedApi] ❌ Erreur suppression classeur', {
        error: error instanceof Error ? error.message : String(error)
      });
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
              const response = await fetch(this.buildUrl(`/api/v2/note/${cleanRef}/insert-content`), {
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
      
      // 🎯 Déclencher le polling ciblé pour la mise à jour
      try {
        const { triggerPollingAfterNoteAction } = await import('@/services/uiActionPolling');
        await triggerPollingAfterNoteAction('note_updated');
      } catch (error) {
        console.warn('[V2UnifiedApi] ⚠️ Erreur déclenchement polling ciblé:', error);
      }
      
      return result;
    } catch (error) {
      logger.error('[V2UnifiedApi] ❌ Erreur ajout contenu note', {
        error: error instanceof Error ? error.message : String(error)
      });
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
      const response = await fetch(this.buildUrl(`/api/v2/note/${cleanRef}?fields=content`), {
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
      logger.error('[V2UnifiedApi] ❌ Erreur récupération contenu note', {
        error: error instanceof Error ? error.message : String(error)
      });
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
      logger.error('[V2UnifiedApi] ❌ Erreur récupération arbre classeur', {
        error: error instanceof Error ? error.message : String(error)
      });
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
      logger.error('[V2UnifiedApi] ❌ Erreur récupération classeurs', {
        error: error instanceof Error ? error.message : String(error)
      });
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
      // Vérifier que result.classeurs existe et est un tableau
      if (result && Array.isArray(result.classeurs)) {
        const store = useFileSystemStore.getState();
        result.classeurs.forEach((classeur: Classeur) => {
          store.updateClasseur(classeur.id, classeur);
        });
      } else {
        logger.warn('[V2UnifiedApi] ⚠️ Réponse API invalide pour reorderClasseurs:', result);
      }
      
      // 🎯 Le polling ciblé est maintenant géré par le système ciblé
      
      return result;
    } catch (error) {
      logger.error('[V2UnifiedApi] ❌ Erreur réorganisation classeurs', {
        error: error instanceof Error ? error.message : String(error)
      });
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
      const allDossiers: Folder[] = [];
      const allNotes: Note[] = [];

      const isFolder = (f: unknown): f is Folder =>
        !!f && typeof f === 'object' && typeof (f as { id?: unknown }).id === 'string' && typeof (f as { name?: unknown }).name === 'string';
      const isNote = (n: unknown): n is Note =>
        !!n && typeof n === 'object' && typeof (n as { id?: unknown }).id === 'string' && typeof (n as { source_title?: unknown }).source_title === 'string';
      
      // 🚀 Pour chaque classeur, récupérer l'arbre complet
      for (const classeur of classeursResult.classeurs) {
        try {
          if (process.env.NODE_ENV === 'development') {
            logger.dev(`[V2UnifiedApi] 🌳 Chargement arbre classeur: ${classeur.id} (${classeur.name})`);
          }
          
          // 🚀 Utiliser l'ID du classeur pour l'endpoint tree
          const treeResult = await this.getClasseurTree(classeur.id);
          
          // 🚀 Accumuler les dossiers et notes de ce classeur (utiliser les listes PLATES, pas tree)
          // L'API retourne tree (nested pour affichage) + folders/notes (plats pour le store)
          if (treeResult.success) {
            const dossiers = Array.isArray(treeResult.folders) ? treeResult.folders : [];
            const notes = Array.isArray(treeResult.notes) ? treeResult.notes : [];

            if (process.env.NODE_ENV === 'development') {
              logger.dev(`[V2UnifiedApi] 📁 ${dossiers.length} dossiers et ${notes.length} notes trouvés pour ${classeur.name}`);
            }

            dossiers.filter(isFolder).forEach((d: Folder) => allDossiers.push(d));
            notes.filter(isNote).forEach((n: Note) => allNotes.push(n));
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
      logger.error('[V2UnifiedApi] ❌ Erreur chargement classeurs avec contenu', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
}

// Export de l'instance singleton
export const v2UnifiedApi = V2UnifiedApi.getInstance(); 