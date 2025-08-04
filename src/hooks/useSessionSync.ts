import { useCallback } from 'react';
import { sessionSyncService } from '@/services/sessionSyncService';
import { chatPollingService } from '@/services/chatPollingService';
import { useChatStore } from '@/store/useChatStore';
import type { ChatMessage } from '@/store/useChatStore';
import { supabase } from '@/supabaseClient';
import { simpleLogger as logger } from '@/utils/logger';

/**
 * 🔄 Hook personnalisé pour la synchronisation des sessions
 * Encapsule la logique DB → Store avec une API simple
 */
export const useSessionSync = () => {
  const { setLoading, setError, currentSession } = useChatStore();

  /**
   * 🔄 Synchroniser les sessions depuis la DB
   */
  const syncSessions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      logger.dev('[useSessionSync] 🔄 Début synchronisation...');
      
      // Vérifier l'authentification avant de synchroniser
      const { data: { session } } = await supabase.auth.getSession();
      logger.dev('[useSessionSync] 🔐 Session trouvée:', session ? 'Oui' : 'Non');
      
      if (!session?.access_token) {
        logger.dev('[useSessionSync] ⚠️ Utilisateur non authentifié, synchronisation ignorée');
        setLoading(false);
        // Mettre à jour le store avec une liste vide
        const { setSessions } = useChatStore.getState();
        setSessions([]);
        return { success: true, sessions: [] };
      }

      logger.dev('[useSessionSync] ✅ Token trouvé, appel sessionSyncService...');

      const result = await sessionSyncService.syncSessionsFromDB();
      
      logger.dev('[useSessionSync] 📋 Résultat reçu:', result);
      
      if (!result.success) {
        setError(result.error || 'Erreur synchronisation');
      } else if (result.sessions) {
        // Mettre à jour le store avec les sessions
        const { setSessions } = useChatStore.getState();
        setSessions(result.sessions);
        logger.dev('[useSessionSync] ✅ Store mis à jour avec', result.sessions.length, 'sessions');
      }
      
      return result;
    } catch (error) {
      logger.error('[useSessionSync] ❌ Erreur syncSessions:', error);
      setError('Erreur lors de la synchronisation');
      return { success: false, error: 'Erreur lors de la synchronisation' };
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError]);

  /**
   * ➕ Créer une nouvelle session
   */
  const createSession = useCallback(async (name?: string) => {
    setLoading(true);
    setError(null);

    try {
      logger.dev('[useSessionSync] ➕ Création session avec nom:', name);
      
      // Vérifier l'authentification avant de créer
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        logger.dev('[useSessionSync] ❌ Pas de token d\'authentification');
        setError('Authentification requise pour créer une session');
        setLoading(false);
        return { success: false, error: 'Authentification requise' };
      }

      logger.dev('[useSessionSync] ✅ Token trouvé, appel sessionSyncService...');
      const result = await sessionSyncService.createSessionAndSync(name);
      logger.dev('[useSessionSync] 📋 Résultat sessionSyncService:', result);
      
      if (!result.success) {
        logger.dev('[useSessionSync] ❌ Échec création session:', result.error);
        setError(result.error || 'Erreur création session');
        setLoading(false);
        return result;
      }
      
      logger.dev('[useSessionSync] ✅ Session créée avec succès');
      
      // Déclencher un polling après création de session
      await chatPollingService.triggerPolling('création session');
      
      // Récupérer la session créée depuis le store
      const store = useChatStore.getState();
      const sessions = store.sessions;
      logger.dev('[useSessionSync] 📊 Sessions dans le store:', sessions.length);
      logger.dev('[useSessionSync] 📋 Sessions:', sessions);
      
      const newSession = sessions[sessions.length - 1]; // La dernière session créée
      logger.dev('[useSessionSync] 🎯 Nouvelle session trouvée:', newSession);
      
      if (newSession) {
        // Définir cette session comme courante
        store.setCurrentSession(newSession);
        logger.dev('[useSessionSync] ✅ Nouvelle session définie comme courante:', newSession);
        setLoading(false);
        return { ...result, session: newSession };
      } else {
        logger.dev('[useSessionSync] ⚠️ Aucune nouvelle session trouvée dans le store');
        setLoading(false);
        return { success: false, error: 'Session créée mais non trouvée dans le store' };
      }
    } catch (error) {
      logger.error('[useSessionSync] ❌ Erreur createSession:', error);
      setError('Erreur lors de la création');
      setLoading(false);
      return { success: false, error: 'Erreur lors de la création' };
    }
  }, [setLoading, setError]);

  /**
   * 💬 Ajouter un message à la session courante
   */
  const addMessage = useCallback(async (message: Omit<ChatMessage, 'id'>) => {
    if (!currentSession) {
      setError('Aucune session active');
      return { success: false, error: 'Aucune session active' };
    }

    setLoading(true);
    setError(null);

    try {
      // Vérifier l'authentification avant d'ajouter un message
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError('Authentification requise pour ajouter un message');
        setLoading(false);
        return { success: false, error: 'Authentification requise' };
      }

      const result = await sessionSyncService.addMessageAndSync(currentSession.id, message);
      
      if (!result.success) {
        setError(result.error || 'Erreur ajout message');
      }
      
      return result;
    } catch (error) {
      logger.error('[useSessionSync] ❌ Erreur addMessage:', error);
      setError('Erreur lors de l\'ajout du message');
      return { success: false, error: 'Erreur lors de l\'ajout du message' };
    } finally {
      setLoading(false);
    }
  }, [currentSession, setLoading, setError]);

  /**
   * 🗑️ Supprimer une session
   */
  const deleteSession = useCallback(async (sessionId: string) => {
    setLoading(true);
    setError(null);

    try {
      const result = await sessionSyncService.deleteSessionAndSync(sessionId);
      
      if (!result.success) {
        setError(result.error || 'Erreur suppression session');
      }
      
      return result;
    } catch (error) {
      logger.error('[useSessionSync] ❌ Erreur deleteSession:', error);
      setError('Erreur lors de la suppression');
      return { success: false, error: 'Erreur lors de la suppression' };
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError]);

  /**
   * ⚙️ Mettre à jour une session
   */
  const updateSession = useCallback(async (sessionId: string, data: {
    name?: string;
    history_limit?: number;
  }) => {
    setLoading(true);
    setError(null);

    try {
      const result = await sessionSyncService.updateSessionAndSync(sessionId, data);
      
      if (!result.success) {
        setError(result.error || 'Erreur mise à jour session');
      }
      
      return result;
    } catch (error) {
      logger.error('[useSessionSync] ❌ Erreur updateSession:', error);
      setError('Erreur lors de la mise à jour');
      return { success: false, error: 'Erreur lors de la mise à jour' };
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError]);

  return {
    syncSessions,
    createSession,
    addMessage,
    deleteSession,
    updateSession,
  };
}; 