import React, { useState, useEffect } from 'react';
import { noteConcurrencyManager } from '@/utils/concurrencyManager';
import { optimizedNoteService } from '@/services/optimizedNoteService';

interface PerformanceMetrics {
  cacheStats: {
    metadataCacheSize: number;
    contentCacheSize: number;
    totalCacheSize: number;
  };
  concurrencyStats: {
    activePromises: number;
    totalKeys: number;
    oldestPromise: number;
  };
  loadingKeys: string[];
}

/**
 * Composant de monitoring des performances en temps réel
 * Affiche les métriques du cache et de la concurrence
 */
const PerformanceMonitor: React.FC<{ visible?: boolean }> = ({ visible = false }) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [isVisible, setIsVisible] = useState(visible);

  // Mettre à jour les métriques toutes les 2 secondes
  useEffect(() => {
    if (!isVisible) return;

    const updateMetrics = () => {
      const cacheStats = optimizedNoteService.getCacheStats();
      const concurrencyStats = noteConcurrencyManager.getStats();
      const loadingKeys = noteConcurrencyManager.getLoadingKeys();

      setMetrics({
        cacheStats,
        concurrencyStats,
        loadingKeys
      });
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 2000);

    return () => clearInterval(interval);
  }, [isVisible]);

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 1000,
          padding: '8px 12px',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          border: 'none',
          borderRadius: '20px',
          fontSize: '12px',
          cursor: 'pointer'
        }}
      >
        📊 Perf
      </button>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      zIndex: 1000,
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      color: 'white',
      padding: '16px',
      borderRadius: '12px',
      fontSize: '12px',
      fontFamily: 'monospace',
      minWidth: '280px',
      maxHeight: '400px',
      overflow: 'auto'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h3 style={{ margin: 0, fontSize: '14px' }}>📊 Performance Monitor</h3>
        <button
          onClick={() => setIsVisible(false)}
          style={{
            background: 'none',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          ✕
        </button>
      </div>

      {metrics && (
        <>
          {/* Cache Stats */}
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#888' }}>💾 Cache</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <span style={{ color: '#888' }}>Métadonnées:</span>
                <span style={{ float: 'right', color: '#4ade80' }}>{metrics.cacheStats.metadataCacheSize}</span>
              </div>
              <div>
                <span style={{ color: '#888' }}>Contenu:</span>
                <span style={{ float: 'right', color: '#4ade80' }}>{metrics.cacheStats.contentCacheSize}</span>
              </div>
              <div style={{ gridColumn: '1 / -1', borderTop: '1px solid #333', paddingTop: '4px' }}>
                <span style={{ color: '#888' }}>Total:</span>
                <span style={{ float: 'right', color: '#4ade80' }}>{metrics.cacheStats.totalCacheSize}</span>
              </div>
            </div>
          </div>

          {/* Concurrency Stats */}
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#888' }}>🔄 Concurrence</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <span style={{ color: '#888' }}>Promesses actives:</span>
                <span style={{ float: 'right', color: '#fbbf24' }}>{metrics.concurrencyStats.activePromises}</span>
              </div>
              <div>
                <span style={{ color: '#888' }}>Clés totales:</span>
                <span style={{ float: 'right', color: '#fbbf24' }}>{metrics.concurrencyStats.totalKeys}</span>
              </div>
              <div>
                <span style={{ color: '#888' }}>Plus ancienne:</span>
                <span style={{ float: 'right', color: '#fbbf24' }}>{(metrics.concurrencyStats.oldestPromise / 1000).toFixed(1)}s</span>
              </div>
            </div>
          </div>

          {/* Loading Keys */}
          {metrics.loadingKeys.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#888' }}>⏳ Chargements en cours</h4>
              <div style={{ maxHeight: '100px', overflow: 'auto' }}>
                {metrics.loadingKeys.map((key, index) => (
                  <div key={index} style={{ 
                    fontSize: '10px', 
                    color: '#ccc', 
                    marginBottom: '2px',
                    wordBreak: 'break-all'
                  }}>
                    {key}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => {
                optimizedNoteService.invalidateAllCache();
                console.log('[PerformanceMonitor] 🗑️ Cache vidé');
              }}
              style={{
                padding: '4px 8px',
                fontSize: '10px',
                backgroundColor: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Vider Cache
            </button>
            <button
              onClick={() => {
                noteConcurrencyManager.abortAll();
                console.log('[PerformanceMonitor] ⏹️ Toutes les promesses annulées');
              }}
              style={{
                padding: '4px 8px',
                fontSize: '10px',
                backgroundColor: '#ea580c',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Annuler Tout
            </button>
          </div>
        </>
      )}

      <div style={{ 
        marginTop: '12px', 
        paddingTop: '8px', 
        borderTop: '1px solid #333', 
        fontSize: '10px', 
        color: '#666' 
      }}>
        Mise à jour: {new Date().toLocaleTimeString()}
      </div>
    </div>
  );
};

export default PerformanceMonitor; 