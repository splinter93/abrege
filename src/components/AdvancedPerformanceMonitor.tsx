"use client";

import { useState, useEffect, useCallback } from 'react';
import { optimizedClasseurService } from '@/services/optimizedClasseurService';
import { useAuth } from '@/hooks/useAuth';
import { useFileSystemStore } from '@/store/useFileSystemStore';

interface HealthStatus {
  healthy: boolean;
  details: Record<string, unknown>;
}

interface CacheStats {
  totalCacheSize: number;
  expiredEntries: number;
  loadingEntries: number;
  errorEntries: number;
  maxCacheSize: number;
  cacheTTL: number;
}

export const AdvancedPerformanceMonitor: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  
  const { user } = useAuth();
  const classeursStore = useFileSystemStore((state) => state.classeurs);
  const foldersStore = useFileSystemStore((state) => state.folders);
  const notesStore = useFileSystemStore((state) => state.notes);

  // 🔧 OPTIMISATION: Mise à jour automatique des stats
  useEffect(() => {
    if (isVisible) {
      updateStats();
      const interval = setInterval(updateStats, 5000); // Mise à jour toutes les 5 secondes
      return () => clearInterval(interval);
    }
  }, [isVisible]);

  const updateStats = useCallback(async () => {
    try {
      // Récupérer les stats du cache
      const stats = optimizedClasseurService.getCacheStats();
      setCacheStats(stats);
      
      // Vérifier la santé du service
      const health = await optimizedClasseurService.healthCheck();
      setHealthStatus(health);
      
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Erreur mise à jour stats:', error);
    }
  }, []);

  const checkHealth = useCallback(async () => {
    if (!user?.id) return;
    
    setIsCheckingHealth(true);
    try {
      await updateStats();
    } finally {
      setIsCheckingHealth(false);
    }
  }, [user?.id, updateStats]);

  const clearAllCache = useCallback(() => {
    optimizedClasseurService.clearAllCache();
    updateStats();
  }, [updateStats]);

  const getHealthColor = (healthy: boolean) => {
    return healthy ? 'text-green-400' : 'text-red-400';
  };

  const getHealthIcon = (healthy: boolean) => {
    return healthy ? '🟢' : '🔴';
  };

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-20 bg-purple-500 text-white p-2 rounded-full shadow-lg z-50"
        title="Monitoring Avancé"
      >
        📊
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-gray-900 text-green-400 p-4 rounded-lg shadow-lg z-50 max-w-md max-h-96 overflow-auto">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-white font-semibold">📊 Monitoring Avancé</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-white hover:text-red-400"
        >
          ✕
        </button>
      </div>
      
      <div className="space-y-3 text-xs">
        {/* État de santé du service */}
        <div className="border-b border-gray-700 pb-2">
          <h4 className="font-semibold text-white mb-2">🏥 Santé du Service</h4>
          {healthStatus ? (
            <div className="space-y-1">
              <div className={`flex items-center ${getHealthColor(healthStatus.healthy)}`}>
                <span className="mr-2">{getHealthIcon(healthStatus.healthy)}</span>
                <span>{healthStatus.healthy ? 'Service en bonne santé' : 'Problème détecté'}</span>
              </div>
              <div className="text-gray-400 text-xs">
                {(() => {
                  const ts = (healthStatus.details as { timestamp?: string | number })?.timestamp;
                  return `Dernière vérification: ${new Date(ts ?? 0).toLocaleTimeString()}`;
                })()}
              </div>
            </div>
          ) : (
            <div className="text-gray-500">Aucune donnée de santé</div>
          )}
        </div>

        {/* Statistiques du cache */}
        <div className="border-b border-gray-700 pb-2">
          <h4 className="font-semibold text-white mb-2">💾 Cache</h4>
          {cacheStats ? (
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Taille:</span>
                <span className={cacheStats.totalCacheSize > cacheStats.maxCacheSize * 0.8 ? 'text-yellow-400' : 'text-green-400'}>
                  {cacheStats.totalCacheSize}/{cacheStats.maxCacheSize}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Expirées:</span>
                <span className="text-gray-400">{cacheStats.expiredEntries}</span>
              </div>
              <div className="flex justify-between">
                <span>En cours:</span>
                <span className="text-blue-400">{cacheStats.loadingEntries}</span>
              </div>
              <div className="flex justify-between">
                <span>Erreurs:</span>
                <span className={cacheStats.errorEntries > 0 ? 'text-red-400' : 'text-green-400'}>
                  {cacheStats.errorEntries}
                </span>
              </div>
              <div className="flex justify-between">
                <span>TTL:</span>
                <span className="text-gray-400">{cacheStats.cacheTTL / 1000}s</span>
              </div>
            </div>
          ) : (
            <div className="text-gray-500">Aucune donnée de cache</div>
          )}
        </div>

        {/* État du store Zustand */}
        <div className="border-b border-gray-700 pb-2">
          <h4 className="font-semibold text-white mb-2">📦 Store Zustand</h4>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span>Classeurs:</span>
              <span className="text-yellow-400">{Object.keys(classeursStore).length}</span>
            </div>
            <div className="flex justify-between">
              <span>Dossiers:</span>
              <span className="text-blue-400">{Object.keys(foldersStore).length}</span>
            </div>
            <div className="flex justify-between">
              <span>Notes:</span>
              <span className="text-green-400">{Object.keys(notesStore).length}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <button
            onClick={checkHealth}
            disabled={isCheckingHealth}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white p-2 rounded text-xs"
          >
            {isCheckingHealth ? '🔍 Vérification...' : '🔍 Vérifier la santé'}
          </button>
          
          <button
            onClick={clearAllCache}
            className="w-full bg-red-600 hover:bg-red-700 text-white p-2 rounded text-xs"
          >
            🗑️ Vider le cache
          </button>
        </div>

        {/* Dernière mise à jour */}
        {lastUpdate && (
          <div className="text-gray-500 text-xs text-center pt-2 border-t border-gray-700">
            Dernière mise à jour: {lastUpdate.toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  );
}; 