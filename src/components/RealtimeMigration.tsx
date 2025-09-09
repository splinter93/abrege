/**
 * 🔄 RealtimeMigration - Composant de migration vers le système Realtime unifié
 * 
 * Composant qui remplace progressivement l'ancien système RealtimeEditorService
 * par le nouveau UnifiedRealtimeService.
 */

import React, { useEffect, useState } from 'react';
import { useUnifiedRealtime } from '@/hooks/useUnifiedRealtime';
import { useAuth } from '@/hooks/useAuth';
import { logger, LogCategory } from '@/utils/logger';

interface RealtimeMigrationProps {
  noteId: string;
  children: React.ReactNode;
  debug?: boolean;
}

/**
 * Composant de migration qui remplace l'ancien système Realtime
 */
export default function RealtimeMigration({ 
  noteId, 
  children, 
  debug = false 
}: RealtimeMigrationProps) {
  const { user } = useAuth();
  const userId = user?.id || 'anonymous';

  const {
    isConnected,
    isConnecting,
    connectionStatus,
    lastError,
    reconnectAttempts,
    connect,
    disconnect,
    reconnect,
    stats
  } = useUnifiedRealtime({
    userId,
    noteId,
    debug,
    autoReconnect: true,
    onEvent: (event) => {
      if (debug) {
        logger.info(LogCategory.EDITOR, '[RealtimeMigration] Événement reçu:', {
          type: event.type,
          source: event.source,
          channel: event.channel
        });
      }
    },
    onStateChange: (state) => {
      if (debug) {
        logger.info(LogCategory.EDITOR, '[RealtimeMigration] État changé:', {
          status: state.connectionStatus,
          connected: state.isConnected,
          channels: state.channels.size
        });
      }
    }
  });

  // Gestion des erreurs de connexion
  useEffect(() => {
    if (connectionStatus === 'error' && lastError) {
      logger.error(LogCategory.EDITOR, '[RealtimeMigration] Erreur de connexion:', {
        error: lastError,
        attempts: reconnectAttempts
      });
    }
  }, [connectionStatus, lastError, reconnectAttempts]);

  // Gestion de la visibilité de la page
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isConnected && !isConnecting) {
        logger.info(LogCategory.EDITOR, '[RealtimeMigration] Page visible - reconnexion automatique');
        connect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isConnected, isConnecting, connect]);

  // Mode debug : afficher l'état de la connexion
  if (debug && process.env.NODE_ENV === 'development') {
    return (
      <div className="realtime-migration-debug">
        {children}
        <div className="fixed top-4 left-4 bg-white border border-gray-300 rounded-lg shadow-lg p-3 max-w-sm z-50">
          <h4 className="font-bold text-sm mb-2">🔄 Realtime Migration Status</h4>
          <div className="space-y-1 text-xs">
            <div>Status: <span className={`font-semibold ${
              connectionStatus === 'connected' ? 'text-green-600' : 
              connectionStatus === 'connecting' ? 'text-yellow-600' :
              connectionStatus === 'error' ? 'text-red-600' : 'text-gray-600'
            }`}>{connectionStatus}</span></div>
            <div>Connected: {isConnected ? '✅' : '❌'}</div>
            <div>Channels: {stats.channelsCount}</div>
            <div>Uptime: {Math.floor(stats.uptime / 1000)}s</div>
            <div>Attempts: {reconnectAttempts}</div>
            {lastError && (
              <div className="text-red-600 text-xs truncate" title={lastError}>
                Error: {lastError}
              </div>
            )}
          </div>
          <div className="mt-2 flex space-x-1">
            <button
              onClick={connect}
              className="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600"
            >
              Connect
            </button>
            <button
              onClick={reconnect}
              className="bg-orange-500 text-white px-2 py-1 rounded text-xs hover:bg-orange-600"
            >
              Reconnect
            </button>
            <button
              onClick={disconnect}
              className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600"
            >
              Disconnect
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Mode production : rendre uniquement les enfants
  return <>{children}</>;
}

/**
 * Hook pour accéder à l'état du RealtimeMigration
 */
export function useRealtimeMigrationState() {
  const { user } = useAuth();
  const userId = user?.id || 'anonymous';

  return useUnifiedRealtime({
    userId,
    debug: false,
    autoReconnect: true
  });
}
