/**
 * Handler pour toutes les opérations liées aux agents spécialisés
 * Implémentation stricte et production-ready des 6 opérations agents
 */

import { BaseHandlerImpl } from '../core/BaseHandler';
import { SpecializedAgentManager } from '@/services/specializedAgents/SpecializedAgentManager';
import { simpleLogger as logger } from '@/utils/logger';
import type {
  ValidationResult,
  ToolDefinition,
  ApiV2Context,
  CreateAgentParams,
  UpdateAgentParams,
  ExecuteAgentParams,
  Agent
} from '../types/ApiV2Types';

export class AgentsHandler extends BaseHandlerImpl {
  private agentManager: SpecializedAgentManager;

  readonly name = 'agents';
  readonly supportedOperations = [
    'listAgents',
    'createAgent',
    'getAgent',
    'updateAgent',
    'deleteAgent',
    'patchAgent',
    'executeAgent'
  ];

  constructor() {
    super();
    this.agentManager = new SpecializedAgentManager();
  }

  /**
   * Validation des paramètres pour chaque opération
   */
  validateParams(operation: string, params: unknown): ValidationResult {
    const baseValidation = this.validateCommonParams(params);
    if (!baseValidation.valid) {
      return baseValidation;
    }

    const errors: string[] = [];

    switch (operation) {
      case 'listAgents':
        // Pas de paramètres requis pour listAgents
        break;

      case 'getAgent':
        errors.push(...this.validateRef((params as any)?.agentId, 'agentId').errors);
        break;

      case 'createAgent':
        errors.push(...this.validateCreateAgentParams(params).errors);
        break;

      case 'updateAgent':
        errors.push(...this.validateUpdateAgentParams(params).errors);
        break;

      case 'deleteAgent':
      case 'patchAgent':
        errors.push(...this.validateRef((params as any)?.agentId, 'agentId').errors);
        break;

      case 'executeAgent':
        errors.push(...this.validateExecuteAgentParams(params).errors);
        break;

      default:
        errors.push(`Opération non supportée: ${operation}`);
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Exécution des opérations
   */
  protected async executeOperation(
    operation: string,
    params: unknown,
    context: ApiV2Context
  ): Promise<unknown> {
    switch (operation) {
      case 'listAgents':
        return await this.listAgents(context);

      case 'getAgent':
        return await this.getAgent(params as { agentId: string }, context);

      case 'createAgent':
        return await this.createAgent(params as CreateAgentParams, context);

      case 'updateAgent':
        return await this.updateAgent(params as UpdateAgentParams, context);

      case 'deleteAgent':
        return await this.deleteAgent(params as { agentId: string }, context);

      case 'patchAgent':
        return await this.patchAgent(params as any, context);

      case 'executeAgent':
        return await this.executeAgent(params as ExecuteAgentParams, context);

      default:
        throw new Error(`Opération non implémentée: ${operation}`);
    }
  }

  /**
   * Définitions des tools pour ChatGPT
   */
  getToolDefinitions(): ToolDefinition[] {
    return [
      {
        name: 'listAgents',
        description: 'Lister tous les agents spécialisés disponibles',
        parameters: {
          type: 'object',
          properties: {}
        },
        handler: 'agents',
        operation: 'listAgents'
      },
      {
        name: 'getAgent',
        description: 'Récupérer les informations d\'un agent spécialisé',
        parameters: {
          type: 'object',
          properties: {
            agentId: {
              type: 'string',
              description: 'ID ou slug de l\'agent'
            }
          },
          required: ['agentId']
        },
        handler: 'agents',
        operation: 'getAgent'
      },
      {
        name: 'createAgent',
        description: 'Créer un nouvel agent spécialisé',
        parameters: {
          type: 'object',
          properties: {
            display_name: {
              type: 'string',
              maxLength: 255,
              description: 'Nom d\'affichage de l\'agent'
            },
            slug: {
              type: 'string',
              pattern: '^[a-z0-9-]+$',
              description: 'Slug unique de l\'agent (lettres minuscules, chiffres, tirets)'
            },
            description: {
              type: 'string',
              maxLength: 1000,
              description: 'Description de l\'agent (optionnel)'
            },
            model: {
              type: 'string',
              description: 'Modèle LLM à utiliser (ex: meta-llama/llama-4-scout-17b-16e-instruct)'
            },
            provider: {
              type: 'string',
              enum: ['groq'],
              default: 'groq',
              description: 'Fournisseur LLM'
            },
            system_instructions: {
              type: 'string',
              description: 'Instructions système pour l\'agent'
            },
            temperature: {
              type: 'number',
              minimum: 0,
              maximum: 2,
              default: 0.7,
              description: 'Température du modèle (0-2)'
            },
            max_tokens: {
              type: 'number',
              minimum: 1,
              maximum: 8192,
              default: 4000,
              description: 'Nombre maximum de tokens'
            },
            capabilities: {
              type: 'array',
              items: { type: 'string' },
              default: ['text', 'function_calling'],
              description: 'Capacités de l\'agent'
            },
            api_v2_capabilities: {
              type: 'array',
              items: { type: 'string' },
              description: 'Capacités API V2 de l\'agent'
            },
            is_chat_agent: {
              type: 'boolean',
              default: false,
              description: 'L\'agent peut-il être utilisé en chat ?'
            }
          },
          required: ['display_name', 'slug', 'model', 'system_instructions']
        },
        handler: 'agents',
        operation: 'createAgent'
      },
      {
        name: 'updateAgent',
        description: 'Mettre à jour complètement un agent spécialisé',
        parameters: {
          type: 'object',
          properties: {
            agentId: {
              type: 'string',
              description: 'ID de l\'agent à mettre à jour'
            },
            display_name: {
              type: 'string',
              maxLength: 255,
              description: 'Nouveau nom d\'affichage'
            },
            description: {
              type: 'string',
              maxLength: 1000,
              description: 'Nouvelle description'
            },
            model: {
              type: 'string',
              description: 'Nouveau modèle LLM'
            },
            system_instructions: {
              type: 'string',
              description: 'Nouvelles instructions système'
            },
            temperature: {
              type: 'number',
              minimum: 0,
              maximum: 2,
              description: 'Nouvelle température'
            },
            max_tokens: {
              type: 'number',
              minimum: 1,
              maximum: 8192,
              description: 'Nouveau nombre maximum de tokens'
            },
            capabilities: {
              type: 'array',
              items: { type: 'string' },
              description: 'Nouvelles capacités'
            },
            api_v2_capabilities: {
              type: 'array',
              items: { type: 'string' },
              description: 'Nouvelles capacités API V2'
            },
            is_chat_agent: {
              type: 'boolean',
              description: 'Peut être utilisé en chat ?'
            },
            is_active: {
              type: 'boolean',
              description: 'Agent actif ?'
            }
          },
          required: ['agentId']
        },
        handler: 'agents',
        operation: 'updateAgent'
      },
      {
        name: 'deleteAgent',
        description: 'Supprimer (désactiver) un agent spécialisé',
        parameters: {
          type: 'object',
          properties: {
            agentId: {
              type: 'string',
              description: 'ID de l\'agent à supprimer'
            }
          },
          required: ['agentId']
        },
        handler: 'agents',
        operation: 'deleteAgent'
      },
      {
        name: 'patchAgent',
        description: 'Mettre à jour partiellement un agent spécialisé',
        parameters: {
          type: 'object',
          properties: {
            agentId: {
              type: 'string',
              description: 'ID de l\'agent à modifier'
            },
            display_name: {
              type: 'string',
              maxLength: 255,
              description: 'Nouveau nom d\'affichage (optionnel)'
            },
            description: {
              type: 'string',
              maxLength: 1000,
              description: 'Nouvelle description (optionnel)'
            },
            system_instructions: {
              type: 'string',
              description: 'Nouvelles instructions système (optionnel)'
            },
            temperature: {
              type: 'number',
              minimum: 0,
              maximum: 2,
              description: 'Nouvelle température (optionnel)'
            },
            max_tokens: {
              type: 'number',
              minimum: 1,
              maximum: 8192,
              description: 'Nouveau nombre maximum de tokens (optionnel)'
            },
            is_active: {
              type: 'boolean',
              description: 'Agent actif ? (optionnel)'
            }
          },
          required: ['agentId']
        },
        handler: 'agents',
        operation: 'patchAgent'
      },
      {
        name: 'executeAgent',
        description: 'Exécuter un agent spécialisé avec un input donné',
        parameters: {
          type: 'object',
          properties: {
            ref: {
              type: 'string',
              description: 'Référence de l\'agent (UUID ou slug)'
            },
            input: {
              type: 'string',
              description: 'Input à traiter par l\'agent'
            },
            image: {
              type: 'string',
              description: 'URL de l\'image à analyser (optionnel, pour agents multimodaux)'
            },
            options: {
              type: 'object',
              description: 'Options supplémentaires pour l\'exécution (optionnel)'
            }
          },
          required: ['ref', 'input']
        },
        handler: 'agents',
        operation: 'executeAgent'
      }
    ];
  }

  // ============================================================================
  // MÉTHODES DE VALIDATION SPÉCIFIQUES
  // ============================================================================

  private validateCreateAgentParams(params: unknown): ValidationResult {
    const p = params as CreateAgentParams;
    const errors: string[] = [];

    errors.push(...this.validateTitle(p.display_name, 'display_name').errors);
    errors.push(...this.validateString(p.slug, 'slug', true).errors);
    errors.push(...this.validateString(p.model, 'model', true).errors);
    errors.push(...this.validateString(p.system_instructions, 'system_instructions', true).errors);

    // Validation du slug
    if (p.slug && !/^[a-z0-9-]+$/.test(p.slug)) {
      errors.push('slug doit contenir uniquement des lettres minuscules, chiffres et tirets');
    }

    // Validation de la température
    if (p.temperature !== undefined) {
      errors.push(...this.validatePositiveNumber(p.temperature, 'temperature', 0, 2).errors);
    }

    // Validation des max_tokens
    if (p.max_tokens !== undefined) {
      errors.push(...this.validatePositiveNumber(p.max_tokens, 'max_tokens', 1, 8192).errors);
    }

    // Validation du provider
    if (p.provider && p.provider !== 'groq') {
      errors.push('provider doit être "groq"');
    }

    return { valid: errors.length === 0, errors };
  }

  private validateUpdateAgentParams(params: unknown): ValidationResult {
    const p = params as UpdateAgentParams;
    const errors: string[] = [];

    errors.push(...this.validateRef(p.agentId, 'agentId').errors);

    if (p.display_name) {
      errors.push(...this.validateTitle(p.display_name, 'display_name').errors);
    }

    if (p.temperature !== undefined) {
      errors.push(...this.validatePositiveNumber(p.temperature, 'temperature', 0, 2).errors);
    }

    if (p.max_tokens !== undefined) {
      errors.push(...this.validatePositiveNumber(p.max_tokens, 'max_tokens', 1, 8192).errors);
    }

    return { valid: errors.length === 0, errors };
  }

  private validateExecuteAgentParams(params: unknown): ValidationResult {
    const p = params as ExecuteAgentParams;
    const errors: string[] = [];

    errors.push(...this.validateRef(p.ref, 'ref').errors);
    errors.push(...this.validateString(p.input, 'input', true).errors);

    return { valid: errors.length === 0, errors };
  }

  // ============================================================================
  // MÉTHODES D'IMPLÉMENTATION
  // ============================================================================

  private async listAgents(context: ApiV2Context): Promise<Agent[]> {
    const agents = await this.agentManager.listAgents(context.userId);
    return agents;
  }

  private async getAgent(params: { agentId: string }, context: ApiV2Context): Promise<Agent | null> {
    const agent = await this.agentManager.getAgentInfo(params.agentId);
    if (!agent) {
      throw new Error('Agent non trouvé');
    }
    return agent;
  }

  private async createAgent(params: CreateAgentParams, context: ApiV2Context): Promise<Agent> {
    const result = await this.agentManager.createSpecializedAgent({
      display_name: params.display_name,
      slug: params.slug,
      description: params.description,
      model: params.model,
      provider: params.provider || 'groq',
      system_instructions: params.system_instructions,
      temperature: params.temperature || 0.7,
      max_tokens: params.max_tokens || 4000,
      capabilities: params.capabilities || ['text', 'function_calling'],
      api_v2_capabilities: params.api_v2_capabilities || ['get_note', 'update_note', 'search_notes'],
      is_chat_agent: params.is_chat_agent || false
    });

    if (!result.success || !result.agent) {
      throw new Error(result.error || 'Erreur lors de la création de l\'agent');
    }

    return result.agent;
  }

  private async updateAgent(params: UpdateAgentParams, context: ApiV2Context): Promise<Agent> {
    const updateData: Record<string, unknown> = {};
    
    if (params.display_name) updateData.display_name = params.display_name;
    if (params.description) updateData.description = params.description;
    if (params.model) updateData.model = params.model;
    if (params.system_instructions) updateData.system_instructions = params.system_instructions;
    if (params.temperature !== undefined) updateData.temperature = params.temperature;
    if (params.max_tokens !== undefined) updateData.max_tokens = params.max_tokens;
    if (params.capabilities) updateData.capabilities = params.capabilities;
    if (params.api_v2_capabilities) updateData.api_v2_capabilities = params.api_v2_capabilities;
    if (params.is_chat_agent !== undefined) updateData.is_chat_agent = params.is_chat_agent;
    if (params.is_active !== undefined) updateData.is_active = params.is_active;

    const agent = await this.agentManager.updateAgent(
      params.agentId,
      updateData,
      context.traceId
    );

    if (!agent) {
      throw new Error('Erreur lors de la mise à jour de l\'agent');
    }

    return agent;
  }

  private async deleteAgent(params: { agentId: string }, context: ApiV2Context): Promise<unknown> {
    const success = await this.agentManager.deleteAgent(params.agentId, context.traceId);
    
    if (!success) {
      throw new Error('Erreur lors de la suppression de l\'agent');
    }

    return {
      success: true,
      message: 'Agent supprimé avec succès'
    };
  }

  private async patchAgent(params: any, context: ApiV2Context): Promise<Agent> {
    const { agentId, ...patchData } = params;
    
    const agent = await this.agentManager.patchAgent(
      agentId,
      patchData,
      context.traceId
    );

    if (!agent) {
      throw new Error('Erreur lors de la mise à jour partielle de l\'agent');
    }

    return agent;
  }

  private async executeAgent(params: ExecuteAgentParams, context: ApiV2Context): Promise<unknown> {
    const result = await this.agentManager.executeSpecializedAgent(
      params.ref,
      {
        input: params.input,
        image: params.image,
        ...params.options
      },
      context.userToken,
      context.sessionId
    );

    if (!result.success) {
      throw new Error(result.error || 'Erreur lors de l\'exécution de l\'agent');
    }

    return {
      success: true,
      data: result.data,
      metadata: result.metadata
    };
  }
}
