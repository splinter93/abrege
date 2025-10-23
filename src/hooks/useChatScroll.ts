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
  scrollToLastAssistantMessage: () => void;
  isNearBottom: boolean;
}

export function useChatScroll(options: UseChatScrollOptions = {}): UseChatScrollReturn {
  const {
    autoScroll = true,
    messages = [],
    offsetTop = 600,
    refreshOffset = 40,
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

  // 🎯 Scroll pour message USER (offset basé sur viewport)
  const scrollToLastUserMessage = useCallback(() => {
    const container = getScrollContainer();
    if (!container) return;

    // 🎯 Calculer l'offset basé sur le viewport (responsive)
    const viewportHeight = window.innerHeight;
    const calculatedOffset = Math.floor(viewportHeight * 0.6); // 60% du viewport
    
    // 🎯 AJOUTER l'espace vide sous les messages (responsive)
    const messagesContainer = container.querySelector('.chatgpt-messages') as HTMLElement;
    if (messagesContainer) {
      messagesContainer.style.paddingBottom = `${calculatedOffset}px`;
    }

    // Scroll au MAXIMUM (comme avant)
    const maxScroll = container.scrollHeight - container.clientHeight;
    
    container.scrollTo({
      top: maxScroll,
      behavior: 'smooth'
    });

    lastScrollTimeRef.current = Date.now();
  }, [getScrollContainer]);

  // 🎯 Scroll pour refresh/chargement (offset normal = 40)
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

  // 🎯 Ajuster le padding SANS scroller (pour messages assistant)
  const adjustPaddingForAssistant = useCallback(() => {
    const container = getScrollContainer();
    if (!container) return;

    // Trouver le dernier message assistant
    const assistantMessages = container.querySelectorAll('.chatgpt-message-assistant');
    const lastAssistantMessage = assistantMessages[assistantMessages.length - 1] as HTMLElement;
    
    if (lastAssistantMessage) {
      // ✅ Forcer un reflow pour obtenir la hauteur réelle après render
      void lastAssistantMessage.offsetHeight;
      
      // Calculer la longueur du message (hauteur en pixels)
      const messageHeight = lastAssistantMessage.offsetHeight;
      
      // 🎯 Calculer l'offset basé sur le viewport (responsive)
      const viewportHeight = window.innerHeight;
      const baseOffset = Math.floor(viewportHeight * 0.6); // 60% du viewport
      
      // Offset dynamique : baseOffset - longueur du message, minimum 40
      const dynamicOffset = Math.max(40, baseOffset - messageHeight);
      
      // 🎯 AJUSTER le padding SANS scroller
      const messagesContainer = container.querySelector('.chatgpt-messages') as HTMLElement;
      if (messagesContainer) {
        messagesContainer.style.paddingBottom = `${dynamicOffset}px`;
      }
      
      // ✅ PAS DE SCROLL - Juste ajuster le padding pour éviter le scroll dans le vide
    }
  }, [getScrollContainer]);

  // 🎯 Scroll pour message ASSISTANT (si jamais besoin, gardé pour compatibilité)
  const scrollToLastAssistantMessage = useCallback(() => {
    adjustPaddingForAssistant();
    // Pas de scroll, juste l'ajustement du padding
  }, [adjustPaddingForAssistant]);

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

  // 🎯 Autoscroll CONDITIONNEL - Seulement pour messages user et NOUVEAUX messages assistant
  const prevMessagesRef = useRef(messages);
  const scrollThrottleRef = useRef<NodeJS.Timeout | null>(null);
  const lastAssistantScrollRef = useRef<string | null>(null);
  
  useEffect(() => {
    if (!autoScroll || messages.length === 0) return;

    const prevMessages = prevMessagesRef.current;
    const prevLast = prevMessages[prevMessages.length - 1];
    const currLast = messages[messages.length - 1];
    
    // ✅ Comparer par ID pour détecter les NOUVEAUX messages (pour scroll)
    const prevLastId = (prevLast as any)?.id || (prevLast as any)?.timestamp;
    const currLastId = (currLast as any)?.id || (currLast as any)?.timestamp;
    const hasNewMessage = messages.length !== prevMessages.length || prevLastId !== currLastId;

    // ✅ Détecter les changements de contenu (même message qui update)
    const hasContentChanged = prevLast !== currLast;

    prevMessagesRef.current = messages;

    // Détermine le rôle du dernier message
    const lastMessage: any = currLast as any;
    const isLastMessageUser = lastMessage && typeof lastMessage === 'object' && 'role' in lastMessage && lastMessage.role === 'user';
    const isLastMessageAssistant = lastMessage && typeof lastMessage === 'object' && 'role' in lastMessage && lastMessage.role === 'assistant';

    // 🎯 USER : Scroll seulement pour NOUVEAUX messages
    if (isLastMessageUser && hasNewMessage) {
      if (scrollThrottleRef.current) clearTimeout(scrollThrottleRef.current);
      scrollThrottleRef.current = setTimeout(() => {
        scrollToLastUserMessage();
      }, 150);
    }

    // 🎯 ASSISTANT : Ajuster padding à chaque changement (même message), SANS scroller
    if (isLastMessageAssistant && hasContentChanged) {
      // Ajuster immédiatement pour éviter les 4px de scroll
      requestAnimationFrame(() => {
        adjustPaddingForAssistant();
      });
    }
  }, [messages, autoScroll, scrollToLastUserMessage, adjustPaddingForAssistant]);

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
    scrollToLastAssistantMessage,
    isNearBottom
  };
}