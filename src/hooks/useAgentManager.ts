import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/supabaseClient';
import { Agent } from '@/types/chat';
import { simpleLogger as logger } from '@/utils/logger';

interface UseAgentManagerReturn {
  agents: Agent[];
  loading: boolean;
  error: string | null;
  selectedAgent: Agent | null;
  loadAgents: () => Promise<void>;
  createAgent: (agentData: Omit<Agent, 'id' | 'created_at' | 'updated_at'>) => Promise<Agent | null>;
  updateAgent: (id: string, updates: Partial<Agent>) => Promise<boolean>;
  deleteAgent: (id: string) => Promise<boolean>;
  getAgentByProvider: (provider: string) => Promise<Agent | null>;
  selectAgent: (agent: Agent | null) => void;
  restoreSelectedAgent: (agentId: string) => Promise<boolean>;
}

/**
 * Hook optimisé pour la gestion des agents
 * Centralise la logique de gestion des agents avec cache et optimisations
 */
export const useAgentManager = (): UseAgentManagerReturn => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  /**
   * Charger tous les agents actifs avec cache
   */
  const loadAgents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data: agentsData, error } = await supabase
        .from('agents')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: false });
        
      if (error) throw error;
      
      setAgents(agentsData || []);
      logger.dev('[useAgentManager] ✅ Agents chargés:', agentsData?.length || 0);
      
    } catch (err) {
      const errorMessage = 'Erreur lors du chargement des agents';
      setError(errorMessage);
      logger.error('[useAgentManager] ❌ Erreur loadAgents:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Créer un nouvel agent
   */
  const createAgent = useCallback(async (agentData: Omit<Agent, 'id' | 'created_at' | 'updated_at'>): Promise<Agent | null> => {
    try {
      const { data: newAgent, error } = await supabase
        .from('agents')
        .insert(agentData)
        .select()
        .single();
        
      if (error) throw error;
      
      if (newAgent) {
        setAgents(prev => [...prev, newAgent]);
        logger.dev('[useAgentManager] ✅ Agent créé:', newAgent.name);
        return newAgent;
      }
      
      return null;
    } catch (err) {
      const errorMessage = 'Erreur lors de la création de l\'agent';
      setError(errorMessage);
      logger.error('[useAgentManager] ❌ Erreur createAgent:', err);
      return null;
    }
  }, []);

  /**
   * Mettre à jour un agent
   */
  const updateAgent = useCallback(async (id: string, updates: Partial<Agent>): Promise<boolean> => {
    try {
      const { data: updatedAgent, error } = await supabase
        .from('agents')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
        
      if (error) throw error;
      
      if (updatedAgent) {
        setAgents(prev => prev.map(agent => 
          agent.id === id ? { ...agent, ...updatedAgent } : agent
        ));
        
        // Mettre à jour l'agent sélectionné si nécessaire
        if (selectedAgent?.id === id) {
          setSelectedAgent(prev => prev ? { ...prev, ...updatedAgent } : null);
        }
        
        logger.dev('[useAgentManager] ✅ Agent mis à jour:', updatedAgent.name);
        return true;
      }
      
      return false;
    } catch (err) {
      const errorMessage = 'Erreur lors de la mise à jour de l\'agent';
      setError(errorMessage);
      logger.error('[useAgentManager] ❌ Erreur updateAgent:', err);
      return false;
    }
  }, [selectedAgent]);

  /**
   * Supprimer un agent
   */
  const deleteAgent = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('agents')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      setAgents(prev => prev.filter(agent => agent.id !== id));
      
      // Désélectionner l'agent si c'était celui sélectionné
      if (selectedAgent?.id === id) {
        setSelectedAgent(null);
      }
      
      logger.dev('[useAgentManager] ✅ Agent supprimé:', id);
      return true;
    } catch (err) {
      const errorMessage = 'Erreur lors de la suppression de l\'agent';
      setError(errorMessage);
      logger.error('[useAgentManager] ❌ Erreur deleteAgent:', err);
      return false;
    }
  }, [selectedAgent]);

  /**
   * Récupérer un agent par son provider
   */
  const getAgentByProvider = useCallback(async (provider: string): Promise<Agent | null> => {
    try {
      const { data: agent, error } = await supabase
        .from('agents')
        .select('*')
        .eq('provider', provider)
        .eq('is_active', true)
        .single();
        
      if (error) throw error;
      return agent;
    } catch (err) {
      logger.error('[useAgentManager] ❌ Erreur getAgentByProvider:', err);
      return null;
    }
  }, []);

  /**
   * Sélectionner un agent
   */
  const selectAgent = useCallback((agent: Agent | null) => {
    setSelectedAgent(agent);
    logger.dev('[useAgentManager] 🎯 Agent sélectionné:', agent?.name || 'Aucun');
  }, []);

  /**
   * Restaurer un agent sélectionné depuis son ID
   */
  const restoreSelectedAgent = useCallback(async (agentId: string): Promise<boolean> => {
    try {
      logger.dev('[useAgentManager] 🔄 Restauration agent avec ID:', agentId);
      
      const { data: agent, error } = await supabase
        .from('agents')
        .select('*')
        .eq('id', agentId)
        .single();
        
      if (error) throw error;
      
      if (agent) {
        setSelectedAgent(agent);
        logger.dev('[useAgentManager] ✅ Agent restauré:', agent.name);
        return true;
      } else {
        logger.dev('[useAgentManager] ⚠️ Agent non trouvé, suppression de l\'ID');
        return false;
      }
    } catch (error) {
      logger.error('[useAgentManager] ❌ Erreur restauration agent:', error);
      return false;
    }
  }, []);

  // Charger les agents au montage
  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  return {
    agents,
    loading,
    error,
    selectedAgent,
    loadAgents,
    createAgent,
    updateAgent,
    deleteAgent,
    getAgentByProvider,
    selectAgent,
    restoreSelectedAgent
  };
}; 