/**
 * Hook pour gérer les callables Synesia d'un agent
 * Pattern identique à useOpenApiSchemas
 */

import { useState, useEffect, useCallback } from 'react';
import { simpleLogger as logger } from '@/utils/logger';
import type { SynesiaCallable, AgentCallableLink } from '@/types/callables';

// Réexporter les types pour cohérence avec useOpenApiSchemas
export type { AgentCallableLink } from '@/types/callables';

export interface CallableListItem {
  id: string;
  name: string;
  type: 'agent' | 'script' | 'request' | 'callable-pipeline';
  description: string | null;
  slug: string | null;
  icon: string | null;
  group_name: string | null;
  auth: 'OAUTH' | 'NONE';
  is_owner: boolean;
}

export function useCallables(agentId?: string) {
  const [availableCallables, setAvailableCallables] = useState<CallableListItem[]>([]);
  const [agentCallables, setAgentCallables] = useState<AgentCallableLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Charger tous les callables disponibles depuis Synesia
   */
  const loadAvailableCallables = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/synesia/callables');
      const data = await response.json();

      if (data.success) {
        // Transformer SynesiaCallable en CallableListItem pour l'UI
        const callables: CallableListItem[] = (data.callables || []).map((c: SynesiaCallable) => ({
          id: c.id,
          name: c.name,
          type: c.type,
          description: c.description,
          slug: c.slug,
          icon: c.icon,
          group_name: c.group_name,
          auth: c.auth,
          is_owner: c.is_owner,
        }));

        setAvailableCallables(callables);
        logger.dev(`[useCallables] ✅ ${callables.length} callables chargés`);
      } else {
        throw new Error(data.error || 'Erreur lors du chargement des callables');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMsg);
      logger.error('[useCallables] ❌ Erreur chargement callables:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Charger les callables liés à un agent
   */
  const loadAgentCallables = useCallback(async (targetAgentId: string) => {
    if (!targetAgentId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/ui/agents/${targetAgentId}/callables`);
      const data = await response.json();

      if (data.success) {
        // Transformer les liens en format AgentCallableLink
        // Note: Supabase retourne synesia_callables (nom de la table), pas synesia_callable
        const links: AgentCallableLink[] = (data.callables || []).map((link: {
          id: string;
          agent_id: string;
          callable_id: string;
          created_at: string;
          updated_at: string;
          synesia_callables: SynesiaCallable | null;
        }) => ({
          id: link.id,
          agent_id: link.agent_id,
          callable_id: link.callable_id,
          created_at: link.created_at,
          updated_at: link.updated_at,
          synesia_callable: link.synesia_callables!,
        }));

        setAgentCallables(links);
        logger.dev(`[useCallables] ✅ ${links.length} callables liés à l'agent ${targetAgentId}`);
      } else {
        throw new Error(data.error || 'Erreur lors du chargement des callables de l\'agent');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMsg);
      logger.error('[useCallables] ❌ Erreur chargement callables agent:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Lier un callable à un agent
   */
  const linkCallable = useCallback(async (targetAgentId: string, callableId: string) => {
    try {
      setError(null);

      const response = await fetch(`/api/ui/agents/${targetAgentId}/callables`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callable_id: callableId }),
      });

      const data = await response.json();

      if (data.success) {
        logger.dev(`[useCallables] ✅ Callable ${callableId} lié à l'agent ${targetAgentId}`);
        // Recharger les callables de l'agent
        await loadAgentCallables(targetAgentId);
        return true;
      } else {
        throw new Error(data.error || 'Erreur lors de la liaison du callable');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMsg);
      logger.error('[useCallables] ❌ Erreur liaison callable:', err);
      return false;
    }
  }, [loadAgentCallables]);

  /**
   * Délier un callable d'un agent
   */
  const unlinkCallable = useCallback(async (targetAgentId: string, callableId: string) => {
    try {
      setError(null);

      const response = await fetch(`/api/ui/agents/${targetAgentId}/callables/${callableId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        logger.dev(`[useCallables] ✅ Callable ${callableId} délié de l'agent ${targetAgentId}`);
        // Recharger les callables de l'agent
        await loadAgentCallables(targetAgentId);
        return true;
      } else {
        throw new Error(data.error || 'Erreur lors de la suppression du callable');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMsg);
      logger.error('[useCallables] ❌ Erreur suppression callable:', err);
      return false;
    }
  }, [loadAgentCallables]);

  // Charger automatiquement les callables disponibles au mount
  useEffect(() => {
    loadAvailableCallables();
  }, [loadAvailableCallables]);

  // Charger les callables de l'agent si agentId fourni
  useEffect(() => {
    if (agentId) {
      loadAgentCallables(agentId);
    }
  }, [agentId, loadAgentCallables]);

  return {
    availableCallables,
    agentCallables,
    loading,
    error,
    loadAvailableCallables,
    loadAgentCallables,
    linkCallable,
    unlinkCallable,
  };
}

