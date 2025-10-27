import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Agent, ChatMessage, EditingState } from '@/types/chat';
import { simpleLogger as logger } from '@/utils/logger';
import { sessionSyncService } from '@/services/sessionSyncService';

// Interface simplifiée pour le store (sans user_id, is_active, metadata)
export interface ChatSession {
  id: string;
  name: string;
  thread: ChatMessage[];
  history_limit: number;
  agent_id: string | null;
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
  editingMessage: EditingState | null;
  
  // 🔄 Actions de base
  setSessions: (sessions: ChatSession[]) => void;
  setCurrentSession: (session: ChatSession | null) => void;
  setSelectedAgent: (agent: Agent | null) => void;
  setSelectedAgentId: (agentId: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // 🎮 Actions UI
  openFullscreen: () => void;
  
  // ✏️ Actions d'édition de messages
  startEditingMessage: (messageId: string, content: string, index: number) => void;
  cancelEditing: () => void;
  
  // ⚡ Actions avec fonctionnalités essentielles
  syncSessions: () => Promise<void>;
  createSession: (name?: string, agentId?: string | null) => Promise<void>;
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
      editingMessage: null,

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

      // ✏️ Actions d'édition de messages
      startEditingMessage: (messageId: string, content: string, index: number) => {
        set({ 
          editingMessage: {
            messageId,
            originalContent: content,
            messageIndex: index
          }
        });
        logger.dev('[ChatStore] ✏️ Mode édition activé:', { messageId, index });
      },

      cancelEditing: () => {
        set({ editingMessage: null });
        logger.dev('[ChatStore] ❌ Mode édition annulé');
      },

      // ⚡ Actions avec fonctionnalités essentielles
      syncSessions: async () => {
        try {
          const result = await sessionSyncService.syncSessionsFromDB();
          if (result.success && result.sessions) {
            get().setSessions(result.sessions);
          }
        } catch (error) {
          logger.error('[ChatStore] Erreur syncSessions:', error);
        }
      },

      createSession: async (name: string = 'Nouvelle conversation', agentId?: string | null) => {
        try {
          const result = await sessionSyncService.createSessionAndSync(name, agentId);
          if (result.success && result.session) {
            const currentSessions = get().sessions;
            const updatedSessions = [result.session, ...currentSessions];
            
            set({ 
              sessions: updatedSessions,
              currentSession: result.session
            });
            
            logger.dev('[ChatStore] ✅ Nouvelle session créée:', {
              id: result.session.id,
              name: result.session.name,
              agentId: result.session.agent_id,
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
            const extLastMsg = lastMessage as ChatMessage & { channel?: string };
            if (lastMessage && extLastMsg.channel === 'analysis') {
              // Remplacer le message temporaire
              const messageWithId: ChatMessage = {
                ...message,
                id: lastMessage.id // Garder le même ID
              };
              updatedThread = [...currentSession.thread.slice(0, -1), messageWithId];
              
              if (process.env.NODE_ENV === 'development') {
                const extMsg = messageWithId as ChatMessage & { 
                  tool_calls?: unknown[]; 
                  reasoning?: string; 
                };
                logger.dev('[ChatStore] Message temporaire remplacé par le message final:', {
                  messageId: messageWithId.id,
                  role: messageWithId.role,
                  content: messageWithId.content?.substring(0, 50) + '...',
                  channel: messageWithId.channel,
                  hasToolCalls: !!extMsg.tool_calls?.length,
                  hasReasoning: !!extMsg.reasoning
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
              const extMsg = messageWithId as ChatMessage & { 
                tool_calls?: unknown[]; 
                reasoning?: string; 
              };
              logger.dev('[ChatStore] Nouveau message ajouté:', {
                messageId: messageWithId.id,
                role: messageWithId.role,
                content: messageWithId.content?.substring(0, 50) + '...',
                channel: messageWithId.channel,
                hasToolCalls: !!extMsg.tool_calls?.length,
                hasReasoning: !!extMsg.reasoning,
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
          await sessionSyncService.deleteSessionAndSync(sessionId);
          get().syncSessions();
        } catch (error) {
          logger.error('[ChatStore] Erreur deleteSession:', error);
        }
      },

      updateSession: async (sessionId: string, data: { name?: string; history_limit?: number }) => {
        try {
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