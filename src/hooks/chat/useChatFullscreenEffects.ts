/**
 * Hook pour gérer les effects et displayMessages de ChatFullscreenV2
 * Extrait de ChatFullscreenV2.tsx (lignes 169-191, 376-598, 784-871, 707-743)
 * 
 * Responsabilités:
 * - Initialisation chat (sessions, agent, canva)
 * - Canva management (auto-activate, close on session change)
 * - Sidebar effects (default, mobile, session change)
 * - Session change detection
 * - Animation trigger
 * - Infinite scroll detection
 * - Display messages (useMemo)
 * 
 * Conformité GUIDE-EXCELLENCE-CODE.md: Hook < 300 lignes, types stricts
 */

import { useEffect, useMemo, useState } from 'react';
import type { ChatMessage, ChatSession, Agent, EditingState } from '@/types/chat';
import type { UseChatAnimationsReturn } from './useChatAnimations';
import type { UseStreamingStateReturn } from './useStreamingState';
import type { UseChatFullscreenUIStateReturn } from './useChatFullscreenUIState';
import type { CanvaSession as CanvaSessionFromStore } from '@/store/useCanvaStore';
import { isEmptyAnalysisMessage } from '@/types/chat';
import { simpleLogger as logger } from '@/utils/logger';
import { getSupabaseClient } from '@/utils/supabaseClientSingleton';
import { useChatStore } from '@/store/useChatStore';
import { supabase } from '@/supabaseClient';
import type { CanvaSession as CanvaSessionDB, ListCanvasResponse } from '@/types/canva';

/**
 * Options du hook
 */
export interface UseChatFullscreenEffectsOptions {
  isDesktop: boolean;
  user: { id: string; email?: string } | null;
  authLoading: boolean;
  agentsLoading: boolean;
  agents: Agent[];
  currentSession: ChatSession | null;
  sidebarOpen: boolean;
  isCanvaOpen: boolean;
  activeCanvaId: string | null;
  canvaSessions: Record<string, CanvaSessionFromStore>;
  infiniteMessages: ChatMessage[];
  isLoadingMessages: boolean;
  hasMore: boolean;
  isLoadingMore: boolean;
  editingMessage: EditingState | null;
  animations: UseChatAnimationsReturn;
  streamingState: UseStreamingStateReturn;
  uiState: UseChatFullscreenUIStateReturn;
  syncSessions: () => Promise<void>;
  setCurrentSession: (session: ChatSession | null) => void;
  setSelectedAgent: (agent: Agent | null) => void;
  setAgentNotFound: (notFound: boolean) => void;
  clearInfiniteMessages: () => void;
  loadMoreMessages: () => void;
  switchCanva: (canvaId: string, noteId: string) => Promise<'activated' | 'not_found'>;
  closeCanva: (canvaId: string, options?: { delete?: boolean }) => Promise<void>;
}

/**
 * Interface de retour du hook
 */
export interface UseChatFullscreenEffectsReturn {
  displayMessages: ChatMessage[];
  isInitializing: boolean;
}

/**
 * Hook pour gérer les effects et displayMessages de ChatFullscreenV2
 * 
 * Groupe tous les useEffect et le useMemo displayMessages dans un seul hook
 * pour éviter la duplication et garantir la cohérence.
 * 
 * @param options - Options du hook
 * @returns displayMessages et isInitializing
 */
