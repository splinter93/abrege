import { useState, useEffect, useCallback } from 'react';
import type { ChatSession, ChatMessage, CreateChatSessionData, UpdateChatSessionData } from '@/types/chat';
import { chatSessionService } from '@/services/chatSessionService';
import { chatHistoryService } from '@/services/chatHistoryService';

interface UseChatSessionsOptions {
  autoLoad?: boolean;
  defaultHistoryLimit?: number;
}

export function useChatSessions(options: UseChatSessionsOptions = {}) {
  const { autoLoad = true, defaultHistoryLimit = 10 } = options;
  
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Charger toutes les sessions
  const loadSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await chatSessionService.getSessions();
      
      if (response.success && response.data) {
        setSessions(response.data);
      } else {
        setError(response.error || 'Erreur lors du chargement des sessions');
      }
    } catch (err) {
      setError('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  }, []);

  // Charger une session spécifique
  const loadSession = useCallback(async (sessionId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await chatSessionService.getSession(sessionId);
      
      if (response.success && response.data) {
        setCurrentSession(response.data);
        return response.data;
      } else {
        setError(response.error || 'Erreur lors du chargement de la session');
        return null;
      }
    } catch (err) {
      setError('Erreur de connexion');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Créer une nouvelle session
  const createSession = useCallback(async (data: CreateChatSessionData) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await chatSessionService.createSession({
        ...data,
        history_limit: data.history_limit || defaultHistoryLimit
      });
      
      if (response.success && response.data) {
        const newSession = response.data;
        setSessions(prev => [newSession, ...prev]);
        setCurrentSession(newSession);
        return newSession;
      } else {
        setError(response.error || 'Erreur lors de la création de la session');
        return null;
      }
    } catch (err) {
      setError('Erreur de connexion');
      return null;
    } finally {
      setLoading(false);
    }
  }, [defaultHistoryLimit]);

  // Mettre à jour une session
  const updateSession = useCallback(async (sessionId: string, data: UpdateChatSessionData) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await chatSessionService.updateSession(sessionId, data);
      
      if (response.success && response.data) {
        const updatedSession = response.data;
        
        // Mettre à jour la liste des sessions
        setSessions(prev => 
          prev.map(session => 
            session.id === sessionId ? updatedSession : session
          )
        );
        
        // Mettre à jour la session courante si c'est elle
        if (currentSession?.id === sessionId) {
          setCurrentSession(updatedSession);
        }
        
        return updatedSession;
      } else {
        setError(response.error || 'Erreur lors de la mise à jour de la session');
        return null;
      }
    } catch (err) {
      setError('Erreur de connexion');
      return null;
    } finally {
      setLoading(false);
    }
  }, [currentSession]);

  // Supprimer une session
  const deleteSession = useCallback(async (sessionId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await chatSessionService.deleteSession(sessionId);
      
      if (response.success) {
        // Retirer de la liste
        setSessions(prev => prev.filter(session => session.id !== sessionId));
        
        // Si c'était la session courante, la vider
        if (currentSession?.id === sessionId) {
          setCurrentSession(null);
        }
        
        return true;
      } else {
        setError(response.error || 'Erreur lors de la suppression de la session');
        return false;
      }
    } catch (err) {
      setError('Erreur de connexion');
      return false;
    } finally {
      setLoading(false);
    }
  }, [currentSession]);

  // Ajouter un message à la session courante
  const addMessage = useCallback(async (message: Omit<ChatMessage, 'id'>) => {
    if (!currentSession) {
      setError('Aucune session active');
      return null;
    }

    setLoading(true);
    setError(null);
    
    try {
      const response = await chatSessionService.addMessage(currentSession.id, message);
      
      if (response.success && response.data) {
        const { session: updatedSession } = response.data;
        
        // Mettre à jour la session courante
        setCurrentSession(updatedSession);
        
        // Mettre à jour dans la liste
        setSessions(prev => 
          prev.map(s => 
            s.id === currentSession.id ? updatedSession : s
          )
        );
        
        return response.data.message;
      } else {
        setError(response.error || 'Erreur lors de l\'ajout du message');
        return null;
      }
    } catch (err) {
      setError('Erreur de connexion');
      return null;
    } finally {
      setLoading(false);
    }
  }, [currentSession]);

  // Obtenir l'historique formaté pour l'API Synesia
  const getFormattedHistory = useCallback((message: string) => {
    if (!currentSession) return null;
    
    return chatHistoryService.formatForSynesia(
      currentSession.thread,
      message,
      currentSession.history_limit
    );
  }, [currentSession]);

  // Analyser la complexité du contexte
  const analyzeContextComplexity = useCallback(() => {
    if (!currentSession) return 'low';
    
    return chatHistoryService.analyzeContextComplexity(currentSession.thread);
  }, [currentSession]);

  // Calculer la limite optimale
  const calculateOptimalHistoryLimit = useCallback(() => {
    if (!currentSession) return defaultHistoryLimit;
    
    const complexity = analyzeContextComplexity();
    return chatHistoryService.calculateOptimalHistoryLimit(
      currentSession.thread.length,
      complexity
    );
  }, [currentSession, analyzeContextComplexity, defaultHistoryLimit]);

  // Charger automatiquement les sessions au montage
  useEffect(() => {
    if (autoLoad) {
      loadSessions();
    }
  }, [autoLoad, loadSessions]);

  return {
    // État
    sessions,
    currentSession,
    loading,
    error,
    
    // Actions
    loadSessions,
    loadSession,
    createSession,
    updateSession,
    deleteSession,
    addMessage,
    
    // Utilitaires
    getFormattedHistory,
    analyzeContextComplexity,
    calculateOptimalHistoryLimit,
    
    // Actions de session
    setCurrentSession,
    clearError: () => setError(null)
  };
} 