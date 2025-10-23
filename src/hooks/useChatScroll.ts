import { useRef, useState, useCallback, useEffect } from 'react';

interface UseChatScrollOptions {
  autoScroll?: boolean;
  messages?: unknown[];
  offsetTop?: number;            // espace sous le header quand on centre un message
  refreshOffset?: number;        // offset normal au refresh/chargement
}

interface UseChatScrollReturn {
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  scrollToBottom: (force?: boolean) => void;
  scrollToLastUserMessage: () => void;
  isNearBottom: boolean;
}

export function useChatScroll(options: UseChatScrollOptions = {}): UseChatScrollReturn {
  const {
    autoScroll = true,
    messages = [],
    offsetTop = 840,
    refreshOffset = 50,
  } = options;
  
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const lastScrollTimeRef = useRef<number>(0);

  // Trouver le container scrollable
  const getScrollContainer = useCallback(() => {
    return (
      messagesEndRef.current?.closest(
        '.chatgpt-messages-container, .messages-container, .chat-scroll-container'
      ) as HTMLElement
    ) || (messagesEndRef.current?.parentElement as HTMLElement);
  }, []);

  // Vérifier si l'utilisateur est près du bas
  const checkScrollPosition = useCallback(() => {
    const container = getScrollContainer();
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const near = distanceFromBottom <= 300;
    
    setIsNearBottom(near);
  }, [getScrollContainer]);

  // 🎯 Scroll pour message USER (offset fort = 840)
  const scrollToLastUserMessage = useCallback(() => {
    const container = getScrollContainer();
    if (!container) return;

    // 🎯 AJOUTER l'espace vide FORT sous les messages (pour positionner sous header)
    const messagesContainer = container.querySelector('.chatgpt-messages') as HTMLElement;
    if (messagesContainer) {
      messagesContainer.style.paddingBottom = `${offsetTop}px`;
    }

    // Scroll au MAXIMUM (comme avant)
    const maxScroll = container.scrollHeight - container.clientHeight;
    
    container.scrollTo({
      top: maxScroll,
      behavior: 'smooth'
    });

    lastScrollTimeRef.current = Date.now();
  }, [getScrollContainer, offsetTop]);

  // 🎯 Scroll pour refresh/chargement (offset normal = 50)
  const scrollToBottom = useCallback((force = false) => {
    const container = getScrollContainer();
    if (!container) return;

    // Clear le timeout précédent
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // 🎯 AJOUTER l'espace vide NORMAL sous les messages (pour voir tout le chat)
    const messagesContainer = container.querySelector('.chatgpt-messages') as HTMLElement;
    if (messagesContainer) {
      messagesContainer.style.paddingBottom = `${refreshOffset}px`;
    }

    // Scroll optimisé sans manipulation du DOM
    scrollTimeoutRef.current = setTimeout(() => {
      // Utiliser requestAnimationFrame pour un scroll fluide
      requestAnimationFrame(() => {
        const maxScrollTop = container.scrollHeight - container.clientHeight;
        
        container.scrollTo({
          top: Math.max(0, maxScrollTop),
          behavior: 'smooth'
        });
        
        lastScrollTimeRef.current = Date.now();
      });
    }, force ? 0 : 50);
  }, [getScrollContainer, refreshOffset]);

  // Écouter le scroll pour détecter la position
  useEffect(() => {
    const container = getScrollContainer();
    if (!container) return;

    const handleScroll = () => {
      checkScrollPosition();
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    
    // Vérifier la position initiale
    checkScrollPosition();
    
    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [getScrollContainer, checkScrollPosition]);

  // 🎯 Autoscroll CONDITIONNEL - Seulement pour messages user
  const prevMessagesRef = useRef(messages);
  const scrollThrottleRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    if (!autoScroll || messages.length === 0) return;

    const prevMessages = prevMessagesRef.current;
    const prevLast = prevMessages[prevMessages.length - 1];
    const currLast = messages[messages.length - 1];
    const hasChanged = messages.length !== prevMessages.length || prevLast !== currLast;

    if (!hasChanged) return;

    prevMessagesRef.current = messages;

    // Détermine le rôle du dernier message si possible
    const lastMessage: any = currLast as any;
    const isLastMessageUser = lastMessage && typeof lastMessage === 'object' && 'role' in lastMessage && lastMessage.role === 'user';

    if (isLastMessageUser) {
      // Petit centrage du message user sous le header
      if (scrollThrottleRef.current) clearTimeout(scrollThrottleRef.current);
      scrollThrottleRef.current = setTimeout(() => {
        scrollToLastUserMessage();
      }, 150);
    }
  }, [messages, autoScroll, scrollToLastUserMessage]);

  // Cleanup des timeouts
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      if (scrollThrottleRef.current) {
        clearTimeout(scrollThrottleRef.current);
      }
    };
  }, []);

  return {
    messagesEndRef,
    scrollToBottom,
    scrollToLastUserMessage,
    isNearBottom
  };
}