/**
 * Manager principal des agents spécialisés (orchestration)
 * Extrait de SpecializedAgentManager pour respecter limite 300 lignes
 * 
 * Orchestre l'exécution des agents en utilisant les modules spécialisés
 */

import { simpleLogger as logger } from '@/utils/logger';
import { MultimodalHandler } from '../multimodalHandler';
import { AgentConfig } from './AgentConfig';
import { AgentExecutor } from '../executors/AgentExecutor';
import { InputValidator } from '../validators/InputValidator';
import { OutputFormatter } from '../formatters/OutputFormatter';
import { SystemMessageBuilder } from './SystemMessageBuilder';
import type { 
  SpecializedAgentConfig, 
  SpecializedAgentResponse 
} from '@/types/specializedAgents';

export class AgentManager {
  private agentConfig: AgentConfig;

  constructor(agentConfig: AgentConfig) {
    this.agentConfig = agentConfig;
  }

  /**
   * Exécuter un agent spécialisé
   */
  async executeSpecializedAgent(
    agentId: string, 
    input: Record<string, unknown>, 
    userToken: string,
    sessionId?: string
  ): Promise<SpecializedAgentResponse> {
    const startTime = Date.now();
    const traceId = `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    try {
      logger.info(`[AgentManager] 🚀 Exécution agent ${agentId}`, { traceId, agentId });

      // 1. Validation de l'agentId
      const agentIdValidation = InputValidator.validateAgentId(agentId);
      if (!agentIdValidation.valid) {
        return {
          success: false,
          error: agentIdValidation.errors.join(', '),
          metadata: {
            agentId: 'unknown',
            executionTime: 0,
            model: 'unknown'
          }
        };
      }

      // 2. Validation du token utilisateur
      const tokenValidation = InputValidator.validateUserToken(userToken);
      if (!tokenValidation.valid) {
        return {
          success: false,
          error: tokenValidation.errors.join(', '),
          metadata: {
            agentId,
            executionTime: 0,
            model: 'unknown'
          }
        };
      }

      // 3. Récupérer l'agent (avec cache)
      const agent = await this.agentConfig.getAgentByIdOrSlug(agentId);
      if (!agent) {
        logger.warn(`[AgentManager] ❌ Agent non trouvé: ${agentId}`, { traceId });
        return {
          success: false,
          error: `Agent ${agentId} not found`,
          metadata: {
            agentId,
            executionTime: Date.now() - startTime,
            model: 'unknown'
          }
        };
      }

      // 4. Validation de l'input
      const inputValidation = InputValidator.validateInput(input, agent, traceId);
      if (!inputValidation.valid) {
        return {
          success: false,
          error: `Validation failed: ${inputValidation.errors.join(', ')}`,
          metadata: {
            agentId,
            executionTime: Date.now() - startTime,
            model: agent.model
          }
        };
      }

      // 5. Préparation multimodale si nécessaire
      let processedInput = input;
      let isMultimodal = false;
      let groqPayload: {
        messages: Array<{
          role: string;
          content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
        }>;
        model: string;
        temperature?: number;
        max_tokens?: number;
        top_p?: number;
        reasoning_effort?: string;
        stream?: boolean;
      } | null = null;
      
      if (MultimodalHandler.isMultimodalModel(agent.model)) {
        const multimodalPrep = MultimodalHandler.prepareGroqContent(input, agent.model);
        
        if (multimodalPrep.error) {
          logger.warn(`[AgentManager] ❌ Erreur préparation multimodale`, { traceId, error: multimodalPrep.error });
          return {
            success: false,
            error: `Erreur multimodale: ${multimodalPrep.error}`,
            metadata: {
              agentId,
              executionTime: Date.now() - startTime,
              model: agent.model
            }
          };
        }

        MultimodalHandler.logMultimodalRequest(
          agent.model,
          multimodalPrep.text,
          multimodalPrep.imageUrl,
          traceId
        );

        groqPayload = MultimodalHandler.createGroqPayload(
          agent.model,
          multimodalPrep.text,
          multimodalPrep.imageUrl,
          {
            temperature: agent.temperature,
            max_completion_tokens: agent.max_tokens,
            stream: false
          }
        );
        isMultimodal = true;
      }

      // 6. Exécution selon le type
      let result: SpecializedAgentResponse;
      const hasImage = !!(input.image || input.imageUrl || input.image_url);
      
      if (isMultimodal && groqPayload) {
        logger.info(`[AgentManager] 🖼️ Exécution multimodale directe`, { traceId, model: agent.model });
        result = await AgentExecutor.executeMultimodalDirect(groqPayload, agent, traceId);
      } else if (hasImage && MultimodalHandler.isMultimodalModel(agent.model)) {
        // Fallback pour forcer l'exécution multimodale
        logger.warn(`[AgentManager] ⚠️ Image détectée, tentative fallback multimodale`, { traceId });
        const fallbackMultimodalPrep = MultimodalHandler.prepareGroqContent(input, agent.model);
        if (!fallbackMultimodalPrep.error) {
          const fallbackGroqPayload = MultimodalHandler.createGroqPayload(
            agent.model,
            fallbackMultimodalPrep.text,
            fallbackMultimodalPrep.imageUrl,
            {
              temperature: agent.temperature,
              max_completion_tokens: agent.max_tokens,
              stream: false
            }
          );
          result = await AgentExecutor.executeMultimodalDirect(fallbackGroqPayload, agent, traceId);
        } else {
          result = await AgentExecutor.executeNormalMode(agent, input, userToken, sessionId, traceId);
        }
      } else {
        result = await AgentExecutor.executeNormalMode(agent, input, userToken, sessionId, traceId);
      }

      // 7. Formater selon le schéma de sortie
      const formattedResult = OutputFormatter.formatOutput(result, agent.output_schema);
      
      const executionTime = Date.now() - startTime;
      logger.info(`[AgentManager] ✅ Agent ${agentId} exécuté avec succès`, { traceId, executionTime });

      // 8. Extraire la réponse finale
      let finalResponse = 'Aucune réponse générée';
      
      if (typeof formattedResult.result === 'string' && formattedResult.result.trim()) {
        finalResponse = formattedResult.result;
      } else if (typeof formattedResult.content === 'string' && formattedResult.content.trim()) {
        finalResponse = formattedResult.content;
      } else if (typeof formattedResult.response === 'string' && formattedResult.response.trim()) {
        finalResponse = formattedResult.response;
      } else if (result && typeof result === 'object' && 'content' in result) {
        const content = (result as { content?: unknown }).content;
        if (typeof content === 'string' && content.trim()) {
          finalResponse = content;
        }
      }

      return {
        success: true,
        result: {
          response: finalResponse,
          model: agent.model,
          provider: 'groq'
        },
        metadata: {
          agentId: agent.id || agent.slug || 'unknown',
          executionTime,
          model: agent.model
        }
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      logger.error(`[AgentManager] ❌ Erreur exécution agent ${agentId}:`, error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
        metadata: {
          agentId,
          executionTime,
          model: 'unknown'
        }
      };
    }
  }
}


