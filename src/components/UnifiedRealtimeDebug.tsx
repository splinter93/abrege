/**
 * 🔍 UnifiedRealtimeDebug - Composant de diagnostic pour le système Realtime unifié
 * 
 * Composant de debug avancé pour diagnostiquer et monitorer le système Realtime unifié
 */

import React, { useState, useEffect } from 'react';
import { useUnifiedRealtimeDebug, useUnifiedRealtime } from '@/hooks/useUnifiedRealtime';
import { unifiedRealtimeService } from '@/services/UnifiedRealtimeService';
import { supabase } from '@/supabaseClient';
import { logger, LogCategory } from '@/utils/logger';

interface UnifiedRealtimeDebugProps {
  userId: string;
  noteId?: string;
}

export function UnifiedRealtimeDebug({ userId, noteId }: UnifiedRealtimeDebugProps) {
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [isVisible, setIsVisible] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'status' | 'events' | 'channels' | 'config'>('status');
  
  const { state, events, clearEvents, getStats } = useUnifiedRealtimeDebug();
  
  const {
    isConnected,
    isConnecting,
    connectionStatus,
    lastError,
    reconnectAttempts,
    channels,
    uptime,
    stats
  } = useUnifiedRealtime({
    userId,
    noteId,
    debug: true,
    autoReconnect: true
  });

  useEffect(() => {
    const gatherDebugInfo = async () => {
      try {
        // Vérifier la session Supabase
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        // Vérifier la configuration
        const config = unifiedRealtimeService.getConfig();
        
        // Vérifier les variables d'environnement
        const envVars = {
          supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'NOT SET',
          supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET',
          nodeEnv: process.env.NODE_ENV
        };

        // Vérifier la connectivité réseau
        const networkInfo = {
          online: navigator.onLine,
          connectionType: (navigator as any).connection?.effectiveType || 'unknown',
          downlink: (navigator as any).connection?.downlink || 'unknown'
        };

        setDebugInfo({
          session: {
            exists: !!session,
            userId: session?.user?.id,
            email: session?.user?.email,
            expiresAt: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
            error: sessionError?.message
          },
          config,
          envVars,
          networkInfo,
          supabaseClient: {
            exists: !!supabase,
            hasChannel: !!supabase?.channel,
            hasAuth: !!supabase?.auth
          },
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        setDebugInfo({
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString()
        });
      }
    };

    gatherDebugInfo();
  }, [userId, noteId]);

  const handleTestConnection = async () => {
    try {
      await unifiedRealtimeService.reconnect();
    } catch (error) {
      console.error('Erreur de test de connexion:', error);
    }
  };

  const handleSendTestEvent = async () => {
    try {
      await unifiedRealtimeService.broadcast('test-event', {
        message: 'Test de connexion',
        timestamp: Date.now(),
        source: 'debug'
      });
    } catch (error) {
      console.error('Erreur envoi événement test:', error);
    }
  };

  const formatUptime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'text-green-600';
      case 'connecting': return 'text-yellow-600';
      case 'reconnecting': return 'text-orange-600';
      case 'error': return 'text-red-600';
      case 'disconnected': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  const stats = getStats();

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 bg-blue-500 text-white px-3 py-2 rounded text-sm z-50 shadow-lg hover:bg-blue-600 transition-colors"
      >
        🔄 Realtime Debug
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg shadow-xl p-4 max-w-2xl max-h-96 overflow-auto z-50">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold text-sm">🔍 Unified Realtime Debug</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-500 hover:text-gray-700 text-lg"
        >
          ✕
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 mb-3 border-b">
        {[
          { id: 'status', label: 'Status' },
          { id: 'events', label: 'Events' },
          { id: 'channels', label: 'Channels' },
          { id: 'config', label: 'Config' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setSelectedTab(tab.id as any)}
            className={`px-2 py-1 text-xs rounded ${
              selectedTab === tab.id 
                ? 'bg-blue-100 text-blue-700' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-3 text-xs">
        {/* Tab: Status */}
        {selectedTab === 'status' && (
          <>
            <div>
              <h4 className="font-semibold">État de connexion:</h4>
              <div className="ml-2 space-y-1">
                <div>Status: <span className={getStatusColor(connectionStatus)}>{connectionStatus}</span></div>
                <div>Connecté: {isConnected ? '✅' : '❌'}</div>
                <div>En cours: {isConnecting ? '🔄' : '⏸️'}</div>
                <div>Tentatives: {reconnectAttempts}</div>
                <div>Uptime: {formatUptime(uptime)}</div>
                <div>Channels: {channels.size}</div>
                {lastError && <div className="text-red-600">Erreur: {lastError}</div>}
              </div>
            </div>

            <div>
              <h4 className="font-semibold">Statistiques:</h4>
              <div className="ml-2 space-y-1">
                <div>Événements totaux: {stats.totalEvents}</div>
                <div>Événements récents: {stats.recentEvents}</div>
                <div>Dernier événement: {stats.lastEvent?.type || 'Aucun'}</div>
                <div>Reconnexions: {stats.reconnectAttempts}</div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold">Réseau:</h4>
              <div className="ml-2 space-y-1">
                <div>En ligne: {debugInfo.networkInfo?.online ? '✅' : '❌'}</div>
                <div>Type: {debugInfo.networkInfo?.connectionType}</div>
                <div>Vitesse: {debugInfo.networkInfo?.downlink} Mbps</div>
              </div>
            </div>
          </>
        )}

        {/* Tab: Events */}
        {selectedTab === 'events' && (
          <>
            <div className="flex justify-between items-center">
              <h4 className="font-semibold">Événements récents ({events.length}):</h4>
              <button
                onClick={clearEvents}
                className="bg-gray-500 text-white px-2 py-1 rounded text-xs"
              >
                Clear
              </button>
            </div>
            <div className="max-h-48 overflow-auto space-y-1">
              {events.slice(0, 20).map((event, index) => (
                <div key={index} className="border-l-2 border-gray-200 pl-2 text-xs">
                  <div className="font-mono">
                    <span className="text-gray-500">[{new Date(event.timestamp).toLocaleTimeString()}]</span>
                    <span className={`ml-2 px-1 rounded text-white text-xs ${
                      event.source === 'database' ? 'bg-blue-500' :
                      event.source === 'editor' ? 'bg-green-500' :
                      'bg-gray-500'
                    }`}>
                      {event.source}
                    </span>
                    <span className="ml-2 font-semibold">{event.type}</span>
                  </div>
                  <div className="text-gray-600 truncate">
                    {event.channel} - {JSON.stringify(event.payload).substring(0, 100)}...
                  </div>
                </div>
              ))}
              {events.length === 0 && (
                <div className="text-gray-500 italic">Aucun événement</div>
              )}
            </div>
          </>
        )}

        {/* Tab: Channels */}
        {selectedTab === 'channels' && (
          <>
            <div>
              <h4 className="font-semibold">Canaux actifs ({channels.size}):</h4>
              <div className="ml-2 space-y-1">
                {Array.from(channels).map(channel => (
                  <div key={channel} className="font-mono text-xs bg-gray-100 p-1 rounded">
                    {channel}
                  </div>
                ))}
                {channels.size === 0 && (
                  <div className="text-gray-500 italic">Aucun canal actif</div>
                )}
              </div>
            </div>

            <div>
              <h4 className="font-semibold">Événements par canal:</h4>
              <div className="ml-2 space-y-1">
                {Object.entries(stats.eventsByChannel).map(([channel, count]) => (
                  <div key={channel} className="flex justify-between">
                    <span className="font-mono text-xs">{channel}</span>
                    <span className="text-blue-600">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Tab: Config */}
        {selectedTab === 'config' && (
          <>
            <div>
              <h4 className="font-semibold">Session Supabase:</h4>
              <div className="ml-2 space-y-1">
                <div>Existe: {debugInfo.session?.exists ? '✅' : '❌'}</div>
                {debugInfo.session?.userId && <div>User ID: {debugInfo.session.userId}</div>}
                {debugInfo.session?.email && <div>Email: {debugInfo.session.email}</div>}
                {debugInfo.session?.expiresAt && <div>Expire: {debugInfo.session.expiresAt}</div>}
                {debugInfo.session?.error && <div className="text-red-600">Erreur: {debugInfo.session.error}</div>}
              </div>
            </div>

            <div>
              <h4 className="font-semibold">Variables d'environnement:</h4>
              <div className="ml-2 space-y-1">
                <div>URL: {debugInfo.envVars?.supabaseUrl}</div>
                <div>Key: {debugInfo.envVars?.supabaseKey}</div>
                <div>NODE_ENV: {debugInfo.envVars?.nodeEnv}</div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold">Configuration Service:</h4>
              <div className="ml-2 space-y-1">
                <div>User ID: {debugInfo.config?.userId}</div>
                <div>Note ID: {debugInfo.config?.noteId || 'N/A'}</div>
                <div>Debug: {debugInfo.config?.debug ? '✅' : '❌'}</div>
                <div>Auto Reconnect: {debugInfo.config?.autoReconnect ? '✅' : '❌'}</div>
                <div>Max Attempts: {debugInfo.config?.maxReconnectAttempts}</div>
                <div>Reconnect Delay: {debugInfo.config?.reconnectDelay}ms</div>
              </div>
            </div>
          </>
        )}

        {/* Actions */}
        <div className="pt-2 border-t flex space-x-2">
          <button
            onClick={handleTestConnection}
            className="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600"
          >
            Test Connexion
          </button>
          <button
            onClick={handleSendTestEvent}
            className="bg-green-500 text-white px-2 py-1 rounded text-xs hover:bg-green-600"
          >
            Test Event
          </button>
          <button
            onClick={() => setDebugInfo({})}
            className="bg-gray-500 text-white px-2 py-1 rounded text-xs hover:bg-gray-600"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
