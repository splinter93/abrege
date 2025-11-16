import { create } from 'zustand';
import { logger, LogCategory } from '@/utils/logger';
import { useFileSystemStore, type Note as FileSystemNote } from './useFileSystemStore';
import { getSupabaseClient } from '@/utils/supabaseClientSingleton';
import type {
  CanvaSession as CanvaSessionDB,
  ListCanvasResponse,
  CanvaSessionResponse,
  CreateCanvaSessionResponse,
  NoteApiResponse
} from '@/types/canva';

/**
 * 🎨 Session Canva V2
 * 
 * Architecture propre avec table canva_sessions
 * Lien vers chat_sessions + note DB reelle
 */
/**
 * Session Canva locale
 * 
 * Architecture:
 * - Note stockée en DB (articles table)
 * - Session canva (canva_sessions table) lie note + chat session
 * - État streaming local (streamBuffer) pour écriture LLM temps réel
 * 
 * Pas de duplication contenu : la note DB est la source de vérité
 */
export interface CanvaSession {
  id: string; // canva_sessions.id (UUID)
  chatSessionId: string; // FK vers chat_sessions
  noteId: string; // FK vers articles (note DB réelle)
  title: string; // Cache local du source_title (synced)
  createdAt: string;
  
  // État streaming local (pour LLM write temps réel)
  isStreaming: boolean;
  streamBuffer: string; // Buffer temporaire pendant streaming
}

/**
 * Position d'insertion pour appendContent
 */
export type AppendPosition = 'start' | 'end';

type SwitchCanvaResult = 'activated' | 'not_found';

interface CanvaStore {
  sessions: Record<string, CanvaSession>;
  activeCanvaId: string | null;
  isCanvaOpen: boolean;
  
  // Actions de base V2
  openCanva: (userId: string, chatSessionId: string, options?: { title?: string }) => Promise<CanvaSession>;
  switchCanva: (canvaId: string, noteId: string) => Promise<SwitchCanvaResult>;
  closeCanva: (sessionId?: string, options?: { delete?: boolean }) => Promise<void>;
  setActiveCanva: (sessionId: string | null) => void;
  updateSession: (sessionId: string, updates: Partial<Omit<CanvaSession, 'id' | 'createdAt'>>) => void;
  reset: () => void;
  
  // Actions streaming
  startStreaming: (sessionId: string) => void;
  appendStreamChunk: (sessionId: string, chunk: string) => void;
  endStreaming: (sessionId: string) => void;
  
  // Actions manipulation contenu (pour endpoints API)
  appendContent: (sessionId: string, content: string, position?: AppendPosition) => void;
  replaceContent: (sessionId: string, pattern: string, newContent: string) => void;
}

/**
 * Créer une session canva locale
 * Note DB deja creee par API
 */
function createEmptySession(
  canvaId: string,
  noteId: string,
  chatSessionId: string,
  title?: string
): CanvaSession {
  const now = new Date();
  const defaultTitle = title?.trim() || `Canva — ${now.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })}`;

  return {
    id: canvaId,
    chatSessionId,
    noteId,
    title: defaultTitle,
    createdAt: now.toISOString(),
    isStreaming: false,
    streamBuffer: ''
  };
}

// ✅ Protection race condition : track pending switches
const pendingSwitches = new Set<string>();

// ✅ Protection race condition : queues exclusives
const openQueues = new Map<string, Promise<CanvaSession>>();
const closeQueues = new Map<string, Promise<void>>();

/**
 * Exécuter une opération de manière exclusive par ID (pattern runExclusive)
 * @param id - ID unique pour la queue (chatSessionId pour open, canvaId pour close)
 * @param queue - Map des queues
 * @param fn - Fonction à exécuter de manière exclusive
 * @returns Résultat de la fonction
 */
