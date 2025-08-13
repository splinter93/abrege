'use client';
import React, { useState } from 'react';
import ChatFullscreenV2 from './ChatFullscreenV2';
import { simpleLogger as logger } from '@/utils/logger';

/**
 * Composant de test pour valider les optimisations du ChatFullscreenV2
 * Permet de tester les performances et la fonctionnalité
 */
const ChatFullscreenV2Test: React.FC = () => {
  const [testMode, setTestMode] = useState<'normal' | 'performance' | 'stress'>('normal');
  const [showMetrics, setShowMetrics] = useState(false);

  // Métriques de performance
  const [metrics, setMetrics] = useState({
    renderCount: 0,
    lastRenderTime: 0,
    averageRenderTime: 0
  });

  // Test de performance
  const runPerformanceTest = () => {
    setTestMode('performance');
    setShowMetrics(true);
    
    const startTime = performance.now();
    setMetrics(prev => ({
      ...prev,
      renderCount: prev.renderCount + 1,
      lastRenderTime: startTime
    }));
    
    logger.dev('[ChatFullscreenV2Test] 🚀 Test de performance démarré');
  };

  // Test de stress
  const runStressTest = () => {
    setTestMode('stress');
    setShowMetrics(true);
    
    logger.dev('[ChatFullscreenV2Test] 🔥 Test de stress démarré');
    
    // Simuler des mises à jour rapides
    let count = 0;
    const interval = setInterval(() => {
      count++;
      setMetrics(prev => ({
        ...prev,
        renderCount: prev.renderCount + 1,
        lastRenderTime: performance.now()
      }));
      
      if (count >= 100) {
        clearInterval(interval);
        logger.dev('[ChatFullscreenV2Test] ✅ Test de stress terminé');
      }
    }, 10);
  };

  // Reset des métriques
  const resetMetrics = () => {
    setMetrics({
      renderCount: 0,
      lastRenderTime: 0,
      averageRenderTime: 0
    });
    setShowMetrics(false);
  };

  return (
    <div className="chat-test-container">
      {/* Header de test */}
      <div className="test-header">
        <h1>🧪 Test ChatFullscreenV2 Optimisé</h1>
        <div className="test-controls">
          <button 
            onClick={() => setTestMode('normal')}
            className={`test-btn ${testMode === 'normal' ? 'active' : ''}`}
          >
            Mode Normal
          </button>
          <button 
            onClick={runPerformanceTest}
            className={`test-btn ${testMode === 'performance' ? 'active' : ''}`}
          >
            Test Performance
          </button>
          <button 
            onClick={runStressTest}
            className={`test-btn ${testMode === 'stress' ? 'active' : ''}`}
          >
            Test Stress
          </button>
          <button onClick={resetMetrics} className="test-btn reset">
            Reset Métriques
          </button>
        </div>
      </div>

      {/* Métriques de performance */}
      {showMetrics && (
        <div className="test-metrics">
          <h3>📊 Métriques de Performance</h3>
          <div className="metrics-grid">
            <div className="metric">
              <span className="metric-label">Renders:</span>
              <span className="metric-value">{metrics.renderCount}</span>
            </div>
            <div className="metric">
              <span className="metric-label">Dernier Render:</span>
              <span className="metric-value">
                {metrics.lastRenderTime ? `${(performance.now() - metrics.lastRenderTime).toFixed(2)}ms` : 'N/A'}
              </span>
            </div>
            <div className="metric">
              <span className="metric-label">Mode Test:</span>
              <span className="metric-value">{testMode}</span>
            </div>
          </div>
        </div>
      )}

      {/* Instructions de test */}
      <div className="test-instructions">
        <h3>📋 Instructions de Test</h3>
        <ul>
          <li><strong>Mode Normal:</strong> Fonctionnement standard du chat</li>
          <li><strong>Test Performance:</strong> Mesure les temps de rendu</li>
          <li><strong>Test Stress:</strong> Simule des mises à jour rapides</li>
          <li><strong>Métriques:</strong> Surveillez les performances en temps réel</li>
        </ul>
      </div>

      {/* Composant de chat à tester */}
      <div className="chat-test-area">
        <ChatFullscreenV2 />
      </div>

      {/* Styles de test */}
      <style jsx>{`
        .chat-test-container {
          padding: 20px;
          background: #f5f5f5;
          min-height: 100vh;
        }
        
        .test-header {
          background: white;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 20px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .test-header h1 {
          margin: 0 0 20px 0;
          color: #333;
          font-size: 24px;
        }
        
        .test-controls {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        
        .test-btn {
          padding: 10px 20px;
          border: none;
          border-radius: 6px;
          background: #007bff;
          color: white;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
        }
        
        .test-btn:hover {
          background: #0056b3;
          transform: translateY(-1px);
        }
        
        .test-btn.active {
          background: #28a745;
        }
        
        .test-btn.reset {
          background: #dc3545;
        }
        
        .test-btn.reset:hover {
          background: #c82333;
        }
        
        .test-metrics {
          background: white;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 20px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .test-metrics h3 {
          margin: 0 0 15px 0;
          color: #333;
        }
        
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
        }
        
        .metric {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px;
          background: #f8f9fa;
          border-radius: 4px;
        }
        
        .metric-label {
          font-weight: 600;
          color: #495057;
        }
        
        .metric-value {
          font-family: monospace;
          color: #007bff;
          font-weight: 600;
        }
        
        .test-instructions {
          background: white;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 20px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .test-instructions h3 {
          margin: 0 0 15px 0;
          color: #333;
        }
        
        .test-instructions ul {
          margin: 0;
          padding-left: 20px;
        }
        
        .test-instructions li {
          margin-bottom: 8px;
          color: #666;
        }
        
        .chat-test-area {
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
      `}</style>
    </div>
  );
};

export default ChatFullscreenV2Test; 