/**
 * Hook pour synchroniser l'agent avec la session
 * Extrait de ChatFullscreenV2.tsx (useEffect lignes 478-530)
 * 
 * Responsabilités:
 * - Charger agent depuis session.agent_id
 * - Mettre à jour selectedAgent dans le store
 * - Logging approprié
 */

import { useEffect } from 'react';
import { supabase } from '@/supabaseClient';
import type { Agent } from '@/types/chat';
import type { ChatSession } from '@/store/useChatStore';
import { simpleLogger as logger } from '@/utils/logger';

/**
 * Options du hook
 */
export interface UseSyncAgentWithSessionOptions {
  currentSession: ChatSession | null;
  selectedAgentId: string | null;
  user: unknown;
  authLoading: boolean;
  onAgentLoaded: (agent: Agent | null) => void;
}

/**
 * Hook pour synchroniser l'agent avec la session
 * 
 * Quand la session change ou que son agent_id change,
 * ce hook charge automatiquement l'agent correspondant
 * depuis la DB et appelle onAgentLoaded.
 * 
 * @param options - Options de synchronisation
 */
export function useSyncAgentWithSession(
  options: UseSyncAgentWithSessionOptions
): void {
  const {
    currentSession,
    selectedAgentId,
    user,
    authLoading,
    onAgentLoaded
  } = options;

  useEffect(() => {
    // ⏭️ Skip si pas authentifié ou en cours de chargement
    if (!user || authLoading || !currentSession) {
      logger.dev('[useSyncAgentWithSession] ⏭️ Skip sync:', {
        hasUser: !!user,
        authLoading,
        hasSession: !!currentSession
      });
      return;
    }

    const syncAgent = async () => {
      const sessionAgentId = currentSession.agent_id;

      logger.dev('[useSyncAgentWithSession] 🔍 Check sync:', {
        sessionId: currentSession.id,
        sessionAgentId,
        selectedAgentId,
        needsSync: sessionAgentId && sessionAgentId !== selectedAgentId
      });

      // Si la session a un agent différent de celui sélectionné, le charger
      if (sessionAgentId && sessionAgentId !== selectedAgentId) {
        try {
          logger.dev('[useSyncAgentWithSession] 🔄 Loading agent:', sessionAgentId);

          const { data: agent, error } = await supabase
            .from('agents')
            .select('*')
            .eq('id', sessionAgentId)
            .single();

          if (error) {
            logger.error('[useSyncAgentWithSession] ❌ Error loading agent:', {
              error: error.message,
              sessionAgentId
            });
            onAgentLoaded(null);
            return;
          }

          if (agent) {
            onAgentLoaded(agent as Agent);
            logger.dev('[useSyncAgentWithSession] ✅ Agent loaded:', {
              agentId: agent.id,
              agentName: (agent as Agent).display_name || (agent as Agent).name
            });
          } else {
            logger.warn('[useSyncAgentWithSession] ⚠️ Agent not found:', sessionAgentId);
            onAgentLoaded(null);
          }
        } catch (err) {
          logger.error('[useSyncAgentWithSession] ❌ Error loading agent:', {
            error: err instanceof Error ? err.message : String(err)
          });
          onAgentLoaded(null);
        }
      } else if (!sessionAgentId) {
        logger.dev('[useSyncAgentWithSession] ℹ️ Session without agent_id:', currentSession.id);
      } else {
        logger.dev('[useSyncAgentWithSession] ✅ Agent already in sync');
      }
    };

    syncAgent();
  }, [
    currentSession?.id,
    currentSession?.agent_id,
    selectedAgentId,
    user,
    authLoading,
    onAgentLoaded
  ]);
}

