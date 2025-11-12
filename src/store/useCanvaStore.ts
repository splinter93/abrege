import { create } from 'zustand';
import { logger, LogCategory } from '@/utils/logger';
import { useFileSystemStore, type Note as FileSystemNote } from './useFileSystemStore';

/**
 * 🎨 Session Canva V2
 * 
 * Architecture propre avec table canva_sessions
 * Lien vers chat_sessions + note DB reelle
 */
export interface CanvaSession {
  id: string; // canva_sessions.id (UUID)
  chatSessionId: string; // Lien vers chat_sessions
  noteId: string; // Note DB reelle
  title: string;
  createdAt: string;
  
  // État streaming local
  isStreaming: boolean;
  streamBuffer: string;
  
  // Champs legacy (a supprimer progressivement)
  markdownDraft: string;
  htmlDraft: string;
  coverImage?: string | null;
  lastUpdatedAt: string;
}

/**
 * Position d'insertion pour appendContent
 */
export type AppendPosition = 'start' | 'end';

interface CanvaStore {
  sessions: Record<string, CanvaSession>;
  activeCanvaId: string | null;
  isCanvaOpen: boolean;
  
  // Actions de base V2
  openCanva: (userId: string, chatSessionId: string, options?: { title?: string }) => Promise<CanvaSession>;
  switchCanva: (canvaId: string, noteId: string) => Promise<void>;
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
    id: canvaId, // canva_sessions.id
    chatSessionId, // Lien chat_sessions
    noteId, // Note DB reelle
    title: defaultTitle,
    createdAt: now.toISOString(),
    
    // État streaming
    isStreaming: false,
    streamBuffer: '',
    
    // Legacy (a supprimer)
    markdownDraft: '',
    htmlDraft: '',
    coverImage: null,
    lastUpdatedAt: now.toISOString()
  };
}

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

      // Appel API V2 avec auth header
      const response = await fetch('/api/v2/canva/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`, // ✅ FIX: Token JWT
          'X-Client-Type': 'canva_store'
        },
        body: JSON.stringify({
          chat_session_id: chatSessionId,
          title: options?.title
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(`API error ${response.status}: ${errorData.error || response.statusText}`);
      }

      const { canva_id, note_id } = await response.json();

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
        options?.title
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

    const session = sessions[targetId];
    if (!session) {
      return;
    }

    // Supprimer note DB si demandé
    if (options?.delete) {
      try {
        // Note: userId devrait être passé en paramètre
        // Pour l'instant, on laisse le service gérer l'erreur
        logger.warn(LogCategory.EDITOR, '[CanvaStore] Delete option requires userId, skipping DB delete');
      } catch (error) {
        logger.error(LogCategory.EDITOR, '[CanvaStore] Failed to delete note', error);
        // Continue quand même
      }
    }

    set((state) => {
      if (!state.sessions[targetId]) {
        return state;
      }

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

    logger.info(LogCategory.EDITOR, '[CanvaStore] ✅ Canva closed', {
      sessionId: targetId,
      deleted: options?.delete
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
    try {
      console.log('🔥🔥🔥 [CanvaStore] switchCanva DÉBUT', { canvaId, noteId });
      
      logger.info(LogCategory.EDITOR, '[CanvaStore] Switching to canva', {
        canvaId,
        noteId
      });

      const { sessions } = useCanvaStore.getState();
      
      console.log('🔥 [CanvaStore] Sessions actuelles:', Object.keys(sessions));

      // Si session locale existe déjà, juste activer
      if (sessions[canvaId]) {
        console.log('🔥 [CanvaStore] Session existe déjà, activation...');
        set({
          activeCanvaId: canvaId,
          isCanvaOpen: true
        });

        logger.info(LogCategory.EDITOR, '[CanvaStore] ✅ Canva switched (existing session)', {
          canvaId
        });
        return;
      }
      
      console.log('🔥 [CanvaStore] Session inexistante, chargement depuis API...');

      // Charger la note depuis DB via API V2
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data: { session: authSession } } = await supabase.auth.getSession();

      if (!authSession?.access_token) {
        console.error('🔥❌ [CanvaStore] No auth session');
        throw new Error('No auth session');
      }
      
      console.log('🔥 [CanvaStore] Fetching note from API:', `/api/v2/note/${noteId}`);

      const response = await fetch(`/api/v2/note/${noteId}`, {
        headers: {
          'Authorization': `Bearer ${authSession.access_token}`,
          'X-Client-Type': 'canva_switch'
        }
      });
      
      console.log('🔥 [CanvaStore] API response status:', response.status);

      if (!response.ok) {
        console.error('🔥❌ [CanvaStore] API error:', response.status);
        throw new Error(`API error: ${response.status}`);
      }

      const responseData = await response.json();
      console.log('🔥🔥🔥 [CanvaStore] API response data:', responseData);
      
      const { note } = responseData;
      if (!note) {
        throw new Error('Note introuvable dans API response');
      }

      // ✅ FIX: L'API V2 retourne "title" au lieu de "source_title"
      const noteTitle = (note as any).title || note.source_title || '';
      
      logger.info(LogCategory.EDITOR, '[CanvaStore] 🔍 Note loaded from API', {
        noteId: note.id,
        title: noteTitle,
        markdownLength: note.markdown_content?.length || 0,
        hasTitle: !!noteTitle
      });

      // Ajouter note dans FileSystemStore pour que l'éditeur puisse y accéder
      // ✅ FIX: Normaliser le champ title → source_title pour le store
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
        chatSessionId: '', // Pas utilisé pour switch
        noteId: note.id,
        title: noteTitle,
        createdAt: note.created_at || new Date().toISOString(),
        isStreaming: false,
        streamBuffer: '',
        markdownDraft: note.markdown_content || '',
        htmlDraft: note.html_content || '',
        coverImage: note.header_image,
        lastUpdatedAt: note.updated_at || new Date().toISOString()
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
        title: note.source_title
      });

    } catch (error) {
      logger.error(LogCategory.EDITOR, '[CanvaStore] ❌ Failed to switch canva', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        canvaId,
        noteId
      });
      throw error;
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

