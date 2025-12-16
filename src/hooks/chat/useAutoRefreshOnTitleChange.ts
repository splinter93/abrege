/**
 * Hook simple pour rafraîchir les sessions après génération de titre
 * 
 * Alternative pragmatique à Realtime (qui a des problèmes de re-renders)
 * Écoute les changements de messages et refresh si nécessaire
 */

import { useEffect, useRef } from 'react';
import { useChatStore } from '@/store/useChatStore';
import { simpleLogger as logger } from '@/utils/logger';

export function useAutoRefreshOnTitleChange() {
  const currentSession = useChatStore((state) => state.currentSession);
  const syncSessions = useChatStore((state) => state.syncSessions);
  const lastSyncRef = useRef<number>(0);

  useEffect(() => {
    // Si nouvelle session (nom par défaut), attendre 3s puis refresh
    // Cela laisse le temps au backend de générer le titre
    if (currentSession?.name === 'Nouvelle conversation') {
      const now = Date.now();
      
      // Éviter multiple refreshes
      if (now - lastSyncRef.current < 5000) {
        return;
      }

      logger.dev('[AutoRefresh] 📝 Session avec nom par défaut détectée, refresh dans 3s', {
        sessionId: currentSession.id
      });

      const timeoutId = setTimeout(() => {
        logger.dev('[AutoRefresh] 🔄 Refresh sessions pour détecter nouveau titre');
        syncSessions();
        lastSyncRef.current = Date.now();
      }, 3000);

      return () => clearTimeout(timeoutId);
    }
  }, [currentSession?.id, currentSession?.name, syncSessions]);
}

