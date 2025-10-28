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
    containerRef: React.RefObject<HTMLDivElement>
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
    containerRef: React.RefObject<HTMLDivElement>
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

    if (messages.length > 0) {
      // 🎯 ÉTAPE 1 : Rendre invisible
      setMessagesVisible(false);

      // 🎯 ÉTAPE 2 : Attendre render + scroll instantané
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const container = containerRef.current;
          if (!container) {
            logger.warn('[useChatAnimations] ⚠️ Container ref null');
            animationInProgressRef.current = false;
            return;
          }

          // Forcer padding fixe
          const messagesContainer = container.querySelector('.chatgpt-messages') as HTMLElement;
          if (messagesContainer) {
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
            container.scrollTop = Math.max(0, newMaxScrollTop);

            logger.dev('[useChatAnimations] 📍 Scroll retry:', {
              scrollTop: container.scrollTop,
              scrollHeight: container.scrollHeight
            });

            // 🎯 ÉTAPE 4 : Fade-in maintenant que tout est en place
            requestAnimationFrame(() => {
              setMessagesVisible(true);
              setShouldAnimateMessages(true);
              
              // Désactiver animation après transition
              setTimeout(() => {
                setShouldAnimateMessages(false);
                animationInProgressRef.current = false;
              }, 400); // Durée transition CSS
            });
          }, 300); // Attendre chargement images
        });
      });
    } else {
      // 🎯 Conversation vide : afficher directement empty state
      setMessagesVisible(true);
      setShouldAnimateMessages(true);
      setTimeout(() => {
        setShouldAnimateMessages(false);
        animationInProgressRef.current = false;
      }, 400);
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

