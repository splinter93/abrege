import { useState, useEffect } from 'react';
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
   * Charge tous les agents actifs
   */
  const loadAgents = async () => {
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
    } catch (err) {
      setError('Erreur lors du chargement des agents');
      logger.error('Erreur useAgents.loadAgents:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Crée un nouvel agent
   */
  const createAgent = async (agentData: Omit<Agent, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data: newAgent, error } = await supabase
        .from('agents')
        .insert(agentData)
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
      console.log('🔍 updateAgent - Début de la fonction');
      console.log('🔍 ID:', id);
      console.log('🔍 Updates:', updates);
      
      const { data: updatedAgent, error } = await supabase
        .from('agents')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      console.log('🔍 Réponse Supabase:', { data: updatedAgent, error });
        
      if (error) {
        console.error('❌ Erreur Supabase:', error);
        throw error;
      }
      
      if (updatedAgent) {
        console.log('✅ Agent mis à jour avec succès:', updatedAgent);
        setAgents(prev => prev.map(agent => 
          agent.id === id ? updatedAgent : agent
        ));
        return updatedAgent;
      }
      
      console.log('⚠️ Aucun agent retourné après mise à jour');
      return null;
    } catch (err) {
      console.error('💥 Erreur dans updateAgent:', err);
      console.error('💥 Type d\'erreur:', typeof err);
      console.error('💥 Message d\'erreur:', err instanceof Error ? err.message : 'Pas de message');
      console.error('💥 Stack trace:', err instanceof Error ? err.stack : 'Pas de stack trace');
      
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
      const { error } = await supabase
        .from('agents')
        .delete()
        .eq('id', id);
        
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
   * Récupère un agent par son provider
   */
  const getAgentByProvider = async (provider: string) => {
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
      logger.error('Erreur useAgents.getAgentByProvider:', err);
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