/**
 * SpecializedAgentManager V2 - Architecture propre et robuste
 * Orchestration des agents spécialisés avec séparation des responsabilités
 */

import { createClient } from '@supabase/supabase-js';
import { 
  AgentId, 
  UserToken, 
  SessionId, 
  AgentInput, 
  AgentResponse, 
  AgentMetadata,
  SpecializedAgentConfig,
  CreateSpecializedAgentRequest,
  CreateSpecializedAgentResponse,
  ExecutionContext,
  OpenAPISchema
} from './types/AgentTypes';
import { AgentValidator } from './services/AgentValidator';
import { AgentCache } from './services/AgentCache';
import { AgentExecutor } from './services/AgentExecutor';
import { AgentFormatter } from './services/AgentFormatter';
import { AgentErrorHandler } from './services/AgentErrorHandler';
import { simpleLogger as logger } from '@/utils/logger';

// Configuration Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Configuration Supabase manquante: NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Manager principal des agents spécialisés - Version 2
 * Architecture propre avec séparation des responsabilités
 */
export class SpecializedAgentManagerV2 {
  private readonly cache: AgentCache;
  private readonly executor: AgentExecutor;
  private readonly validator: typeof AgentValidator;
  private readonly formatter: typeof AgentFormatter;
  private readonly errorHandler: typeof AgentErrorHandler;

  constructor() {
    this.cache = new AgentCache();
    this.executor = new AgentExecutor();
    this.validator = AgentValidator;
    this.formatter = AgentFormatter;
    this.errorHandler = AgentErrorHandler;
  }

  /**
   * Exécute un agent spécialisé
   */
  async executeSpecializedAgent(
    agentId: string,
    input: Record<string, unknown>,
    userToken: string,
    sessionId?: string
  ): Promise<AgentResponse> {
    const traceId = `agent-${agentId}-${Date.now()}`;
    const startTime = Date.now();

    try {
      // 1. Validation des entrées
      const validationResult = this.validateInputs(agentId, input, userToken, sessionId);
      if (!validationResult.valid) {
        return this.formatter.createErrorResponse(
          `Validation échouée: ${validationResult.errors.join(', ')}`,
          this.createMetadata(agentId, startTime, 'unknown', traceId)
        );
      }

      // 2. Récupération de l'agent
      const agent = await this.getAgent(validationResult.agentId!);
      if (!agent) {
        return this.formatter.createErrorResponse(
          `Agent ${agentId} non trouvé`,
          this.createMetadata(agentId, startTime, 'unknown', traceId)
        );
      }

      // 3. Création du contexte d'exécution
      const context: ExecutionContext = {
        agentId: validationResult.agentId!,
        input: validationResult.validatedInput!,
        userToken: validationResult.userToken!,
        sessionId: validationResult.sessionId,
        traceId
      };

      // 4. Exécution de l'agent
      const executionResult = await this.executor.execute(agent, context);

      // 5. Formatage de la réponse
      const metadata = this.createMetadata(
        agentId, 
        startTime, 
        agent.model, 
        traceId, 
        executionResult.isMultimodal
      );

      return this.formatter.formatResponse(executionResult, agent, metadata);

    } catch (error) {
      const agentError = this.errorHandler.createError(error, {
        agentId,
        traceId,
        operation: 'executeSpecializedAgent'
      });

      return this.errorHandler.createErrorResponse(
        agentError,
        this.createMetadata(agentId, startTime, 'unknown', traceId)
      );
    }
  }

  /**
   * Valide tous les inputs
   */
  private validateInputs(
    agentId: string,
    input: Record<string, unknown>,
    userToken: string,
    sessionId?: string
  ): {
    valid: boolean;
    errors: string[];
    agentId?: AgentId;
    validatedInput?: AgentInput;
    userToken?: UserToken;
    sessionId?: SessionId;
  } {
    const errors: string[] = [];

    // Validation agentId
    const agentIdValidation = this.validator.validateAgentId(agentId);
    if (!agentIdValidation.valid) {
      errors.push(...agentIdValidation.errors);
    }

    // Validation userToken
    const userTokenValidation = this.validator.validateUserToken(userToken);
    if (!userTokenValidation.valid) {
      errors.push(...userTokenValidation.errors);
    }

    // Validation sessionId (optionnel)
    const sessionIdValidation = this.validator.validateSessionId(sessionId);
    if (!sessionIdValidation.valid) {
      errors.push(...sessionIdValidation.errors);
    }

    // Validation input
    const inputValidation = this.validator.validateAgentInput(input);
    if (!inputValidation.valid) {
      errors.push(...inputValidation.errors);
    }

    if (errors.length > 0) {
      return { valid: false, errors };
    }

    return {
      valid: true,
      errors: [],
      agentId: this.validator.createAgentId(agentId),
      validatedInput: this.validator.validateAndCreateAgentInput(input),
      userToken: this.validator.createUserToken(userToken),
      sessionId: sessionId ? this.validator.createSessionId(sessionId) : undefined
    };
  }

