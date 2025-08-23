import { useRef, useState, useCallback, useEffect } from 'react';

interface UseChatScrollOptions {
  scrollThreshold?: number;
  scrollDelay?: number;
}

interface UseChatScrollReturn {
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  scrollToBottom: (force?: boolean) => void;
  isNearBottom: boolean;
}

export function useChatScroll(options: UseChatScrollOptions = {}): UseChatScrollReturn {
  const { 
    scrollThreshold = 150, 
    scrollDelay = 100
  } = options;
  
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const lastScrollTimeRef = useRef<number>(0);

  // Trouver le container scrollable
  const getScrollContainer = useCallback(() => {
    return messagesEndRef.current?.closest('.chat-messages-container') as HTMLElement;
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

  // Scroll intelligent vers le bas
  const scrollToBottom = useCallback((force = false) => {
    const container = getScrollContainer();
    if (!container) return;

    const now = Date.now();
    
    // Si pas forcé et qu'on a scrollé récemment, on attend
    if (!force && now - lastScrollTimeRef.current < scrollDelay) {
      return;
    }

    // Clear le timeout précédent
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Scroll avec debounce
    scrollTimeoutRef.current = setTimeout(() => {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: force ? 'auto' : 'smooth'
      });
      lastScrollTimeRef.current = Date.now();
    }, force ? 0 : 50);
  }, [getScrollContainer, scrollDelay]);

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

  // Cleanup des timeouts
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  return {
    messagesEndRef,
    scrollToBottom,
    isNearBottom
  };
} 