/**
 * 🎯 Monitor du Polling Ciblé
 * 
 * Affiche le statut du nouveau système de polling ciblé en temps réel.
 */

"use client";

import { useState, useEffect } from 'react';
import { targetedPollingService } from '@/services/targetedPollingService';

export default function TargetedPollingMonitor() {
  const [isVisible, setIsVisible] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [lastAction, setLastAction] = useState<string>('Aucune');

  useEffect(() => {
    // Surveiller le statut du polling
    const interval = setInterval(() => {
      setIsPolling(targetedPollingService.isCurrentlyPolling());
    }, 100);

    return () => clearInterval(interval);
  }, []);

  // Afficher le monitor seulement en développement
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="targeted-polling-monitor">
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="monitor-toggle"
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 9999,
          background: isPolling ? '#10b981' : '#6b7280',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          padding: '8px 12px',
          fontSize: '12px',
          cursor: 'pointer',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}
      >
        🎯 Polling {isPolling ? 'ACTIF' : 'INACTIF'}
      </button>

      {isVisible && (
        <div
          className="monitor-panel"
          style={{
            position: 'fixed',
            bottom: '70px',
            right: '20px',
            zIndex: 9998,
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '16px',
            minWidth: '300px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
          }}
        >
          <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600' }}>
            🎯 Polling Ciblé
          </h3>
          
          <div style={{ fontSize: '12px', lineHeight: '1.5' }}>
            <div>
              <strong>Statut:</strong> {isPolling ? '🟢 Actif' : '🔴 Inactif'}
            </div>
            <div>
              <strong>Dernière action:</strong> {lastAction}
            </div>
            <div>
              <strong>Système:</strong> Polling ciblé (1 action = 1 polling)
            </div>
          </div>

          <div style={{ marginTop: '12px', fontSize: '11px', color: '#6b7280' }}>
            ✅ Plus de polling continu inefficace<br/>
            ✅ Polling déclenché par actions UI<br/>
            ✅ Mise à jour instantanée
          </div>
        </div>
      )}
    </div>
  );
}
