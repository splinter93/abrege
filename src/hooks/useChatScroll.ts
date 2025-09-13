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
    scrollThreshold = 150, 
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

  // Scroll intelligent vers le bas - VERSION CORRIGÉE
  const scrollToBottom = useCallback((force = false) => {
    const container = getScrollContainer();
    if (!container) return;

    // Clear le timeout précédent
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Scroll immédiat avec offset généreux
    scrollTimeoutRef.current = setTimeout(() => {
      // Calculer la hauteur de l'input pour un offset précis
      const inputContainer = container.closest('.chatgpt-container, .chat-fullscreen-container')?.querySelector('.chatgpt-input-container, .chat-input-container') as HTMLElement;
      const inputHeight = inputContainer ? inputContainer.offsetHeight : 120; // fallback si pas trouvé
      
      // ✅ CORRECTION: Créer un padding-bottom temporaire pour forcer l'espace
      const originalPaddingBottom = container.style.paddingBottom;
      const extraPadding = inputHeight + 100; // hauteur input + marge généreuse
      
      // Appliquer le padding temporaire
      container.style.paddingBottom = `${extraPadding}px`;
      
      // Forcer le recalcul du layout
      container.offsetHeight;
      
      // Maintenant scroll vers le bas réel
      const maxScrollTop = container.scrollHeight - container.clientHeight;
      
      container.scrollTo({
        top: Math.max(0, maxScrollTop),
        behavior: force ? 'auto' : 'smooth'
      });
      
      // Restaurer le padding original après le scroll
      setTimeout(() => {
        container.style.paddingBottom = originalPaddingBottom;
      }, force ? 50 : 300);
      
      lastScrollTimeRef.current = Date.now();
    }, force ? 0 : 100);
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

  // 🎯 Autoscroll automatique - surveille les changements de contenu
  const prevMessagesRef = useRef(messages);
  useEffect(() => {
    if (!autoScroll || messages.length === 0) return;
    
    const prevMessages = prevMessagesRef.current;
    const hasChanged = messages.length !== prevMessages.length || 
      JSON.stringify(messages) !== JSON.stringify(prevMessages);
    
    if (hasChanged) {
      prevMessagesRef.current = messages;
      
      // Scroll immédiat pour tout changement de message
      const timer = setTimeout(() => {
        scrollToBottom(true);
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [messages, autoScroll, scrollToBottom]);

  // 🎯 Autoscroll spécifique pour les changements de contenu des messages d'assistant
  useEffect(() => {
    if (!autoScroll || messages.length === 0) return;
    
    // Surveiller les changements de contenu des messages d'assistant
    const assistantMessages = messages.filter((msg: any) => msg.role === 'assistant');
    const hasAssistantContentChanged = assistantMessages.some((msg: any, index) => {
      const prevAssistantMessages = prevMessagesRef.current.filter((prevMsg: any) => prevMsg.role === 'assistant');
      const prevMsg = prevAssistantMessages[index];
      return prevMsg && prevMsg.content !== msg.content;
    });
    
    if (hasAssistantContentChanged) {
      // Scroll immédiat quand le contenu d'un message assistant change
      const timer = setTimeout(() => {
        scrollToBottom(true);
      }, 50); // Délai plus court pour le streaming
      
      return () => clearTimeout(timer);
    }
  }, [messages, autoScroll, scrollToBottom]);

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