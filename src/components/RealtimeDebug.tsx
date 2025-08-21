"use client";

import { useState, useEffect } from 'react';
import { getRealtimeService } from '@/services/realtimeService';
import { clientPollingTrigger } from '@/services/clientPollingTrigger';

/**
 * Composant de debug pour le service realtime
 * Affiche l'état du service et permet de le tester
 */
export default function RealtimeDebug() {
  const [isVisible, setIsVisible] = useState(false);
  const [realtimeStatus, setRealtimeStatus] = useState<string>('Vérification...');
  const [pollingStatus, setPollingStatus] = useState<string>('Vérification...');

  useEffect(() => {
    const checkStatus = () => {
      // Vérifier le service realtime
      const realtimeService = getRealtimeService();
      setRealtimeStatus(realtimeService ? '✅ Disponible' : '❌ Non disponible');

      // Vérifier le polling trigger
      const isPollingAvailable = clientPollingTrigger.isRealtimeAvailable();
      setPollingStatus(isPollingAvailable ? '✅ Disponible' : '❌ Non disponible');
    };

    checkStatus();
    const interval = setInterval(checkStatus, 1000);
    return () => clearInterval(interval);
  }, []);

  const testPolling = async () => {
    try {
      await clientPollingTrigger.triggerFoldersPolling('INSERT');
      alert('Test de polling déclenché !');
    } catch (error) {
      alert(`Erreur: ${error}`);
    }
  };

  const refreshRealtime = () => {
    clientPollingTrigger.refreshRealtimeService();
    alert('Service realtime rafraîchi !');
  };

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 left-4 z-50 bg-green-600 text-white p-2 rounded-full shadow-lg hover:bg-green-700 transition-colors"
        title="Debug Realtime"
      >
        🔧
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 bg-white border border-gray-300 rounded-lg shadow-xl p-4 max-w-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-800">🔧 Debug Realtime</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <h4 className="text-xs font-medium text-gray-700">Service Realtime</h4>
          <p className="text-xs text-gray-600">{realtimeStatus}</p>
        </div>

        <div>
          <h4 className="text-xs font-medium text-gray-700">Polling Trigger</h4>
          <p className="text-xs text-gray-600">{pollingStatus}</p>
        </div>

        <div className="pt-3 border-t border-gray-200">
          <div className="flex space-x-2">
            <button
              onClick={testPolling}
              className="text-xs bg-blue-100 hover:bg-blue-200 px-2 py-1 rounded transition-colors"
            >
              🧪 Test Polling
            </button>
            <button
              onClick={refreshRealtime}
              className="text-xs bg-green-100 hover:bg-green-200 px-2 py-1 rounded transition-colors"
            >
              🔄 Rafraîchir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 