import React, { useState, useEffect } from 'react';
import { optimizedClasseurService } from '@/services/optimizedClasseurService';
import { optimizedNoteService } from '@/services/optimizedNoteService';

// ==========================================================================
// COMPOSANT MONITEUR DE PERFORMANCE
// ==========================================================================

interface PerformanceStats {
  classeurCacheSize: number;
  noteMetadataCacheSize: number;
  noteContentCacheSize: number;
  totalCacheSize: number;
}

export const PerformanceMonitor: React.FC = () => {
  const [stats, setStats] = useState<PerformanceStats>({
    classeurCacheSize: 0,
    noteMetadataCacheSize: 0,
    noteContentCacheSize: 0,
    totalCacheSize: 0
  });
  const [isVisible, setIsVisible] = useState(false);

  // Mettre à jour les statistiques toutes les 2 secondes
  useEffect(() => {
    const interval = setInterval(() => {
      const classeurStats = (optimizedClasseurService as any).getCacheStats?.() || { totalCacheSize: 0 };
      const noteStats = optimizedNoteService.getCacheStats();
      
      setStats({
        classeurCacheSize: classeurStats.totalCacheSize || 0,
        noteMetadataCacheSize: noteStats.metadataCacheSize,
        noteContentCacheSize: noteStats.contentCacheSize,
        totalCacheSize: (classeurStats.totalCacheSize || 0) + noteStats.totalCacheSize
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // Nettoyer le cache
  const clearAllCache = () => {
    // Invalider le cache des classeurs pour tous les utilisateurs (on utilise une clé générique)
    optimizedClasseurService.invalidateCache('all');
    optimizedNoteService.invalidateAllCache();
  };

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="performance-monitor-toggle"
        title="Afficher les métriques de performance"
      >
        📊
      </button>
    );
  }

  return (
    <div className="performance-monitor">
      <div className="monitor-header">
        <h4>📊 Métriques de Performance</h4>
        <button
          onClick={() => setIsVisible(false)}
          className="close-button"
          title="Fermer"
        >
          ×
        </button>
      </div>
      
      <div className="monitor-content">
        <div className="cache-stats">
          <h5>💾 Cache</h5>
          <div className="stat-row">
            <span>Classeurs:</span>
            <span className="stat-value">{stats.classeurCacheSize}</span>
          </div>
          <div className="stat-row">
            <span>Métadonnées notes:</span>
            <span className="stat-value">{stats.noteMetadataCacheSize}</span>
          </div>
          <div className="stat-row">
            <span>Contenu notes:</span>
            <span className="stat-value">{stats.noteContentCacheSize}</span>
          </div>
          <div className="stat-row total">
            <span>Total:</span>
            <span className="stat-value">{stats.totalCacheSize}</span>
          </div>
        </div>
        
        <div className="monitor-actions">
          <button
            onClick={clearAllCache}
            className="clear-cache-button"
            title="Vider tout le cache"
          >
            🗑️ Vider le cache
          </button>
        </div>
      </div>
    </div>
  );
};

export default PerformanceMonitor; 