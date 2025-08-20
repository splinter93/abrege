import { useCallback } from 'react';
import { sessionSyncService } from '@/services/sessionSyncService';
import { useChatStore } from '@/store/useChatStore';
import { supabase } from '@/supabaseClient';
import { simpleLogger as logger } from '@/utils/logger';

/**
 * 🔄 Hook simplifié pour la synchronisation des sessions
 * Délègue toute la logique au service
 */
export const useSessionSync = () => {
  const { setLoading, setError } = useChatStore();

  /**
   * 🔄 Synchroniser les sessions depuis la DB
   */
  const syncSessions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Vérifier l'authentification
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError('Authentification requise');
        return { success: false, error: 'Authentification requise' };
      }

      // Déléguer au service
      const result = await sessionSyncService.syncSessionsFromDB();
      
      if (!result.success) {
        setError(result.error || 'Erreur synchronisation');
      }
      
      return result;
    } catch (error) {
      logger.error('[useSessionSync] ❌ Erreur:', error);
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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError('Authentification requise');
        return { success: false, error: 'Authentification requise' };
      }

      const result = await sessionSyncService.createSessionAndSync(name);
      
      if (!result.success) {
        setError(result.error || 'Erreur création session');
      }
      
      return result;
    } catch (error) {
      logger.error('[useSessionSync] ❌ Erreur création:', error);
      setError('Erreur lors de la création');
      return { success: false, error: 'Erreur lors de la création' };
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError]);

  /**
   * 💬 Ajouter un message
   */
  const addMessage = useCallback(async (sessionId: string, message: unknown) => {
    try {
      const result = await sessionSyncService.addMessageAndSync(sessionId, message);
      if (!result.success) {
        setError(result.error || 'Erreur ajout message');
      }
      return result;
    } catch (error) {
      logger.error('[useSessionSync] ❌ Erreur ajout message:', error);
      setError('Erreur lors de l\'ajout du message');
      return { success: false, error: 'Erreur lors de l\'ajout du message' };
    }
  }, [setError]);

  /**
   * 🗑️ Supprimer une session
   */
  const deleteSession = useCallback(async (sessionId: string) => {
    setLoading(true);
    setError(null);

    try {
      const result = await sessionSyncService.deleteSessionAndSync(sessionId);
      
      if (!result.success) {
        setError(result.error || 'Erreur suppression');
      }
      
      return result;
    } catch (error) {
      logger.error('[useSessionSync] ❌ Erreur suppression:', error);
      setError('Erreur lors de la suppression');
      return { success: false, error: 'Erreur lors de la suppression' };
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError]);

  return {
    syncSessions,
    createSession,
    addMessage,
    deleteSession
  };
}; 