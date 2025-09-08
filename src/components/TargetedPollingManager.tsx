/**
 * 🎯 Gestionnaire de Polling Ciblé
 * 
 * Ce composant gère le polling ciblé et ponctuel pour la page dossiers.
 * Principe : 1 Action UI = 1 Polling Ciblé = 1 Mise à jour UI
 */

"use client";

import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTargetedPolling } from '@/hooks/useTargetedPolling';
import { simpleLogger as logger } from '@/utils/logger';

export default function TargetedPollingManager() {
  const { user } = useAuth();
  const { pollAll, pollNotes, pollFolders, pollClasseurs, isPolling } = useTargetedPolling();

  console.log('[TargetedPollingManager] 🔍 Composant rendu, user:', user?.id, 'isPolling:', isPolling);

  // Initialiser le système de polling ciblé
  useEffect(() => {
    console.log('[TargetedPollingManager] 🔍 useEffect initialisation, user:', user?.id);
    
    if (user?.id) {
      console.log('[TargetedPollingManager] ✅ Gestionnaire de polling ciblé initialisé');
      logger.dev('[TargetedPollingManager] ✅ Gestionnaire de polling ciblé initialisé');
      
      // 🚫 Pas de polling initial automatique pour éviter les erreurs 401
      // Le polling sera déclenché par les actions UI
      console.log('[TargetedPollingManager] 🎯 Prêt pour le polling ciblé par actions UI');
      logger.dev('[TargetedPollingManager] 🎯 Prêt pour le polling ciblé par actions UI');
    } else {
      console.log('[TargetedPollingManager] ⚠️ Pas d\'utilisateur connecté');
    }
  }, [user?.id]);

  // Exposer les fonctions de polling globalement pour les actions UI
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Exposer les fonctions de polling sur window pour les actions UI
      (window as any).targetedPolling = {
        pollNotes,
        pollFolders,
        pollClasseurs,
        pollAll,
        isPolling: () => isPolling
      };
    }
  }, [pollNotes, pollFolders, pollClasseurs, pollAll, isPolling]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).targetedPolling;
      }
    };
  }, []);

  // Composant invisible - fonctionne en arrière-plan
  return null;
}
