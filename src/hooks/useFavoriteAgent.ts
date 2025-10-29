/**
 * Hook pour charger l'agent favori de l'utilisateur
 * 
 * Flow:
 * 1. Récupère favorite_agent_id depuis user metadata
 * 2. Charge l'agent depuis la DB
 * 3. Si introuvable → fallback sur le 1er agent de la liste
 * 4. Appelle onAgentLoaded avec l'agent
 * 
 * @param user - Utilisateur authentifié
 * @param agents - Liste des agents disponibles
 * @param onAgentLoaded - Callback appelé avec l'agent chargé
 */

import { useEffect } from 'react';
import { supabase } from '@/supabaseClient';
import type { Agent } from '@/types/chat';
import { simpleLogger as logger } from '@/utils/logger';

export interface UseFavoriteAgentOptions {
  user: {
    id: string;
  } | null;
  agents: Agent[];
  agentsLoading: boolean;
  onAgentLoaded: (agent: Agent | null) => void;
}

export function useFavoriteAgent(options: UseFavoriteAgentOptions): void {
  const { user, agents, agentsLoading, onAgentLoaded } = options;

  useEffect(() => {
    // Skip si pas d'utilisateur ou agents en chargement
    if (!user || agentsLoading || agents.length === 0) {
      return;
    }

    let isMounted = true; // ✅ Éviter race condition si démontage rapide

    const loadFavoriteAgent = async () => {
      // ✅ Charger favorite_agent_id depuis la table users
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('favorite_agent_id')
        .eq('id', user.id)
        .single();

      if (userError) {
        logger.error('[useFavoriteAgent] ❌ Erreur chargement user:', userError);
        // Fallback sur 1er agent
        if (agents.length > 0) {
          onAgentLoaded(agents[0] as Agent);
        }
        return;
      }

      const favoriteAgentId = userData?.favorite_agent_id;

      // ✅ CAS 1 : Utilisateur a un agent favori
      if (favoriteAgentId) {
        logger.dev('[useFavoriteAgent] 🌟 Chargement agent favori:', favoriteAgentId);

        const { data: favoriteAgent, error } = await supabase
          .from('agents')
          .select('*')
          .eq('id', favoriteAgentId)
          .single();

        if (!isMounted) return; // ✅ Composant démonté

        if (error || !favoriteAgent) {
          logger.warn('[useFavoriteAgent] ⚠️ Agent favori introuvable (supprimé), fallback sur 1er agent');
          
          // ✅ FALLBACK : Premier agent de la liste
          if (agents.length > 0) {
            onAgentLoaded(agents[0] as Agent);
            logger.dev('[useFavoriteAgent] ✅ Fallback agent chargé:', agents[0].name);
          } else {
            onAgentLoaded(null);
          }
          return;
        }

        // ✅ Agent favori trouvé
        onAgentLoaded(favoriteAgent as Agent);
        logger.dev('[useFavoriteAgent] ✅ Agent favori chargé:', favoriteAgent.name);
        return;
      }

      // ✅ CAS 2 : Pas de favori défini → fallback sur 1er agent
      logger.dev('[useFavoriteAgent] ℹ️ Pas de favori défini, fallback sur 1er agent');
      if (agents.length > 0 && isMounted) {
        onAgentLoaded(agents[0] as Agent);
        logger.dev('[useFavoriteAgent] ✅ Premier agent chargé par défaut:', agents[0].name);
      } else {
        onAgentLoaded(null);
      }
    };

    loadFavoriteAgent();

    return () => {
      isMounted = false; // ✅ Cleanup
    };
  }, [user?.id, agents.length, agentsLoading]); // ✅ Pas onAgentLoaded (fonction change à chaque render)
}

