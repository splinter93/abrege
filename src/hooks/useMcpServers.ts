/**
 * Hook pour la gestion des serveurs MCP d'un agent
 * Production-ready avec TypeScript strict
 */

import { useState, useEffect, useCallback } from 'react';
import { McpServer, AgentMcpServerWithDetails } from '@/types/mcp';
import { mcpService } from '@/services/agents/mcpService';
import { simpleLogger as logger } from '@/utils/logger';

/**
 * État du hook
 */
interface UseMcpServersState {
  allServers: McpServer[];
  agentServers: AgentMcpServerWithDetails[];
  loading: boolean;
  error: string | null;
}

/**
 * Valeur de retour du hook
 */
interface UseMcpServersReturn extends UseMcpServersState {
  loadAllServers: () => Promise<void>;
  loadAgentServers: (agentId: string) => Promise<void>;
  linkServer: (agentId: string, serverId: string) => Promise<boolean>;
  unlinkServer: (agentId: string, serverId: string) => Promise<boolean>;
  isServerLinked: (serverId: string) => boolean;
}

/**
 * Hook pour gérer les serveurs MCP d'un agent
 */
export function useMcpServers(agentId?: string): UseMcpServersReturn {
  const [state, setState] = useState<UseMcpServersState>({
    allServers: [],
    agentServers: [],
    loading: false,
    error: null,
  });

  /**
   * Charge tous les serveurs MCP disponibles
   */
  const loadAllServers = useCallback(async (): Promise<void> => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const servers = await mcpService.listMcpServers();
      setState(prev => ({
        ...prev,
        allServers: servers,
        loading: false,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Erreur lors du chargement des serveurs MCP';
      logger.error('useMcpServers.loadAllServers:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
    }
  }, []);

  /**
   * Charge les serveurs MCP liés à un agent
   */
  const loadAgentServers = useCallback(async (targetAgentId: string): Promise<void> => {
    if (!targetAgentId || targetAgentId.trim() === '') {
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const servers = await mcpService.getAgentMcpServers(targetAgentId);
      setState(prev => ({
        ...prev,
        agentServers: servers,
        loading: false,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Erreur lors du chargement des serveurs MCP de l\'agent';
      logger.error('useMcpServers.loadAgentServers:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
    }
  }, []);

  /**
   * Lie un serveur MCP à un agent
   */
  const linkServer = useCallback(async (
    targetAgentId: string, 
    serverId: string
  ): Promise<boolean> => {
    setState(prev => ({ ...prev, error: null }));

    try {
      await mcpService.linkMcpServerToAgent({
        agent_id: targetAgentId,
        mcp_server_id: serverId,
      });

      // Recharger les serveurs de l'agent
      await loadAgentServers(targetAgentId);

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Erreur lors de la liaison du serveur MCP';
      logger.error('useMcpServers.linkServer:', error);
      setState(prev => ({
        ...prev,
        error: errorMessage,
      }));
      return false;
    }
  }, [loadAgentServers]);

  /**
   * Délie un serveur MCP d'un agent
   */
  const unlinkServer = useCallback(async (
    targetAgentId: string, 
    serverId: string
  ): Promise<boolean> => {
    setState(prev => ({ ...prev, error: null }));

    try {
      await mcpService.unlinkMcpServerFromAgent(targetAgentId, serverId);

      // Retirer le serveur de la liste
      setState(prev => ({
        ...prev,
        agentServers: prev.agentServers.filter(
          s => s.mcp_server_id !== serverId
        ),
      }));

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Erreur lors de la suppression de la liaison';
      logger.error('useMcpServers.unlinkServer:', error);
      setState(prev => ({
        ...prev,
        error: errorMessage,
      }));
      return false;
    }
  }, []);

  /**
   * Vérifie si un serveur est lié à l'agent
   */
  const isServerLinked = useCallback((serverId: string): boolean => {
    return state.agentServers.some(s => s.mcp_server_id === serverId);
  }, [state.agentServers]);

  /**
   * Charge les serveurs au montage
   */
  useEffect(() => {
    loadAllServers();
  }, [loadAllServers]);

  /**
   * Charge les serveurs de l'agent quand agentId change
   * ✅ Avec cancellation pour éviter race conditions
   */
  useEffect(() => {
    if (!agentId) {
      return;
    }

    let cancelled = false;

    const load = async () => {
      setState(prev => ({ ...prev, loading: true, error: null }));

      try {
        const servers = await mcpService.getAgentMcpServers(agentId);
        
        if (!cancelled) {
          setState(prev => ({
            ...prev,
            agentServers: servers,
            loading: false,
          }));
        }
      } catch (error) {
        if (!cancelled) {
          const errorMessage = error instanceof Error 
            ? error.message 
            : 'Erreur lors du chargement des serveurs MCP de l\'agent';
          logger.error('useMcpServers.loadAgentServers:', error);
          setState(prev => ({
            ...prev,
            loading: false,
            error: errorMessage,
          }));
        }
      }
    };

    load();

    return () => {
      cancelled = true; // ✅ Cleanup : annuler les updates si agentId change
    };
  }, [agentId]);

  return {
    ...state,
    loadAllServers,
    loadAgentServers,
    linkServer,
    unlinkServer,
    isServerLinked,
  };
}

