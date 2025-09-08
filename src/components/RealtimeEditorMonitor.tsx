/**
 * 🔄 RealtimeEditorMonitor - Composant de monitoring et debug pour Realtime Editor
 * 
 * Composant de développement pour surveiller l'état de la connexion Realtime
 * et déboguer les événements. Affiché uniquement en mode développement.
 */

import React, { useState, useCallback } from 'react';
import { useRealtimeEditorDebug } from '@/hooks/RealtimeEditorHook';
import { RealtimeEditorEvent } from '@/services/RealtimeEditorService';

interface RealtimeEditorMonitorProps {
  isVisible?: boolean;
  onToggle?: () => void;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

/**
 * Composant de monitoring pour Realtime Editor
 */
export default function RealtimeEditorMonitor({
  isVisible: controlledVisible,
  onToggle,
  position = 'bottom-right'
}: RealtimeEditorMonitorProps) {
  const [internalVisible, setInternalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'status' | 'events' | 'stats'>('status');
  
  const { state, events, clearEvents, getStats } = useRealtimeEditorDebug();
  
  const isVisible = controlledVisible !== undefined ? controlledVisible : internalVisible;
  const toggle = onToggle || (() => setInternalVisible(!internalVisible));

  // Ne pas afficher en production
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  const stats = getStats();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return '#10b981';
      case 'connecting': return '#f59e0b';
      case 'error': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected': return '🟢';
      case 'connecting': return '🟡';
      case 'error': return '🔴';
      default: return '⚪';
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const formatEventType = (type: string) => {
    return type.replace('editor.', '').toUpperCase();
  };

  const formatEventSource = (source: string) => {
    switch (source) {
      case 'llm': return '🤖 LLM';
      case 'user': return '👤 User';
      case 'system': return '⚙️ System';
      default: return '❓ Unknown';
    }
  };

  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4'
  };

  return (
    <>
      {/* Bouton de toggle */}
      {!isVisible && (
        <button
          onClick={toggle}
          className={`fixed ${positionClasses[position]} bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-colors z-50`}
          title="Realtime Editor Monitor"
        >
          <div className="flex items-center space-x-2">
            <span className="text-lg">🔄</span>
            <span className="text-xs font-medium">
              {getStatusIcon(state.connectionStatus)}
            </span>
          </div>
        </button>
      )}

      {/* Panel de monitoring */}
      {isVisible && (
        <div className={`fixed ${positionClasses[position]} bg-white border border-gray-200 rounded-lg shadow-xl z-50 w-96 max-h-96 overflow-hidden`}>
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center space-x-2">
              <span className="text-lg">🔄</span>
              <h3 className="font-semibold text-sm text-gray-800">
                Realtime Editor Monitor
              </h3>
            </div>
            <button
              onClick={toggle}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            {(['status', 'events', 'stats'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                  activeTab === tab
                    ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                {tab === 'status' && '📊 Status'}
                {tab === 'events' && `📨 Events (${events.length})`}
                {tab === 'stats' && '📈 Stats'}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="p-3 max-h-64 overflow-y-auto">
            {activeTab === 'status' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Status:</span>
                  <div className="flex items-center space-x-2">
                    <span>{getStatusIcon(state.connectionStatus)}</span>
                    <span 
                      className="text-sm font-medium"
                      style={{ color: getStatusColor(state.connectionStatus) }}
                    >
                      {state.connectionStatus.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Connected:</span>
                  <span className="text-sm">{state.isConnected ? '✅' : '❌'}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Connecting:</span>
                  <span className="text-sm">{state.isConnecting ? '🔄' : '⏸️'}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Reconnect Attempts:</span>
                  <span className="text-sm">{state.reconnectAttempts}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Last Activity:</span>
                  <span className="text-sm">{formatTimestamp(state.lastActivity)}</span>
                </div>

                {state.lastError && (
                  <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded">
                    <div className="text-xs font-medium text-red-800 mb-1">Last Error:</div>
                    <div className="text-xs text-red-600 break-words">{state.lastError}</div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'events' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Recent Events</span>
                  <button
                    onClick={clearEvents}
                    className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    Clear
                  </button>
                </div>

                {events.length === 0 ? (
                  <div className="text-center text-gray-500 text-sm py-4">
                    No events yet
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {events.slice(0, 20).map((event, index) => (
                      <div
                        key={`${event.timestamp}-${index}`}
                        className="p-2 bg-gray-50 border border-gray-200 rounded text-xs"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-gray-800">
                            {formatEventType(event.type)}
                          </span>
                          <span className="text-gray-500">
                            {formatTimestamp(event.timestamp)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">
                            {formatEventSource(event.source)}
                          </span>
                          <span className="text-gray-500">
                            {(() => {
                              try {
                                const payloadStr = JSON.stringify(event.payload);
                                return payloadStr.length > 50
                                  ? `${payloadStr.substring(0, 50)}...`
                                  : payloadStr;
                              } catch (error) {
                                return '[Circular Reference or Invalid JSON]';
                              }
                            })()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'stats' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total Events:</span>
                  <span className="text-sm font-mono">{stats.totalEvents}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Recent Events (1min):</span>
                  <span className="text-sm font-mono">{stats.recentEvents}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Connection Uptime:</span>
                  <span className="text-sm font-mono">
                    {Math.round(stats.connectionUptime / 1000)}s
                  </span>
                </div>

                <div className="mt-3">
                  <div className="text-sm font-medium mb-2">Events by Type:</div>
                  <div className="space-y-1">
                    {Object.entries(stats.eventsByType).map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">{formatEventType(type)}:</span>
                        <span className="font-mono">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-3">
                  <div className="text-sm font-medium mb-2">Events by Source:</div>
                  <div className="space-y-1">
                    {Object.entries(stats.eventsBySource).map(([source, count]) => (
                      <div key={source} className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">{formatEventSource(source)}:</span>
                        <span className="font-mono">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {stats.lastEvent && (
                  <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded">
                    <div className="text-xs font-medium text-blue-800 mb-1">Last Event:</div>
                    <div className="text-xs text-blue-600">
                      {formatEventType(stats.lastEvent.type)} from {formatEventSource(stats.lastEvent.source)}
                    </div>
                    <div className="text-xs text-blue-500">
                      {formatTimestamp(stats.lastEvent.timestamp)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Hook pour contrôler la visibilité du monitor
 */
export function useRealtimeEditorMonitor() {
  const [isVisible, setIsVisible] = useState(false);

  const toggle = useCallback(() => {
    setIsVisible(prev => !prev);
  }, []);

  const show = useCallback(() => {
    setIsVisible(true);
  }, []);

  const hide = useCallback(() => {
    setIsVisible(false);
  }, []);

  return {
    isVisible,
    toggle,
    show,
    hide
  };
}
