/**
 * Hook de polling léger pour synchroniser les sessions de chat
 * 
 * Permet de détecter les changements de nom de session (auto-rename)
 * sans surcharger le réseau.
 * 
 * Conformité GUIDE-EXCELLENCE-CODE.md:
 * - Hook isolé et réutilisable
 * - Cleanup automatique
 * - Performance optimisée (intervalle configurable)
 * - Logs structurés
 * 
 * @param enabled - Activer/désactiver le polling
 * @param intervalMs - Intervalle de polling en ms (défaut: 5000)
 */

import { useEffect, useRef } from 'react';
import { useChatStore } from '@/store/useChatStore';
import { simpleLogger as logger } from '@/utils/logger';

interface UseChatSessionsPollingOptions {
  enabled?: boolean;
  intervalMs?: number;
}

const DEFAULT_INTERVAL_MS = 5000; // 5 secondes

export function useChatSessionsPolling(options: UseChatSessionsPollingOptions = {}) {
  const { enabled = true, intervalMs = DEFAULT_INTERVAL_MS } = options;
  const syncSessions = useChatStore((state) => state.syncSessions);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    if (!enabled) {
      logger.dev('[useChatSessionsPolling] Polling désactivé');
      return;
    }

    logger.dev('[useChatSessionsPolling] Polling démarré', { intervalMs });

    // Sync initial au mount
    syncSessions().catch((error) => {
      logger.warn('[useChatSessionsPolling] Erreur sync initial', {
        error: error instanceof Error ? error.message : String(error)
      });
    });

    // Polling périodique
    intervalRef.current = setInterval(() => {
      if (!isMountedRef.current) {
        return;
      }

      syncSessions().catch((error) => {
        logger.warn('[useChatSessionsPolling] Erreur sync périodique', {
          error: error instanceof Error ? error.message : String(error)
        });
      });
    }, intervalMs);

    // Cleanup
    return () => {
      isMountedRef.current = false;

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      logger.dev('[useChatSessionsPolling] Polling arrêté');
    };
  }, [enabled, intervalMs, syncSessions]);
}

