/**
 * Hook pour gérer les schémas OpenAPI d'un agent
 * Pattern identique à useMcpServers
 */

import { useState, useEffect, useCallback } from 'react';
import { simpleLogger as logger } from '@/utils/logger';

export interface OpenApiSchema {
  id: string;
  name: string;
  description?: string;
  version: string;
  status: string;
  api_key?: string;
  header?: string;
}

export interface AgentSchemaLink {
  id: string;
  agent_id: string;
  openapi_schema_id: string;
  openapi_schema: OpenApiSchema;
  created_at: string;
  updated_at: string;
}

export function useOpenApiSchemas(agentId?: string) {
  const [allSchemas, setAllSchemas] = useState<OpenApiSchema[]>([]);
  const [agentSchemas, setAgentSchemas] = useState<AgentSchemaLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Charger tous les schémas OpenAPI disponibles
   */
  const loadAllSchemas = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/ui/openapi-schemas');
      const data = await response.json();
      
      if (data.success) {
        setAllSchemas(data.schemas || []);
        logger.dev(`[useOpenApiSchemas] ✅ ${data.schemas?.length || 0} schémas chargés`);
      } else {
        throw new Error(data.error || 'Erreur lors du chargement des schémas');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMsg);
      logger.error('[useOpenApiSchemas] ❌ Erreur chargement schémas:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Charger les schémas liés à un agent
   */
  const loadAgentSchemas = useCallback(async (targetAgentId: string) => {
    if (!targetAgentId) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/ui/agents/${targetAgentId}/openapi-schemas`);
      const data = await response.json();
      
      if (data.success) {
        setAgentSchemas(data.schemas || []);
        logger.dev(`[useOpenApiSchemas] ✅ ${data.schemas?.length || 0} schémas liés à l'agent ${targetAgentId}`);
      } else {
        throw new Error(data.error || 'Erreur lors du chargement des schémas de l\'agent');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMsg);
      logger.error('[useOpenApiSchemas] ❌ Erreur chargement schémas agent:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Lier un schéma à un agent
   */
  const linkSchema = useCallback(async (targetAgentId: string, schemaId: string) => {
    try {
      const response = await fetch(`/api/ui/agents/${targetAgentId}/openapi-schemas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schema_id: schemaId })
      });

      const data = await response.json();
      
      if (data.success) {
        logger.dev(`[useOpenApiSchemas] ✅ Schéma ${schemaId} lié à l'agent ${targetAgentId}`);
        // Recharger les schémas de l'agent
        await loadAgentSchemas(targetAgentId);
      } else {
        throw new Error(data.error || 'Erreur lors de la liaison du schéma');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMsg);
      logger.error('[useOpenApiSchemas] ❌ Erreur liaison schéma:', err);
      throw err;
    }
  }, [loadAgentSchemas]);

  /**
   * Délier un schéma d'un agent
   */
  const unlinkSchema = useCallback(async (targetAgentId: string, schemaId: string) => {
    try {
      const response = await fetch(`/api/ui/agents/${targetAgentId}/openapi-schemas/${schemaId}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      
      if (data.success) {
        logger.dev(`[useOpenApiSchemas] ✅ Schéma ${schemaId} délié de l'agent ${targetAgentId}`);
        // Recharger les schémas de l'agent
        await loadAgentSchemas(targetAgentId);
      } else {
        throw new Error(data.error || 'Erreur lors de la suppression du schéma');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMsg);
      logger.error('[useOpenApiSchemas] ❌ Erreur suppression schéma:', err);
      throw err;
    }
  }, [loadAgentSchemas]);

  /**
   * Vérifier si un schéma est lié à l'agent
   */
  const isSchemaLinked = useCallback((schemaId: string) => {
    return agentSchemas.some(link => link.openapi_schema_id === schemaId);
  }, [agentSchemas]);

  /**
   * Charger tous les schémas au montage
   */
  useEffect(() => {
    loadAllSchemas();
  }, [loadAllSchemas]);

  /**
   * Charger les schémas de l'agent quand l'agentId change
   * ✅ Avec AbortController pour éviter race conditions
   */
  useEffect(() => {
    if (!agentId) {
      setAgentSchemas([]);
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/ui/agents/${agentId}/openapi-schemas`);
        
        if (cancelled) return; // ✅ Évite race condition
        
        const data = await response.json();
        
        if (data.success && !cancelled) {
          setAgentSchemas(data.schemas || []);
          logger.dev(`[useOpenApiSchemas] ✅ ${data.schemas?.length || 0} schémas liés à l'agent ${agentId}`);
        }
      } catch (err) {
        if (!cancelled) {
          const errorMsg = err instanceof Error ? err.message : 'Erreur inconnue';
          setError(errorMsg);
          logger.error('[useOpenApiSchemas] ❌ Erreur chargement schémas agent:', err);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true; // ✅ Cleanup : annuler les updates si agentId change
    };
  }, [agentId]);

  return {
    allSchemas,
    agentSchemas,
    loading,
    error,
    linkSchema,
    unlinkSchema,
    isSchemaLinked,
    loadAgentSchemas,
    loadAllSchemas
  };
}

