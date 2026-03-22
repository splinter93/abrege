import { useRef, useCallback, useEffect, useLayoutEffect } from 'react';
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
  /** Scroll to follow streaming content (call on each chunk if user hasn't scrolled away) */
  scrollToFollowStream: () => void;
}

/** Marge sous le header pour que le message user ne colle pas au bord (px) */
const MARGIN_BELOW_HEADER_PX = 16;
const USER_SCROLL_SETTLE_MS = 320;

/**
 * Hook pour le scroll auto — comportement ChatGPT :
 *
 * 1. Message USER → scroll pour positionner le message user en haut de la zone visible
 *    (juste sous le header). Pas de paddingBottom artificiel.
 * 2. Message ASSISTANT en streaming → garde la position de lecture stable.
 *    Le contenu peut dépasser naturellement, sans autoscroll forcé.
 * 3. Scroll manuel → reste libre pour revoir l'historique ou descendre lire la suite.
 */
export function useChatScroll(options: UseChatScrollOptions = {}): UseChatScrollReturn {
  const { autoScroll = true, messages = [], watchLayoutChanges = false, layoutTrigger } = options;

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const prevMessagesRef = useRef(messages);
  const prevLayoutTriggerRef = useRef(layoutTrigger);
  const isScrollingProgrammaticallyRef = useRef(false);
  const scrollAnimationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streamAnchorScrollTopRef = useRef<number | null>(null);
  const bottomSpacerHeightRef = useRef(0);
  /** Offset contenu du dernier assistant (timeline / markdown) pendant le stream — compensation fin de stream */
  const assistantStreamAnchorYRef = useRef<number | null>(null);
  const prevLastAssistantWasStreamingRef = useRef(false);

  const getScrollContainer = useCallback((): HTMLElement | null => {
    return (
      (messagesEndRef.current?.closest('.chatgpt-messages-container') as HTMLElement) ||
      (messagesEndRef.current?.parentElement as HTMLElement) ||
      null
    );
  }, []);

  const setBottomSpacerHeight = useCallback((height: number) => {
    const spacer = messagesEndRef.current;
    if (!spacer) return;

    const safeHeight = Math.max(0, Math.round(height));
    bottomSpacerHeightRef.current = safeHeight;
    spacer.style.display = 'block';
    spacer.style.width = '100%';
    spacer.style.height = `${safeHeight}px`;
    spacer.style.flexShrink = '0';
  }, []);

  const updateBottomSpacerForAnchor = useCallback((anchorScrollTop: number) => {
    const container = getScrollContainer();
    if (!container) return;

    const contentMaxScroll = Math.max(
      0,
      container.scrollHeight - container.clientHeight - bottomSpacerHeightRef.current
    );
    const requiredSpacer = Math.max(0, anchorScrollTop - contentMaxScroll);
    setBottomSpacerHeight(requiredSpacer);
  }, [getScrollContainer, setBottomSpacerHeight]);

  /**
   * Position de suivi "effective" :
   * - soit le vrai bas si pas de spacer artificiel
   * - soit l'ancre user si le spacer artificiel est encore présent
   */
  const getFollowScrollTop = useCallback((container: HTMLElement): number => {
    const actualMaxScrollTop = Math.max(0, container.scrollHeight - container.clientHeight);
    const anchorScrollTop = streamAnchorScrollTopRef.current;

    if (anchorScrollTop !== null && bottomSpacerHeightRef.current > 0) {
      return Math.min(anchorScrollTop, actualMaxScrollTop);
    }

    return actualMaxScrollTop;
  }, []);

  /**
   * Recalcule la frontière de scroll autorisée à partir du layout réel actuel.
   * Important quand le rendu final assistant (markdown, cross-fade, images, etc.)
   * modifie la hauteur après la fin du stream.
   */
  const refreshFollowBounds = useCallback((container: HTMLElement): number => {
    const anchorScrollTop = streamAnchorScrollTopRef.current;
    if (anchorScrollTop !== null) {
      updateBottomSpacerForAnchor(anchorScrollTop);
    }

    return getFollowScrollTop(container);
  }, [getFollowScrollTop, updateBottomSpacerForAnchor]);

  /**
   * Fin de stream : layout (reasoning, markdown final, actions). On compense scrollTop pour que
   * le corps du message (ancre data-chat-stream-anchor) reste visuellement stable.
   */
  useLayoutEffect(() => {
    if (!autoScroll || messages.length === 0) return;

    const container = getScrollContainer();
    if (!container) return;

    const last = messages[messages.length - 1];
    const assistants = container.querySelectorAll('.chatgpt-message-assistant');
    const lastAssistant = assistants[assistants.length - 1] as HTMLElement | undefined;
    const anchor = lastAssistant?.querySelector<HTMLElement>('[data-chat-stream-anchor]') ?? null;

    const contentY = (el: HTMLElement) =>
      el.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop;

    if (last?.role !== 'assistant') {
      assistantStreamAnchorYRef.current = null;
      prevLastAssistantWasStreamingRef.current = false;
      return;
    }

    const streaming = Boolean(last.isStreaming);

    if (streaming) {
      if (anchor) {
        assistantStreamAnchorYRef.current = contentY(anchor);
      }
      prevLastAssistantWasStreamingRef.current = true;
      return;
    }

    const wasStreaming = prevLastAssistantWasStreamingRef.current;
    prevLastAssistantWasStreamingRef.current = false;

    if (wasStreaming && anchor && assistantStreamAnchorYRef.current != null) {
      const yAfter = contentY(anchor);
      const delta = yAfter - assistantStreamAnchorYRef.current;
      if (Math.abs(delta) > 0.5) {
        isScrollingProgrammaticallyRef.current = true;
        container.scrollTop += delta;
        requestAnimationFrame(() => {
          isScrollingProgrammaticallyRef.current = false;
        });
      }
    }

    assistantStreamAnchorYRef.current = null;
  }, [messages, autoScroll, getScrollContainer]);

  // Détecter le scroll manuel de l'utilisateur
  useEffect(() => {
    const container = getScrollContainer();
    if (!container) return;

    const onScroll = () => {
      if (isScrollingProgrammaticallyRef.current) return;

      // Empêche de scroller "dans le vide" créé par le spacer artificiel,
      // tout en laissant libre le scroll vers le haut pour revoir l'historique.
      const maxAllowedScrollTop = refreshFollowBounds(container);
      if (container.scrollTop > maxAllowedScrollTop) {
        isScrollingProgrammaticallyRef.current = true;
        container.scrollTop = maxAllowedScrollTop;
        requestAnimationFrame(() => {
          isScrollingProgrammaticallyRef.current = false;
        });
        return;
      }
    };

    container.addEventListener('scroll', onScroll, { passive: true });
    return () => container.removeEventListener('scroll', onScroll);
  }, [getScrollContainer, refreshFollowBounds]);

  /**
   * Positionne le dernier message user en haut de la zone visible (juste sous le header).
   * N'ajoute aucun paddingBottom — utilise uniquement scrollTop.
   */
  const scrollToUserMessage = useCallback(() => {
    const container = getScrollContainer();
    if (!container) return;

    const userMessages = container.querySelectorAll('.chatgpt-message-user');
    const lastUserMessage = userMessages.length > 0
      ? (userMessages[userMessages.length - 1] as HTMLElement)
      : null;

    if (lastUserMessage) {
      const containerRect = container.getBoundingClientRect();
      const messageRect = lastUserMessage.getBoundingClientRect();
      const messageOffsetTop = container.scrollTop + (messageRect.top - containerRect.top);
      const targetScrollTop = Math.max(0, messageOffsetTop - MARGIN_BELOW_HEADER_PX);

      isScrollingProgrammaticallyRef.current = true;
      streamAnchorScrollTopRef.current = targetScrollTop;
      updateBottomSpacerForAnchor(targetScrollTop);
      if (scrollAnimationTimeoutRef.current) {
        clearTimeout(scrollAnimationTimeoutRef.current);
      }
      container.scrollTo({ top: targetScrollTop, behavior: 'smooth' });

      scrollAnimationTimeoutRef.current = setTimeout(() => {
        scrollAnimationTimeoutRef.current = null;
        isScrollingProgrammaticallyRef.current = false;
      }, USER_SCROLL_SETTLE_MS);
    } else {
      // Fallback : scroll en bas
      isScrollingProgrammaticallyRef.current = true;
      streamAnchorScrollTopRef.current = null;
      setBottomSpacerHeight(0);
      container.scrollTo({ top: container.scrollHeight, behavior: 'auto' });
      requestAnimationFrame(() => {
        isScrollingProgrammaticallyRef.current = false;
      });
    }
  }, [getScrollContainer, setBottomSpacerHeight, updateBottomSpacerForAnchor]);

  /**
   * Pendant le streaming, on met seulement à jour l'espace artificiel éventuel
   * sans déplacer la position de lecture de l'utilisateur.
   */
  const scrollToFollowStream = useCallback(() => {
    const container = getScrollContainer();
    if (!container) return;

    const anchorScrollTop = streamAnchorScrollTopRef.current;
    if (anchorScrollTop === null) return;

    const maxAllowedScrollTop = refreshFollowBounds(container);
    if (container.scrollTop > maxAllowedScrollTop) {
      isScrollingProgrammaticallyRef.current = true;
      container.scrollTop = maxAllowedScrollTop;
      requestAnimationFrame(() => {
        isScrollingProgrammaticallyRef.current = false;
      });
    }
  }, [getScrollContainer, refreshFollowBounds]);

  /** scrollToBottom public — conservé pour compatibilité API externe */
  const scrollToBottom = useCallback(() => {
    scrollToUserMessage();
  }, [scrollToUserMessage]);

  // Autoscroll UNIQUEMENT pour nouveaux messages user
  useEffect(() => {
    if (!autoScroll || messages.length === 0) return;

    const prevMessages = prevMessagesRef.current;
    const currLast = messages[messages.length - 1];
    const hasNewMessage = messages.length !== prevMessages.length;
    prevMessagesRef.current = messages;

    if (hasNewMessage && currLast?.role === 'user') {
      // Délai pour laisser le DOM se mettre à jour
      setTimeout(() => scrollToUserMessage(), 100);
    }
  }, [messages, autoScroll, scrollToUserMessage]);

  useEffect(() => {
    if (messages.length > 0) return;
    streamAnchorScrollTopRef.current = null;
    setBottomSpacerHeight(0);
  }, [messages.length, setBottomSpacerHeight]);

  useEffect(() => {
    return () => {
      if (scrollAnimationTimeoutRef.current) {
        clearTimeout(scrollAnimationTimeoutRef.current);
      }
    };
  }, []);

  // Scroll auto quand le layout change (ouverture/fermeture canva)
  useEffect(() => {
    if (!watchLayoutChanges || layoutTrigger === undefined) return;

    const container = getScrollContainer();
    if (!container) return;

    const layoutChanged = prevLayoutTriggerRef.current !== layoutTrigger;
    prevLayoutTriggerRef.current = layoutTrigger;

    if (!layoutChanged) return;

    let cancelled = false;
    let retryCount = 0;
    const maxRetries = 8;
    const retryInterval = 100;
    let previousScrollHeight = container.scrollHeight;

    const scrollToBottomInstant = () => {
      if (cancelled) return previousScrollHeight;
      const scrollHeight = container.scrollHeight;
      const clientHeight = container.clientHeight;
      container.scrollTop = Math.max(0, scrollHeight - clientHeight);
      return scrollHeight;
    };

    const checkStabilityAndScroll = () => {
      if (cancelled) return;
      const currentScrollHeight = scrollToBottomInstant();
      if (currentScrollHeight === previousScrollHeight || retryCount >= maxRetries) return;
      previousScrollHeight = currentScrollHeight;
      retryCount += 1;
      setTimeout(checkStabilityAndScroll, retryInterval);
    };

    requestAnimationFrame(() => {
      scrollToBottomInstant();
      setTimeout(checkStabilityAndScroll, retryInterval);
    });

    return () => { cancelled = true; };
  }, [watchLayoutChanges, layoutTrigger, getScrollContainer]);

  return {
    messagesEndRef,
    scrollToBottom,
    scrollToFollowStream
  };
}
