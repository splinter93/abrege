'use client';

import React, { useState, useEffect } from 'react';
import { useRealtime } from '@/hooks/useRealtime';

interface PollingEvent {
  table: string;
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: any;
  old: any;
  timestamp: number;
  diff?: any;
}

export default function PollingTest() {
  const [events, setEvents] = useState<PollingEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const { subscribe, unsubscribe } = useRealtime({
    userId: "3223651c-5580-4471-affb-b3f4456bd729",
    type: 'polling',
    interval: 3000,
    debug: true
  });

  useEffect(() => {
    console.log('[PollingTest] 🔄 Initialisation du test de polling...');

    const handleArticleChange = (event: PollingEvent) => {
      console.log('[PollingTest] 📡 Événement articles reçu:', event);
      setEvents(prev => [event, ...prev.slice(0, 9)]); // Garder les 10 derniers
    };

    const handleFolderChange = (event: PollingEvent) => {
      console.log('[PollingTest] 📡 Événement folders reçu:', event);
      setEvents(prev => [event, ...prev.slice(0, 9)]); // Garder les 10 derniers
    };

    // S'abonner aux changements
    subscribe('articles', handleArticleChange);
    subscribe('folders', handleFolderChange);
    setIsConnected(true);

    console.log('[PollingTest] ✅ Abonnements activés');

    return () => {
      console.log('[PollingTest] 🛑 Nettoyage des abonnements...');
      unsubscribe('articles', handleArticleChange);
      unsubscribe('folders', handleFolderChange);
      setIsConnected(false);
    };
  }, [subscribe, unsubscribe]);

  return (
    <div style={{ 
      maxWidth: 600, 
      margin: '20px auto', 
      padding: 20, 
      background: 'rgba(255,255,255,0.05)', 
      borderRadius: 12,
      border: '1px solid rgba(255,255,255,0.1)'
    }}>
      <h2 style={{ fontWeight: 700, fontSize: 18, marginBottom: 16 }}>
        🧪 Test du Système de Polling
      </h2>
      
      <div style={{ marginBottom: 16 }}>
        <span style={{ 
          color: isConnected ? '#4ade80' : '#f87171',
          fontWeight: 500 
        }}>
          {isConnected ? '🟢 Connecté' : '🔴 Déconnecté'}
        </span>
      </div>

      <div style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
          📡 Événements Reçus ({events.length})
        </h3>
        
        {events.length === 0 ? (
          <div style={{ color: '#888', fontStyle: 'italic', fontSize: 14 }}>
            Aucun événement reçu pour l'instant...
          </div>
        ) : (
          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            {events.map((event, index) => (
              <div key={index} style={{ 
                padding: 8, 
                marginBottom: 8, 
                background: 'rgba(255,255,255,0.03)', 
                borderRadius: 6,
                fontSize: 12
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ 
                    color: event.eventType === 'UPDATE' ? '#4ade80' : 
                           event.eventType === 'INSERT' ? '#60a5fa' : '#f87171',
                    fontWeight: 500 
                  }}>
                    {event.eventType}
                  </span>
                  <span style={{ color: '#888', fontSize: 11 }}>
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div style={{ color: '#ccc' }}>
                  <strong>Table:</strong> {event.table}
                </div>
                {event.new && (
                  <div style={{ color: '#ccc' }}>
                    <strong>ID:</strong> {event.new.id}
                    {event.new.source_title && (
                      <span style={{ marginLeft: 8 }}>
                        <strong>Titre:</strong> {event.new.source_title}
                      </span>
                    )}
                    {event.new.name && (
                      <span style={{ marginLeft: 8 }}>
                        <strong>Nom:</strong> {event.new.name}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ fontSize: 12, color: '#888' }}>
        <p>💡 Ce composant teste le système de polling en temps réel.</p>
        <p>📊 Il écoute les changements sur les tables 'articles' et 'folders'.</p>
        <p>🔄 Intervalle de polling: 3 secondes</p>
      </div>
    </div>
  );
} 