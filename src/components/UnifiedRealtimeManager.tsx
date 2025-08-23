/**
 * 🔄 Gestionnaire Unifié Realtime + Polling
 * 
 * Ce composant remplace RealtimeInitializer + UnifiedPollingInitializer
 * avec une logique intelligente qui utilise Supabase Realtime en priorité
 * et bascule vers le polling unifié en cas de problème.
 */

"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useFileSystemStore } from '@/store/useFileSystemStore';
import { setUnifiedPollingAuthToken, clearUnifiedPollingAuthToken } from '@/services/unifiedPollingService';

export default function UnifiedRealtimeManager() {
  const { user } = useAuth();
  const [realtimeStatus, setRealtimeStatus] = useState<'connecting' | 'connected' | 'failed' | 'fallback'>('connecting');
  const [pollingActive, setPollingActive] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    const initializeRealtime = async () => {
      try {
        console.log('[UnifiedRealtimeManager] 🚀 Initialisation de la synchronisation temps réel...');
        
        // Importer Supabase dynamiquement
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        
        // Récupérer la session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !session?.access_token) {
          console.error('[UnifiedRealtimeManager] ❌ Erreur récupération session:', error);
          setRealtimeStatus('failed');
          return;
        }

        console.log('[UnifiedRealtimeManager] ✅ Session récupérée, activation Supabase Realtime...');
        
        // Configurer le token pour le polling de fallback
        setUnifiedPollingAuthToken(session.access_token);
        
        // Essayer Supabase Realtime en premier
        const realtimeSuccess = await setupSupabaseRealtime(supabase, session.access_token);
        
        if (realtimeSuccess) {
          setRealtimeStatus('connected');
          console.log('[UnifiedRealtimeManager] ✅ Supabase Realtime activé avec succès');
        } else {
          setRealtimeStatus('fallback');
          setPollingActive(true);
          console.log('[UnifiedRealtimeManager] 🔄 Basculement vers le polling unifié');
        }
        
      } catch (error) {
        console.error('[UnifiedRealtimeManager] ❌ Erreur initialisation:', error);
        setRealtimeStatus('failed');
        setPollingActive(true);
      }
    };

    initializeRealtime();

    // Cleanup
    return () => {
      console.log('[UnifiedRealtimeManager] 🛑 Arrêt de la synchronisation');
      clearUnifiedPollingAuthToken();
      setRealtimeStatus('connecting');
      setPollingActive(false);
    };
  }, [user?.id]);

  /**
   * Configurer Supabase Realtime
   */
  const setupSupabaseRealtime = async (supabase: any, token: string): Promise<boolean> => {
    try {
      const store = useFileSystemStore.getState();
      
      // Canal pour les classeurs
      const classeursChannel = supabase
        .channel('classeurs-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'classeurs'
          },
          (payload: any) => {
            console.log('[UnifiedRealtimeManager] 📚 Changement classeur:', payload);
            
            switch (payload.eventType) {
              case 'INSERT':
                store.addClasseur(payload.new);
                break;
              case 'UPDATE':
                store.updateClasseur(payload.new.id, payload.new);
                break;
              case 'DELETE':
                store.removeClasseur(payload.old.id);
                break;
            }
          }
        )
        .subscribe((status: any) => {
          if (status === 'SUBSCRIBED') {
            console.log('[UnifiedRealtimeManager] ✅ Canal classeurs activé');
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.warn('[UnifiedRealtimeManager] ⚠️ Problème canal classeurs:', status);
            return false; // Échec
          }
        });

      // Canal pour les dossiers
      const dossiersChannel = supabase
        .channel('dossiers-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'folders'
          },
          (payload: any) => {
            console.log('[UnifiedRealtimeManager] 📁 Changement dossier:', payload);
            
            switch (payload.eventType) {
              case 'INSERT':
                store.addFolder(payload.new);
                break;
              case 'UPDATE':
                store.updateFolder(payload.new.id, payload.new);
                break;
              case 'DELETE':
                store.removeFolder(payload.old.id);
                break;
            }
          }
        )
        .subscribe((status: any) => {
          if (status === 'SUBSCRIBED') {
            console.log('[UnifiedRealtimeManager] ✅ Canal dossiers activé');
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.warn('[UnifiedRealtimeManager] ⚠️ Problème canal dossiers:', status);
            return false; // Échec
          }
        });

      // Canal pour les notes
      const notesChannel = supabase
        .channel('notes-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'articles'
          },
          (payload: any) => {
            console.log('[UnifiedRealtimeManager] 📝 Changement note:', payload);
            
            switch (payload.eventType) {
              case 'INSERT':
                store.addNote(payload.new);
                break;
              case 'UPDATE':
                store.updateNote(payload.new.id, payload.new);
                break;
              case 'DELETE':
                store.removeNote(payload.old.id);
                break;
            }
          }
        )
        .subscribe((status: any) => {
          if (status === 'SUBSCRIBED') {
            console.log('[UnifiedRealtimeManager] ✅ Canal notes activé');
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.warn('[UnifiedRealtimeManager] ⚠️ Problème canal notes:', status);
            return false; // Échec
          }
        });

      // Attendre un peu pour vérifier que les canaux sont stables
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      return true; // Succès
      
    } catch (error) {
      console.error('[UnifiedRealtimeManager] ❌ Erreur Supabase Realtime:', error);
      return false; // Échec
    }
  };

  // Indicateur visuel du statut (optionnel, pour le debug)
  if (process.env.NODE_ENV === 'development') {
    return (
      <div className="fixed top-4 right-4 z-50 bg-white border rounded-lg shadow-lg p-3 text-xs">
        <div className="flex items-center gap-2">
          <div 
            className={`w-3 h-3 rounded-full ${
              realtimeStatus === 'connected' ? 'bg-green-500' :
              realtimeStatus === 'fallback' ? 'bg-yellow-500' :
              realtimeStatus === 'failed' ? 'bg-red-500' :
              'bg-gray-400'
            }`}
          />
          <span>
            {realtimeStatus === 'connected' ? '🟢 Realtime' :
             realtimeStatus === 'fallback' ? '🟡 Polling' :
             realtimeStatus === 'failed' ? '🔴 Échec' :
             '⚪ Connexion...'}
          </span>
        </div>
        {pollingActive && (
          <div className="mt-1 text-gray-500">
            Polling actif
          </div>
        )}
      </div>
    );
  }

  // En production, ne rien afficher
  return null;
} 