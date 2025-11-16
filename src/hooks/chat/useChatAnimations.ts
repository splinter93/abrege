/**
 * Hook pour gérer les animations et le scroll du chat
 * Extrait de ChatFullscreenV2.tsx (useEffect lignes 532-578 + états lignes 98-104)
 * 
 * Responsabilités:
 * - Animation fade-in des messages
 * - Scroll automation avec retry pour images
 * - Gestion état visibility
 * - Reset lors changement session
 */

import { useState, useCallback, useRef } from 'react';
import type { ChatMessage } from '@/types/chat';
import { simpleLogger as logger } from '@/utils/logger';

/**
 * Options du hook
 */
export interface UseChatAnimationsOptions {
  currentSessionId: string | null;
  isLoadingMessages: boolean;
}

/**
 * Interface de retour du hook
 */
export interface UseChatAnimationsReturn {
  shouldAnimateMessages: boolean;
  messagesVisible: boolean;
  displayedSessionId: string | null;
  
  triggerFadeIn: (
    sessionId: string,
    messages: ChatMessage[],
    containerRef: React.RefObject<HTMLDivElement | null>
  ) => void;
  
  resetAnimation: () => void;
  setDisplayedSessionId: (id: string | null) => void;
}

/**
 * Hook pour gérer les animations du chat
 * 
 * Gère le fade-in des messages avec scroll automation intelligent :
 * 1. Rend les messages invisibles (opacity: 0)
 * 2. Scroll instantané (invisible)
 * 3. Retry après 300ms pour charger les images
 * 4. Fade-in progressif
 * 
 * @param options - Options du hook
 * @returns État et actions d'animation
 */