export function useChatFullscreenEffects(
  options: UseChatFullscreenEffectsOptions
): UseChatFullscreenEffectsReturn {
  const {
    isDesktop,
    user,
    authLoading,
    agentsLoading,
    agents,
    currentSession,
    sidebarOpen,
    isCanvaOpen,
    activeCanvaId,
    canvaSessions,
    infiniteMessages,
    isLoadingMessages,
    hasMore,
    isLoadingMore,
    editingMessage,
    animations,
    streamingState,
    uiState,
    syncSessions,
    setCurrentSession,
    setSelectedAgent,
    setAgentNotFound,
    clearInfiniteMessages,
    loadMoreMessages,
    switchCanva,
    closeCanva
  } = options;

  const [isInitializing, setIsInitializing] = useState(true);

  // 🎯 SYNC SESSIONS + AUTO-SELECT DERNIÈRE CONVERSATION + AGENT (flow séquentiel optimal)
  useEffect(() => {
    // ✅ Attendre auth uniquement (pas isInitializing, car on gère l'init ici)
    if (!user || authLoading || agentsLoading) {
      return;
    }

    // ✅ FIX RACE CONDITION : Tout séquentiel (sessions → session → agent)
    let isMounted = true;

    const initializeChat = async () => {
      try {
        // 1️⃣ Sync sessions depuis DB
        await syncSessions();
        
        if (!isMounted) return;
        
        // 2️⃣ Lire l'état actuel du store (mis à jour par syncSessions)
        const storeState = useChatStore.getState();
        
        // 3️⃣ Auto-select dernière conversation si aucune session active
        if (!storeState.currentSession && storeState.sessions.length > 0) {
          // Sessions déjà triées par updated_at DESC (plus récente en premier)
          const lastSession = storeState.sessions[0];
          setCurrentSession(lastSession);
          logger.dev('[useChatFullscreenEffects] 🎯 Auto-select dernière conversation:', {
            id: lastSession.id,
            name: lastSession.name,
            agentId: lastSession.agent_id
          });

          // 4️⃣ Charger l'agent de la session (si agent_id existe)
          if (lastSession.agent_id && agents.length > 0) {
            const sessionAgent = agents.find(a => a.id === lastSession.agent_id);
            if (sessionAgent) {
              setSelectedAgent(sessionAgent);
              logger.dev('[useChatFullscreenEffects] ✅ Agent de la session chargé:', sessionAgent.name);
            }
          }
        } else if (storeState.sessions.length === 0 && agents.length > 0) {
          // 5️⃣ FALLBACK : Aucune session → charger agent favori
          const { data: userData } = await supabase
            .from('users')
            .select('favorite_agent_id')
            .eq('id', user.id)
            .single();

          const favoriteAgentId = userData?.favorite_agent_id;
          const favoriteAgent = favoriteAgentId 
            ? agents.find(a => a.id === favoriteAgentId) 
            : agents[0];

          if (favoriteAgent) {
            setSelectedAgent(favoriteAgent);
            logger.dev('[useChatFullscreenEffects] 🌟 Agent favori chargé (aucune session):', favoriteAgent.name);
          }
        }

        // 6️⃣ Marquer initialisation terminée
        setIsInitializing(false);
        logger.dev('[useChatFullscreenEffects] ✅ Initialisation chat terminée');

      } catch (error) {
        logger.error('[useChatFullscreenEffects] ❌ Erreur initialisation chat:', error);
        setIsInitializing(false);
      }
    };

    initializeChat();

    return () => {
      isMounted = false;
    };
  }, [user, authLoading, agentsLoading, agents, syncSessions, setCurrentSession, setSelectedAgent]);

  // 🎯 FERMER CANVA SI PAS ASSOCIÉ À SESSION ACTUELLE
  useEffect(() => {
    // Ne rien faire si pas encore initialisé ou pas de session
    if (!currentSession?.id || !user?.id || authLoading) {
      return;
    }

    // Si un canva est actif, vérifier qu'il appartient à la session actuelle
    if (isCanvaOpen && activeCanvaId) {
      const activeCanva = canvaSessions[activeCanvaId];
      
      // ✅ Ignorer si chatSessionId est vide (session locale pas encore hydratée)
      // ✅ Ne fermer que si chatSessionId est défini ET différent de la session actuelle
      if (activeCanva && 
          activeCanva.chatSessionId && 
          activeCanva.chatSessionId !== currentSession.id) {
        logger.info('[useChatFullscreenEffects] 🔄 Fermeture canva : appartient à une autre session', {
          activeCanvaId,
          activeCanvaChatSessionId: activeCanva.chatSessionId,
          currentSessionId: currentSession.id
        });
        
        closeCanva(activeCanvaId).catch((error) => {
          logger.error('[useChatFullscreenEffects] ❌ Erreur fermeture canva lors changement session', error);
        });
      }
    }
  }, [currentSession?.id, isCanvaOpen, activeCanvaId, canvaSessions, closeCanva, user?.id, authLoading]);

  // 🎯 AUTO-ACTIVATE OPEN CANVA on session load
  useEffect(() => {
    // Ne rien faire si pas encore initialisé ou pas de session
    if (!currentSession?.id || !user?.id || authLoading) {
      return;
    }

    // Ne rien faire si un canva est déjà actif (évite double activation)
    // ✅ Vérifier aussi que le canva actif appartient à la session actuelle
    if (isCanvaOpen && activeCanvaId) {
      const activeCanva = canvaSessions[activeCanvaId];
      // Si le canva actif appartient à la session actuelle, ne rien faire
      if (activeCanva && activeCanva.chatSessionId === currentSession.id) {
      return;
      }
    }

    let isMounted = true;

    const loadAndActivateOpenCanva = async () => {
      try {
        // Récupérer token auth via client singleton (évite multiples GoTrueClient)
        const supabaseClient = getSupabaseClient();
        const { data: { session } } = await supabaseClient.auth.getSession();

        if (!session?.access_token || !isMounted) {
          return;
        }

        // Charger les canvas de cette session
        const response = await fetch(`/api/v2/canva/sessions?chat_session_id=${currentSession.id}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'X-Client-Type': 'canva_auto_activate'
          }
        });

        if (!response.ok || !isMounted) {
          return;
        }

        const data = await response.json() as ListCanvasResponse;
        const canvases = data.canva_sessions || [];

        // Trouver tous les canvas avec status='open'
        const openCanvas = canvases.filter((c: CanvaSessionDB) => c.status === 'open');

        if (openCanvas.length === 0) {
          // Pas de canva ouvert → chat normal
          return;
        }

        // ✅ FALLBACK : Si plusieurs canvas sont 'open' (cas d'erreur/race condition)
        // On prend le dernier (updated_at le plus récent, ou created_at si pas de updated_at)
        let selectedCanva = openCanvas[0];
        if (openCanvas.length > 1) {
          logger.warn('[useChatFullscreenEffects] ⚠️ Multiple open canvases detected, using fallback (most recent)', {
            count: openCanvas.length,
            canvases: openCanvas.map((c: CanvaSessionDB) => ({ id: c.id, created_at: c.created_at }))
          });

          // Trier par created_at DESC (le plus récent en premier)
          // Note: CanvaSession n'a pas updated_at, on utilise created_at
          selectedCanva = openCanvas.sort((a: CanvaSessionDB, b: CanvaSessionDB) => {
            const aDate = a.created_at || '';
            const bDate = b.created_at || '';
            return bDate.localeCompare(aDate); // DESC order
          })[0];

          // ✅ FALLBACK ACTION : Fermer les autres canvas 'open' (cleanup)
          try {
            await Promise.all(
              openCanvas
                .filter((c: CanvaSessionDB) => c.id !== selectedCanva.id)
                .map((otherCanva: CanvaSessionDB) =>
                  fetch(`/api/v2/canva/sessions/${otherCanva.id}`, {
                    method: 'PATCH',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${session.access_token}`,
                      'X-Client-Type': 'canva_fallback_cleanup'
                    },
                    body: JSON.stringify({ status: 'closed' })
                  })
                )
            );

            logger.info('[useChatFullscreenEffects] ✅ Fallback cleanup: closed other open canvases', {
              closedCount: openCanvas.length - 1,
              keptCanvaId: selectedCanva.id
            });
          } catch (cleanupError) {
            logger.error('[useChatFullscreenEffects] ⚠️ Error during fallback cleanup', cleanupError);
            // Continue quand même, on active le canva sélectionné
          }
        }

        if (selectedCanva && selectedCanva.note_id && isMounted) {
          logger.info('[useChatFullscreenEffects] 🔄 Auto-activating open canva on load', {
            canvaId: selectedCanva.id,
            noteId: selectedCanva.note_id,
            chatSessionId: currentSession.id,
            isFallback: openCanvas.length > 1
          });

          // Activer automatiquement le canva ouvert (le plus récent si plusieurs)
          await switchCanva(selectedCanva.id, selectedCanva.note_id);
        }
      } catch (error) {
        logger.error('[useChatFullscreenEffects] ❌ Error auto-activating open canva', error);
      }
    };

    loadAndActivateOpenCanva();

    return () => {
      isMounted = false;
    };
  }, [currentSession?.id, user?.id, authLoading, isCanvaOpen, activeCanvaId, canvaSessions, switchCanva]);

  // Sidebar fermée par défaut
  useEffect(() => {
    uiState.setSidebarOpen(false);
  }, [uiState.setSidebarOpen]);

  // Fermer sidebar en passant mobile
  useEffect(() => {
    if (!isDesktop) {
      uiState.setSidebarOpen(false);
      uiState.setSidebarHovered(false);
    }
  }, [isDesktop, uiState.setSidebarOpen, uiState.setSidebarHovered]);

  // Fermer sidebar mobile après changement session
  useEffect(() => {
    if (!isDesktop && sidebarOpen && currentSession) {
      const currentId = currentSession.id;

      if (uiState.previousSessionIdRef.current !== null && uiState.previousSessionIdRef.current !== currentId) {
        const timer = setTimeout(() => uiState.setSidebarOpen(false), 300);
        uiState.previousSessionIdRef.current = currentId;
        return () => clearTimeout(timer);
      }

      uiState.previousSessionIdRef.current = currentId;
    }
  }, [currentSession?.id, isDesktop, sidebarOpen, uiState.setSidebarOpen, uiState.previousSessionIdRef]);

  // Détecter changement session et vider immédiatement
  useEffect(() => {
    const previousSessionId = uiState.previousSessionIdRef.current;
    const currentSessionId = currentSession?.id || null;

    // ✅ Réinitialiser si changement de session (y compris null → nouvelle session, ou session → autre session)
    if (currentSessionId !== previousSessionId) {
      animations.setDisplayedSessionId(null);
      animations.resetAnimation();
      clearInfiniteMessages();
      streamingState.reset(); // ✅ Reset le streaming précédent aussi
      uiState.setStreamError(null); // ✅ Reset l'erreur lors du changement de session
      // ✅ Reset padding inline éventuel appliqué par useChatScroll (scroll padding temporaire)
      if (uiState.messagesContainerRef.current) {
        uiState.messagesContainerRef.current.style.paddingBottom = '';
      }
      uiState.previousSessionIdRef.current = currentSessionId;
      
      logger.dev('[useChatFullscreenEffects] 🔄 Changement de session, reset complet (y compris erreur)', {
        previousSessionId,
        currentSessionId
      });
    }

    // ✅ Réinitialiser l'erreur aussi si currentSession devient null (session fermée)
    if (!currentSessionId && previousSessionId) {
      uiState.setStreamError(null);
      uiState.previousSessionIdRef.current = null;
      logger.dev('[useChatFullscreenEffects] 🔄 Session fermée, reset erreur');
    }

    if (!isLoadingMessages && !animations.displayedSessionId && currentSessionId) {
      animations.setDisplayedSessionId(currentSessionId);
    }
  }, [currentSession?.id, animations, isLoadingMessages, infiniteMessages.length, clearInfiniteMessages, streamingState, uiState.setStreamError, uiState.previousSessionIdRef, uiState.messagesContainerRef]);

  // Animation + scroll quand session chargée
  useEffect(() => {
    if (
      currentSession?.id &&
      infiniteMessages.length > 0 &&
      !isLoadingMessages &&
      (
        animations.displayedSessionId !== currentSession.id ||
        !animations.messagesVisible
      )
    ) {
      animations.triggerFadeIn(
        currentSession.id,
        infiniteMessages,
        uiState.messagesContainerRef
      );
    }
  }, [
    currentSession?.id,
    infiniteMessages,
    animations.messagesVisible,
    isLoadingMessages,
    animations,
    uiState.messagesContainerRef
  ]);

  // Infinite scroll detection
  useEffect(() => {
    const container = uiState.messagesContainerRef.current;
    if (!container || !hasMore || isLoadingMore) return;

    const handleScroll = () => {
      if (container.scrollTop < 50) {
        loadMoreMessages();
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [hasMore, isLoadingMore, loadMoreMessages, uiState.messagesContainerRef]);

  // 🎯 MESSAGES AFFICHÉS (calcul optimisé)
  const displayMessages = useMemo(() => {
    if (animations.displayedSessionId && animations.displayedSessionId !== currentSession?.id) return [];
    if (infiniteMessages.length === 0) return [];
    
    // ✅ OPTIMISATION: Pas de sort, les messages sont déjà triés par sequence_number depuis DB
    let filtered = infiniteMessages.filter(msg => {
      if (msg.role === 'user') return true;
      if (msg.role === 'assistant' && msg.content) return true;
      if (msg.role === 'tool') return true;
      if (isEmptyAnalysisMessage(msg)) return false;
      return true;
    });
    
    // ✏️ Si en édition, masquer le message édité et ceux qui suivent
    if (editingMessage) {
      let cutIndex = -1;
      
      if (typeof editingMessage.messageIndex === 'number') {
        cutIndex = Math.min(Math.max(editingMessage.messageIndex, 0), filtered.length);
      }
      
      if (cutIndex === -1) {
        const fallbackIndex = filtered.findIndex(msg =>
          msg.id === editingMessage.messageId ||
          (msg.timestamp && editingMessage.messageId.includes(new Date(msg.timestamp).getTime().toString()))
        );
        if (fallbackIndex !== -1) {
          cutIndex = fallbackIndex;
        }
      }
      
      if (cutIndex !== -1) {
        filtered = filtered.slice(0, cutIndex);
      }
    }
    
    return filtered;
  }, [infiniteMessages, animations.displayedSessionId, currentSession?.id, editingMessage]);

  return {
    displayMessages,
    isInitializing
  };
}

