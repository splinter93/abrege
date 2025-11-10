import { useRef, useCallback, useEffect } from 'react';
import type { ChatMessage } from '@/types/chat';

interface UseChatScrollOptions {
  autoScroll?: boolean;
  messages?: ChatMessage[];
}

interface UseChatScrollReturn {
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  scrollToBottom: () => void;
}

/**
 * Hook minimaliste pour le scroll auto
 * 
 * Fonctionnement :
 * - Scroll au bas UNIQUEMENT quand un nouveau message USER arrive
 * - RIEN pour les messages assistant (évite les saccades pendant le streaming)
 * 
 * Comportement du padding :
 * - Par défaut : padding CSS normal (120px desktop, 100px mobile)
 * - À l'envoi user : padding temporaire inline (75% viewport) pour remonter le message en haut
 * - Le padding temporaire RESTE en place (pas de retour automatique)
 * - Au refresh page : reset automatique au padding CSS (le style inline disparaît)
 * 
 * Pourquoi garder le padding temporaire ?
 * - Évite que le message redescende après l'animation
 * - L'utilisateur garde la vue sur son message pendant que l'assistant répond
 * - UX fluide sans saccade
 */
export function useChatScroll(options: UseChatScrollOptions = {}): UseChatScrollReturn {
  const { autoScroll = true, messages = [] } = options;
  
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const prevMessagesRef = useRef(messages);
  const maxTemporaryPaddingRef = useRef<number | null>(null);

  // Trouver le container scrollable
  const getScrollContainer = useCallback(() => {
    return (
      messagesEndRef.current?.closest('.chatgpt-messages-container') as HTMLElement
    ) || (messagesEndRef.current?.parentElement as HTMLElement);
  }, []);

  /**
   * Scroll au bas avec padding temporaire
   * 
   * Ajoute un padding inline de 75% du viewport pour que le message user
   * remonte complètement en haut sous le header.
   * 
   * Le padding reste en place (pas de timeout) pour éviter que le message
   * redescende pendant que l'assistant stream sa réponse.
   */
  const scrollToBottom = useCallback(() => {
    const container = getScrollContainer();
    if (!container) return;
    
    const viewportHeight = window.innerHeight;
    const visualViewport = typeof window !== 'undefined' && 'visualViewport' in window ? window.visualViewport : null;
    const effectiveHeight = visualViewport?.height || viewportHeight;
    const viewportOffset = viewportHeight - effectiveHeight;

    const tempPadding = Math.floor(effectiveHeight * 0.75);
    const isKeyboardOpen = viewportOffset > 120; // ~ clavier mobile
    const maxPadding = maxTemporaryPaddingRef.current ?? 420;
    const appliedPadding = isKeyboardOpen
      ? Math.min(tempPadding, maxPadding)
      : tempPadding;

    if (isKeyboardOpen) {
      maxTemporaryPaddingRef.current = appliedPadding;
    } else {
      maxTemporaryPaddingRef.current = null;
    }
    
    container.style.paddingBottom = `${appliedPadding}px`;
    
    // Scroll au maximum avec le nouveau padding
    requestAnimationFrame(() => {
      const maxScroll = container.scrollHeight - container.clientHeight;
      container.scrollTo({
        top: maxScroll,
        behavior: 'smooth'
      });
    });
  }, [getScrollContainer]);

  // Autoscroll UNIQUEMENT pour nouveaux messages user
  useEffect(() => {
    if (!autoScroll || messages.length === 0) return;

    const prevMessages = prevMessagesRef.current;
    const currLast = messages[messages.length - 1];
    
    // Détecter nouveau message
    const hasNewMessage = messages.length !== prevMessages.length;
    prevMessagesRef.current = messages;

    // Scroll UNIQUEMENT si c'est un message user
    if (hasNewMessage && currLast?.role === 'user') {
      setTimeout(() => scrollToBottom(), 100);
    }
  }, [messages, autoScroll, scrollToBottom]);

  return {
    messagesEndRef,
    scrollToBottom
  };
}
