import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { sessionSyncService } from '@/services/sessionSyncService';

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

interface ChatStore {
  // 🎯 État (cache léger)
  sessions: ChatSession[];
  currentSession: ChatSession | null;
  isWidgetOpen: boolean;
  isFullscreen: boolean;
  loading: boolean;
  error: string | null;
  
  // 🔄 Actions
  setSessions: (sessions: ChatSession[]) => void;
  setCurrentSession: (session: ChatSession | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // 🎮 Actions UI
  toggleWidget: () => void;
  openFullscreen: () => void;
  closeWidget: () => void;
  
  // 🔄 Actions de synchronisation (DB → Cache)
  syncSessions: () => Promise<void>;
  createSession: (name?: string) => Promise<void>;
  addMessage: (message: Omit<ChatMessage, 'id'>) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  updateSession: (sessionId: string, data: { name?: string; history_limit?: number }) => Promise<void>;
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      // 🎯 État initial
      sessions: [],
      currentSession: null,
      isWidgetOpen: false,
      isFullscreen: false,
      loading: false,
      error: null,

      // 🔄 Actions de base
      setSessions: (sessions: ChatSession[]) => set({ sessions }),
      setCurrentSession: (session: ChatSession | null) => set({ currentSession: session }),
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

      // 🔄 Actions de synchronisation (DB → Cache)
      
      /**
       * 🔄 Synchroniser les sessions depuis la DB
       * DB = source de vérité → Cache = miroir
       */
      syncSessions: async () => {
        const { setLoading, setError, setSessions } = get();
        
        setLoading(true);
        setError(null);
        
        try {
          console.log('[Chat Store] 🔄 Synchronisation depuis DB...');
          
          const result = await sessionSyncService.syncSessionsFromDB();
          
          console.log('[Chat Store] 📋 Résultat complet:', result);
          
          if (!result.success) {
            setError(result.error || 'Erreur synchronisation');
            return;
          }
          
          console.log('[Chat Store] ✅ Synchronisation réussie');
          console.log('[Chat Store] 📊 Sessions reçues:', result.sessions?.length || 0);
          
          // Mettre à jour le store avec les sessions
          if (result.sessions) {
            console.log('[Chat Store] 🔄 Mise à jour du store avec', result.sessions.length, 'sessions');
            setSessions(result.sessions);
            console.log('[Chat Store] ✅ Store mis à jour avec', result.sessions.length, 'sessions');
          } else {
            console.log('[Chat Store] ⚠️ Aucune session dans le résultat');
          }
          
        } catch (error) {
          console.error('[Chat Store] ❌ Erreur synchronisation:', error);
          setError('Erreur lors de la synchronisation');
        } finally {
          setLoading(false);
        }
      },

      /**
       * ➕ Créer une session en DB puis synchroniser
       * DB d'abord → Cache ensuite
       */
      createSession: async (name: string = 'Nouvelle conversation') => {
        const { setLoading, setError } = get();
        
        setLoading(true);
        setError(null);
        
        try {
          console.log('[Chat Store] ➕ Création session en DB...');
          
          const result = await sessionSyncService.createSessionAndSync(name);
          
          if (!result.success) {
            setError(result.error || 'Erreur création session');
            return;
          }
          
          console.log('[Chat Store] ✅ Session créée et synchronisée');
          
        } catch (error) {
          console.error('[Chat Store] ❌ Erreur création session:', error);
          setError('Erreur lors de la création');
        } finally {
          setLoading(false);
        }
      },

      /**
       * 💬 Ajouter un message en DB puis synchroniser
       * DB d'abord → Cache ensuite
       */
      addMessage: async (message: Omit<ChatMessage, 'id'>) => {
        const { currentSession, setLoading, setError } = get();
        
        if (!currentSession) {
          setError('Aucune session active');
          return;
        }

        setLoading(true);
        setError(null);
        
        try {
          console.log('[Chat Store] 💬 Ajout message en DB...');
          
          const result = await sessionSyncService.addMessageAndSync(currentSession.id, message);
          
          if (!result.success) {
            setError(result.error || 'Erreur ajout message');
            return;
          }
          
          console.log('[Chat Store] ✅ Message ajouté et synchronisé');
          
        } catch (error) {
          console.error('[Chat Store] ❌ Erreur ajout message:', error);
          setError('Erreur lors de l\'ajout du message');
        } finally {
          setLoading(false);
        }
      },

      /**
       * 🗑️ Supprimer une session en DB puis synchroniser
       * DB d'abord → Cache ensuite
       */
      deleteSession: async (sessionId: string) => {
        const { setLoading, setError } = get();
        
        setLoading(true);
        setError(null);
        
        try {
          console.log('[Chat Store] 🗑️ Suppression session en DB...');
          
          const result = await sessionSyncService.deleteSessionAndSync(sessionId);
          
          if (!result.success) {
            setError(result.error || 'Erreur suppression session');
            return;
          }
          
          console.log('[Chat Store] ✅ Session supprimée et synchronisée');
          
        } catch (error) {
          console.error('[Chat Store] ❌ Erreur suppression session:', error);
          setError('Erreur lors de la suppression');
        } finally {
          setLoading(false);
        }
      },

      /**
       * ⚙️ Mettre à jour une session en DB puis synchroniser
       * DB d'abord → Cache ensuite
       */
      updateSession: async (sessionId: string, data: { name?: string; history_limit?: number }) => {
        const { setLoading, setError } = get();
        
        setLoading(true);
        setError(null);
        
        try {
          console.log('[Chat Store] ⚙️ Mise à jour session en DB...');
          
          const result = await sessionSyncService.updateSessionAndSync(sessionId, data);
          
          if (!result.success) {
            setError(result.error || 'Erreur mise à jour session');
            return;
          }
          
          console.log('[Chat Store] ✅ Session mise à jour et synchronisée');
          
        } catch (error) {
          console.error('[Chat Store] ❌ Erreur mise à jour session:', error);
          setError('Erreur lors de la mise à jour');
        } finally {
          setLoading(false);
        }
      },
    }),
    {
      name: 'chat-store',
      // 🎯 Cache léger: ne persister que l'état UI, pas les sessions
      partialize: (state) => ({
        isWidgetOpen: state.isWidgetOpen,
        isFullscreen: state.isFullscreen,
        currentSessionId: state.currentSession?.id || null,
      }),
    }
  )
); 