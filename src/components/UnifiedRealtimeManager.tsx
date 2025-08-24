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
          userToken: '', // Token vide pour l'instant, sera géré par le service
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

  // En production et en développement, ne rien afficher visuellement
  // Le composant fonctionne en arrière-plan pour la synchronisation
  return null;
} 