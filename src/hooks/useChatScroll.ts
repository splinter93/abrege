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

/** Padding min (px) si le message user est plus grand que la zone visible */
const PADDING_MIN_PX = 24;
/** Marge sous le header pour que le message user ne remonte pas trop (px) */
const MARGIN_BELOW_HEADER_PX = 48;

/**
 * Hook pour le scroll auto avec padding temporaire
 * 
 * Fonctionnement :
 * - Scroll UNIQUEMENT quand un nouveau message USER arrive
 * - Ajoute un padding temporaire pour que le message user remonte sous le header
 * - Mesure le dernier message user dans le DOM et calcule le padding pour qu'il
 *   s'arrête exactement en haut de la zone visible (juste sous le header).
 * - Plus de pourcentage viewport : même rendu sur mobile, tablette, desktop.
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
   * Scroll avec padding pour que le message user s'arrête juste sous le header.
   * On soustrait la hauteur du header pour ne pas placer le message sous la barre fixe.
   */
  const scrollToBottom = useCallback(() => {
    const container = getScrollContainer();
    if (!container) return;

    const clientHeight = container.clientHeight;
    const userMessages = container.querySelectorAll('.chatgpt-message-user');
    const lastUserMessage = userMessages.length > 0 ? (userMessages[userMessages.length - 1] as HTMLElement) : null;
    const messageHeight = lastUserMessage?.offsetHeight ?? 0;

    const header = container.closest('.chatgpt-main')?.querySelector('.chatgpt-header') as HTMLElement | null;
    const headerHeight = header?.offsetHeight ?? 0;

    const tempPadding = Math.max(PADDING_MIN_PX, clientHeight - messageHeight - headerHeight - MARGIN_BELOW_HEADER_PX);

    container.style.paddingBottom = `${tempPadding}px`;

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
