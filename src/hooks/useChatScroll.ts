import { useRef, useCallback, useEffect } from 'react';
import type { ChatMessage } from '@/types/chat';

interface UseChatScrollOptions {
  autoScroll?: boolean;
  messages?: ChatMessage[];
  /** Détecter les changements de layout (ex: ouverture/fermeture canva) */
  watchLayoutChanges?: boolean;
  /** Dépendance qui change quand le layout change (ex: isCanvaOpen) */
  layoutTrigger?: boolean;
}

interface UseChatScrollReturn {
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  scrollToBottom: () => void;
}

/**
 * Hook pour le scroll auto avec padding temporaire
 * 
 * Fonctionnement :
 * - Scroll UNIQUEMENT quand un nouveau message USER arrive
 * - Ajoute un padding temporaire pour que le message user remonte sous le header
 * - Padding différent selon le layout : 75% chat normal, 65% mode canva
 * - Le padding reste en place (pas de timeout) pour éviter que le message redescende
 * 
 * Séparation claire :
 * - Chat normal : 75% viewport (comportement par défaut)
 * - Mode canva : 65% viewport (layout avec canva ouvert)
 * - Détection via .chatgpt-main--canva-open (classe sur chatgpt-main)
 */
export function useChatScroll(options: UseChatScrollOptions = {}): UseChatScrollReturn {
  const { autoScroll = true, messages = [], watchLayoutChanges = false, layoutTrigger } = options;
  
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const prevMessagesRef = useRef(messages);
  const prevLayoutTriggerRef = useRef(layoutTrigger);

  // Trouver le container scrollable
  const getScrollContainer = useCallback(() => {
    return (
      messagesEndRef.current?.closest('.chatgpt-messages-container') as HTMLElement
    ) || (messagesEndRef.current?.parentElement as HTMLElement);
  }, []);

  /**
   * Scroll avec padding temporaire
   * 
   * Ajoute un padding inline pour que le message user remonte complètement
   * en haut sous le header. Le padding reste en place pour éviter que le
   * message redescende pendant que l'assistant stream sa réponse.
   * 
   * Padding selon le layout :
   * - Chat normal : 75% viewport
   * - Mode canva : 65% viewport (moins car moins d'espace disponible)
   */
  const scrollToBottom = useCallback(() => {
    const container = getScrollContainer();
    if (!container) return;
    
    // Détecter mode canva : chercher .chatgpt-main--canva-open
    // On cherche depuis le container vers le haut de l'arbre DOM
    const chatMain = container.closest('.chatgpt-main') as HTMLElement;
    const isCanvaLayout = chatMain?.classList.contains('chatgpt-main--canva-open') ?? false;
    
    // Calculer la hauteur effective du viewport (gère le clavier mobile)
    const viewportHeight = window.innerHeight;
    const visualViewport = typeof window !== 'undefined' && 'visualViewport' in window ? window.visualViewport : null;
    const effectiveHeight = visualViewport?.height || viewportHeight;
    
    // Ratio de padding selon le layout
    const paddingRatio = isCanvaLayout ? 0.70 : 0.75;
    const tempPadding = Math.floor(effectiveHeight * paddingRatio);
    
    // Appliquer le padding temporaire
    container.style.paddingBottom = `${tempPadding}px`;
    
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
      // Délai pour laisser le DOM se mettre à jour
      setTimeout(() => scrollToBottom(), 100);
    }
  }, [messages, autoScroll, scrollToBottom]);

  // 🔄 Scroll auto quand le layout change (ouverture/fermeture canva)
  useEffect(() => {
    if (!watchLayoutChanges || layoutTrigger === undefined) return;

    const container = getScrollContainer();
    if (!container) return;

    // Détecter changement de layout (ex: isCanvaOpen change)
    const layoutChanged = prevLayoutTriggerRef.current !== layoutTrigger;
    prevLayoutTriggerRef.current = layoutTrigger;

    if (!layoutChanged) return;

    let cancelled = false;
    let retryCount = 0;
    const maxRetries = 8; // ~800ms
    const retryInterval = 100;
    let previousScrollHeight = container.scrollHeight;

    const scrollToBottomInstant = () => {
      if (cancelled) return previousScrollHeight;
      const scrollHeight = container.scrollHeight;
      const clientHeight = container.clientHeight;
      const maxScroll = Math.max(0, scrollHeight - clientHeight);
      container.scrollTop = maxScroll;
      return scrollHeight;
    };

    const checkStabilityAndScroll = () => {
      if (cancelled) return;
      const currentScrollHeight = scrollToBottomInstant();
      if (currentScrollHeight === previousScrollHeight || retryCount >= maxRetries) {
        return;
      }
      previousScrollHeight = currentScrollHeight;
      retryCount += 1;
      setTimeout(checkStabilityAndScroll, retryInterval);
    };

    // Scroll immédiatement (layout en cours), puis surveiller la stabilisation
    requestAnimationFrame(() => {
      scrollToBottomInstant();
      setTimeout(checkStabilityAndScroll, retryInterval);
    });

    return () => {
      cancelled = true;
    };
  }, [watchLayoutChanges, layoutTrigger, getScrollContainer]);

  return {
    messagesEndRef,
    scrollToBottom
  };
}
