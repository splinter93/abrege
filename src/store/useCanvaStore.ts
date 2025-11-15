import { create } from 'zustand';
import { logger, LogCategory } from '@/utils/logger';
import { useFileSystemStore, type Note as FileSystemNote } from './useFileSystemStore';

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

export const useCanvaStore = create<CanvaStore>((set, get) => ({
  sessions: {},
  activeCanvaId: null,
  isCanvaOpen: false,

  /**
   * ✅ Ouvrir un nouveau canva V2
   * Appelle API /api/v2/canva/create
   */
  openCanva: async (userId, chatSessionId, options) => {
    try {
      logger.info(LogCategory.EDITOR, '[CanvaStore] Opening canva', {
        userId,
        chatSessionId,
        title: options?.title
      });

      // Recuperer token auth Supabase
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
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

      const payload = await response.json();
      const canvaSessionPayload = payload.canva_session;
      const canva_id: string = canvaSessionPayload?.id || payload.canva_id;
      const note_id: string = canvaSessionPayload?.note_id || payload.note_id;

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
          const notePayload = await noteResponse.json().catch(() => null);
          const apiNote = notePayload?.note as (Record<string, unknown> | undefined);

          if (apiNote) {
            const createdAt = (apiNote.created_at as string | undefined) || new Date().toISOString();
            const updatedAt = (apiNote.updated_at as string | undefined) || createdAt;
            noteForStore = {
              id: (apiNote.id as string) || note_id,
              source_title: (apiNote.title as string) || options?.title || 'Canva — Sans titre',
              markdown_content: (apiNote.markdown_content as string) || '',
              html_content: (apiNote.markdown_content as string) || '',
              folder_id: (apiNote.folder_id as string | null | undefined) ?? null,
              classeur_id: (apiNote.classeur_id as string | null | undefined) ?? null,
              position: typeof apiNote.position === 'number' ? apiNote.position : 0,
              created_at: createdAt,
              updated_at: updatedAt,
              slug: (apiNote.slug as string) || '',
              public_url: (apiNote.public_url as string | undefined) ?? undefined,
              header_image: (apiNote.header_image as string | undefined) ?? undefined,
              header_image_offset: (apiNote.header_image_offset as number | undefined) ?? undefined,
              header_image_blur: (apiNote.header_image_blur as number | undefined) ?? undefined,
              header_image_overlay: (apiNote.header_image_overlay as number | undefined) ?? undefined,
              header_title_in_image: (apiNote.header_title_in_image as boolean | undefined) ?? undefined,
              wide_mode: (apiNote.wide_mode as boolean | undefined) ?? false,
              a4_mode: (apiNote.a4_mode as boolean | undefined) ?? false,
              slash_lang: (apiNote.slash_lang as 'fr' | 'en' | undefined) ?? 'en',
              font_family: (apiNote.font_family as string | undefined) ?? 'Figtree',
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
  },

  /**
   * ✅ Fermer un canva
   * Options:
   * - delete: true → Supprimer note DB (annulation)
   * - delete: false → Garder note DB (sauvegarde ultérieure)
   */
  closeCanva: async (sessionId, options) => {
    const { activeCanvaId, sessions } = get();
    const targetId = sessionId || activeCanvaId;
    if (!targetId) {
      return;
    }

    const session = sessions[targetId] || null;

    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
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
    } catch (error) {
      logger.error(LogCategory.EDITOR, '[CanvaStore] ❌ Failed to delete canva session via API', {
        error,
        canvaId: targetId
      });
      throw error;
    }

    if (session) {
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
    }

    logger.info(LogCategory.EDITOR, '[CanvaStore] ✅ Canva closed & detached from chat', {
      sessionId: targetId,
      deleted: true
    });
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

      const { sessions } = useCanvaStore.getState();

      // Si session locale existe déjà, juste activer
      if (sessions[canvaId]) {
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
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data: { session: authSession } } = await supabase.auth.getSession();

      if (!authSession?.access_token) {
        throw new Error('No auth session');
      }

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

      const responseData = await response.json();
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
       * 
       * TODO (long terme) : Créer type `ApiNoteResponse` distinct de `Note`
       * pour typage explicite et éviter `as any`.
       */
      const noteTitle = (note as any).title || note.source_title || '';
      
      logger.info(LogCategory.EDITOR, '[CanvaStore] 🔍 Note loaded from API', {
        noteId: note.id,
        title: noteTitle,
        markdownLength: note.markdown_content?.length || 0,
        hasTitle: !!noteTitle
      });

      // Normaliser le champ title → source_title pour FileSystemStore
      const normalizedNote = {
        ...note,
        source_title: noteTitle
      };
      
      const fileSystemStore = useFileSystemStore.getState();
      fileSystemStore.addNote(normalizedNote as any);

      logger.info(LogCategory.EDITOR, '[CanvaStore] 🔍 Note added to FileSystemStore');

      // Créer session locale depuis note DB
      const canvaSession: CanvaSession = {
        id: canvaId,
        chatSessionId: '', // Pas utilisé pour switch, sera populated si besoin
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

