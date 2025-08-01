import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export interface ChatSession {
  id: string;
  name: string;
  thread: ChatMessage[];
  history_limit: number;
  created_at: string;
  updated_at: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

interface ChatStore {
  // État
  sessions: ChatSession[];
  currentSession: ChatSession | null;
  isWidgetOpen: boolean;
  isFullscreen: boolean;
  loading: boolean;
  error: string | null;
  
  // Actions
  setSessions: (sessions: ChatSession[]) => void;
  setCurrentSession: (session: ChatSession | null) => void;
  addMessage: (message: ChatMessage) => void;
  toggleWidget: () => void;
  openFullscreen: () => void;
  closeWidget: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  createSession: () => Promise<void>;
  loadSessions: () => Promise<void>;
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      // État initial
      sessions: [],
      currentSession: null,
      isWidgetOpen: false,
      isFullscreen: false,
      loading: false,
      error: null,

      // Actions
      setSessions: (sessions: ChatSession[]) => set({ sessions }),
      
      setCurrentSession: (session: ChatSession | null) => set({ currentSession: session }),
      
      addMessage: (message: ChatMessage) => {
        const { currentSession } = get();
        if (currentSession) {
          const updatedSession: ChatSession = {
            ...currentSession,
            thread: [...currentSession.thread, message],
            updated_at: new Date().toISOString()
          };
          set({ currentSession: updatedSession });
          
          // Mettre à jour la session dans la liste
          const { sessions } = get();
          const updatedSessions = sessions.map(s => 
            s.id === currentSession.id ? updatedSession : s
          );
          set({ sessions: updatedSessions });
        }
      },

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

      closeWidget: () => set({ isWidgetOpen: false }),

      setLoading: (loading: boolean) => set({ loading }),

      setError: (error: string | null) => set({ error }),

      createSession: async () => {
        const { setLoading, setError, sessions, setSessions, setCurrentSession } = get();
        
        setLoading(true);
        setError(null);
        
        try {
          const response = await fetch('/api/v1/chat-sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          });
          
          if (response.ok) {
            const data = await response.json() as ApiResponse<ChatSession>;
            const newSession = data.data;
            
            const updatedSessions = [...sessions, newSession];
            setSessions(updatedSessions);
            setCurrentSession(newSession);
          } else {
            setError('Erreur lors de la création de la session');
          }
        } catch (error) {
          console.error('Erreur lors de la création de session:', error);
          setError('Erreur réseau');
        } finally {
          setLoading(false);
        }
      },

      loadSessions: async () => {
        const { setLoading, setError, setSessions, setCurrentSession } = get();
        
        setLoading(true);
        setError(null);
        
        try {
          const response = await fetch('/api/v1/chat-sessions');
          const data = await response.json() as ApiResponse<ChatSession[]>;
          
          if (data.success && data.data) {
            setSessions(data.data);
            if (data.data.length > 0 && !get().currentSession) {
              setCurrentSession(data.data[0]);
            }
          }
        } catch (error) {
          console.error('Erreur lors du chargement des sessions:', error);
          setError('Erreur lors du chargement des sessions');
        } finally {
          setLoading(false);
        }
      },
    }),
    {
      name: 'chat-store',
      partialize: (state) => ({
        sessions: state.sessions,
        currentSession: state.currentSession,
      }),
    }
  )
); 