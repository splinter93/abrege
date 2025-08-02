import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/supabaseClient';

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
  addMessage: (message: ChatMessage) => Promise<void>;
  toggleWidget: () => void;
  openFullscreen: () => void;
  closeWidget: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  createSession: () => Promise<void>;
  loadSessions: () => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  updateHistoryLimit: (sessionId: string, historyLimit: number) => Promise<void>;
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
      
      addMessage: async (message: ChatMessage) => {
        const { currentSession } = get();
        if (currentSession) {
          // Mettre à jour localement d'abord pour une UX fluide
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

          // Sauvegarder via l'API si ce n'est pas une session temporaire
          if (!currentSession.id.startsWith('temp-')) {
            try {
              console.log('[Chat Store] 💾 Sauvegarde du message via API...');
              
              // Récupérer le token d'authentification
              const { data: { session } } = await supabase.auth.getSession();
              const token = session?.access_token;
              
              if (!token) {
                console.warn('[Chat Store] ❌ Pas de token d\'authentification pour sauvegarde');
                return;
              }
              
              const response = await fetch(`/api/v1/chat-sessions/${currentSession.id}/messages`, {
                method: 'POST',
                headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                  role: message.role,
                  content: message.content
                })
              });

              if (response.ok) {
                console.log('[Chat Store] ✅ Message sauvegardé avec succès');
              } else {
                console.error('[Chat Store] ❌ Erreur sauvegarde message:', response.status);
                // Le message reste en local même si la sauvegarde échoue
              }
            } catch (error) {
              console.error('[Chat Store] ❌ Erreur réseau sauvegarde message:', error);
              // Le message reste en local même si la sauvegarde échoue
            }
          } else {
            console.log('[Chat Store] 🧪 Message temporaire (pas de sauvegarde API)');
          }
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
          console.log('[Chat Store] 📝 Tentative de création de session...');
          
          // Récupérer le token d'authentification
          const { data: { session } } = await supabase.auth.getSession();
          const token = session?.access_token;
          
          if (!token) {
            console.warn('[Chat Store] ❌ Pas de token d\'authentification');
            // Créer une session temporaire en local
            const tempSession: ChatSession = {
              id: `temp-${Date.now()}`,
              name: 'Nouvelle conversation',
              thread: [],
              history_limit: 10,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            
            const { sessions } = get();
            const updatedSessions = [...sessions, tempSession];
            setSessions(updatedSessions);
            setCurrentSession(tempSession);
            return;
          }
          
          const response = await fetch('/api/v1/chat-sessions', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              name: 'Nouvelle conversation',
              history_limit: 10
            })
          });
          
          console.log('[Chat Store] 📡 Réponse API:', {
            status: response.status,
            statusText: response.statusText,
            ok: response.ok
          });
          
          if (response.ok) {
            const responseText = await response.text();
            console.log('[Chat Store] 📄 Réponse brute:', responseText);
            
            if (!responseText) {
              throw new Error('Réponse vide de l\'API');
            }
            
            const data = JSON.parse(responseText) as ApiResponse<ChatSession>;
            const newSession = data.data;
            
            const updatedSessions = [...sessions, newSession];
            setSessions(updatedSessions);
            setCurrentSession(newSession);
            
            console.log('[Chat Store] ✅ Session créée avec succès:', newSession.id);
          } else {
            let errorData;
            try {
              const responseText = await response.text();
              console.log('[Chat Store] ❌ Réponse d\'erreur brute:', responseText);
              errorData = responseText ? JSON.parse(responseText) : {};
            } catch (parseError) {
              console.error('[Chat Store] ❌ Erreur parsing réponse:', parseError);
              errorData = { error: 'Réponse invalide de l\'API' };
            }
            
            console.error('[Chat Store] ❌ Erreur API:', {
              status: response.status,
              statusText: response.statusText,
              data: errorData
            });
            
            // Créer une session temporaire en local si l'API échoue
            const tempSession: ChatSession = {
              id: `temp-${Date.now()}`,
              name: 'Nouvelle conversation',
              thread: [],
              history_limit: 10,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            
            const updatedSessions = [...sessions, tempSession];
            setSessions(updatedSessions);
            setCurrentSession(tempSession);
            
            console.warn('[Chat Store] 🧪 Session temporaire créée en local');
          }
        } catch (error) {
          console.error('[Chat Store] ❌ Erreur lors de la création de session:', error);
          
          // Créer une session temporaire en local en cas d'erreur réseau
          const tempSession: ChatSession = {
            id: `temp-${Date.now()}`,
            name: 'Nouvelle conversation',
            thread: [],
            history_limit: 10,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          
          const { sessions } = get();
          const updatedSessions = [...sessions, tempSession];
          setSessions(updatedSessions);
          setCurrentSession(tempSession);
          
          console.warn('[Chat Store] 🧪 Session temporaire créée en local (erreur réseau)');
        } finally {
          setLoading(false);
        }
      },

      loadSessions: async () => {
        const { setLoading, setError, setSessions, setCurrentSession } = get();
        
        setLoading(true);
        setError(null);
        
        try {
          // Récupérer le token d'authentification
          const { data: { session } } = await supabase.auth.getSession();
          const token = session?.access_token;
          
          if (!token) {
            console.warn('[Chat Store] ❌ Pas de token d\'authentification');
            // Utiliser les sessions stockées localement
            const { sessions } = get();
            if (sessions.length > 0 && !get().currentSession) {
              setCurrentSession(sessions[0]);
            }
            return;
          }
          
          const response = await fetch('/api/v1/chat-sessions', {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.ok) {
            const data = await response.json() as ApiResponse<ChatSession[]>;
            
            if (data.success && data.data) {
              setSessions(data.data);
              if (data.data.length > 0 && !get().currentSession) {
                setCurrentSession(data.data[0]);
              }
            }
          } else {
            console.warn('Erreur lors du chargement des sessions, utilisation des sessions locales');
            // Utiliser les sessions stockées localement
            const { sessions } = get();
            if (sessions.length > 0 && !get().currentSession) {
              setCurrentSession(sessions[0]);
            }
          }
        } catch (error) {
          console.error('Erreur lors du chargement des sessions:', error);
          console.warn('Utilisation des sessions stockées localement');
          
          // Utiliser les sessions stockées localement
          const { sessions } = get();
          if (sessions.length > 0 && !get().currentSession) {
            setCurrentSession(sessions[0]);
          }
        } finally {
          setLoading(false);
        }
      },

      deleteSession: async (sessionId: string) => {
        const { setLoading, setError, sessions, setSessions, currentSession, setCurrentSession } = get();
        
        setLoading(true);
        setError(null);
        
        try {
          // Récupérer le token d'authentification
          const { data: { session } } = await supabase.auth.getSession();
          const token = session?.access_token;
          
          if (!token) {
            console.warn('[Chat Store] ❌ Pas de token d\'authentification pour suppression');
            // Supprimer quand même en local si c'est une session temporaire
            if (sessionId.startsWith('temp-')) {
              const updatedSessions = sessions.filter(s => s.id !== sessionId);
              setSessions(updatedSessions);
              
              if (currentSession?.id === sessionId) {
                if (updatedSessions.length > 0) {
                  setCurrentSession(updatedSessions[0]);
                } else {
                  setCurrentSession(null);
                }
              }
            }
            return;
          }
          
          const response = await fetch(`/api/v1/chat-sessions/${sessionId}`, {
            method: 'DELETE',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
          });
          
          if (response.ok) {
            // Supprimer de la liste locale
            const updatedSessions = sessions.filter(s => s.id !== sessionId);
            setSessions(updatedSessions);
            
            // Si c'était la session courante, sélectionner la première disponible
            if (currentSession?.id === sessionId) {
              if (updatedSessions.length > 0) {
                setCurrentSession(updatedSessions[0]);
              } else {
                setCurrentSession(null);
              }
            }
          } else {
            const errorData = await response.json();
            console.error('Erreur suppression API:', errorData);
            
            // Supprimer quand même en local si c'est une session temporaire
            if (sessionId.startsWith('temp-')) {
              const updatedSessions = sessions.filter(s => s.id !== sessionId);
              setSessions(updatedSessions);
              
              if (currentSession?.id === sessionId) {
                if (updatedSessions.length > 0) {
                  setCurrentSession(updatedSessions[0]);
                } else {
                  setCurrentSession(null);
                }
              }
            } else {
              setError('Erreur lors de la suppression de la session');
            }
          }
        } catch (error) {
          console.error('Erreur lors de la suppression:', error);
          
          // Supprimer quand même en local si c'est une session temporaire
          if (sessionId.startsWith('temp-')) {
            const { sessions, currentSession } = get();
            const updatedSessions = sessions.filter(s => s.id !== sessionId);
            setSessions(updatedSessions);
            
            if (currentSession?.id === sessionId) {
              if (updatedSessions.length > 0) {
                setCurrentSession(updatedSessions[0]);
              } else {
                setCurrentSession(null);
              }
            }
          } else {
            setError('Erreur réseau lors de la suppression');
          }
        } finally {
          setLoading(false);
        }
      },

      updateHistoryLimit: async (sessionId: string, historyLimit: number) => {
        const { setLoading, setError, sessions, setSessions, currentSession, setCurrentSession } = get();
        
        setLoading(true);
        setError(null);
        
        try {
          const response = await fetch(`/api/v1/chat-sessions/${sessionId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ history_limit: historyLimit })
          });

          if (response.ok) {
            const updatedSession = {
              ...currentSession!,
              history_limit: historyLimit,
              updated_at: new Date().toISOString()
            };
            setCurrentSession(updatedSession);

            const updatedSessions = sessions.map(s =>
              s.id === sessionId ? updatedSession : s
            );
            setSessions(updatedSessions);
            console.log(`[Chat Store] ✅ Historique limité mis à jour pour la session ${sessionId}`);
          } else {
            const errorData = await response.json();
            console.error(`[Chat Store] ❌ Erreur lors de la mise à jour du historique limité pour la session ${sessionId}:`, errorData);
            setError('Erreur lors de la mise à jour du historique limité');
          }
        } catch (error) {
          console.error(`[Chat Store] ❌ Erreur réseau lors de la mise à jour du historique limité pour la session ${sessionId}:`, error);
          setError('Erreur réseau lors de la mise à jour du historique limité');
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