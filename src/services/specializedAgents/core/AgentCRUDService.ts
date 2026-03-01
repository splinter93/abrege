/**
 * Service CRUD pour les agents spécialisés
 * Extrait de SpecializedAgentManager pour respecter limite 300 lignes
 */

import { createClient } from '@supabase/supabase-js';
import { simpleLogger as logger } from '@/utils/logger';
import { SchemaValidator } from '../schemaValidator';
import type {
  SpecializedAgentConfig,
  CreateSpecializedAgentRequest,
  CreateSpecializedAgentResponse,
  ValidationResult
} from '@/types/specializedAgents';
import { AgentConfigService } from './AgentConfigService';
import { AgentConfigValidator } from '../validation/AgentConfigValidator';
import { AgentUpdateService } from './AgentUpdateService';

// Configuration Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Configuration Supabase manquante: NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Service CRUD pour les agents spécialisés
 */
export class AgentCRUDService {
  private configValidator: AgentConfigValidator;
  private updateService: AgentUpdateService;

  constructor(private agentConfigService: AgentConfigService) {
    this.configValidator = new AgentConfigValidator();
    this.updateService = new AgentUpdateService(agentConfigService);
  }

  /**
   * Créer un nouvel agent spécialisé
   */
  async createSpecializedAgent(config: CreateSpecializedAgentRequest): Promise<CreateSpecializedAgentResponse> {
    try {
      logger.info(`[AgentCRUDService] 🚀 Création agent spécialisé: ${config.slug}`);

      // Validation des données
      const validation = this.validateCreateRequest(config);
      if (!validation.valid) {
        return {
          success: false,
          error: `Validation failed: ${validation.errors.join(', ')}`
        };
      }

      // Vérifier que le slug n'existe pas déjà
      const existingAgent = await this.agentConfigService.getAgentByIdOrSlug(config.slug);
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
        logger.error(`[AgentCRUDService] ❌ Erreur création agent:`, error);
        return {
          success: false,
          error: `Erreur base de données: ${error.message}`
        };
      }

      // Invalider le cache pour forcer le rechargement
      this.agentConfigService.invalidateAgentCache(config.slug);

      logger.info(`[AgentCRUDService] ✅ Agent créé: ${agent.slug}`, { agentId: agent.id });

      return {
        success: true,
        agent: agent as SpecializedAgentConfig
      };

    } catch (error) {
      logger.error(`[AgentCRUDService] ❌ Erreur création agent ${config.slug}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Supprimer un agent spécialisé
   */
  async deleteAgent(agentId: string, traceId: string): Promise<boolean> {
    try {
      logger.dev(`[AgentCRUDService] 🗑️ Suppression agent ${agentId}`, { traceId });

      // Vérifier que l'agent existe
      const existingAgent = await this.agentConfigService.getAgentByIdOrSlug(agentId);
      if (!existingAgent) {
        logger.warn(`[AgentCRUDService] ❌ Agent ${agentId} non trouvé`);
        return false;
      }

      // Supprimer de la base (soft delete en désactivant)
      const { error } = await supabase
        .from('agents')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingAgent.id);

      if (error) {
        logger.error(`[AgentCRUDService] ❌ Erreur suppression agent:`, error);
        throw new Error(`Erreur base de données: ${error.message}`);
      }

      // Invalider le cache
      this.agentConfigService.invalidateAgentCache(agentId);

      logger.dev(`[AgentCRUDService] ✅ Agent ${agentId} supprimé (désactivé)`, { traceId });

      return true;

    } catch (error) {
      logger.error(`[AgentCRUDService] ❌ Erreur suppression agent ${agentId}:`, error);
      throw error;
    }
  }

  /**
   * Lister tous les agents spécialisés
   */
  async listSpecializedAgents(): Promise<SpecializedAgentConfig[]> {
    try {
      const { data: agents, error } = await supabase
        .from('agents')
        .select('*')
        .eq('is_endpoint_agent', true)
        .eq('is_active', true)
        .order('priority', { ascending: false });

      if (error) {
        logger.error(`[AgentCRUDService] ❌ Erreur liste agents:`, error);
        return [];
      }

      return (agents || []) as SpecializedAgentConfig[];
    } catch (error) {
      logger.error(`[AgentCRUDService] ❌ Erreur fatale liste agents:`, error);
      return [];
    }
  }

  /**
   * Obtenir les informations d'un agent (pour GET)
   */
  async getAgentInfo(agentId: string): Promise<SpecializedAgentConfig | null> {
    return await this.agentConfigService.getAgentByIdOrSlug(agentId);
  }

  /**
   * Récupérer un agent par référence (ID ou slug) - alias public
   */
  async getAgentByRef(ref: string, userId: string): Promise<SpecializedAgentConfig | null> {
    return await this.agentConfigService.getAgentByIdOrSlug(ref);
  }

  /**
   * Mettre à jour complètement un agent spécialisé
   */
  async updateAgent(
    agentId: string, 
    updateData: Record<string, unknown>, 
    traceId: string
  ): Promise<SpecializedAgentConfig | null> {
    return await this.updateService.updateAgent(agentId, updateData, traceId);
  }

  /**
   * Mettre à jour partiellement un agent spécialisé
   */
  async patchAgent(
    agentId: string, 
    patchData: Record<string, unknown>, 
    traceId: string
  ): Promise<SpecializedAgentConfig | null> {
    return await this.updateService.patchAgent(agentId, patchData, traceId);
  }

  /**
   * Lister tous les agents spécialisés disponibles (tous types)
   */
  async listAgents(userId: string): Promise<SpecializedAgentConfig[]> {
    try {
      logger.dev(`[AgentCRUDService] 📋 Récupération liste des agents`, { userId });

      // Charger TOUS les agents actifs (chat + endpoint)
      const { data: agents, error } = await supabase
        .from('agents')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        logger.error(`[AgentCRUDService] ❌ Erreur récupération liste agents:`, error);
        throw new Error(`Erreur base de données: ${error.message}`);
      }

      // Même normalisation que AgentConfigService pour max_tokens (éviter valeurs différentes list vs GET)
      const toNum = (v: unknown, defaultVal: number): number => {
        if (typeof v === 'number' && !Number.isNaN(v)) return v;
        const n = typeof v === 'string' ? parseInt(v, 10) : Number(v);
        return typeof n === 'number' && !Number.isNaN(n) ? n : defaultVal;
      };
      const clampMaxTokens = (v: number) => Math.max(1, Math.min(128000, v));
      const processedAgents = (agents || []).map(agent => {
        const maxTok = toNum(agent.max_tokens, 4000);
        return {
          ...agent,
          temperature: (() => { const t = toNum(agent.temperature, 0.7); return t >= 0 && t <= 2 ? t : 0.7; })(),
          top_p: (() => { const p = toNum(agent.top_p, 1); return p >= 0 && p <= 1 ? p : 1; })(),
          max_tokens: clampMaxTokens(maxTok),
          max_completion_tokens: (() => { const c = toNum(agent.max_completion_tokens, maxTok); return clampMaxTokens(c); })(),
          priority: (() => { const pr = toNum(agent.priority, 10); return pr >= 0 && pr <= 100 ? pr : 10; })()
        };
      });

      logger.dev(`[AgentCRUDService] ✅ ${processedAgents.length} agents récupérés`, { 
        userId, 
        count: processedAgents.length 
      });

      return processedAgents as SpecializedAgentConfig[];

    } catch (error) {
      logger.error(`[AgentCRUDService] ❌ Erreur liste agents:`, error);
      throw error;
    }
  }

  /**
   * Validation de la requête de création
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
}

