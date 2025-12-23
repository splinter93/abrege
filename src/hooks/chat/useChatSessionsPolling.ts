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
const MAX_BACKOFF_MS = 30000; // 30 secondes max
const BACKOFF_MULTIPLIER = 1.5;

export function useChatSessionsPolling(options: UseChatSessionsPollingOptions = {}) {
  const { enabled = true, intervalMs = DEFAULT_INTERVAL_MS } = options;
  const syncSessions = useChatStore((state) => state.syncSessions);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const consecutiveErrorsRef = useRef(0);
  const currentIntervalRef = useRef(intervalMs);
  const lastErrorTimeRef = useRef<number | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    consecutiveErrorsRef.current = 0;
    currentIntervalRef.current = intervalMs;

    if (!enabled) {
      logger.dev('[useChatSessionsPolling] Polling désactivé');
      return;
    }

    logger.dev('[useChatSessionsPolling] Polling démarré', { intervalMs });

    const scheduleNextSync = (delay: number) => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
      }
      intervalRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          performSync();
        }
      }, delay);
    };

    const performSync = async () => {
      if (!isMountedRef.current) {
        return;
      }

      try {
        await syncSessions();
        // Succès : reset le compteur d'erreurs et l'intervalle
        if (consecutiveErrorsRef.current > 0) {
          logger.info('[useChatSessionsPolling] ✅ Sync réussie après erreurs', {
            previousErrors: consecutiveErrorsRef.current
          });
        }
        consecutiveErrorsRef.current = 0;
        currentIntervalRef.current = intervalMs;
        lastErrorTimeRef.current = null;
        
        // Planifier la prochaine sync avec l'intervalle normal
        scheduleNextSync(currentIntervalRef.current);
      } catch (error) {
        consecutiveErrorsRef.current += 1;
        lastErrorTimeRef.current = Date.now();

        // Backoff exponentiel
        const newInterval = Math.min(
          intervalMs * Math.pow(BACKOFF_MULTIPLIER, consecutiveErrorsRef.current - 1),
          MAX_BACKOFF_MS
        );
        currentIntervalRef.current = newInterval;

        // Log seulement toutes les 5 erreurs ou si c'est la première
        if (consecutiveErrorsRef.current === 1 || consecutiveErrorsRef.current % 5 === 0) {
          logger.warn('[useChatSessionsPolling] ⚠️ Erreur sync', {
            error: error instanceof Error ? error.message : String(error),
            consecutiveErrors: consecutiveErrorsRef.current,
            nextInterval: newInterval
          });
        }

        // Réplanifier avec le nouvel intervalle (backoff)
        scheduleNextSync(newInterval);
      }
    };

    // Sync initial au mount
    performSync();

    // Cleanup
    return () => {
      isMountedRef.current = false;

      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
        intervalRef.current = null;
      }

      logger.dev('[useChatSessionsPolling] Polling arrêté');
    };
  }, [enabled, intervalMs, syncSessions]);
}

