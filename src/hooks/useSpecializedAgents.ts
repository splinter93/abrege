/**
 * Hook React pour la gestion des agents spécialisés
 * Interface utilisateur pour interagir avec le système d'agents spécialisés
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  SpecializedAgentConfig, 
  SpecializedAgentResponse, 
  CreateSpecializedAgentRequest,
  CreateSpecializedAgentResponse,
  UseSpecializedAgentsReturn 
} from '@/types/specializedAgents';
import { simpleLogger as logger } from '@/utils/logger';

export const useSpecializedAgents = (): UseSpecializedAgentsReturn => {
  const [agents, setAgents] = useState<SpecializedAgentConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Charger la liste des agents spécialisés
   */
  const refreshAgents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/ui/agents/specialized');
      const data = await response.json();

      if (data.success) {
        setAgents(data.agents || []);
        logger.dev('[useSpecializedAgents] ✅ Agents chargés:', data.agents?.length || 0);
      } else {
        throw new Error(data.error || 'Erreur lors du chargement des agents');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMessage);
      logger.error('[useSpecializedAgents] ❌ Erreur refreshAgents:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Exécuter un agent spécialisé
   */
  const executeAgent = useCallback(async (
    agentId: string, 
    input: Record<string, unknown>
  ): Promise<SpecializedAgentResponse> => {
    try {
      setError(null);

      const response = await fetch(`/api/v2/agents/${agentId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input)
      });

      const data = await response.json();

      if (response.ok) {
        logger.dev('[useSpecializedAgents] ✅ Agent exécuté:', agentId);
        return {
          success: true,
          result: data,
          metadata: data.metadata
        };
      } else {
        const errorMessage = data.error || `Erreur HTTP ${response.status}`;
        logger.error('[useSpecializedAgents] ❌ Erreur exécution agent:', errorMessage);
        return {
          success: false,
          error: errorMessage,
          metadata: data.metadata
        };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur de connexion';
      logger.error('[useSpecializedAgents] ❌ Erreur fatale exécution agent:', err);
      return {
        success: false,
        error: errorMessage
      };
    }
  }, []);

  /**
   * Créer un nouvel agent spécialisé
   */
  const createAgent = useCallback(async (
    config: CreateSpecializedAgentRequest
  ): Promise<CreateSpecializedAgentResponse> => {
    try {
      setError(null);

      const response = await fetch('/api/ui/agents/specialized', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Rafraîchir la liste des agents
        await refreshAgents();
        logger.dev('[useSpecializedAgents] ✅ Agent créé:', data.agent?.slug);
        return data;
      } else {
        const errorMessage = data.error || `Erreur HTTP ${response.status}`;
        logger.error('[useSpecializedAgents] ❌ Erreur création agent:', errorMessage);
        return {
          success: false,
          error: errorMessage
        };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur de connexion';
      logger.error('[useSpecializedAgents] ❌ Erreur fatale création agent:', err);
      return {
        success: false,
        error: errorMessage
      };
    }
  }, [refreshAgents]);

  /**
   * Mettre à jour un agent spécialisé
   */
  const updateAgent = useCallback(async (
    agentId: string, 
    updates: Partial<SpecializedAgentConfig>
  ): Promise<boolean> => {
    try {
      setError(null);

      const response = await fetch(`/api/ui/agents/${agentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Rafraîchir la liste des agents
        await refreshAgents();
        logger.dev('[useSpecializedAgents] ✅ Agent mis à jour:', agentId);
        return true;
      } else {
        const errorMessage = data.error || `Erreur HTTP ${response.status}`;
        setError(errorMessage);
        logger.error('[useSpecializedAgents] ❌ Erreur mise à jour agent:', errorMessage);
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur de connexion';
      setError(errorMessage);
      logger.error('[useSpecializedAgents] ❌ Erreur fatale mise à jour agent:', err);
      return false;
    }
  }, [refreshAgents]);

  /**
   * Supprimer un agent spécialisé
   */
  const deleteAgent = useCallback(async (agentId: string): Promise<boolean> => {
    try {
      setError(null);

      const response = await fetch(`/api/ui/agents/${agentId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Rafraîchir la liste des agents
        await refreshAgents();
        logger.dev('[useSpecializedAgents] ✅ Agent supprimé:', agentId);
        return true;
      } else {
        const errorMessage = data.error || `Erreur HTTP ${response.status}`;
        setError(errorMessage);
        logger.error('[useSpecializedAgents] ❌ Erreur suppression agent:', errorMessage);
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur de connexion';
      setError(errorMessage);
      logger.error('[useSpecializedAgents] ❌ Erreur fatale suppression agent:', err);
      return false;
    }
  }, [refreshAgents]);

  // Charger les agents au montage du composant
  useEffect(() => {
    refreshAgents();
  }, [refreshAgents]);

  return {
    agents,
    loading,
    error,
    executeAgent,
    createAgent,
    updateAgent,
    deleteAgent,
    refreshAgents
  };
};

/**
 * Hook pour exécuter un agent spécifique
 */
export const useAgentExecution = (agentId: string) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SpecializedAgentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (input: Record<string, unknown>) => {
    try {
      setLoading(true);
      setError(null);
      setResult(null);

      const response = await fetch(`/api/v2/agents/${agentId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input)
      });

      const data = await response.json();

      if (response.ok) {
        setResult({
          success: true,
          result: data,
          metadata: data.metadata
        });
      } else {
        const errorMessage = data.error || `Erreur HTTP ${response.status}`;
        setError(errorMessage);
        setResult({
          success: false,
          error: errorMessage,
          metadata: data.metadata
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur de connexion';
      setError(errorMessage);
      setResult({
        success: false,
        error: errorMessage
      });
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    execute,
    reset,
    loading,
    result,
    error
  };
};

/**
 * Hook pour obtenir les informations d'un agent
 */
export const useAgentInfo = (agentId: string) => {
  const [agent, setAgent] = useState<SpecializedAgentConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInfo = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/v2/agents/${agentId}`);
      const data = await response.json();

      if (response.ok) {
        setAgent(data);
      } else {
        throw new Error(data.error || `Erreur HTTP ${response.status}`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur de connexion';
      setError(errorMessage);
      logger.error('[useAgentInfo] ❌ Erreur récupération info agent:', err);
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    if (agentId) {
      fetchInfo();
    }
  }, [agentId, fetchInfo]);

  return {
    agent,
    loading,
    error,
    refetch: fetchInfo
  };
};
