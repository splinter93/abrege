import { useState, useCallback, useRef, useEffect } from 'react';
import { ChatMessage } from '@/types/chat';
import { supabase } from '@/supabaseClient';
import { simpleLogger as logger } from '@/utils/logger';

/**
 * Marque des messages pour animation temporaire
 */
interface ChatMessageWithAnimation extends ChatMessage {
  _isNewlyLoaded?: boolean;
}

/**
 * 🎯 Hook pour le lazy loading des messages avec infinite scroll
 * 
 * Fonctionnement:
 * 1. Charge les 15 derniers messages au début
 * 2. Charge les messages plus anciens quand on scroll vers le haut
 * 3. Gère l'état de chargement et détecte s'il reste des messages
 * 
 * @param sessionId - ID de la session active
 * @returns {object} - Messages, états et fonctions de chargement
 */

interface UseInfiniteMessagesOptions {
  sessionId: string | null;
  initialLimit?: number;
  loadMoreLimit?: number;
  enabled?: boolean;
}

interface UseInfiniteMessagesReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  loadInitialMessages: () => Promise<void>;
  loadMoreMessages: () => Promise<void>;
  addMessage: (message: ChatMessage) => void;
  replaceMessages: (messages: ChatMessage[]) => void;
  clearMessages: () => void;
}

export function useInfiniteMessages(
  options: UseInfiniteMessagesOptions
): UseInfiniteMessagesReturn {
  const {
    sessionId,
    initialLimit = 15,
    loadMoreLimit = 20,
    enabled = true
  } = options;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isInitializedRef = useRef(false);
  const loadingRef = useRef(false);

  /**
   * 🎯 Récupérer le token d'authentification
   */
  const getAuthToken = useCallback(async (): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  }, []);

  /**
   * 📥 Charger les N derniers messages (initial load)
   */
  const loadInitialMessages = useCallback(async () => {
    if (!sessionId || !enabled || loadingRef.current) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      loadingRef.current = true;

      const token = await getAuthToken();
      if (!token) {
        throw new Error('Non authentifié');
      }

      const response = await fetch(
        `/api/chat/sessions/${sessionId}/messages/recent?limit=${initialLimit}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Erreur chargement messages');
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Erreur inconnue');
      }

      setMessages(result.data.messages || []);
      setHasMore(result.data.hasMore || false);
      isInitializedRef.current = true;

      logger.dev('[useInfiniteMessages] ✅ Messages initiaux chargés:', {
        count: result.data.messages?.length || 0,
        hasMore: result.data.hasMore,
        total: result.data.totalCount
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMessage);
      logger.error('[useInfiniteMessages] ❌ Erreur chargement initial:', err);
    } finally {
      setIsLoading(false);
      loadingRef.current = false;
    }
  }, [sessionId, initialLimit, enabled, getAuthToken]);

  /**
   * 📥 Charger les messages plus anciens (infinite scroll)
   * ✅ REFACTOR: Utilise sequence_number au lieu de timestamp
   */
  const loadMoreMessages = useCallback(async () => {
    if (!sessionId || !enabled || loadingRef.current || !hasMore || messages.length === 0) {
      return;
    }

    try {
      setIsLoadingMore(true);
      loadingRef.current = true;

      // ✅ Utiliser sequence_number du message le plus ancien
      const oldestMessage = messages[0];
      const beforeSequence = oldestMessage.sequence_number || 0;

      const token = await getAuthToken();
      if (!token) {
        throw new Error('Non authentifié');
      }

      // ✅ Passer sequence_number au lieu de timestamp
      const response = await fetch(
        `/api/chat/sessions/${sessionId}/messages/before?before=${beforeSequence}&limit=${loadMoreLimit}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Erreur chargement messages');
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Erreur inconnue');
      }

      const olderMessages = result.data.messages || [];
      
      // ✅ PRÉSERVER la position de scroll pendant l'ajout des anciens messages
      // Trouver le container scrollable
      const container = document.querySelector('.chatgpt-messages-container') as HTMLElement;
      const scrollHeightBefore = container?.scrollHeight || 0;
      const scrollTopBefore = container?.scrollTop || 0;
      
      // ✅ Marquer les nouveaux messages pour animation
      const markedMessages = olderMessages.map(msg => ({
        ...msg,
        _isNewlyLoaded: true
      })) as ChatMessageWithAnimation[];
      
      // 🎯 Ajouter les anciens messages AU DÉBUT du tableau
      setMessages(prev => [...markedMessages, ...prev]);
      setHasMore(result.data.hasMore || false);
      
      // ✅ Restaurer la position de scroll après le render (évite le jump au début)
      requestAnimationFrame(() => {
        if (container) {
          const scrollHeightAfter = container.scrollHeight;
          const heightDiff = scrollHeightAfter - scrollHeightBefore;
          // Ajuster scrollTop pour compenser la hauteur ajoutée
          container.scrollTop = scrollTopBefore + heightDiff;
        }
      });
      
      // ✅ Retirer le marqueur d'animation après 400ms (durée de l'animation)
      setTimeout(() => {
        setMessages(prev => prev.map(msg => {
          const { _isNewlyLoaded, ...cleanMsg } = msg as ChatMessageWithAnimation;
          return cleanMsg;
        }));
      }, 400);

      logger.dev('[useInfiniteMessages] ✅ Messages anciens chargés (scroll préservé):', {
        count: olderMessages.length,
        hasMore: result.data.hasMore,
        beforeSequence,
        heightAdded: container ? container.scrollHeight - scrollHeightBefore : 0
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMessage);
      logger.error('[useInfiniteMessages] ❌ Erreur chargement plus:', err);
    } finally {
      setIsLoadingMore(false);
      loadingRef.current = false;
    }
  }, [sessionId, messages, hasMore, enabled, loadMoreLimit, getAuthToken]);

  /**
   * ➕ Ajouter un nouveau message (streaming, envoi user, etc.)
   */
  const addMessage = useCallback((message: ChatMessage) => {
    setMessages(prev => [...prev, message]);
  }, []);

  /**
   * 🔄 Remplacer tous les messages (changement de session)
   */
  const replaceMessages = useCallback((newMessages: ChatMessage[]) => {
    setMessages(newMessages);
    isInitializedRef.current = true;
  }, []);

  /**
   * 🗑️ Vider les messages
   */
  const clearMessages = useCallback(() => {
    setMessages([]);
    setHasMore(false);
    setError(null);
    isInitializedRef.current = false;
  }, []);

  /**
   * 🔄 Auto-load des messages quand sessionId change
   */
  useEffect(() => {
    if (sessionId && enabled && !isInitializedRef.current) {
      loadInitialMessages();
    }
  }, [sessionId, enabled, loadInitialMessages]);

  /**
   * 🧹 Cleanup quand sessionId change
   */
  useEffect(() => {
    return () => {
      if (sessionId) {
        clearMessages();
      }
    };
  }, [sessionId, clearMessages]);

  return {
    messages,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    loadInitialMessages,
    loadMoreMessages,
    addMessage,
    replaceMessages,
    clearMessages
  };
}

