'use client';

import React, { useState, useEffect } from 'react';
import { useRealtime } from '@/hooks/useRealtime';

interface PollingIndicatorProps {
  className?: string;
}

export default function PollingIndicator({ className = '' }: PollingIndicatorProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<string | null>(null);
  const [eventCount, setEventCount] = useState(0);

  const { subscribe, unsubscribe } = useRealtime({
    userId: "3223651c-5580-4471-affb-b3f4456bd729",
    type: 'polling',
    interval: 3000,
    debug: true
  });

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[PollingIndicator] 🔄 Initialisation de l\'indicateur de polling...');
    }

    const handleArticleChange = (event: any) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('[PollingIndicator] 📡 Événement reçu:', event);
      }
      
      let eventText = '';
      switch (event.eventType) {
        case 'INSERT':
          eventText = `INSERT - ${event.new?.source_title || 'Note'}`;
          break;
        case 'UPDATE':
          eventText = `UPDATE - ${event.new?.source_title || 'Note'}`;
          break;
        case 'DELETE':
          eventText = `DELETE - Note supprimée`;
          break;
      }
      
      setLastEvent(eventText);
      setEventCount(prev => prev + 1);
    };

    const handleFolderChange = (event: any) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('[PollingIndicator] 📡 Événement reçu:', event);
      }
      
      let eventText = '';
      switch (event.eventType) {
        case 'INSERT':
          eventText = `INSERT - ${event.new?.name || 'Dossier'}`;
          break;
        case 'UPDATE':
          eventText = `UPDATE - ${event.new?.name || 'Dossier'}`;
          break;
        case 'DELETE':
          eventText = `DELETE - Dossier supprimé`;
          break;
      }
      
      setLastEvent(eventText);
      setEventCount(prev => prev + 1);
    };

    // S'abonner aux changements
    subscribe('articles', handleArticleChange);
    subscribe('folders', handleFolderChange);
    setIsConnected(true);

    if (process.env.NODE_ENV === 'development') {
      console.log('[PollingIndicator] ✅ Indicateur de polling activé');
    }

    return () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('[PollingIndicator] 🛑 Désactivation de l\'indicateur...');
      }
      unsubscribe('articles', handleArticleChange);
      unsubscribe('folders', handleFolderChange);
      setIsConnected(false);
    };
  }, [subscribe, unsubscribe]);

  return (
    <div className={`polling-indicator ${className}`} style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      background: 'rgba(0, 0, 0, 0.8)',
      color: 'white',
      padding: '12px 16px',
      borderRadius: '8px',
      fontSize: '12px',
      fontFamily: 'monospace',
      zIndex: 1000,
      border: '1px solid rgba(255, 255, 255, 0.1)',
      minWidth: '200px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: isConnected ? '#4ade80' : '#f87171',
          marginRight: '8px',
          animation: isConnected ? 'pulse 2s infinite' : 'none'
        }} />
        <span style={{ fontWeight: 500 }}>
          {isConnected ? '🟢 Polling Actif' : '🔴 Polling Inactif'}
        </span>
      </div>
      
      {isConnected && (
        <>
          <div style={{ marginBottom: '4px', color: '#ccc' }}>
            Événements: {eventCount}
          </div>
          {lastEvent && (
            <div style={{ 
              fontSize: '11px', 
              color: '#888',
              maxWidth: '180px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              Dernier: {lastEvent}
            </div>
          )}
        </>
      )}
      
      <style jsx>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
} 