async function runExclusive<T>(
  id: string,
  queue: Map<string, Promise<unknown>>,
  fn: () => Promise<T>
): Promise<T> {
  const prev = queue.get(id) || Promise.resolve();
  let resolveNext: (value: unknown) => void;
  const next = new Promise((resolve) => (resolveNext = resolve));
  queue.set(id, prev.then(() => next));
  
  try {
    const result = await fn();
    return result;
  } finally {
    // Libérer la file d'attente
    resolveNext!(null);
    // Nettoyage si la promesse correspond toujours
    if (queue.get(id) === next) {
      queue.delete(id);
    }
  }
}

/**
 * Fermer tous les autres canvas ouverts d'une chat session
 * @param chatSessionId - ID de la chat session
 * @param excludeCanvaId - ID du canvas à exclure de la fermeture
 * @param authToken - Token d'authentification
 * @throws Ne throw pas, log seulement les erreurs
 */
async function closeOtherOpenCanvases(
  chatSessionId: string,
  excludeCanvaId: string,
  authToken: string
): Promise<void> {
  try {
    const listResponse = await fetch(`/api/v2/canva/sessions?chat_session_id=${chatSessionId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'X-Client-Type': 'canva_store'
      }
    });

    if (!listResponse.ok) {
      logger.warn(LogCategory.EDITOR, '[CanvaStore] ⚠️ Failed to list canvases', {
        chatSessionId,
        status: listResponse.status
      });
      return;
    }

    const listData = await listResponse.json() as ListCanvasResponse;
    const otherCanvas = (listData.canva_sessions || []).filter(
      (c: CanvaSessionDB) => c.id !== excludeCanvaId && c.status === 'open'
    );

    if (otherCanvas.length === 0) {
      return;
    }

    // Utiliser Promise.allSettled pour gérer les échecs partiels
    const results = await Promise.allSettled(
      otherCanvas.map((otherCanva: CanvaSessionDB) =>
        fetch(`/api/v2/canva/sessions/${otherCanva.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
            'X-Client-Type': 'canva_store'
          },
          body: JSON.stringify({ status: 'closed' })
        })
      )
    );

    const failed = results
      .map((result, index) => ({ result, canva: otherCanvas[index] }))
      .filter(({ result }) => result.status === 'rejected');

    if (failed.length > 0) {
      logger.warn(LogCategory.EDITOR, '[CanvaStore] ⚠️ Some canvas closures failed', {
        failedCount: failed.length,
        totalCount: otherCanvas.length,
        failedCanvas: failed.map(({ canva, result }) => ({
          canvaId: canva.id,
          error: result.status === 'rejected' ? String(result.reason) : null
        })),
        context: {
          chatSessionId,
          excludeCanvaId
        }
      });
    }

    if (otherCanvas.length > 0) {
      const successCount = otherCanvas.length - failed.length;
      logger.info(LogCategory.EDITOR, '[CanvaStore] ✅ Closed other open canvases', {
        successCount,
        totalCount: otherCanvas.length,
        otherCanvasIds: otherCanvas.map((c: CanvaSessionDB) => c.id)
      });
    }
  } catch (error) {
    logger.warn(LogCategory.EDITOR, '[CanvaStore] ⚠️ Error closing other canvases', {
      error: error instanceof Error ? { message: error.message, stack: error.stack } : String(error),
      context: {
        chatSessionId,
        excludeCanvaId
      }
    });
    // Ne pas throw : continuer même si la fermeture des autres échoue
  }
}

/**
 * Synchroniser status canva en DB
 * @param canvaId - ID du canvas
 * @param status - Status à synchroniser ('open' | 'closed')
 * @param authToken - Token d'authentification
 * @throws Ne throw pas, log seulement les erreurs
 */
