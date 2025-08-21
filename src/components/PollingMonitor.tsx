"use client";

import { useState, useEffect } from 'react';
import { clientPollingTrigger } from '@/services/clientPollingTrigger';

/**
 * Composant de monitoring du polling intelligent
 * Affiche l'état des opérations de polling en temps réel
 */
export default function PollingMonitor() {
  const [activeOperations, setActiveOperations] = useState<any[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [pollingStatus, setPollingStatus] = useState<'active' | 'inactive' | 'error'>('inactive');

  useEffect(() => {
    const interval = setInterval(() => {
      try {
        const operations = clientPollingTrigger.getActiveOperations();
        setActiveOperations(operations);
        
        // Vérifier le statut du service de polling
        const { getRealtimeService } = require('@/services/realtimeService');
        const realtimeService = getRealtimeService();
        if (realtimeService) {
          setPollingStatus('active');
        } else {
          setPollingStatus('inactive');
        }
      } catch (error) {
        setPollingStatus('error');
        console.error('[PollingMonitor] Erreur:', error);
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 z-50 bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
        title="Afficher le monitoring du polling"
      >
        🔄
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white border border-gray-300 rounded-lg shadow-xl p-4 max-w-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-800">🔄 Polling Intelligent</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>

      {/* ✅ STATUT DU SYSTÈME DE POLLING */}
      <div className="mb-3 p-2 rounded border">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium">Statut Système:</span>
          <span className={`px-2 py-1 rounded text-xs ${
            pollingStatus === 'active' ? 'bg-green-100 text-green-800' :
            pollingStatus === 'inactive' ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
            {pollingStatus === 'active' ? '🟢 Actif' :
             pollingStatus === 'inactive' ? '🟡 Inactif' :
             '🔴 Erreur'}
          </span>
        </div>
      </div>

      {activeOperations.length === 0 ? (
        <p className="text-xs text-gray-500">Aucune opération active</p>
      ) : (
        <div className="space-y-2">
          {activeOperations.map((op) => (
            <div
              key={op.id}
              className={`text-xs p-2 rounded border ${
                op.status === 'pending'
                  ? 'bg-blue-50 border-blue-200'
                  : op.status === 'success'
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">
                  {op.table} ({op.operation})
                </span>
                <span
                  className={`px-2 py-1 rounded text-xs ${
                    op.status === 'pending'
                      ? 'bg-blue-100 text-blue-800'
                      : op.status === 'success'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {op.status}
                </span>
              </div>
              <div className="text-gray-600 mt-1">
                Tentatives: {op.attempts} | Âge: {Math.round((Date.now() - op.timestamp) / 1000)}s
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-gray-200">
        <div className="flex space-x-2">
          <button
            onClick={() => clientPollingTrigger.cleanup()}
            className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded transition-colors"
          >
            🧹 Nettoyer
          </button>
          <button
            onClick={() => clientPollingTrigger.stopAll()}
            className="text-xs bg-red-100 hover:bg-red-200 px-2 py-1 rounded transition-colors"
          >
            🛑 Arrêter tout
          </button>
        </div>
      </div>
    </div>
  );
} 