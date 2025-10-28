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
  addMessage: (message: Omit<ChatMessage, 'id'>, options?: { persist?: boolean; updateExisting?: boolean }) => Promise<ChatMessage | null>;
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

      addMessage: async (message: Omit<ChatMessage, 'id'>, options?: { persist?: boolean; updateExisting?: boolean }): Promise<ChatMessage | null> => {
        const currentSession = get().currentSession;
        if (!currentSession) {
          logger.warn('[ChatStore] Aucune session active pour addMessage');
          return null;
        }

        try {
          // ✅ REFACTOR: Sauvegarde directement en DB via HistoryManager
          
          // Persister en DB
          if (options?.persist !== false) {
            const result = await sessionSyncService.addMessageAndSync(currentSession.id, message);
            
            if (result.success && result.message) {
              logger.dev('[ChatStore] ✅ Message sauvegardé en DB:', {
                sessionId: currentSession.id,
                sequenceNumber: result.message.sequence_number,
                role: result.message.role,
                contentPreview: result.message.content?.substring(0, 50)
              });
              
              return result.message;  // ✅ Retourner message complet
            }
          }
          
          return null;
          
        } catch (error) {
          logger.error('[ChatStore] Erreur addMessage:', error);
          throw error;
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