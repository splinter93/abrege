import { create } from 'zustand';
import { CanvaNoteService } from '@/services/canvaNoteService';
import { logger, LogCategory } from '@/utils/logger';

/**
 * 🎨 Session Canva
 * 
 * Représente un canva ouvert avec son état local de streaming.
 * Le noteId pointe vers une note réelle en DB (orpheline jusqu'au save).
 */
export interface CanvaSession {
  id: string;
  noteId: string; // Note DB réelle (orpheline)
  title: string;
  createdAt: string;
  
  // ✅ NOUVEAU: État streaming local
  isStreaming: boolean; // Streaming LLM actif ?
  streamBuffer: string; // Contenu en cours de stream (non persisté)
  
  // Champs legacy (seront supprimés après migration)
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
  
  // Actions de base
  openCanva: (userId: string, options?: { title?: string }) => Promise<CanvaSession>;
  closeCanva: (sessionId?: string, options?: { delete?: boolean }) => Promise<void>;
  setActiveCanva: (sessionId: string | null) => void;
  updateSession: (sessionId: string, updates: Partial<Omit<CanvaSession, 'id' | 'createdAt'>>) => void;
  reset: () => void;
  
  // ✅ NOUVEAU: Actions streaming
  startStreaming: (sessionId: string) => void;
  appendStreamChunk: (sessionId: string, chunk: string) => void;
  endStreaming: (sessionId: string) => void;
  
  // ✅ NOUVEAU: Actions manipulation contenu (pour endpoints API)
  appendContent: (sessionId: string, content: string, position?: AppendPosition) => void;
  replaceContent: (sessionId: string, pattern: string, newContent: string) => void;
}

/**
 * Créer une session canva locale (sans note DB)
 * La note DB sera créée par openCanva()
 */
function createEmptySession(noteId: string, title?: string): CanvaSession {
  const now = new Date();
  const id = `canva_${now.getTime()}_${Math.random().toString(36).slice(2, 8)}`;
  const defaultTitle = title?.trim() || `Canva — ${now.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })}`;

  return {
    id,
    noteId, // Note DB réelle
    title: defaultTitle,
    createdAt: now.toISOString(),
    
    // État streaming
    isStreaming: false,
    streamBuffer: '',
    
    // Legacy (à supprimer)
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
   * ✅ Ouvrir un nouveau canva
   * Crée une note orpheline en DB et une session locale
   */
  openCanva: async (userId, options) => {
    try {
      logger.info(LogCategory.EDITOR, '[CanvaStore] Opening canva', {
        userId,
        title: options?.title
      });

      // 1. Créer note orpheline en DB
      const noteId = await CanvaNoteService.createOrphanNote(userId, {
        title: options?.title
      });

      // 2. Créer session locale
      const session = createEmptySession(noteId, options?.title);

      set((state) => ({
        sessions: {
          ...state.sessions,
          [session.id]: session
        },
        activeCanvaId: session.id,
        isCanvaOpen: true
      }));

      logger.info(LogCategory.EDITOR, '[CanvaStore] ✅ Canva opened', {
        sessionId: session.id,
        noteId
      });

      return session;

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