export function useChatAnimations(
  options: UseChatAnimationsOptions
): UseChatAnimationsReturn {
  const { currentSessionId, isLoadingMessages } = options;

  const [shouldAnimateMessages, setShouldAnimateMessages] = useState(false);
  const [messagesVisible, setMessagesVisible] = useState(false);
  const [displayedSessionId, setDisplayedSessionId] = useState<string | null>(null);

  // Ref pour éviter les triggers multiples
  const animationInProgressRef = useRef(false);

  /**
   * Déclenche le fade-in des messages avec scroll automation
   * 
   * Flow:
   * 1. Rendre invisible (opacity: 0)
   * 2. Attendre DOM render
   * 3. Scroll instantané invisible
   * 4. Retry après 300ms pour images
   * 5. Fade-in visible
   * 
   * @param sessionId - ID de la session
   * @param messages - Messages à afficher
   * @param containerRef - Ref du container de scroll
   */
  const triggerFadeIn = useCallback((
    sessionId: string,
    messages: ChatMessage[],
    containerRef: React.RefObject<HTMLDivElement | null>
  ) => {
    // Éviter les triggers multiples
    if (animationInProgressRef.current) {
      logger.dev('[useChatAnimations] ⏭️ Animation déjà en cours, skip');
      return;
    }

    animationInProgressRef.current = true;

    logger.dev('[useChatAnimations] 🎬 Démarrage fade-in:', {
      sessionId,
      messagesCount: messages.length
    });

    let fallbackTimeout: ReturnType<typeof setTimeout> | null = null;
    let messagesContainerElement: HTMLElement | null = null;
    let previousMessagesPaddingBottom: string | null = null;

    const clearFallback = () => {
      if (fallbackTimeout !== null) {
        clearTimeout(fallbackTimeout);
        fallbackTimeout = null;
      }
    };

    const restorePadding = () => {
      if (messagesContainerElement) {
        messagesContainerElement.style.paddingBottom = previousMessagesPaddingBottom ?? '';
      }
    };

    const finalizeWithAnimation = () => {
      if (!animationInProgressRef.current) {
        restorePadding();
        return;
      }

      clearFallback();
      requestAnimationFrame(() => {
        setMessagesVisible(true);
        setShouldAnimateMessages(true);

        setTimeout(() => {
          setShouldAnimateMessages(false);
          animationInProgressRef.current = false;
          // ✅ Padding déjà restauré avant fade-in, pas besoin de le refaire ici
        }, 400); // Durée transition CSS
      });
    };

    const finalizeWithoutAnimation = () => {
      clearFallback();
      restorePadding();
      setMessagesVisible(true);
      setShouldAnimateMessages(false);
      animationInProgressRef.current = false;
    };

    if (messages.length > 0) {
      // 🎯 ÉTAPE 1 : Rendre invisible
      setMessagesVisible(false);

      fallbackTimeout = setTimeout(() => {
        logger.warn('[useChatAnimations] ⚠️ Fallback fade-in déclenché (rAF suspendu)');
        finalizeWithoutAnimation();
      }, 1200);

      // 🎯 ÉTAPE 2 : Attendre render + scroll instantané
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const container = containerRef.current;
          if (!container) {
            logger.warn('[useChatAnimations] ⚠️ Container ref null');
            finalizeWithoutAnimation();
            return;
          }

          const messagesContainer = container.querySelector('.chatgpt-messages') as HTMLElement | null;
          if (messagesContainer) {
            messagesContainerElement = messagesContainer;
            previousMessagesPaddingBottom = messagesContainer.style.paddingBottom;
            messagesContainer.style.paddingBottom = '40px';
          }

          // Scroll instantané (invisible)
          const maxScrollTop = container.scrollHeight - container.clientHeight;
          container.scrollTop = Math.max(0, maxScrollTop);

          logger.dev('[useChatAnimations] 📍 Scroll initial:', {
            scrollTop: container.scrollTop,
            scrollHeight: container.scrollHeight,
            clientHeight: container.clientHeight
          });

          // 🎯 ÉTAPE 3 : Retry après 300ms pour images/mermaid
          setTimeout(() => {
            const newMaxScrollTop = container.scrollHeight - container.clientHeight;
            const finalScrollTop = Math.max(0, newMaxScrollTop);
            
            // ✅ Scroll instantané (pas smooth) pour éviter conflit avec fade-in
            container.scrollTop = finalScrollTop;

            logger.dev('[useChatAnimations] 📍 Scroll retry:', {
              scrollTop: finalScrollTop,
              scrollHeight: container.scrollHeight
            });

            // ✅ RESTAURER LE PADDING AVANT LE FADE-IN pour éviter saccade
            // Le padding change la hauteur du container, il faut le restaurer avant l'animation
            restorePadding();

            // 🎯 ÉTAPE 4 : Recaler le scroll après restauration du padding
            // Le padding restauré peut changer la hauteur, on recalcule
            requestAnimationFrame(() => {
              const scrollAfterPaddingRestore = container.scrollHeight - container.clientHeight;
              container.scrollTop = Math.max(0, scrollAfterPaddingRestore);

              // Petit délai pour stabilisation puis fade-in
              setTimeout(() => {
                finalizeWithAnimation();
              }, 50);
            });
          }, 300); // Attendre chargement images
        });
      });
    } else {
      // 🎯 Conversation vide : afficher directement empty state
      finalizeWithAnimation();
    }

    setDisplayedSessionId(sessionId);

    logger.dev('[useChatAnimations] ✅ Fade-in configuré');
  }, []);

  /**
   * Réinitialise l'animation
   * Appelé lors du changement de session
   */
  const resetAnimation = useCallback(() => {
    setShouldAnimateMessages(false);
    setMessagesVisible(false);
    setDisplayedSessionId(null);
    animationInProgressRef.current = false;

    logger.dev('[useChatAnimations] 🔄 Animation réinitialisée');
  }, []);

  return {
    shouldAnimateMessages,
    messagesVisible,
    displayedSessionId,
    triggerFadeIn,
    resetAnimation,
    setDisplayedSessionId
  };
}

