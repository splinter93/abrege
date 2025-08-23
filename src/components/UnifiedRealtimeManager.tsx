/**
 * 🔄 Gestionnaire Realtime Unifié Simplifié
 * 
 * Ce composant utilise le service unifié pour gérer realtime + polling
 * avec une logique simple et efficace.
 */

"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { 
  initializeUnifiedRealtime, 
  getUnifiedRealtimeStatus, 
  stopUnifiedRealtimeService 
} from '@/services/unifiedRealtimeService';

export default function UnifiedRealtimeManager() {
  const { user } = useAuth();
  const [status, setStatus] = useState(getUnifiedRealtimeStatus());

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    const initializeRealtime = async () => {
      try {
        const success = await initializeUnifiedRealtime({
          supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
          supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          userId: user.id,
          debug: process.env.NODE_ENV === 'development'
        });

        if (success) {
          // Mettre à jour le statut
          setStatus(getUnifiedRealtimeStatus());
          
          // Surveiller les changements de statut
          const statusInterval = setInterval(() => {
            setStatus(getUnifiedRealtimeStatus());
          }, 1000);

          return () => clearInterval(statusInterval);
        }
        
      } catch (error) {
        console.error('[RealtimeManager] Erreur d\'initialisation:', error);
      }
    };

    initializeRealtime();

    // Cleanup
    return () => {
      stopUnifiedRealtimeService();
    };
  }, [user?.id]);

  // Indicateur visuel du statut (dev uniquement)
  if (process.env.NODE_ENV === 'development') {
    return (
      <div className="fixed top-4 right-4 z-50 bg-white border rounded-lg shadow-lg p-3 text-xs">
        <div className="flex items-center gap-2">
          <div 
            className={`w-3 h-3 rounded-full ${
              status.isConnected ? 'bg-green-500' :
              status.provider === 'polling' ? 'bg-yellow-500' :
              'bg-red-500'
            }`}
          />
          <span>
            {status.isConnected ? '🟢 Realtime' :
             status.provider === 'polling' ? '🟡 Polling' :
             '🔴 Échec'}
          </span>
        </div>
        
        {status.provider === 'polling' && (
          <div className="mt-1 text-gray-500">
            Polling actif (5s)
          </div>
        )}
        
        {status.lastEvent && (
          <div className="mt-1 text-gray-400 text-xs">
            Dernier: {status.lastEvent}
          </div>
        )}
        
        {status.errorCount > 0 && (
          <div className="mt-1 text-red-500 text-xs">
            Erreurs: {status.errorCount}
          </div>
        )}
      </div>
    );
  }

  // En production, ne rien afficher
  return null;
} 