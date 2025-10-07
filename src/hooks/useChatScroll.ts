import { useRef, useState, useCallback, useEffect } from 'react';

interface UseChatScrollOptions {
  scrollThreshold?: number;
  scrollDelay?: number;
  autoScroll?: boolean;
  messages?: unknown[];
}

interface UseChatScrollReturn {
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  scrollToBottom: (force?: boolean) => void;
  isNearBottom: boolean;
}

export function useChatScroll(options: UseChatScrollOptions = {}): UseChatScrollReturn {
  const { 
    scrollThreshold = 300, 
    scrollDelay = 100,
    autoScroll = true,
    messages = []
  } = options;
  
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const lastScrollTimeRef = useRef<number>(0);

  // Trouver le container scrollable
  const getScrollContainer = useCallback(() => {
    return messagesEndRef.current?.closest('.chatgpt-messages-container, .messages-container') as HTMLElement;
  }, []);

  // Vérifier si l'utilisateur est près du bas
  const checkScrollPosition = useCallback(() => {
    const container = getScrollContainer();
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const near = distanceFromBottom <= scrollThreshold;
    
    setIsNearBottom(near);
  }, [getScrollContainer, scrollThreshold]);

  // Scroll intelligent vers le bas - VERSION OPTIMISÉE
  const scrollToBottom = useCallback((force = false) => {
    const container = getScrollContainer();
    if (!container) return;

    // Clear le timeout précédent
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Scroll optimisé sans manipulation du DOM
    scrollTimeoutRef.current = setTimeout(() => {
      // Utiliser requestAnimationFrame pour un scroll fluide
      requestAnimationFrame(() => {
        const maxScrollTop = container.scrollHeight - container.clientHeight;
        
        container.scrollTo({
          top: Math.max(0, maxScrollTop),
          behavior: 'smooth' // Toujours smooth pour éviter la saccade
        });
        
        lastScrollTimeRef.current = Date.now();
      });
    }, force ? 0 : 50); // Délai réduit pour plus de réactivité
  }, [getScrollContainer]);

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

  // 🎯 Autoscroll optimisé - un seul effet pour éviter les conflits
  const prevMessagesRef = useRef(messages);
  const scrollThrottleRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    if (!autoScroll || messages.length === 0) return;
    
    const prevMessages = prevMessagesRef.current;
    const hasChanged = messages.length !== prevMessages.length || 
      JSON.stringify(messages) !== JSON.stringify(prevMessages);
    
    if (hasChanged) {
      prevMessagesRef.current = messages;
      
      // Throttle le scroll pour éviter les appels multiples
      if (scrollThrottleRef.current) {
        clearTimeout(scrollThrottleRef.current);
      }
      
      scrollThrottleRef.current = setTimeout(() => {
        scrollToBottom(false); // Utiliser smooth scroll
      }, 100);
    }
  }, [messages, autoScroll, scrollToBottom]);

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
    isNearBottom
  };
} 