  /**
   * Récupère un agent (avec cache)
   */
  private async getAgent(agentId: AgentId): Promise<SpecializedAgentConfig | null> {
    try {
      // Vérifier le cache
      const cachedAgent = this.cache.get(agentId.value);
      if (cachedAgent) {
        return cachedAgent;
      }

      // Récupérer de la base de données
      const agent = await this.fetchAgentFromDB(agentId);
      if (agent) {
        // Mettre en cache
        this.cache.set(agentId.value, agent);
        if (agent.slug && agent.slug !== agentId.value) {
          this.cache.set(agent.slug, agent);
        }
      }

      return agent;

    } catch (error) {
      logger.error(`[SpecializedAgentManagerV2] ❌ Erreur récupération agent ${agentId.value}:`, error);
      return null;
    }
  }

  /**
   * Récupère un agent de la base de données
   */
  private async fetchAgentFromDB(agentId: AgentId): Promise<SpecializedAgentConfig | null> {
    try {
      let query = supabase
        .from('agents')
        .select('*')
        .eq('is_endpoint_agent', true)
        .eq('is_active', true);

      if (agentId.type === 'uuid') {
        query = query.eq('id', agentId.value);
      } else {
        query = query.eq('slug', agentId.value);
      }

      const { data: agent, error } = await query.single();

      if (error) {
        logger.warn(`[SpecializedAgentManagerV2] ❌ Erreur requête agent ${agentId.value}:`, {
          error: error.message,
          code: error.code
        });
        return null;
      }

      if (!agent) {
        return null;
      }

      // Validation et conversion des types
      return this.validateAndConvertAgent(agent);

    } catch (error) {
      logger.error(`[SpecializedAgentManagerV2] ❌ Erreur fatale récupération agent:`, error);
      return null;
    }
  }

  /**
   * Valide et convertit un agent de la DB
   */
  private validateAndConvertAgent(agent: Record<string, unknown>): SpecializedAgentConfig {
    const validation = this.validator.validateAgentConfig(agent);
    if (!validation.valid) {
      logger.warn(`[SpecializedAgentManagerV2] ⚠️ Agent invalide, utilisation des valeurs par défaut:`, {
        agentId: agent.id,
        errors: validation.errors
      });
    }

    const capabilities = Array.isArray(agent.capabilities) ? [...agent.capabilities] : ['text'];
    const apiV2Capabilities = Array.isArray(agent.api_v2_capabilities) ? [...agent.api_v2_capabilities] : [];

    const temperature = this.sanitizeNumber(agent.temperature, 0.7, 0, 2);
    const top_p = this.sanitizeNumber(agent.top_p, 1, 0, 1);
    const max_tokens = this.sanitizeNumber(agent.max_tokens, 4000, 1, 128000);
    const max_completion_tokens = this.sanitizeNumber(agent.max_completion_tokens, max_tokens, 1, 128000);
    const priority = this.sanitizeNumber(agent.priority, 10, 0, 100);

    return {
      id: String(agent.id ?? ''),
      slug: String(agent.slug ?? ''),
      name: String(agent.name ?? agent.display_name ?? ''),
      display_name: String(agent.display_name ?? agent.name ?? ''),
      description: String(agent.description ?? ''),
      model: String(agent.model ?? ''),
      provider: 'groq',
      system_instructions: String(agent.system_instructions ?? ''),
      is_endpoint_agent: Boolean(agent.is_endpoint_agent),
      is_chat_agent: Boolean(agent.is_chat_agent),
      is_active: Boolean(agent.is_active ?? true),
      priority,
      temperature,
      max_tokens,
      max_completion_tokens,
      top_p,
      capabilities,
      api_v2_capabilities: apiV2Capabilities,
      openapi_schema_id: (agent.openapi_schema_id as string | null | undefined) ?? null,
      version: (agent.version as string | null | undefined) ?? null,
      is_default: (agent.is_default as boolean | null | undefined) ?? null,
      context_template: agent.context_template ? String(agent.context_template) : undefined,
      api_config: (agent.api_config as Record<string, unknown> | null | undefined) ?? null,
      is_favorite: (agent.is_favorite as boolean | null | undefined) ?? null,
      category: (agent.category as string | null | undefined) ?? null,
      input_schema: agent.input_schema as OpenAPISchema | undefined,
      output_schema: agent.output_schema as OpenAPISchema | undefined,
      voice: agent.voice ? String(agent.voice) : undefined,
      created_at: String(agent.created_at ?? new Date().toISOString()),
      updated_at: String(agent.updated_at ?? new Date().toISOString())
    };
  }

