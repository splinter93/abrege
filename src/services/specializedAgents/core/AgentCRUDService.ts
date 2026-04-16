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
import { isPlatformAgentRow } from '@/constants/platformAgents';
import { AgentAccessDeniedError } from '@/services/specializedAgents/AgentAccessDeniedError';

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
   * Créer un nouvel agent spécialisé (rattaché au compte propriétaire).
   */
  async createSpecializedAgent(
    config: CreateSpecializedAgentRequest,
    ownerUserId: string,
  ): Promise<CreateSpecializedAgentResponse> {
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
        user_id: ownerUserId,
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
        // 23505 = unique_violation (race condition : deux créations simultanées du même slug)
        if (error.code === '23505') {
          logger.warn(`[AgentCRUDService] ⚠️ Slug '${config.slug}' déjà pris (race condition)`, { code: error.code });
          return { success: false, error: `Le slug '${config.slug}' est déjà utilisé` };
        }
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
   * Supprimer un agent spécialisé définitivement (hard delete)
   * Les FK agent_mcp_servers et agent_callables sont en CASCADE, editor_prompts en SET NULL
   */
  async deleteAgent(agentId: string, traceId: string, requesterUserId: string): Promise<boolean> {
    try {
      logger.dev(`[AgentCRUDService] 🗑️ Suppression définitive agent ${agentId}`, { traceId });

      const existingAgent = await this.agentConfigService.getAgentByIdOrSlug(agentId);
      if (!existingAgent) {
        logger.warn(`[AgentCRUDService] ❌ Agent ${agentId} non trouvé`);
        return false;
      }

      const ownerId = (existingAgent as { user_id?: string | null }).user_id ?? null;
      if (isPlatformAgentRow(existingAgent as { is_platform?: boolean })) {
        throw new AgentAccessDeniedError('Les agents plateforme ne sont pas supprimables');
      }
      if (ownerId !== requesterUserId) {
        throw new AgentAccessDeniedError();
      }

      const { error } = await supabase
        .from('agents')
        .delete()
        .eq('id', existingAgent.id);

      if (error) {
        logger.error(`[AgentCRUDService] ❌ Erreur suppression agent:`, error);
        throw new Error(`Erreur base de données: ${error.message}`);
      }

      this.agentConfigService.invalidateAgentCache(agentId);

      logger.dev(`[AgentCRUDService] ✅ Agent ${agentId} supprimé définitivement`, { traceId });

      return true;
    } catch (error) {
      logger.error(`[AgentCRUDService] ❌ Erreur suppression agent ${agentId}:`, error);
      throw error;
    }
  }

  /**
   * Agents endpoint seedés plateforme (OpenAPI public, sans compte).
   */
  async listPublicSpecializedEndpointAgents(): Promise<SpecializedAgentConfig[]> {
    try {
      const { data: agents, error } = await supabase
        .from('agents')
        .select('*')
        .eq('is_platform', true)
        .eq('is_endpoint_agent', true)
        .eq('is_active', true)
        .order('priority', { ascending: false });

      if (error) {
        logger.error(`[AgentCRUDService] ❌ Erreur liste agents publics:`, error);
        return [];
      }

      return (agents || []) as SpecializedAgentConfig[];
    } catch (error) {
      logger.error(`[AgentCRUDService] ❌ Erreur fatale liste agents publics:`, error);
      return [];
    }
  }

  /**
   * Agents endpoint : les vôtres + les agents plateforme (is_platform = true).
   */
  async listSpecializedAgentsForUser(userId: string): Promise<SpecializedAgentConfig[]> {
    try {
      const [ownRes, platRes] = await Promise.all([
        supabase
          .from('agents')
          .select('*')
          .eq('user_id', userId)
          .eq('is_endpoint_agent', true)
          .eq('is_active', true)
          .order('priority', { ascending: false }),
        supabase
          .from('agents')
          .select('*')
          .eq('is_platform', true)
          .eq('is_endpoint_agent', true)
          .eq('is_active', true)
          .order('priority', { ascending: false }),
      ]);

      if (ownRes.error) {
        logger.error(`[AgentCRUDService] ❌ Erreur liste agents user:`, ownRes.error);
        return [];
      }
      if (platRes.error) {
        logger.error(`[AgentCRUDService] ❌ Erreur liste agents plateforme:`, platRes.error);
        return (ownRes.data || []) as SpecializedAgentConfig[];
      }

      const byId = new Map<string, SpecializedAgentConfig>();
      for (const a of [...(ownRes.data || []), ...(platRes.data || [])]) {
        byId.set(a.id, a as SpecializedAgentConfig);
      }
      return [...byId.values()].sort(
        (a, b) => (b.priority ?? 0) - (a.priority ?? 0),
      );
    } catch (error) {
      logger.error(`[AgentCRUDService] ❌ Erreur fatale liste agents spécialisés user:`, error);
      return [];
    }
  }

  /**
   * @deprecated Utiliser listPublicSpecializedEndpointAgents ou listSpecializedAgentsForUser
   */
  async listSpecializedAgents(): Promise<SpecializedAgentConfig[]> {
    return this.listPublicSpecializedEndpointAgents();
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
    traceId: string,
    requesterUserId: string,
  ): Promise<SpecializedAgentConfig | null> {
    return await this.updateService.updateAgent(agentId, updateData, traceId, requesterUserId);
  }

  /**
   * Mettre à jour partiellement un agent spécialisé
   */
  async patchAgent(
    agentId: string, 
    patchData: Record<string, unknown>, 
    traceId: string,
    requesterUserId: string,
  ): Promise<SpecializedAgentConfig | null> {
    return await this.updateService.patchAgent(agentId, patchData, traceId, requesterUserId);
  }

  /**
   * Lister tous les agents spécialisés disponibles (tous types).
   * @param includeInactive - si true, inclut les agents inactifs (pour la page de gestion)
   */
  async listAgents(userId: string, includeInactive = false): Promise<SpecializedAgentConfig[]> {
    try {
      logger.dev(`[AgentCRUDService] 📋 Récupération liste des agents`, { userId, includeInactive });

      let ownQuery = supabase
        .from('agents')
        .select('*')
        .eq('user_id', userId)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });
      if (!includeInactive) {
        ownQuery = ownQuery.eq('is_active', true);
      }

      let platformQuery = supabase
        .from('agents')
        .select('*')
        .eq('is_platform', true)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });
      if (!includeInactive) {
        platformQuery = platformQuery.eq('is_active', true);
      }

      const [ownRes, platRes] = await Promise.all([ownQuery, platformQuery]);

      if (ownRes.error) {
        logger.error(`[AgentCRUDService] ❌ Erreur récupération agents utilisateur:`, ownRes.error);
        throw new Error(`Erreur base de données: ${ownRes.error.message}`);
      }
      if (platRes.error) {
        logger.error(`[AgentCRUDService] ❌ Erreur récupération agents plateforme:`, platRes.error);
        throw new Error(`Erreur base de données: ${platRes.error.message}`);
      }

      const byId = new Map<string, Record<string, unknown>>();
      for (const row of [
        ...(ownRes.data || []),
        ...(platRes.data || []),
      ]) {
        byId.set(row.id as string, row as Record<string, unknown>);
      }
      const merged = [...byId.values()];
      const processedAgents = this.normalizeAgentsListRows(merged);

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

  private normalizeAgentsListRows(agents: Record<string, unknown>[]): SpecializedAgentConfig[] {
    const toNum = (v: unknown, defaultVal: number): number => {
      if (typeof v === 'number' && !Number.isNaN(v)) return v;
      const n = typeof v === 'string' ? parseInt(v, 10) : Number(v);
      return typeof n === 'number' && !Number.isNaN(n) ? n : defaultVal;
    };
    const clampMaxTokens = (v: number) => Math.max(1, Math.min(128000, v));
    return agents.map((agent) => {
      const maxTok = toNum(agent.max_tokens, 4000);
      return {
        ...agent,
        temperature: (() => { const t = toNum(agent.temperature, 0.7); return t >= 0 && t <= 2 ? t : 0.7; })(),
        top_p: (() => { const p = toNum(agent.top_p, 1); return p >= 0 && p <= 1 ? p : 1; })(),
        max_tokens: clampMaxTokens(maxTok),
        max_completion_tokens: (() => { const c = toNum(agent.max_completion_tokens, maxTok); return clampMaxTokens(c); })(),
        priority: (() => { const pr = toNum(agent.priority, 10); return pr >= 0 && pr <= 100 ? pr : 10; })()
      };
    }) as unknown as SpecializedAgentConfig[];
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

