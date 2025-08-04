import { useState, useEffect } from 'react';
import { Agent } from '@/types/chat';
import { AgentService } from '@/services/agentService';

/**
 * Hook pour gérer les agents
 */
export const useAgents = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Charge tous les agents actifs
   */
  const loadAgents = async () => {
    try {
      setLoading(true);
      setError(null);
      const agentsData = await AgentService.getActiveAgents();
      setAgents(agentsData);
    } catch (err) {
      setError('Erreur lors du chargement des agents');
      console.error('Erreur useAgents.loadAgents:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Crée un nouvel agent
   */
  const createAgent = async (agentData: Omit<Agent, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const newAgent = await AgentService.createAgent(agentData);
      if (newAgent) {
        setAgents(prev => [...prev, newAgent]);
        return newAgent;
      }
      return null;
    } catch (err) {
      setError('Erreur lors de la création de l\'agent');
      console.error('Erreur useAgents.createAgent:', err);
      return null;
    }
  };

  /**
   * Met à jour un agent
   */
  const updateAgent = async (id: string, updates: Partial<Agent>) => {
    try {
      const updatedAgent = await AgentService.updateAgent(id, updates);
      if (updatedAgent) {
        setAgents(prev => prev.map(agent => 
          agent.id === id ? updatedAgent : agent
        ));
        return updatedAgent;
      }
      return null;
    } catch (err) {
      setError('Erreur lors de la mise à jour de l\'agent');
      console.error('Erreur useAgents.updateAgent:', err);
      return null;
    }
  };

  /**
   * Supprime un agent
   */
  const deleteAgent = async (id: string) => {
    try {
      const success = await AgentService.deleteAgent(id);
      if (success) {
        setAgents(prev => prev.filter(agent => agent.id !== id));
        return true;
      }
      return false;
    } catch (err) {
      setError('Erreur lors de la suppression de l\'agent');
      console.error('Erreur useAgents.deleteAgent:', err);
      return false;
    }
  };

  /**
   * Récupère un agent par son provider
   */
  const getAgentByProvider = async (provider: string) => {
    try {
      return await AgentService.getAgentByProvider(provider);
    } catch (err) {
      console.error('Erreur useAgents.getAgentByProvider:', err);
      return null;
    }
  };

  // Charger les agents au montage du composant
  useEffect(() => {
    loadAgents();
  }, []);

  return {
    agents,
    loading,
    error,
    loadAgents,
    createAgent,
    updateAgent,
    deleteAgent,
    getAgentByProvider
  };
}; 