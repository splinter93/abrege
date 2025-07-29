"use client";

import { useSupabaseRealtime } from '@/hooks/useRealtime';
import { useMemo } from 'react';

export default function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { isConnected } = useSupabaseRealtime();

  // Mémoriser le badge pour éviter les re-renders inutiles
  const realtimeBadge = useMemo(() => {
    if (!isConnected) return null;
    
    return (
      <div style={{
        position: 'fixed',
        bottom: 10,
        right: 10,
        background: '#10b981',
        color: 'white',
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '12px',
        zIndex: 9999
      }}>
        🟢 Realtime
      </div>
    );
  }, [isConnected]);

  return (
    <>
      {children}
      {realtimeBadge}
    </>
  );
} 