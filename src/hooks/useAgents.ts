import { useState, useEffect, useCallback } from 'react';
import { Agent } from '@/types/chat';
import { supabase } from '@/supabaseClient';

import { simpleLogger as logger } from '@/utils/logger';

/**
 * Hook pour gérer les agents
 */
export const useAgents = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Charge tous les agents actifs de type chat uniquement
   * (pour la sidebar du chat)
   */
  const loadAgents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();
      if (userErr || !user?.id) {
        setAgents([]);
        return;
      }

      // RLS filtre automatiquement : user_id = auth.uid() OU is_platform = true
      const { data: agentsData, error } = await supabase
        .from('agents')
        .select('*')
        .eq('is_active', true)
        .eq('is_chat_agent', true)
        .order('priority', { ascending: false });
        
      if (error) throw error;
      setAgents(agentsData || []);
    } catch (err) {
      setError('Erreur lors du chargement des agents');
      logger.error('Erreur useAgents.loadAgents:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Crée un nouvel agent
   */
  const createAgent = async (agentData: Omit<Agent, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();
      if (userErr || !user?.id) {
        setError('Authentification requise pour créer un agent');
        return null;
      }

      const { data: newAgent, error } = await supabase
        .from('agents')
        .insert({ ...agentData, user_id: user.id })
        .select()
        .single();
        
      if (error) throw error;
      if (newAgent) {
        setAgents(prev => [...prev, newAgent]);
        return newAgent;
      }
      return null;
    } catch (err) {
      setError('Erreur lors de la création de l\'agent');
      logger.error('Erreur useAgents.createAgent:', err);
      return null;
    }
  };

  /**
   * Met à jour un agent
   */
  const updateAgent = async (id: string, updates: Partial<Agent>) => {
    try {
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();
      if (userErr || !user?.id) return null;

      const { data: updatedAgent, error } = await supabase
        .from('agents')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();
        
      if (error) throw error;
      
      if (updatedAgent) {
        setAgents(prev => prev.map(agent => 
          agent.id === id ? updatedAgent : agent
        ));
        return updatedAgent;
      }
      
      return null;
    } catch (err) {
      setError('Erreur lors de la mise à jour de l\'agent');
      logger.error('Erreur useAgents.updateAgent:', err);
      return null;
    }
  };

  /**
   * Supprime un agent
   */
  const deleteAgent = async (id: string) => {
    try {
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();
      if (userErr || !user?.id) return false;

      const { error } = await supabase
        .from('agents')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
        
      if (error) throw error;
      setAgents(prev => prev.filter(agent => agent.id !== id));
      return true;
    } catch (err) {
      setError('Erreur lors de la suppression de l\'agent');
      logger.error('Erreur useAgents.deleteAgent:', err);
      return false;
    }
  };

  /**
   * Récupère un agent de type chat par son provider
   */
  const getAgentByProvider = async (provider: string) => {
    try {
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();
      if (userErr || !user?.id) return null;

      // RLS filtre automatiquement : user_id = auth.uid() OU is_platform = true
      const { data: agent, error } = await supabase
        .from('agents')
        .select('*')
        .eq('provider', provider)
        .eq('is_active', true)
        .eq('is_chat_agent', true)
        .limit(1)
        .maybeSingle();
        
      if (error) throw error;
      return agent;
    } catch (err) {
      logger.error('Erreur useAgents.getAgentByProvider:', err);
      return null;
    }
  };

  useEffect(() => {
    void loadAgents();
  }, [loadAgents]);

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