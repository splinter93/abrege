/**
 * 🔍 RealtimeStatus - Composant de statut realtime simple
 * 
 * Composant de debug simple pour afficher l'état de la connexion realtime
 */

import React from 'react';
import { useRealtime } from '@/hooks/useRealtime';

interface RealtimeStatusProps {
  readonly userId: string;
  readonly noteId?: string;
}

export function RealtimeStatus({ userId, noteId }: RealtimeStatusProps) {
  const realtime = useRealtime({
    userId,
    noteId,
    debug: process.env.NODE_ENV === 'development',
    onEvent: (event) => {
      // Events are handled by the dispatcher
    },
    onStateChange: (state) => {
      // State changes are handled by the hook
    }
  });

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const getStatusColor = (isConnected: boolean, isConnecting: boolean, error: string | null) => {
    if (error) return 'text-red-600';
    if (isConnecting) return 'text-yellow-600';
    if (isConnected) return 'text-green-600';
    return 'text-gray-600';
  };

  const getStatusText = (isConnected: boolean, isConnecting: boolean, error: string | null) => {
    if (error) return `❌ ${error}`;
    if (isConnecting) return '🔄 Connecting...';
    if (isConnected) return '✅ Connected';
    return '⏸️ Disconnected';
  };

  const handleForceReconnect = async () => {
    await realtime.reconnect();
  };

  const handleDisconnect = async () => {
    await realtime.disconnect();
  };

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg shadow-lg p-3 text-xs z-50 max-w-xs">
      <div className="font-semibold mb-2">🔄 Realtime Status</div>
      
      <div className="space-y-1">
        <div className={getStatusColor(realtime.isConnected, realtime.isConnecting, realtime.error)}>
          {getStatusText(realtime.isConnected, realtime.isConnecting, realtime.error)}
        </div>
        
        <div className="text-gray-600">
          Channels: {realtime.channels.length}
        </div>
        
        {realtime.channels.length > 0 && (
          <div className="text-gray-500">
            {realtime.channels.map(channel => (
              <div key={channel} className="font-mono text-xs">
                {channel}
              </div>
            ))}
          </div>
        )}
        
        <div className="text-gray-500">
          User: {userId || 'undefined'}
        </div>
        
        {userId === 'anonymous' && (
          <div className="text-red-500 text-xs">
            ⚠️ User anonymous - Realtime non supporté
          </div>
        )}
        
        {!userId && (
          <div className="text-red-500 text-xs">
            ⚠️ User undefined - Vérifier l'authentification
          </div>
        )}
        
        {noteId && (
          <div className="text-gray-500">
            Note: {noteId}
          </div>
        )}
      </div>
      
      {/* Actions de debug */}
      <div className="mt-3 pt-2 border-t flex space-x-2">
        <button
          onClick={handleForceReconnect}
          className="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600"
        >
          Reconnect
        </button>
        <button
          onClick={handleDisconnect}
          className="bg-gray-500 text-white px-2 py-1 rounded text-xs hover:bg-gray-600"
        >
          Disconnect
        </button>
      </div>
    </div>
  );
}
