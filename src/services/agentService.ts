import { supabase } from '@/supabaseClient';
import { Agent } from '@/types/chat';

/**
 * Service pour gérer les agents
 */
export class AgentService {
  /**
   * Récupère tous les agents actifs
   */
  static async getActiveAgents(): Promise<Agent[]> {
    try {
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Erreur lors de la récupération des agents:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Erreur AgentService.getActiveAgents:', error);
      return [];
    }
  }

  /**
   * Récupère un agent par son ID
   */
  static async getAgentById(id: string): Promise<Agent | null> {
    try {
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Erreur lors de la récupération de l\'agent:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Erreur AgentService.getAgentById:', error);
      return null;
    }
  }

  /**
   * Récupère un agent par son provider
   */
  static async getAgentByProvider(provider: string): Promise<Agent | null> {
    try {
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .eq('provider', provider)
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('Erreur lors de la récupération de l\'agent par provider:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Erreur AgentService.getAgentByProvider:', error);
      return null;
    }
  }

  /**
   * Crée un nouvel agent
   */
  static async createAgent(agentData: Omit<Agent, 'id' | 'created_at' | 'updated_at'>): Promise<Agent | null> {
    try {
      const { data, error } = await supabase
        .from('agents')
        .insert([agentData])
        .select()
        .single();

      if (error) {
        console.error('Erreur lors de la création de l\'agent:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Erreur AgentService.createAgent:', error);
      return null;
    }
  }

  /**
   * Met à jour un agent
   */
  static async updateAgent(id: string, updates: Partial<Agent>): Promise<Agent | null> {
    try {
      const { data, error } = await supabase
        .from('agents')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Erreur lors de la mise à jour de l\'agent:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Erreur AgentService.updateAgent:', error);
      return null;
    }
  }

  /**
   * Supprime un agent (désactive)
   */
  static async deleteAgent(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('agents')
        .update({ is_active: false })
        .eq('id', id);

      if (error) {
        console.error('Erreur lors de la suppression de l\'agent:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Erreur AgentService.deleteAgent:', error);
      return false;
    }
  }
} 