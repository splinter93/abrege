"use client";

import { useState, useEffect } from 'react';
import { getPollingStatus, stopPollingService } from '@/services/intelligentPollingService';

/**
 * Composant de monitoring pour le système de polling intelligent V2
 */
export default function PollingMonitor() {
  const [status, setStatus] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const currentStatus = getPollingStatus();
      setStatus(currentStatus);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 bg-blue-500 text-white p-2 rounded-full shadow-lg hover:bg-blue-600 transition-colors"
        title="Afficher le monitoring du polling"
      >
        🔄
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white border rounded-lg shadow-lg p-4 max-w-sm">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-sm">🔄 Polling Monitor V2</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>

      {status && (
        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span>Status:</span>
            <span className={`font-mono ${status.isPolling ? 'text-green-600' : 'text-gray-600'}`}>
              {status.isPolling ? '🟢 Polling' : '⚪ Idle'}
            </span>
          </div>

          <div className="flex justify-between">
            <span>Queue:</span>
            <span className="font-mono">{status.queueLength}</span>
          </div>

          <div className="border-t pt-2">
            <span className="block mb-1 font-medium">Derniers résultats:</span>
            {Array.from(status.lastResults.entries()).map(([key, result]: [string, any]) => (
              <div key={key} className="text-xs bg-gray-50 p-1 rounded mb-1">
                <div className="flex justify-between">
                  <span className="capitalize">{key}:</span>
                  <span className={`font-mono ${result.success ? 'text-green-600' : 'text-red-600'}`}>
                    {result.success ? '✅' : '❌'}
                  </span>
                </div>
                {result.dataCount !== undefined && (
                  <div className="text-gray-500">
                    {result.dataCount} éléments
                  </div>
                )}
                {result.error && (
                  <div className="text-red-500 text-xs truncate" title={result.error}>
                    {result.error}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="border-t pt-2">
            <button
              onClick={stopPollingService}
              className="w-full bg-red-500 text-white text-xs py-1 px-2 rounded hover:bg-red-600 transition-colors"
            >
              🛑 Arrêter le service
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 