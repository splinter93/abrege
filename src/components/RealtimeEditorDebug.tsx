/**
 * 🔍 RealtimeEditorDebug - Composant de diagnostic pour RealtimeEditor
 * 
 * Composant de debug pour diagnostiquer les problèmes de connexion Realtime
 */

import React, { useState, useEffect } from 'react';
import { useRealtimeEditor, useRealtimeEditorDebug } from '@/hooks/RealtimeEditorHook';
import { realtimeEditorService } from '@/services/RealtimeEditorService';
import { supabase } from '@/supabaseClient';

interface RealtimeEditorDebugProps {
  noteId: string;
  userId: string;
}

export function RealtimeEditorDebug({ noteId, userId }: RealtimeEditorDebugProps) {
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [isVisible, setIsVisible] = useState(false);
  
  const { state, events, getStats } = useRealtimeEditorDebug();
  
  const {
    isConnected,
    isConnecting,
    connectionStatus,
    lastError,
    reconnectAttempts
  } = useRealtimeEditor({
    noteId,
    userId,
    debug: true,
    autoReconnect: true
  });

  useEffect(() => {
    const gatherDebugInfo = async () => {
      try {
        // Vérifier la session Supabase
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        // Vérifier la configuration
        const config = realtimeEditorService.getConfig();
        
        // Vérifier les variables d'environnement
        const envVars = {
          supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'NOT SET',
          supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET',
          nodeEnv: process.env.NODE_ENV
        };

        setDebugInfo({
          session: {
            exists: !!session,
            userId: session?.user?.id,
            email: session?.user?.email,
            expiresAt: session?.expires_at,
            error: sessionError?.message
          },
          config,
          envVars,
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
  }, [noteId, userId]);

  const handleTestConnection = async () => {
    try {
      await realtimeEditorService.reconnect();
    } catch (error) {
      console.error('Erreur de test de connexion:', error);
    }
  };

  const stats = getStats();

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 bg-red-500 text-white px-3 py-2 rounded text-sm z-50"
      >
        🔍 Debug Realtime
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg shadow-lg p-4 max-w-md max-h-96 overflow-auto z-50">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold text-sm">🔍 Realtime Debug</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>

      <div className="space-y-3 text-xs">
        {/* État de connexion */}
        <div>
          <h4 className="font-semibold">État de connexion:</h4>
          <div className="ml-2">
            <div>Status: <span className={connectionStatus === 'connected' ? 'text-green-600' : 'text-red-600'}>{connectionStatus}</span></div>
            <div>Connecté: {isConnected ? '✅' : '❌'}</div>
            <div>En cours: {isConnecting ? '🔄' : '⏸️'}</div>
            <div>Tentatives: {reconnectAttempts}</div>
            {lastError && <div className="text-red-600">Erreur: {lastError}</div>}
          </div>
        </div>

        {/* Session Supabase */}
        <div>
          <h4 className="font-semibold">Session Supabase:</h4>
          <div className="ml-2">
            <div>Existe: {debugInfo.session?.exists ? '✅' : '❌'}</div>
            {debugInfo.session?.userId && <div>User ID: {debugInfo.session.userId}</div>}
            {debugInfo.session?.email && <div>Email: {debugInfo.session.email}</div>}
            {debugInfo.session?.error && <div className="text-red-600">Erreur: {debugInfo.session.error}</div>}
          </div>
        </div>

        {/* Variables d'environnement */}
        <div>
          <h4 className="font-semibold">Variables d'environnement:</h4>
          <div className="ml-2">
            <div>URL: {debugInfo.envVars?.supabaseUrl}</div>
            <div>Key: {debugInfo.envVars?.supabaseKey}</div>
            <div>NODE_ENV: {debugInfo.envVars?.nodeEnv}</div>
          </div>
        </div>

        {/* Client Supabase */}
        <div>
          <h4 className="font-semibold">Client Supabase:</h4>
          <div className="ml-2">
            <div>Existe: {debugInfo.supabaseClient?.exists ? '✅' : '❌'}</div>
            <div>Channel: {debugInfo.supabaseClient?.hasChannel ? '✅' : '❌'}</div>
            <div>Auth: {debugInfo.supabaseClient?.hasAuth ? '✅' : '❌'}</div>
          </div>
        </div>

        {/* Statistiques */}
        <div>
          <h4 className="font-semibold">Statistiques:</h4>
          <div className="ml-2">
            <div>Événements totaux: {stats.totalEvents}</div>
            <div>Événements récents: {stats.recentEvents}</div>
            <div>Dernier événement: {stats.lastEvent?.type || 'Aucun'}</div>
          </div>
        </div>

        {/* Actions */}
        <div className="pt-2 border-t">
          <button
            onClick={handleTestConnection}
            className="bg-blue-500 text-white px-2 py-1 rounded text-xs mr-2"
          >
            Test Connexion
          </button>
          <button
            onClick={() => setDebugInfo({})}
            className="bg-gray-500 text-white px-2 py-1 rounded text-xs"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
