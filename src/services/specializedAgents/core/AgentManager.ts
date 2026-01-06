/**
 * Service principal d'orchestration des agents spécialisés
 * Orchestre tous les modules pour l'exécution complète
 */

import { simpleLogger as logger } from '@/utils/logger';
import { SchemaValidator } from '../schemaValidator';
import type {
  SpecializedAgentConfig,
  SpecializedAgentRequest,
  SpecializedAgentResponse
} from '@/types/specializedAgents';
import { AgentConfigService } from './AgentConfigService';
import { SystemMessageBuilder } from './SystemMessageBuilder';
import { InputValidator } from '../validation/InputValidator';
import { AgentExecutor } from '../execution/AgentExecutor';
import { ResponseBuilder } from '../formatting/ResponseBuilder';
import { GroqErrorHandler } from '../errors/GroqErrorHandler';
import { MultimodalExecutor } from '../execution/MultimodalExecutor';
import { NormalModeExecutor } from '../execution/NormalModeExecutor';
import { OutputFormatter } from '../formatting/OutputFormatter';

/**
 * Service principal d'orchestration des agents spécialisés
 */
export class AgentManager {
  private agentConfigService: AgentConfigService;
  private systemMessageBuilder: SystemMessageBuilder;
  private inputValidator: InputValidator;
  private agentExecutor: AgentExecutor;
  private responseBuilder: ResponseBuilder;
  private errorHandler: GroqErrorHandler;

  constructor() {
    // Initialiser tous les services
    this.agentConfigService = new AgentConfigService();
    this.systemMessageBuilder = new SystemMessageBuilder();
    this.inputValidator = new InputValidator();
    this.errorHandler = new GroqErrorHandler();
    
    // Services avec dépendances
    const multimodalExecutor = new MultimodalExecutor(this.errorHandler);
    const normalModeExecutor = new NormalModeExecutor(this.systemMessageBuilder);
    this.agentExecutor = new AgentExecutor(multimodalExecutor, normalModeExecutor);
    
    const outputFormatter = new OutputFormatter();
    this.responseBuilder = new ResponseBuilder(outputFormatter);
  }

  /**
   * Exécuter un agent spécialisé via l'infrastructure existante
   * Supporte les requêtes multimodales (texte + images)
   */
  async executeSpecializedAgent(
    agentId: string, 
    input: Record<string, unknown>, 
    userToken: string,
    sessionId?: string
  ): Promise<SpecializedAgentResponse> {
    const startTime = Date.now();
    const traceId = `agent-${agentId}-${Date.now()}`;

    try {
      // 1. Validation des inputs
      const tokenValidation = this.inputValidator.validateUserToken(userToken, agentId);
      if (!tokenValidation.valid) {
        return tokenValidation.error!;
      }

      const inputValidation = this.inputValidator.validateInput(input, agentId);
      if (!inputValidation.valid) {
        return inputValidation.error!;
      }

      const agentIdValidation = this.inputValidator.validateAgentId(agentId);
      if (!agentIdValidation.valid) {
        return agentIdValidation.error!;
      }

      const sessionIdValidation = this.inputValidator.validateSessionId(sessionId, agentId);
      if (!sessionIdValidation.valid) {
        return sessionIdValidation.error!;
      }

      logger.info(`[AgentManager] 🚀 Exécution agent ${agentId}`, { traceId, agentId });

      // 2. Récupérer l'agent (avec cache)
      const agent = await this.agentConfigService.getAgentByIdOrSlug(agentId);
      if (!agent) {
        logger.warn(`[AgentManager] ❌ Agent non trouvé: ${agentId}`, { traceId });
        return this.responseBuilder.buildErrorResponse(
          `Agent ${agentId} not found`,
          agentId,
          Date.now() - startTime,
          'unknown'
        );
      }

      // 3. Validation du schéma d'entrée
      if (agent.input_schema) {
        const validation = SchemaValidator.validateInput(input, agent.input_schema);
        if (!validation.valid) {
          logger.warn(`[AgentManager] ❌ Validation échouée pour ${agentId}`, { 
            traceId, 
            errors: validation.errors 
          });
          return this.responseBuilder.buildErrorResponse(
            `Validation failed: ${validation.errors.join(', ')}`,
            agentId,
            Date.now() - startTime,
            agent.model
          );
        }
      }

      // 4. Exécuter l'agent
      const result = await this.agentExecutor.executeAgent(
        agent,
        input,
        userToken,
        sessionId,
        traceId
      );

      // Si l'exécution a échoué, retourner directement
      if (!result.success) {
        const executionTime = Date.now() - startTime;
        await this.updateAgentMetrics(agentId, false, executionTime);
        return {
          ...result,
          metadata: {
            agentId: result.metadata?.agentId || agentId,
            executionTime,
            model: result.metadata?.model || 'unknown'
          }
        };
      }

      // 5. Construire la réponse finale
      const executionTime = Date.now() - startTime;
      const finalResponse = this.responseBuilder.buildResponse(
        result,
        agent,
        executionTime,
        traceId
      );

      logger.info(`[AgentManager] ✅ Agent ${agentId} exécuté avec succès`, { 
        traceId, 
        executionTime 
      });

      // 6. Mettre à jour les métriques
      await this.updateAgentMetrics(agentId, true, executionTime);

      return finalResponse;

    } catch (error) {
      const executionTime = Date.now() - startTime;
      logger.error(`[AgentManager] ❌ Erreur exécution agent ${agentId}:`, {
        traceId,
        error: error instanceof Error ? error.message : String(error)
      });
      
      await this.updateAgentMetrics(agentId, false, executionTime);
      
      return this.responseBuilder.buildErrorResponse(
        `Erreur interne: ${error instanceof Error ? error.message : String(error)}`,
        agentId,
        executionTime,
        'unknown'
      );
    }
  }

  /**
   * Mettre à jour les métriques d'exécution d'un agent
   */
  private async updateAgentMetrics(agentId: string, success: boolean, executionTime: number): Promise<void> {
    try {
      // Ici on pourrait implémenter un système de métriques plus sophistiqué
      // Pour l'instant, on log simplement
      logger.dev(`[AgentManager] 📊 Métriques agent ${agentId}:`, {
        success,
        executionTime,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.warn(`[AgentManager] ⚠️ Erreur mise à jour métriques:`, error);
    }
  }

  /**
   * Obtenir le service de configuration (pour accès externe)
   */
  getAgentConfigService(): AgentConfigService {
    return this.agentConfigService;
  }
}
