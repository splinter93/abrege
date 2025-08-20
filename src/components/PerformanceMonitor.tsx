import React, { useState, useEffect } from 'react';
import { optimizedClasseurService } from '@/services/optimizedClasseurService';
import { optimizedNoteService } from '@/services/optimizedNoteService';
import { v2UnifiedApi } from '@/services/V2UnifiedApi';
import { useFileSystemStore } from '@/store/useFileSystemStore';
import { simpleLogger as logger } from '@/utils/logger';

interface PerformanceStats {
  classeurCacheSize: number;
  noteMetadataCacheSize: number;
  noteContentCacheSize: number;
  totalCacheSize: number;
  storeStats: {
    classeurs: number;
    folders: number;
    notes: number;
  };
  lastLoadTime: number;
  loadStatus: 'idle' | 'loading' | 'success' | 'error';
  lastError?: string;
}

export const PerformanceMonitor: React.FC = () => {
  const [stats, setStats] = useState<PerformanceStats>({
    classeurCacheSize: 0,
    noteMetadataCacheSize: 0,
    noteContentCacheSize: 0,
    totalCacheSize: 0,
    storeStats: { classeurs: 0, folders: 0, notes: 0 },
    lastLoadTime: 0,
    loadStatus: 'idle'
  });
  const [isVisible, setIsVisible] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);

  // Pas besoin d'utiliser le hook, on accède directement au store

  useEffect(() => {
    const interval = setInterval(() => {
      try {
        const classeurStats = (optimizedClasseurService as any).getCacheStats?.() || { totalCacheSize: 0 };
        const noteStats = optimizedNoteService.getCacheStats();
        const storeState = useFileSystemStore.getState();
        
        setStats({
          classeurCacheSize: classeurStats.totalCacheSize || 0,
          noteMetadataCacheSize: noteStats.metadataCacheSize || 0,
          noteContentCacheSize: noteStats.contentCacheSize || 0,
          totalCacheSize: (classeurStats.totalCacheSize || 0) + (noteStats.metadataCacheSize || 0) + (noteStats.contentCacheSize || 0),
          storeStats: {
            classeurs: Object.keys(storeState.classeurs).length,
            folders: Object.keys(storeState.folders).length,
            notes: Object.keys(storeState.notes).length
          },
          lastLoadTime: stats.lastLoadTime,
          loadStatus: stats.loadStatus
        });
      } catch (error) {
        console.error('Erreur mise à jour stats:', error);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [stats.lastLoadTime, stats.loadStatus]);

  const clearAllCache = () => {
    try {
      optimizedClasseurService.invalidateCache('all');
      optimizedNoteService.invalidateAllCache();
      setStats(prev => ({ ...prev, loadStatus: 'idle' }));
      addTestResult('🗑️ Cache vidé avec succès');
    } catch (error) {
      addTestResult(`❌ Erreur vidage cache: ${error}`);
    }
  };

  const addTestResult = (message: string) => {
    setTestResults(prev => [...prev.slice(-9), `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const runDiagnosticTest = async () => {
    setIsTesting(true);
    setTestResults([]);
    addTestResult('🧪 Début du diagnostic complet...');

    try {
      // Test 1: Service optimisé
      addTestResult('🧪 Test 1: Service optimisé des classeurs');
      const startTime = Date.now();
      
      try {
        const result = await optimizedClasseurService.loadClasseursWithContentOptimized('test-user');
        const duration = Date.now() - startTime;
        addTestResult(`✅ Service optimisé: ${result.length} classeurs en ${duration}ms`);
      } catch (error) {
        const duration = Date.now() - startTime;
        addTestResult(`❌ Service optimisé échoué en ${duration}ms: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      }

      // Test 2: Ancien système
      addTestResult('🧪 Test 2: Ancien système V2UnifiedApi');
      const fallbackStart = Date.now();
      
      try {
        await v2UnifiedApi.loadClasseursWithContent('test-user');
        const duration = Date.now() - fallbackStart;
        addTestResult(`✅ Ancien système: succès en ${duration}ms`);
      } catch (error) {
        const duration = Date.now() - fallbackStart;
        addTestResult(`❌ Ancien système échoué en ${duration}ms: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      }

      // Test 3: Vérification store
      addTestResult('🧪 Test 3: Vérification du store Zustand');
             const storeState = useFileSystemStore.getState();
      addTestResult(`📊 Store: ${Object.keys(storeState.classeurs).length} classeurs, ${Object.keys(storeState.folders).length} dossiers, ${Object.keys(storeState.notes).length} notes`);

      addTestResult('🎯 Diagnostic terminé');

    } catch (error) {
      addTestResult(`💥 Erreur critique: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setIsTesting(false);
    }
  };

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="performance-monitor-toggle"
        title="Ouvrir le moniteur de performance"
      >
        📊
      </button>
    );
  }

  return (
    <div className="performance-monitor">
      <div className="performance-monitor-header">
        <h3>📊 Moniteur de Performance</h3>
        <button onClick={() => setIsVisible(false)} className="close-btn">×</button>
      </div>

      <div className="performance-monitor-content">
        <div className="stats-section">
          <h4>📈 Statistiques en temps réel</h4>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-label">Cache Classeurs:</span>
              <span className="stat-value">{stats.classeurCacheSize}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Cache Notes (meta):</span>
              <span className="stat-value">{stats.noteMetadataCacheSize}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Cache Notes (contenu):</span>
              <span className="stat-value">{stats.noteContentCacheSize}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Total Cache:</span>
              <span className="stat-value">{stats.totalCacheSize}</span>
            </div>
          </div>

          <div className="store-stats">
            <h5>🏪 État du Store Zustand</h5>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-label">Classeurs:</span>
                <span className="stat-value">{stats.storeStats.classeurs}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Dossiers:</span>
                <span className="stat-value">{stats.storeStats.folders}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Notes:</span>
                <span className="stat-value">{stats.storeStats.notes}</span>
              </div>
            </div>
          </div>

          <div className="status-info">
            <h5>🔄 Statut du chargement</h5>
            <div className="status-item">
              <span className="status-label">Statut:</span>
              <span className={`status-value status-${stats.loadStatus}`}>
                {stats.loadStatus === 'idle' && '🟡 En attente'}
                {stats.loadStatus === 'loading' && '🔄 Chargement...'}
                {stats.loadStatus === 'success' && '✅ Succès'}
                {stats.loadStatus === 'error' && '❌ Erreur'}
              </span>
            </div>
            {stats.lastLoadTime > 0 && (
              <div className="status-item">
                <span className="status-label">Dernier chargement:</span>
                <span className="status-value">{new Date(stats.lastLoadTime).toLocaleTimeString()}</span>
              </div>
            )}
            {stats.lastError && (
              <div className="status-item">
                <span className="status-label">Dernière erreur:</span>
                <span className="status-value error">{stats.lastError}</span>
              </div>
            )}
          </div>
        </div>

        <div className="actions-section">
          <h4>🛠️ Actions</h4>
          <div className="action-buttons">
            <button 
              onClick={runDiagnosticTest} 
              disabled={isTesting}
              className="action-btn primary"
            >
              {isTesting ? '🧪 Test en cours...' : '🧪 Lancer diagnostic'}
            </button>
            <button onClick={clearAllCache} className="action-btn danger">
              🗑️ Vider le cache
            </button>
          </div>

          {testResults.length > 0 && (
            <div className="test-results">
              <h5>📋 Résultats des tests</h5>
              <div className="test-results-list">
                {testResults.map((result, index) => (
                  <div key={index} className="test-result-item">
                    {result}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PerformanceMonitor; 