  /**
   * Sanitise un nombre avec des limites
   */
  private sanitizeNumber(value: unknown, defaultValue: number, min: number, max: number): number {
    const num = typeof value === 'string' ? parseFloat(value) : Number(value);
    if (isNaN(num) || num < min || num > max) {
      return defaultValue;
    }
    return num;
  }

  /**
   * Crée les métadonnées d'exécution
   */
  private createMetadata(
    agentId: string,
    startTime: number,
    model: string,
    traceId: string,
    isMultimodal?: boolean
  ): AgentMetadata {
    return {
      agentId,
      executionTime: Date.now() - startTime,
      model,
      traceId,
      isMultimodal
    };
  }

  /**
   * Crée un nouvel agent spécialisé
   */
  async createSpecializedAgent(config: CreateSpecializedAgentRequest): Promise<CreateSpecializedAgentResponse> {
    try {
      // Validation
      const validation = this.validator.validateCreateRequest(config);
      if (!validation.valid) {
        return {
          success: false,
          error: `Validation échouée: ${validation.errors.join(', ')}`
        };
      }

      // Vérifier l'unicité du slug
      const existingAgent = await this.getAgent(this.validator.createAgentId(config.slug));
      if (existingAgent) {
        return {
          success: false,
          error: `Agent avec le slug '${config.slug}' existe déjà`
        };
      }

      // Préparer les données
      const agentData = {
        name: config.name || config.display_name, // Utiliser name si fourni, sinon display_name
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
        logger.error(`[SpecializedAgentManagerV2] ❌ Erreur création agent:`, error);
        return {
          success: false,
          error: `Erreur lors de la création: ${error.message}`
        };
      }

      // Invalider le cache
      this.cache.invalidate(config.slug);

      logger.info(`[SpecializedAgentManagerV2] ✅ Agent spécialisé créé: ${config.slug}`);

      return {
        success: true,
        agent: agent as SpecializedAgentConfig,
        endpoint: `/api/v2/agents/${config.slug}`
      };

    } catch (error) {
      const agentError = this.errorHandler.createError(error, {
        agentId: config.slug,
        operation: 'createSpecializedAgent'
      });

      return {
        success: false,
        error: agentError.message
      };
    }
  }

  /**
   * Liste tous les agents spécialisés
   * ✅ Charger TOUS les agents actifs (chat + endpoint)
   */
  async listSpecializedAgents(): Promise<SpecializedAgentConfig[]> {
    try {
      const { data: agents, error } = await supabase
        .from('agents')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: false });

      if (error) {
        logger.error(`[SpecializedAgentManagerV2] ❌ Erreur liste agents:`, error);
        return [];
      }

      const processedAgents = (agents || []).map(agent => this.validateAndConvertAgent(agent));
      
      // Préchauffer le cache
      await this.cache.preload(processedAgents);

      return processedAgents;

    } catch (error) {
      logger.error(`[SpecializedAgentManagerV2] ❌ Erreur fatale liste agents:`, error);
      return [];
    }
  }

  /**
   * Récupère les informations d'un agent
   */
  async getAgentInfo(agentId: string): Promise<SpecializedAgentConfig | null> {
    try {
      const agentIdObj = this.validator.createAgentId(agentId);
      return await this.getAgent(agentIdObj);
    } catch (error) {
      logger.error(`[SpecializedAgentManagerV2] ❌ Erreur récupération info agent:`, error);
      return null;
    }
  }

  /**
   * Vide le cache
   */
  clearCache(): void {
    this.cache.clear();
    logger.dev(`[SpecializedAgentManagerV2] 🗑️ Cache vidé`);
  }

  /**
   * Invalide le cache d'un agent
   */
  invalidateAgentCache(agentId: string): void {
    this.cache.invalidate(agentId);
    logger.dev(`[SpecializedAgentManagerV2] 🗑️ Cache invalidé pour agent: ${agentId}`);
  }

  /**
   * Obtient les statistiques du cache
   */
  getCacheStats() {
    return this.cache.getStats();
  }

  /**
   * Nettoyage des ressources
   */
  destroy(): void {
    this.cache.destroy();
    logger.dev(`[SpecializedAgentManagerV2] 🗑️ Manager détruit`);
  }
}

// Instance singleton
export const specializedAgentManagerV2 = new SpecializedAgentManagerV2();
