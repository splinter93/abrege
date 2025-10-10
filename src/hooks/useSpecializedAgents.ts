/**
 * Hook pour la gestion des agents spécialisés
 * Production-ready avec TypeScript strict
 */

import { useState, useEffect, useCallback } from 'react';
import { SpecializedAgentConfig, CreateSpecializedAgentRequest } from '@/types/specializedAgents';
import { agentsService } from '@/services/agents/agentsService';
import { simpleLogger as logger } from '@/utils/logger';

/**
 * État du hook
 */
interface UseSpecializedAgentsState {
  agents: SpecializedAgentConfig[];
  loading: boolean;
  error: string | null;
  selectedAgent: SpecializedAgentConfig | null;
}

/**
 * Valeur de retour du hook
 */
interface UseSpecializedAgentsReturn extends UseSpecializedAgentsState {
  // Actions sur les agents
  loadAgents: () => Promise<void>;
  getAgent: (agentId: string) => Promise<SpecializedAgentConfig | null>;
  createAgent: (agentData: CreateSpecializedAgentRequest) => Promise<SpecializedAgentConfig | null>;
  updateAgent: (agentId: string, updates: Partial<SpecializedAgentConfig>) => Promise<SpecializedAgentConfig | null>;
  patchAgent: (agentId: string, updates: Partial<SpecializedAgentConfig>) => Promise<SpecializedAgentConfig | null>;
  deleteAgent: (agentId: string) => Promise<boolean>;
  selectAgent: (agent: SpecializedAgentConfig | null) => void;
  refreshAgent: (agentId: string) => Promise<void>;
}

/**
 * Hook pour gérer les agents spécialisés
 */
export function useSpecializedAgents(): UseSpecializedAgentsReturn {
  const [state, setState] = useState<UseSpecializedAgentsState>({
    agents: [],
    loading: false,
    error: null,
    selectedAgent: null,
  });

  /**
   * Charge tous les agents
   */
  const loadAgents = useCallback(async (): Promise<void> => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const agents = await agentsService.listAgents();
      setState(prev => ({
        ...prev,
        agents,
        loading: false,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors du chargement des agents';
      logger.error('useSpecializedAgents.loadAgents:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
    }
  }, []);

  /**
   * Récupère un agent spécifique
   */
  const getAgent = useCallback(async (agentId: string): Promise<SpecializedAgentConfig | null> => {
    try {
      const agent = await agentsService.getAgent(agentId);
      return agent;
    } catch (error) {
      logger.error('useSpecializedAgents.getAgent:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Erreur lors de la récupération de l\'agent',
      }));
      return null;
    }
  }, []);

  /**
   * Crée un nouvel agent
   */
  const createAgent = useCallback(async (
    agentData: CreateSpecializedAgentRequest
  ): Promise<SpecializedAgentConfig | null> => {
    setState(prev => ({ ...prev, error: null }));

    try {
      const newAgent = await agentsService.createAgent(agentData);
      
      // Ajouter le nouvel agent à la liste
      setState(prev => ({
        ...prev,
        agents: [...prev.agents, newAgent],
      }));

      return newAgent;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la création de l\'agent';
      logger.error('useSpecializedAgents.createAgent:', error);
      setState(prev => ({
        ...prev,
        error: errorMessage,
      }));
      return null;
    }
  }, []);

  /**
   * Met à jour complètement un agent (PUT)
   */
  const updateAgent = useCallback(async (
    agentId: string,
    updates: Partial<SpecializedAgentConfig>
  ): Promise<SpecializedAgentConfig | null> => {
    setState(prev => ({ ...prev, error: null }));

    try {
      const updatedAgent = await agentsService.updateAgent(agentId, updates);
      
      // Mettre à jour l'agent dans la liste
      setState(prev => ({
        ...prev,
        agents: prev.agents.map(agent =>
          agent.id === updatedAgent.id || agent.slug === agentId ? updatedAgent : agent
        ),
        selectedAgent: prev.selectedAgent?.id === updatedAgent.id ? updatedAgent : prev.selectedAgent,
      }));

      return updatedAgent;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la mise à jour de l\'agent';
      logger.error('useSpecializedAgents.updateAgent:', error);
      setState(prev => ({
        ...prev,
        error: errorMessage,
      }));
      return null;
    }
  }, []);

  /**
   * Met à jour partiellement un agent (PATCH)
   */
  const patchAgent = useCallback(async (
    agentId: string,
    updates: Partial<SpecializedAgentConfig>
  ): Promise<SpecializedAgentConfig | null> => {
    setState(prev => ({ ...prev, error: null }));

    try {
      const patchedAgent = await agentsService.patchAgent(agentId, updates);
      
      // Mettre à jour l'agent dans la liste
      setState(prev => ({
        ...prev,
        agents: prev.agents.map(agent =>
          agent.id === patchedAgent.id || agent.slug === agentId ? patchedAgent : agent
        ),
        selectedAgent: prev.selectedAgent?.id === patchedAgent.id ? patchedAgent : prev.selectedAgent,
      }));

      return patchedAgent;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la mise à jour de l\'agent';
      logger.error('useSpecializedAgents.patchAgent:', error);
      setState(prev => ({
        ...prev,
        error: errorMessage,
      }));
      return null;
    }
  }, []);

  /**
   * Supprime un agent
   */
  const deleteAgent = useCallback(async (agentId: string): Promise<boolean> => {
    setState(prev => ({ ...prev, error: null }));

    try {
      await agentsService.deleteAgent(agentId);
      
      // Retirer l'agent de la liste
      setState(prev => ({
        ...prev,
        agents: prev.agents.filter(agent => agent.id !== agentId && agent.slug !== agentId),
        selectedAgent: prev.selectedAgent?.id === agentId ? null : prev.selectedAgent,
      }));

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la suppression de l\'agent';
      logger.error('useSpecializedAgents.deleteAgent:', error);
      setState(prev => ({
        ...prev,
        error: errorMessage,
      }));
      return false;
    }
  }, []);

  /**
   * Sélectionne un agent
   */
  const selectAgent = useCallback((agent: SpecializedAgentConfig | null): void => {
    setState(prev => ({
      ...prev,
      selectedAgent: agent,
    }));
  }, []);

  /**
   * Rafraîchit un agent spécifique
   */
  const refreshAgent = useCallback(async (agentId: string): Promise<void> => {
    try {
      const agent = await agentsService.getAgent(agentId);
      
      setState(prev => ({
        ...prev,
        agents: prev.agents.map(a =>
          a.id === agent.id || a.slug === agentId ? agent : a
        ),
        selectedAgent: prev.selectedAgent?.id === agent.id ? agent : prev.selectedAgent,
      }));
    } catch (error) {
      logger.error('useSpecializedAgents.refreshAgent:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Erreur lors du rafraîchissement de l\'agent',
      }));
    }
  }, []);

  /**
   * Charge les agents au montage
   */
  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  return {
    ...state,
    loadAgents,
    getAgent,
    createAgent,
    updateAgent,
    patchAgent,
    deleteAgent,
    selectAgent,
    refreshAgent,
  };
}
