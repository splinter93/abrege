/**
 * CRUD pour les agents spécialisés
 * Extrait de SpecializedAgentManager pour respecter limite 300 lignes
 */

import { createClient } from '@supabase/supabase-js';
import { simpleLogger as logger } from '@/utils/logger';
import { SchemaValidator } from '../schemaValidator';
import { AgentConfig } from './AgentConfig';
import { omitNonPersistedAgentFields } from './agentPersistence';
import type { 
  SpecializedAgentConfig, 
  CreateSpecializedAgentRequest, 
  CreateSpecializedAgentResponse,
  ValidationResult
} from '@/types/specializedAgents';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export class AgentCRUD {
  private agentConfig: AgentConfig;

  constructor(agentConfig: AgentConfig) {
    this.agentConfig = agentConfig;
  }

  /**
   * Créer un nouvel agent spécialisé
   */
  async createAgent(config: CreateSpecializedAgentRequest): Promise<CreateSpecializedAgentResponse> {
    try {
      logger.info(`[AgentCRUD] 🚀 Création agent spécialisé: ${config.slug}`);

      // Validation
      const validation = this.validateCreateRequest(config);
      if (!validation.valid) {
        return {
          success: false,
          error: `Validation failed: ${validation.errors.join(', ')}`
        };
      }

      // Vérifier que le slug n'existe pas déjà
      const existingAgent = await this.agentConfig.getAgentByIdOrSlug(config.slug);
      if (existingAgent) {
        return {
          success: false,
          error: `Agent avec le slug '${config.slug}' existe déjà`
        };
      }

      // Préparer les données d'insertion
      const agentData = {
        name: config.name || config.display_name,
        slug: config.slug,
        display_name: config.display_name,
        description: config.description,
        model: config.model,
        provider: config.provider || 'groq',
        system_instructions: config.system_instructions,
        is_endpoint_agent: true,
        is_chat_agent: config.is_chat_agent || false,
        is_active: true,
        priority: 10,
        temperature: config.temperature || 0.7,
        max_tokens: config.max_tokens || 4000,
        capabilities: ['text', 'function_calling'],
        api_v2_capabilities: config.api_v2_capabilities || ['get_note', 'update_note', 'search_notes'],
        input_schema: config.input_schema || null,
        output_schema: config.output_schema || null
      };

      // Insérer en base
      const { data: agent, error } = await supabase
        .from('agents')
        .insert(agentData)
        .select()
        .single();

      if (error) {
        logger.error(`[AgentCRUD] ❌ Erreur création agent:`, error);
        return {
          success: false,
          error: `Erreur lors de la création: ${error.message}`
        };
      }

      // Invalider le cache
      this.agentConfig.invalidateCache(config.slug);

      logger.info(`[AgentCRUD] ✅ Agent spécialisé créé: ${config.slug}`);

      return {
        success: true,
        agent: agent as SpecializedAgentConfig,
        endpoint: `/api/v2/agents/${config.slug}`
      };

    } catch (error) {
      logger.error(`[AgentCRUD] ❌ Erreur fatale création agent:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur interne du serveur'
      };
    }
  }

  /**
   * Valider une requête de création d'agent
   */
  private validateCreateRequest(config: CreateSpecializedAgentRequest): ValidationResult {
    const errors: string[] = [];

    if (!config.slug || !config.slug.match(/^[a-z0-9-]+$/)) {
      errors.push('Slug requis et doit contenir uniquement des lettres minuscules, chiffres et tirets');
    }

    if (!config.display_name || config.display_name.trim().length === 0) {
      errors.push('Nom d\'affichage requis');
    }

    if (!config.model || config.model.trim().length === 0) {
      errors.push('Modèle requis');
    }

    if (!config.system_instructions || config.system_instructions.trim().length === 0) {
      errors.push('Instructions système requises');
    }

    // Valider les schémas si fournis
    if (config.input_schema) {
      const schemaValidation = SchemaValidator.validateSchema(config.input_schema);
      if (!schemaValidation.valid) {
        errors.push(`Schéma d'entrée invalide: ${schemaValidation.errors.map(e => e.message).join(', ')}`);
      }
    }

    if (config.output_schema) {
      const schemaValidation = SchemaValidator.validateSchema(config.output_schema);
      if (!schemaValidation.valid) {
        errors.push(`Schéma de sortie invalide: ${schemaValidation.errors.map(e => e.message).join(', ')}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Lister tous les agents spécialisés
   */
  async listAgents(userId: string): Promise<SpecializedAgentConfig[]> {
    try {
      logger.dev(`[AgentCRUD] 📋 Récupération liste des agents`, { userId });

      const { data: agents, error } = await supabase
        .from('agents')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        logger.error(`[AgentCRUD] ❌ Erreur récupération liste agents:`, error);
        throw new Error(`Erreur base de données: ${error.message}`);
      }

      // Convertir les types numériques
      const processedAgents = (agents || []).map(agent => {
        const processed = {
          ...agent,
          temperature: typeof agent.temperature === 'string' ? parseFloat(agent.temperature) : agent.temperature,
          top_p: typeof agent.top_p === 'string' ? parseFloat(agent.top_p) : agent.top_p,
          max_tokens: typeof agent.max_tokens === 'string' ? parseInt(agent.max_tokens) : agent.max_tokens,
          priority: typeof agent.priority === 'string' ? parseInt(agent.priority) : agent.priority
        };
        // max_completion_tokens n'existe pas dans SpecializedAgentConfig, mais peut exister dans la DB
        // On le garde si présent mais ne le typons pas
        if ('max_completion_tokens' in agent) {
          (processed as unknown as { max_completion_tokens?: number }).max_completion_tokens = 
            typeof (agent as { max_completion_tokens?: unknown }).max_completion_tokens === 'string' 
              ? parseInt((agent as { max_completion_tokens: string }).max_completion_tokens) 
              : (agent as { max_completion_tokens?: number }).max_completion_tokens;
        }
        return processed;
      });

      logger.dev(`[AgentCRUD] ✅ ${processedAgents.length} agents récupérés`, { 
        userId, 
        count: processedAgents.length 
      });

      return processedAgents as SpecializedAgentConfig[];

    } catch (error) {
      logger.error(`[AgentCRUD] ❌ Erreur liste agents:`, error);
      throw error;
    }
  }

  /**
   * Mettre à jour un agent
   */
  async updateAgent(
    agentId: string, 
    updateData: Record<string, unknown>, 
    traceId: string
  ): Promise<SpecializedAgentConfig | null> {
    try {
      logger.dev(`[AgentCRUD] 🔄 Mise à jour complète agent ${agentId}`, { traceId });

      const existingAgent = await this.agentConfig.getAgentByIdOrSlug(agentId);
      if (!existingAgent) {
        logger.warn(`[AgentCRUD] ❌ Agent ${agentId} non trouvé`);
        return null;
      }

      // Détecter changement de nom et régénérer le slug
      const nameChanged = (
        (updateData.display_name && updateData.display_name !== existingAgent.display_name) ||
        (updateData.name && updateData.name !== existingAgent.name)
      );

      if (nameChanged) {
        const newName = (updateData.display_name || updateData.name) as string;
        const newSlug = await this.agentConfig.generateAgentSlug(newName, existingAgent.id);
        updateData.slug = newSlug;
      }

      const updatePayload = omitNonPersistedAgentFields({
        ...updateData,
        updated_at: new Date().toISOString()
      });

      const { data: updatedAgent, error } = await supabase
        .from('agents')
        .update(updatePayload)
        .eq('id', existingAgent.id)
        .select()
        .single();

      if (error) {
        logger.error(`[AgentCRUD] ❌ Erreur mise à jour agent:`, error);
        throw new Error(`Erreur base de données: ${error.message}`);
      }

      this.agentConfig.invalidateCache(agentId);
      if (nameChanged && updateData.slug) {
        this.agentConfig.invalidateCache(existingAgent.slug);
      }

      logger.dev(`[AgentCRUD] ✅ Agent ${agentId} mis à jour`, { traceId });
      return updatedAgent as SpecializedAgentConfig;

    } catch (error) {
      logger.error(`[AgentCRUD] ❌ Erreur mise à jour agent ${agentId}:`, error);
      throw error;
    }
  }

  /**
   * Mettre à jour partiellement un agent
   */
  async patchAgent(
    agentId: string, 
    patchData: Record<string, unknown>, 
    traceId: string
  ): Promise<SpecializedAgentConfig | null> {
    try {
      logger.dev(`[AgentCRUD] 🔧 Mise à jour partielle agent ${agentId}`, { traceId });

      const existingAgent = await this.agentConfig.getAgentByIdOrSlug(agentId);
      if (!existingAgent) {
        logger.warn(`[AgentCRUD] ❌ Agent ${agentId} non trouvé`);
        return null;
      }

      // Détecter changement de nom
      const nameChanged = (
        (patchData.display_name && patchData.display_name !== existingAgent.display_name) ||
        (patchData.name && patchData.name !== existingAgent.name)
      );

      if (nameChanged) {
        const newName = (patchData.display_name || patchData.name) as string;
        const newSlug = await this.agentConfig.generateAgentSlug(newName, existingAgent.id);
        patchData.slug = newSlug;
      }

      // Auto-corriger le provider si le modèle change
      const modelChanged = (
        patchData.model && 
        typeof patchData.model === 'string' && 
        patchData.model !== existingAgent.model
      );

      if (modelChanged) {
        const newModel = patchData.model as string;
        let deducedProvider: string;
        if (newModel.includes('grok')) {
          deducedProvider = 'xai';
        } else if (newModel.includes('openai/') || newModel.includes('llama') || newModel.includes('mixtral')) {
          deducedProvider = 'groq';
        } else {
          deducedProvider = 'groq';
        }
        
        if (existingAgent.provider !== deducedProvider) {
          patchData.provider = deducedProvider;
        }
      }

      const mergedData = {
        ...existingAgent,
        ...patchData,
        updated_at: new Date().toISOString()
      };

      const persistPayload = omitNonPersistedAgentFields(
        mergedData as Record<string, unknown>
      );

      const { data: updatedAgent, error } = await supabase
        .from('agents')
        .update(persistPayload)
        .eq('id', existingAgent.id)
        .select()
        .single();

      if (error) {
        logger.error(`[AgentCRUD] ❌ Erreur patch agent:`, error);
        throw new Error(`Erreur base de données: ${error.message}`);
      }

      this.agentConfig.invalidateCache(agentId);
      if (nameChanged && patchData.slug) {
        this.agentConfig.invalidateCache(existingAgent.slug);
      }

      logger.dev(`[AgentCRUD] ✅ Agent ${agentId} patché`, { traceId });
      return updatedAgent as SpecializedAgentConfig;

    } catch (error) {
      logger.error(`[AgentCRUD] ❌ Erreur patch agent ${agentId}:`, error);
      throw error;
    }
  }

  /**
   * Supprimer un agent (soft delete)
   */
  async deleteAgent(agentId: string, traceId: string): Promise<boolean> {
    try {
      logger.dev(`[AgentCRUD] 🗑️ Suppression agent ${agentId}`, { traceId });

      const existingAgent = await this.agentConfig.getAgentByIdOrSlug(agentId);
      if (!existingAgent) {
        logger.warn(`[AgentCRUD] ❌ Agent ${agentId} non trouvé`);
        return false;
      }

      // Soft delete en désactivant
      const { error } = await supabase
        .from('agents')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingAgent.id);

      if (error) {
        logger.error(`[AgentCRUD] ❌ Erreur suppression agent:`, error);
        throw new Error(`Erreur base de données: ${error.message}`);
      }

      // Invalider le cache
      this.agentConfig.invalidateCache(agentId);

      logger.dev(`[AgentCRUD] ✅ Agent ${agentId} supprimé (désactivé)`, { traceId });
      return true;

    } catch (error) {
      logger.error(`[AgentCRUD] ❌ Erreur suppression agent ${agentId}:`, error);
      throw error;
    }
  }
}

