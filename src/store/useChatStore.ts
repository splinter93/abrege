import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Agent, ChatMessage } from '@/types/chat';
import { simpleLogger as logger } from '@/utils/logger';

export interface ChatSession {
  id: string;
  name: string;
  thread: ChatMessage[];
  history_limit: number;
  created_at: string;
  updated_at: string;
}

interface ChatStore {
  // 🎯 État
  sessions: ChatSession[];
  currentSession: ChatSession | null;
  selectedAgent: Agent | null;
  selectedAgentId: string | null;
  isWidgetOpen: boolean;
  isFullscreen: boolean;
  loading: boolean;
  error: string | null;
  
  // 🔄 Actions de base
  setSessions: (sessions: ChatSession[]) => void;
  setCurrentSession: (session: ChatSession | null) => void;
  setSelectedAgent: (agent: Agent | null) => void;
  setSelectedAgentId: (agentId: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // 🎮 Actions UI
  toggleWidget: () => void;
  openFullscreen: () => void;
  closeWidget: () => void;
  
  // ⚡ Actions avec fonctionnalités essentielles
  syncSessions: () => Promise<void>;
  createSession: (name?: string) => Promise<void>;
  addMessage: (message: Omit<ChatMessage, 'id'>, options?: { persist?: boolean; updateExisting?: boolean }) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  updateSession: (sessionId: string, data: { name?: string; history_limit?: number }) => Promise<void>;
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      // 🎯 État initial
      sessions: [],
      currentSession: null,
      selectedAgent: null,
      selectedAgentId: null,
      isWidgetOpen: false,
      isFullscreen: false,
      loading: false,
      error: null,

      // 🔄 Actions de base
      setSessions: (sessions: ChatSession[]) => set({ sessions }),
      setCurrentSession: (session: ChatSession | null) => set({ currentSession: session }),
      setSelectedAgent: (agent: Agent | null) => set({ 
        selectedAgent: agent,
        selectedAgentId: agent?.id || null 
      }),
      setSelectedAgentId: (agentId: string | null) => set({ selectedAgentId: agentId }),
      setLoading: (loading: boolean) => set({ loading }),
      setError: (error: string | null) => set({ error }),

      // 🎮 Actions UI
      toggleWidget: () => {
        const { isWidgetOpen } = get();
        set({ isWidgetOpen: !isWidgetOpen });
      },

      openFullscreen: () => {
        set({ isFullscreen: true, isWidgetOpen: false });
        if (typeof window !== 'undefined') {
          window.location.href = '/chat';
        }
      },

      closeWidget: () => set({ isWidgetOpen: false, isFullscreen: false }),

      // ⚡ Actions avec fonctionnalités essentielles
      syncSessions: async () => {
        try {
          const { sessionSyncService } = await import('@/services/sessionSyncService');
          const result = await sessionSyncService.syncSessionsFromDB();
          if (result.success && result.sessions) {
            get().setSessions(result.sessions);
          }
        } catch (error) {
          logger.error('[ChatStore] Erreur syncSessions:', error);
        }
      },

      createSession: async (name: string = 'Nouvelle conversation') => {
        try {
          const { sessionSyncService } = await import('@/services/sessionSyncService');
          const result = await sessionSyncService.createSessionAndSync(name);
          if (result.success && result.session) {
            get().setCurrentSession(result.session);
            get().syncSessions();
          }
        } catch (error) {
          logger.error('[ChatStore] Erreur createSession:', error);
        }
      },

      addMessage: async (message: Omit<ChatMessage, 'id'>, options?: { persist?: boolean; updateExisting?: boolean }) => {
        const currentSession = get().currentSession;
        if (!currentSession) {
          logger.warn('[ChatStore] Aucune session active pour addMessage');
          return;
        }

        try {
          // Créer le message avec ID
          const messageWithId: ChatMessage = {
            ...message,
            id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          };

          // Mise à jour optimiste immédiate
          const updatedThread = [...currentSession.thread, messageWithId];
          const updatedSession = {
            ...currentSession,
            thread: updatedThread,
            updated_at: new Date().toISOString()
          };

          // Mettre à jour le store immédiatement
          get().setCurrentSession(updatedSession);
          logger.dev('[ChatStore] Message ajouté optimistiquement');

          // Persister en DB si demandé
          if (options?.persist !== false) {
            const { sessionSyncService } = await import('@/services/sessionSyncService');
            await sessionSyncService.addMessageAndSync(currentSession.id, message);
            // Synchroniser pour avoir les données à jour
            get().syncSessions();
          }
        } catch (error) {
          logger.error('[ChatStore] Erreur addMessage:', error);
          // Rollback en cas d'erreur
          get().setCurrentSession(currentSession);
        }
      },

      deleteSession: async (sessionId: string) => {
        try {
          const { sessionSyncService } = await import('@/services/sessionSyncService');
          await sessionSyncService.deleteSessionAndSync(sessionId);
          get().syncSessions();
        } catch (error) {
          logger.error('[ChatStore] Erreur deleteSession:', error);
        }
      },

      updateSession: async (sessionId: string, data: { name?: string; history_limit?: number }) => {
        try {
          const { sessionSyncService } = await import('@/services/sessionSyncService');
          await sessionSyncService.updateSessionAndSync(sessionId, data);
          get().syncSessions();
        } catch (error) {
          logger.error('[ChatStore] Erreur updateSession:', error);
        }
      },
    }),
    {
      name: 'chat-store',
      partialize: (state) => ({
        isWidgetOpen: state.isWidgetOpen,
        isFullscreen: state.isFullscreen,
        selectedAgentId: state.selectedAgentId,
      }),
    }
  )
); 