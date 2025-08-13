import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/supabaseClient';
import { SessionSyncService } from '@/services/sessionSyncService';
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
  selectedAgentId: string | null; // Ajouté pour la persistance
  isWidgetOpen: boolean;
  isFullscreen: boolean;
  loading: boolean;
  error: string | null;
  
  // 🔄 Actions de base
  setSessions: (sessions: ChatSession[]) => void;
  setCurrentSession: (session: ChatSession | null) => void;
  setSelectedAgent: (agent: Agent | null) => void;
  setSelectedAgentId: (agentId: string | null) => void; // Ajouté
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // 🎮 Actions UI
  toggleWidget: () => void;
  openFullscreen: () => void;
  closeWidget: () => void;
  
  // ⚡ Actions optimisées avec optimistic updates
  syncSessions: () => Promise<void>;
  createSession: (name?: string) => Promise<void>;
  addMessage: (message: Omit<ChatMessage, 'id'>, options?: { persist?: boolean; updateExisting?: boolean }) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  updateSession: (sessionId: string, data: { name?: string; history_limit?: number }) => Promise<void>;
  
  // 🔧 Fonctions utilitaires pour la DB
  saveMessageToDB: (sessionId: string, message: Omit<ChatMessage, 'id'>) => Promise<void>;
  updateMessageInDB: (sessionId: string, message: ChatMessage) => Promise<void>;
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
      setSessions: (sessions: ChatSession[]) => set({ sessions: Array.isArray(sessions) ? sessions.map((s) => {
        // Normaliser le thread: IDs stables + tri chronologique
        const normalizedThread = (s.thread || [])
          .map((m, idx) => ({
            ...m,
            id: m.id || `${m.role}-${m.timestamp}-${(m as any).tool_call_id || ''}-${idx}`
          }))
          .sort((a, b) => {
            const ta = new Date(a.timestamp).getTime();
            const tb = new Date(b.timestamp).getTime();
            return ta - tb;
          });
        return { ...s, thread: normalizedThread };
      }) : [] }),
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

      closeWidget: () => set({ isWidgetOpen: false }),

      // ⚡ Actions optimisées avec optimistic updates
      
      /**
       * 🔄 Synchroniser les sessions depuis la DB
       */
      syncSessions: async () => {
        const { setLoading, setError, setSessions } = get();
        
        setLoading(true);
        setError(null);
        
        try {
          logger.dev('[Chat Store] 🔄 Synchronisation depuis DB...');
          
          // Vérifier l'authentification
          const { data: { session } } = await supabase.auth.getSession();
          if (!session?.access_token) {
            logger.dev('[Chat Store] ⚠️ Utilisateur non authentifié');
            setSessions([]);
            setError('Utilisateur non authentifié');
            return;
          }

          // Utiliser le service de synchronisation
          const result = await SessionSyncService.getInstance().syncSessionsFromDB();
          
          if (!result.success) {
            throw new Error(result.error || 'Erreur synchronisation');
          }

          if (result.sessions) {
            setSessions(result.sessions);
            logger.dev('[Chat Store] ✅ Sessions synchronisées:', result.sessions.length);
          }
          
        } catch (error) {
          logger.error('[Chat Store] ❌ Erreur synchronisation:', error);
          setError('Erreur lors de la synchronisation');
        } finally {
          setLoading(false);
        }
      },

      /**
       * ➕ Créer une session avec optimistic update et rollback sécurisé
       */
      createSession: async (name: string = 'Nouvelle conversation') => {
        const { setLoading, setError, sessions, setSessions, setCurrentSession } = get();
        
        setLoading(true);
        setError(null);
        
        // Sauvegarder l'état initial pour rollback
        const initialState = {
          sessions: [...sessions],
          currentSession: get().currentSession
        };
        
        try {
          // 1. Optimistic update - créer une session temporaire
          const tempSession: ChatSession = {
            id: `temp-${Date.now()}`,
            name,
            thread: [],
            history_limit: 10,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          const newSessions = [tempSession, ...sessions];
          setSessions(newSessions);
          setCurrentSession(tempSession);
          logger.dev('[Chat Store] ⚡ Session temporaire créée');

          // 2. API call via service
          const result = await SessionSyncService.getInstance().createSessionAndSync(name);
          
          if (!result.success) {
            throw new Error(result.error || 'Erreur création session');
          }

          logger.dev('[Chat Store] ✅ Session créée en DB:', result.session);

          // 3. Remplacer la session temporaire par la vraie
          if (result.session) {
            const updatedSessions = newSessions.map(s => 
              s.id === tempSession.id ? result.session! : s
            );
            setSessions(updatedSessions);
            setCurrentSession(result.session);
          }
          
        } catch (error) {
          logger.error('[Chat Store] ❌ Erreur création session:', error);
          setError('Erreur lors de la création de la session');
          
          // Rollback sécurisé - restaurer l'état initial
          setSessions(initialState.sessions);
          setCurrentSession(initialState.currentSession);
        } finally {
          setLoading(false);
        }
      },

      /**
       * 💬 Ajouter un message à la session courante
       * 🔧 CORRECTION: Éviter la duplication des messages
       */
      addMessage: async (message: Omit<ChatMessage, 'id'>, options?: { persist?: boolean; updateExisting?: boolean }) => {
        const currentSession = get().currentSession;
        if (!currentSession) {
          get().setError('Aucune session active');
          return;
        }

        try {
          // 🔧 ANTI-DUPLICATION: Vérifier si le message existe déjà
          let existingMessageIndex = -1;
          if (options?.updateExisting) {
            existingMessageIndex = currentSession.thread.findIndex(msg => 
              msg.role === message.role && 
              Math.abs(new Date(msg.timestamp).getTime() - new Date(message.timestamp).getTime()) < 5000
            );
          }

          if (existingMessageIndex >= 0) {
            // 🔧 MISE À JOUR: Modifier le message existant au lieu d'en créer un nouveau
            const updatedThread = [...currentSession.thread];
            updatedThread[existingMessageIndex] = {
              ...updatedThread[existingMessageIndex],
              ...message,
              id: updatedThread[existingMessageIndex].id // Garder l'ID existant
            };

            const updatedSession = {
              ...currentSession,
              thread: updatedThread,
              updated_at: new Date().toISOString()
            };

            get().setCurrentSession(updatedSession);
            logger.dev('[Chat Store] 🔧 Message existant mis à jour');

            // Sauvegarder la mise à jour en DB
            if (options?.persist !== false) {
              await get().updateMessageInDB(currentSession.id, updatedThread[existingMessageIndex]);
            }
          } else {
            // 🔧 NOUVEAU MESSAGE: Créer un nouveau message avec ID unique
            const messageWithId: ChatMessage = {
              ...message,
              id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
            };

            // 🔧 GESTION HISTORIQUE: Appliquer la limite d'historique
            const historyLimit = currentSession.history_limit || 10;
            let updatedThread = [...currentSession.thread, messageWithId];
            
            // Trier par timestamp et limiter l'historique
            updatedThread = updatedThread
              .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
              .slice(-historyLimit);

            const updatedSession = {
              ...currentSession,
              thread: updatedThread,
              updated_at: new Date().toISOString()
            };

            get().setCurrentSession(updatedSession);
            logger.dev('[Chat Store] ⚡ Nouveau message ajouté');

            // Sauvegarder en DB
            if (options?.persist !== false) {
              await get().saveMessageToDB(currentSession.id, message);
            }
          }
          
        } catch (error) {
          logger.error('[Chat Store] ❌ Erreur ajout message:', error);
          get().setError('Erreur lors de l\'ajout du message');
        }
      },

      /**
       * 🔧 Fonction utilitaire pour sauvegarder un message en DB
       */
      saveMessageToDB: async (sessionId: string, message: Omit<ChatMessage, 'id'>) => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session?.access_token) {
            throw new Error('Authentification requise');
          }

          const response = await fetch(`/api/v1/chat-sessions/${sessionId}/messages`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(message),
          });

          if (!response.ok) {
            throw new Error('Erreur sauvegarde message');
          }

          logger.dev('[Chat Store] ✅ Message sauvegardé en DB');
        } catch (error) {
          logger.error('[Chat Store] ❌ Erreur sauvegarde DB:', error);
          throw error;
        }
      },

      /**
       * 🔧 Fonction utilitaire pour mettre à jour un message en DB
       */
      updateMessageInDB: async (sessionId: string, message: ChatMessage) => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session?.access_token) {
            throw new Error('Authentification requise');
          }

          // Pour la mise à jour, on utilise la route PATCH si elle existe
          const response = await fetch(`/api/v1/chat-sessions/${sessionId}/messages`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(message),
          });

          if (!response.ok) {
            // Fallback: utiliser POST si PATCH n'existe pas
            const postResponse = await fetch(`/api/v1/chat-sessions/${sessionId}/messages`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(message),
            });

            if (!postResponse.ok) {
              throw new Error('Erreur mise à jour message');
            }
          }

          logger.dev('[Chat Store] ✅ Message mis à jour en DB');
        } catch (error) {
          logger.error('[Chat Store] ❌ Erreur mise à jour DB:', error);
          throw error;
        }
      },

      /**
       * 🗑️ Supprimer une session avec rollback sécurisé
       */
      deleteSession: async (sessionId: string) => {
        const { setLoading, setError, sessions, setSessions, currentSession, setCurrentSession } = get();
        
        setLoading(true);
        setError(null);
        
        // Sauvegarder l'état initial pour rollback
        const initialState = {
          sessions: [...sessions],
          currentSession: currentSession
        };
        
        try {
          // 1. Optimistic update - supprimer immédiatement
          const updatedSessions = sessions.filter(s => s.id !== sessionId);
          setSessions(updatedSessions);
          
          // Si c'était la session courante, sélectionner la première
          if (currentSession?.id === sessionId) {
            setCurrentSession(updatedSessions[0] || null);
          }

          logger.dev('[Chat Store] ⚡ Session supprimée optimistiquement');

          // 2. API call via service
          const result = await SessionSyncService.getInstance().deleteSessionAndSync(sessionId);
          
          if (!result.success) {
            throw new Error(result.error || 'Erreur suppression session');
          }

          logger.dev('[Chat Store] ✅ Session supprimée en DB');
          
        } catch (error) {
          logger.error('[Chat Store] ❌ Erreur suppression session:', error);
          setError('Erreur lors de la suppression');
          
          // Rollback sécurisé - restaurer l'état initial
          setSessions(initialState.sessions);
          setCurrentSession(initialState.currentSession);
        } finally {
          setLoading(false);
        }
      },

      /**
       * ⚙️ Mettre à jour une session avec rollback sécurisé
       */
      updateSession: async (sessionId: string, data: { name?: string; history_limit?: number }) => {
        const { setLoading, setError, sessions, setSessions, currentSession, setCurrentSession } = get();
        
        setLoading(true);
        setError(null);
        
        // Sauvegarder l'état initial pour rollback
        const initialState = {
          sessions: [...sessions],
          currentSession: currentSession
        };
        
        try {
          // 1. Optimistic update
          const updatedSessions = sessions.map(s => 
            s.id === sessionId ? { ...s, ...data, updated_at: new Date().toISOString() } : s
          );
          setSessions(updatedSessions);
          
          // Mettre à jour la session courante si nécessaire
          if (currentSession?.id === sessionId) {
            const updatedCurrentSession = updatedSessions.find(s => s.id === sessionId);
            if (updatedCurrentSession) {
              setCurrentSession(updatedCurrentSession);
            }
          }

          logger.dev('[Chat Store] ⚡ Session mise à jour optimistiquement');

          // 2. API call via service
          const result = await SessionSyncService.getInstance().updateSessionAndSync(sessionId, data);
          
          if (!result.success) {
            throw new Error(result.error || 'Erreur mise à jour session');
          }

          logger.dev('[Chat Store] ✅ Session mise à jour en DB');
          
        } catch (error) {
          logger.error('[Chat Store] ❌ Erreur mise à jour session:', error);
          setError('Erreur lors de la mise à jour');
          
          // Rollback sécurisé - restaurer l'état initial
          setSessions(initialState.sessions);
          setCurrentSession(initialState.currentSession);
        } finally {
          setLoading(false);
        }
      },
    }),
    {
      name: 'chat-store-robust',
      // 🎯 Cache léger: ne persister que l'état UI
      partialize: (state) => ({
        isWidgetOpen: state.isWidgetOpen,
        isFullscreen: state.isFullscreen,
        currentSessionId: state.currentSession?.id || null,
        selectedAgentId: state.selectedAgentId || null,
      }),
    }
  )
); 