async function syncStatusToDB(
  canvaId: string,
  status: 'open' | 'closed',
  authToken: string
): Promise<void> {
  try {
    const statusResponse = await fetch(`/api/v2/canva/sessions/${canvaId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        'X-Client-Type': 'canva_store'
      },
      body: JSON.stringify({ status })
    });

    if (!statusResponse.ok) {
      logger.warn(LogCategory.EDITOR, `[CanvaStore] ⚠️ Failed to update status to ${status}`, {
        canvaId,
        status,
        httpStatus: statusResponse.status,
        context: {
          canvaId,
          targetStatus: status
        }
      });
    } else {
      logger.info(LogCategory.EDITOR, `[CanvaStore] ✅ Status synced to ${status}`, {
        canvaId,
        status
      });
    }
  } catch (error) {
    logger.warn(LogCategory.EDITOR, `[CanvaStore] ⚠️ Error updating status to ${status}`, {
      error: error instanceof Error ? { message: error.message, stack: error.stack } : String(error),
      context: {
        canvaId,
        targetStatus: status
      }
    });
    // Ne pas throw : sync non-bloquante
  }
}

export const useCanvaStore = create<CanvaStore>((set, get) => ({
  sessions: {},
  activeCanvaId: null,
  isCanvaOpen: false,

  /**
   * ✅ Ouvrir un nouveau canva V2
   * Appelle API /api/v2/canva/create
   * Protégé par runExclusive pour éviter les race conditions
   */
  openCanva: async (userId, chatSessionId, options) => {
    return runExclusive(
      chatSessionId,
      openQueues as Map<string, Promise<unknown>>,
      async () => {
    try {
      logger.info(LogCategory.EDITOR, '[CanvaStore] Opening canva', {
        userId,
        chatSessionId,
        title: options?.title
      });

      // Recuperer token auth Supabase
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('No auth session available');
      }

      // Appel API V2 avec auth header (REST V2: /sessions pluriel)
      const response = await fetch('/api/v2/canva/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`, // ✅ FIX: Token JWT
          'X-Client-Type': 'canva_store'
        },
        body: JSON.stringify({
          chat_session_id: chatSessionId,
          create_if_missing: true,
          title: options?.title,
          initial_content: ''
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(`API error ${response.status}: ${errorData.error || response.statusText}`);
      }

      const payload = await response.json() as CreateCanvaSessionResponse;
      const canvaSessionPayload = payload.canva_session;
      const canva_id: string = canvaSessionPayload?.id || payload.canva_id || '';
      const note_id: string = canvaSessionPayload?.note_id || payload.note_id || '';

      if (!canva_id || !note_id) {
        throw new Error('Réponse API canva/session invalide');
      }

      const store = useFileSystemStore.getState();

      let noteForStore: FileSystemNote | null = null;

      try {
        const noteResponse = await fetch(`/api/v2/note/${note_id}?fields=all`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'X-Client-Type': 'canva_store'
          }
        });

        if (noteResponse.ok) {
          const notePayload = await noteResponse.json().catch(() => null) as NoteApiResponse | null;
          const apiNote = notePayload?.note;

          if (apiNote) {
            const createdAt = apiNote.created_at || new Date().toISOString();
            const updatedAt = apiNote.updated_at || createdAt;
            noteForStore = {
              id: apiNote.id || note_id,
              source_title: apiNote.title || apiNote.source_title || options?.title || 'Canva — Sans titre',
              markdown_content: apiNote.markdown_content || '',
              html_content: apiNote.html_content || apiNote.markdown_content || '',
              folder_id: apiNote.folder_id ?? null,
              classeur_id: apiNote.classeur_id ?? null,
              position: apiNote.position ?? 0,
              created_at: createdAt,
              updated_at: updatedAt,
              slug: apiNote.slug || '',
              public_url: apiNote.public_url,
              header_image: apiNote.header_image,
              header_image_offset: apiNote.header_image_offset,
              header_image_blur: apiNote.header_image_blur,
              header_image_overlay: apiNote.header_image_overlay,
              header_title_in_image: apiNote.header_title_in_image,
              wide_mode: apiNote.wide_mode ?? false,
              a4_mode: apiNote.a4_mode ?? false,
              slash_lang: apiNote.slash_lang ?? 'en',
              font_family: apiNote.font_family ?? 'Figtree',
              share_settings: apiNote.share_settings as FileSystemNote['share_settings'],
              is_canva_draft: true
            };
          }
        } else {
          const errorText = await noteResponse.text();
          logger.warn(LogCategory.EDITOR, '[CanvaStore] ⚠️ Failed to hydrate canva note content', {
            noteId: note_id,
            status: noteResponse.status,
            statusText: noteResponse.statusText,
            errorText
          });
        }
      } catch (hydrateError) {
        logger.warn(LogCategory.EDITOR, '[CanvaStore] ⚠️ Error hydrating canva note', hydrateError);
      }

      if (!noteForStore) {
        const timestamp = new Date().toISOString();
        noteForStore = {
          id: note_id,
          source_title: options?.title || 'Canva — Sans titre',
          markdown_content: '',
          html_content: '',
          folder_id: null,
          classeur_id: null,
          position: 0,
          created_at: timestamp,
          updated_at: timestamp,
          slug: '',
          public_url: undefined,
          header_image: undefined,
          header_image_offset: undefined,
          header_image_blur: undefined,
          header_image_overlay: undefined,
          header_title_in_image: undefined,
          wide_mode: false,
          a4_mode: false,
          slash_lang: 'en',
          font_family: 'Figtree',
          share_settings: undefined,
          is_canva_draft: true
        };
      }

      if (store.notes[noteForStore.id]) {
        store.updateNote(noteForStore.id, noteForStore);
      } else {
        store.addNote(noteForStore);
      }

      // Créer session canva locale
      const canvaSession = createEmptySession(
        canva_id,
        note_id,
        chatSessionId,
        canvaSessionPayload?.title || options?.title
      );

      set((state) => ({
        sessions: {
          ...state.sessions,
          [canvaSession.id]: canvaSession
        },
        activeCanvaId: canvaSession.id,
        isCanvaOpen: true
      }));

      // ✅ Fermer tous les autres canvas de cette chat session avant d'ouvrir ce nouveau
      // Garantit qu'un seul canva est 'open' à la fois
      await closeOtherOpenCanvases(chatSessionId, canva_id, session.access_token);

      // ✅ Synchroniser status DB : openCanva = status='open'
      await syncStatusToDB(canva_id, 'open', session.access_token);

      logger.info(LogCategory.EDITOR, '[CanvaStore] ✅ Canva opened', {
        canvaId: canva_id,
        noteId: note_id,
        chatSessionId
      });

      return canvaSession;

    } catch (error) {
      logger.error(LogCategory.EDITOR, '[CanvaStore] ❌ Failed to open canva', error);
      throw error;
    }
      }
    );
  },

  /**
   * ✅ Fermer le pane UI d'un canva (sans supprimer la session)
   * 
   * Comportement:
   * - Si delete: true → Supprime la session canva (DELETE API)
   * - Si delete: false ou undefined → Ferme juste le pane UI (garde dans menu)
   * 
   * Le status DB ne change PAS (reste 'open' ou autre)
   * Seule la visibilité UI change (isCanvaOpen = false)
   * Protégé par runExclusive pour éviter les race conditions
   */
  closeCanva: async (sessionId, options) => {
    const { activeCanvaId, sessions } = get();
    const targetId = sessionId || activeCanvaId;
    if (!targetId) {
      return;
    }

    return runExclusive(
      targetId,
      closeQueues as Map<string, Promise<unknown>>,
      async () => {

    const shouldDelete = options?.delete === true;

    // Si suppression demandée → DELETE via API
    if (shouldDelete) {
      try {
        const supabaseClient = getSupabaseClient();
        const { data: { session } } = await supabaseClient.auth.getSession();

        if (!session?.access_token) {
          throw new Error('No auth session available');
        }

        const response = await fetch(`/api/v2/canva/sessions/${targetId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'X-Client-Type': 'canva_store'
          }
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(`API error ${response.status}: ${errorData.error || response.statusText}`);
        }

        // Supprimer de l'état local après DELETE réussi
        set((state) => {
          const nextSessions = { ...state.sessions };
          delete nextSessions[targetId];

          const nextActiveId = state.activeCanvaId === targetId ? null : state.activeCanvaId;
          const hasSessionsLeft = Object.keys(nextSessions).length > 0;

          return {
            sessions: nextSessions,
            activeCanvaId: nextActiveId,
            isCanvaOpen: hasSessionsLeft ? state.isCanvaOpen : false
          };
        });

        logger.info(LogCategory.EDITOR, '[CanvaStore] ✅ Canva session deleted', {
          sessionId: targetId
        });
        return;
      } catch (error) {
        logger.error(LogCategory.EDITOR, '[CanvaStore] ❌ Failed to delete canva session via API', {
          error,
          canvaId: targetId
        });
        throw error;
      }
    }

    // Sinon → Fermer le pane UI (garde dans menu) + synchroniser status='closed'
    try {
      const supabaseClient = getSupabaseClient();
      const { data: { session } } = await supabaseClient.auth.getSession();

      if (session?.access_token) {
        const statusResponse = await fetch(`/api/v2/canva/sessions/${targetId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'X-Client-Type': 'canva_store'
          },
          body: JSON.stringify({ status: 'closed' })
        });

        if (!statusResponse.ok) {
          logger.warn(LogCategory.EDITOR, '[CanvaStore] ⚠️ Failed to update status to closed', {
            canvaId: targetId,
            status: statusResponse.status
          });
        } else {
          logger.info(LogCategory.EDITOR, '[CanvaStore] ✅ Status synced to closed', {
            canvaId: targetId
          });
        }
      }
    } catch (statusError) {
      logger.warn(LogCategory.EDITOR, '[CanvaStore] ⚠️ Error updating status to closed', statusError);
      // Continue quand même : on ferme le pane UI même si la sync status échoue
    }

    set((state) => {
      const wasActive = state.activeCanvaId === targetId;
      return {
        activeCanvaId: wasActive ? null : state.activeCanvaId,
        isCanvaOpen: wasActive ? false : state.isCanvaOpen
      };
    });

    logger.info(LogCategory.EDITOR, '[CanvaStore] ✅ Canva pane closed (session kept in menu)', {
      sessionId: targetId
    });
      }
    );
  },

  /**
   * 🔄 Switch vers un canva existant
   * 
   * 1. Charger la note depuis DB (via useFileSystemStore)
   * 2. Mettre à jour session locale si existe pas
   * 3. Activer le canva
   */
  switchCanva: async (canvaId, noteId) => {
    // ✅ Protection race condition : ignorer si switch déjà en cours
    if (pendingSwitches.has(canvaId)) {
      logger.info(LogCategory.EDITOR, '[CanvaStore] Switch already pending, ignoring', { canvaId });
      return;
    }

    try {
      pendingSwitches.add(canvaId);
      
      logger.info(LogCategory.EDITOR, '[CanvaStore] Switching to canva', {
        canvaId,
        noteId
      });

      const { sessions } = get();

      // Si session locale existe déjà, juste activer
      if (sessions[canvaId]) {
        const supabase = getSupabaseClient();
        const { data: { session: authSession } } = await supabase.auth.getSession();

        if (authSession?.access_token) {
          // ✅ Déclarer chatSessionId au niveau du scope pour l'utiliser plus tard
          let chatSessionId: string | undefined;

          // ✅ Vérifier existence canva en DB avant activation
          const canvaSessionResponse = await fetch(`/api/v2/canva/sessions/${canvaId}`, {
            headers: {
              'Authorization': `Bearer ${authSession.access_token}`,
              'X-Client-Type': 'canva_store'
            }
          });

          if (!canvaSessionResponse.ok) {
            if (canvaSessionResponse.status === 404) {
              logger.warn(LogCategory.EDITOR, '[CanvaStore] ⚠️ Canva not found in DB', {
                canvaId,
                noteId,
                status: canvaSessionResponse.status
              });

              // Nettoyer état local
              set((state) => {
                const nextSessions = { ...state.sessions };
                delete nextSessions[canvaId];
                const wasActive = state.activeCanvaId === canvaId;

                return {
                  sessions: nextSessions,
                  activeCanvaId: wasActive ? null : state.activeCanvaId,
                  isCanvaOpen: wasActive ? false : state.isCanvaOpen
                };
              });

              return 'not_found';
            }

            throw new Error(`API error ${canvaSessionResponse.status}: Failed to verify canva existence`);
          }

          const canvaData = await canvaSessionResponse.json() as CanvaSessionResponse;
          if (!canvaData.canva_session) {
            throw new Error('Canva session data not found in API response');
          }

          chatSessionId = canvaData.canva_session.chat_session_id;

          if (chatSessionId) {
            // ✅ Fermer tous les autres canvas de cette chat session
            await closeOtherOpenCanvases(chatSessionId, canvaId, authSession.access_token);
          }

          // ✅ Synchroniser status DB : switchCanva = status='open'
          await syncStatusToDB(canvaId, 'open', authSession.access_token);

          // ✅ Mettre à jour chatSessionId dans la session locale si on l'a récupéré
          if (chatSessionId && sessions[canvaId]) {
            get().updateSession(canvaId, { chatSessionId });
          }
        }

        // Ces opérations doivent s'exécuter même si authSession n'est pas disponible
        set({
          activeCanvaId: canvaId,
          isCanvaOpen: true
        });

        logger.info(LogCategory.EDITOR, '[CanvaStore] ✅ Canva switched (existing session)', {
          canvaId
        });
        return 'activated';
      }

      // Charger la note depuis DB via API V2
      const supabase = getSupabaseClient();
      const { data: { session: authSession } } = await supabase.auth.getSession();

      if (!authSession?.access_token) {
        throw new Error('No auth session');
      }

      // ✅ Vérifier existence canva en DB avant activation et récupérer chatSessionId
      const canvaSessionVerifyResponse = await fetch(`/api/v2/canva/sessions/${canvaId}`, {
        headers: {
          'Authorization': `Bearer ${authSession.access_token}`,
          'X-Client-Type': 'canva_store'
        }
      });

      if (!canvaSessionVerifyResponse.ok) {
        if (canvaSessionVerifyResponse.status === 404) {
          logger.warn(LogCategory.EDITOR, '[CanvaStore] ⚠️ Canva not found in DB', {
            canvaId,
            noteId,
            status: canvaSessionVerifyResponse.status
          });

          // Nettoyer état local
          set((state) => {
            const nextSessions = { ...state.sessions };
            delete nextSessions[canvaId];
            const wasActive = state.activeCanvaId === canvaId;

            return {
              sessions: nextSessions,
              activeCanvaId: wasActive ? null : state.activeCanvaId,
              isCanvaOpen: wasActive ? false : state.isCanvaOpen
            };
          });

          return 'not_found';
        }

        throw new Error(`API error ${canvaSessionVerifyResponse.status}: Failed to verify canva existence`);
      }

      // ✅ Récupérer chatSessionId AVANT création session locale
      const canvaSessionVerifyData = await canvaSessionVerifyResponse.json() as CanvaSessionResponse;
      const chatSessionId = canvaSessionVerifyData.canva_session?.chat_session_id || '';

      const response = await fetch(`/api/v2/note/${noteId}`, {
        headers: {
          'Authorization': `Bearer ${authSession.access_token}`,
          'X-Client-Type': 'canva_switch'
        },
        credentials: 'include' // ✅ Envoyer cookies pour auth cross-origin
      });

      if (response.status === 404) {
        logger.warn(LogCategory.EDITOR, '[CanvaStore] ⚠️ Canva note not found', {
          canvaId,
          noteId,
          status: response.status
        });

        set((state) => {
          const nextSessions = { ...state.sessions };
          delete nextSessions[canvaId];
          const wasActive = state.activeCanvaId === canvaId;

          return {
            sessions: nextSessions,
            activeCanvaId: wasActive ? null : state.activeCanvaId,
            isCanvaOpen: wasActive ? false : state.isCanvaOpen
          };
        });

        return 'not_found';
      }

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const responseData = await response.json() as NoteApiResponse;
      const { note } = responseData;
      if (!note) {
        throw new Error('Note introuvable dans API response');
      }

      /**
       * ✅ NORMALISATION API V2 → FileSystemStore
       * 
       * Problème : L'API V2 `/api/v2/note/[ref]` retourne `title` au lieu de `source_title`
       * pour des raisons de cohérence externe (clients tiers, docs API).
       * 
       * Raison : Éviter confusion entre `source_title` (nom interne DB Supabase)
       * et `title` (convention REST standard).
       * 
       * Solution : Normaliser côté client avant insertion dans FileSystemStore
       * qui attend `source_title` (cohérence avec schéma DB direct).
       */
      const noteTitle = note.title || note.source_title || '';
      
      logger.info(LogCategory.EDITOR, '[CanvaStore] 🔍 Note loaded from API', {
        noteId: note.id,
        title: noteTitle,
        markdownLength: note.markdown_content?.length || 0,
        hasTitle: !!noteTitle
      });

      // Normaliser le champ title → source_title pour FileSystemStore
      const normalizedNote: FileSystemNote = {
        id: note.id,
        source_title: noteTitle,
        markdown_content: note.markdown_content || '',
        html_content: note.html_content || note.markdown_content || '',
        folder_id: note.folder_id ?? null,
        classeur_id: note.classeur_id ?? null,
        position: note.position ?? 0,
        created_at: note.created_at,
        updated_at: note.updated_at,
        slug: note.slug || '',
        public_url: note.public_url,
        header_image: note.header_image,
        header_image_offset: note.header_image_offset,
        header_image_blur: note.header_image_blur,
        header_image_overlay: note.header_image_overlay,
        header_title_in_image: note.header_title_in_image,
        wide_mode: note.wide_mode ?? false,
        a4_mode: note.a4_mode ?? false,
        slash_lang: note.slash_lang ?? 'en',
        font_family: note.font_family ?? 'Figtree',
        share_settings: note.share_settings as FileSystemNote['share_settings'],
        is_canva_draft: true
      };
      
      const fileSystemStore = useFileSystemStore.getState();
      fileSystemStore.addNote(normalizedNote);

      logger.info(LogCategory.EDITOR, '[CanvaStore] 🔍 Note added to FileSystemStore');

      // Créer session locale depuis note DB avec chatSessionId déjà hydraté
      const canvaSession: CanvaSession = {
        id: canvaId,
        chatSessionId, // ✅ Déjà récupéré depuis la vérification d'existence
        noteId: note.id,
        title: noteTitle,
        createdAt: note.created_at || new Date().toISOString(),
        isStreaming: false,
        streamBuffer: ''
      };

      logger.info(LogCategory.EDITOR, '[CanvaStore] 🔍 Creating canva session', {
        canvaSessionTitle: canvaSession.title,
        canvaSessionNoteId: canvaSession.noteId,
        hasTitle: !!canvaSession.title
      });

      set((state) => ({
        sessions: {
          ...state.sessions,
          [canvaId]: canvaSession
        },
        activeCanvaId: canvaId,
        isCanvaOpen: true
      }));

      // ✅ Fermer tous les autres canvas de cette chat session avant d'activer celui-ci
      try {
        if (chatSessionId) {
          await closeOtherOpenCanvases(chatSessionId, canvaId, authSession.access_token);
        }
      } catch (closeError) {
        logger.warn(LogCategory.EDITOR, '[CanvaStore] ⚠️ Error closing other canvases', closeError);
      }

      // ✅ Synchroniser status DB : switchCanva = status='open'
      await syncStatusToDB(canvaId, 'open', authSession.access_token);

      logger.info(LogCategory.EDITOR, '[CanvaStore] ✅ Canva switched (new session created)', {
        canvaId,
        noteId,
        title: noteTitle
      });

      return 'activated';

    } catch (error) {
      logger.error(LogCategory.EDITOR, '[CanvaStore] ❌ Failed to switch canva', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        canvaId,
        noteId
      });
      throw error;
    } finally {
      // ✅ Toujours cleanup le lock, même en cas d'erreur
      pendingSwitches.delete(canvaId);
    }
  },

  setActiveCanva: (sessionId) => {
    set((state) => {
      if (sessionId && !state.sessions[sessionId]) {
        return state;
      }

      return {
        activeCanvaId: sessionId,
        isCanvaOpen: !!sessionId
      };
    });
  },

  updateSession: (sessionId, updates) => {
    set((state) => {
      const session = state.sessions[sessionId];
      if (!session) {
        return state;
      }

      const merged: CanvaSession = {
        ...session,
        ...updates,
        lastUpdatedAt: new Date().toISOString()
      };

      return {
        sessions: {
          ...state.sessions,
          [sessionId]: merged
        }
      };
    });
  },

  reset: () => set({
    sessions: {},
    activeCanvaId: null,
    isCanvaOpen: false
  }),

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ✅ ACTIONS STREAMING
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Démarrer le streaming LLM
   * Suspend l'auto-save pendant le stream
   */
  startStreaming: (sessionId) => {
    set((state) => {
      const session = state.sessions[sessionId];
      if (!session) return state;

      logger.debug(LogCategory.EDITOR, '[CanvaStore] 🌊 Streaming started', {
        sessionId
      });

      return {
        sessions: {
          ...state.sessions,
          [sessionId]: {
            ...session,
            isStreaming: true,
            streamBuffer: '' // Reset buffer
          }
        }
      };
    });
  },

  /**
   * Ajouter un chunk de stream
   * Sera inséré dans TipTap par useEffect
   */
  appendStreamChunk: (sessionId, chunk) => {
    set((state) => {
      const session = state.sessions[sessionId];
      if (!session) return state;

      return {
        sessions: {
          ...state.sessions,
          [sessionId]: {
            ...session,
            streamBuffer: session.streamBuffer + chunk
          }
        }
      };
    });
  },

  /**
   * Terminer le streaming
   * Réactive l'auto-save
   */
  endStreaming: (sessionId) => {
    set((state) => {
      const session = state.sessions[sessionId];
      if (!session) return state;

      logger.debug(LogCategory.EDITOR, '[CanvaStore] ✅ Streaming ended', {
        sessionId,
        totalLength: session.streamBuffer.length
      });

      return {
        sessions: {
          ...state.sessions,
          [sessionId]: {
            ...session,
            isStreaming: false
            // streamBuffer gardé pour insertion finale
          }
        }
      };
    });
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ✅ ACTIONS MANIPULATION CONTENU (API V2 Endpoints)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Ajouter du contenu (pour endpoint /api/v2/agent/canva/append)
   * Manipulation locale → Auto-save différé
   */
  appendContent: (sessionId, content, position = 'end') => {
    set((state) => {
      const session = state.sessions[sessionId];
      if (!session) return state;

      const newBuffer = position === 'start'
        ? content + session.streamBuffer
        : session.streamBuffer + content;

      logger.info(LogCategory.EDITOR, '[CanvaStore] Content appended', {
        sessionId,
        contentLength: content.length,
        position
      });

      return {
        sessions: {
          ...state.sessions,
          [sessionId]: {
            ...session,
            streamBuffer: newBuffer
          }
        }
      };
    });
  },

  /**
   * Remplacer du contenu (pour endpoint /api/v2/agent/canva/replace)
   * Utilise regex pour remplacer pattern
   */
  replaceContent: (sessionId, pattern, newContent) => {
    set((state) => {
      const session = state.sessions[sessionId];
      if (!session) return state;

      try {
        const regex = new RegExp(pattern, 'g');
        const matches = (session.streamBuffer.match(regex) || []).length;
        const updatedBuffer = session.streamBuffer.replace(regex, newContent);

        logger.info(LogCategory.EDITOR, '[CanvaStore] Content replaced', {
          sessionId,
          pattern,
          matches,
          newContentLength: newContent.length
        });

        return {
          sessions: {
            ...state.sessions,
            [sessionId]: {
              ...session,
              streamBuffer: updatedBuffer
            }
          }
        };
      } catch (error) {
        logger.error(LogCategory.EDITOR, '[CanvaStore] Replace failed', error);
        return state;
      }
    });
  }
}));

