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

  // Initialiser le système de polling ciblé
  useEffect(() => {
    if (user?.id) {
      logger.dev('[TargetedPollingManager] ✅ Gestionnaire de polling ciblé initialisé', {
        userId: user.id,
        isPolling
      });
      
      // 🚫 Pas de polling initial automatique pour éviter les erreurs 401
      // Le polling sera déclenché par les actions UI
      logger.dev('[TargetedPollingManager] 🎯 Prêt pour le polling ciblé par actions UI');
    } else {
      logger.dev('[TargetedPollingManager] ⚠️ Pas d\'utilisateur connecté');
    }
  }, [user?.id, isPolling]);

  // Exposer les fonctions de polling globalement pour les actions UI
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Exposer les fonctions de polling sur window pour les actions UI
      // Les fonctions acceptent un paramètre optionnel OperationType, mais l'API globale attend string[]
      // On crée des wrappers pour adapter les signatures
      window.targetedPolling = {
        pollNotes: async (noteIds: string[]) => {
          // L'API globale attend noteIds mais notre hook n'en a pas besoin
          // On appelle simplement pollNotes() sans paramètre
          await pollNotes();
        },
        pollFolders: async (folderIds: string[]) => {
          await pollFolders();
        },
        pollClasseurs: async (classeurIds: string[]) => {
          await pollClasseurs();
        },
        pollAll,
      };
    }
  }, [pollNotes, pollFolders, pollClasseurs, pollAll]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined') {
        delete window.targetedPolling;
      }
    };
  }, []);

  // Composant invisible - fonctionne en arrière-plan
  return null;
}
