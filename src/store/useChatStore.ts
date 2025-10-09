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
  openFullscreen: () => void;
  
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
      openFullscreen: () => {
        set({ isFullscreen: true });
        if (typeof window !== 'undefined') {
          window.location.href = '/chat';
        }
      },

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
            // ✅ FIX: Ajouter la nouvelle session à la liste SANS re-synchroniser toutes les sessions
            // Cela évite une race condition qui pourrait charger l'ancienne session
            const currentSessions = get().sessions;
            const updatedSessions = [result.session, ...currentSessions];
            
            // Mettre à jour la liste ET la session courante en une seule fois
            set({ 
              sessions: updatedSessions,
              currentSession: result.session
            });
            
            logger.dev('[ChatStore] ✅ Nouvelle session créée:', {
              id: result.session.id,
              name: result.session.name,
              threadLength: result.session.thread.length
            });
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
          let updatedThread: ChatMessage[];
          
          if (options?.updateExisting) {
            // ✅ Remplacer le dernier message temporaire (canal 'analysis') par le message final
            const lastMessage = currentSession.thread[currentSession.thread.length - 1];
            if (lastMessage && (lastMessage as any).channel === 'analysis') {
              // Remplacer le message temporaire
              const messageWithId: ChatMessage = {
                ...message,
                id: lastMessage.id // Garder le même ID
              };
              updatedThread = [...currentSession.thread.slice(0, -1), messageWithId];
              
              if (process.env.NODE_ENV === 'development') {
                logger.dev('[ChatStore] Message temporaire remplacé par le message final:', {
                  messageId: messageWithId.id,
                  role: messageWithId.role,
                  content: messageWithId.content?.substring(0, 50) + '...',
                  channel: messageWithId.channel,
                  hasToolCalls: !!(messageWithId as any).tool_calls?.length,
                  hasReasoning: !!(messageWithId as any).reasoning
                });
              }
            } else {
              // Pas de message temporaire à remplacer, ajouter normalement
              const messageWithId: ChatMessage = {
                ...message,
                id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
              };
              updatedThread = [...currentSession.thread, messageWithId];
            }
          } else {
            // Ajouter un nouveau message
            const messageWithId: ChatMessage = {
              ...message,
              id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
            };
            updatedThread = [...currentSession.thread, messageWithId];
            
            // Log optimisé pour le debugging
            if (process.env.NODE_ENV === 'development') {
              logger.dev('[ChatStore] Nouveau message ajouté:', {
                messageId: messageWithId.id,
                role: messageWithId.role,
                content: messageWithId.content?.substring(0, 50) + '...',
                channel: messageWithId.channel,
                hasToolCalls: !!(messageWithId as any).tool_calls?.length,
                hasReasoning: !!(messageWithId as any).reasoning,
                threadLength: updatedThread.length
              });
            }
          }

          const updatedSession = {
            ...currentSession,
            thread: updatedThread,
            updated_at: new Date().toISOString()
          };

          // Mettre à jour le store immédiatement
          get().setCurrentSession(updatedSession);

          // Persister en DB si demandé
          if (options?.persist !== false) {
            const { sessionSyncService } = await import('@/services/sessionSyncService');
            await sessionSyncService.addMessageAndSync(currentSession.id, message);
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
        isFullscreen: state.isFullscreen,
        selectedAgentId: state.selectedAgentId,
      }),
    }
  )
); 