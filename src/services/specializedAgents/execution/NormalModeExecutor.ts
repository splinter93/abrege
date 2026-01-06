/**
 * Service d'exécution en mode normal pour les agents spécialisés
 * Extrait de SpecializedAgentManager pour respecter limite 300 lignes
 */

import { agentOrchestrator } from '@/services/llm/services/AgentOrchestrator';
import { simpleLogger as logger } from '@/utils/logger';
import type { SpecializedAgentConfig, SpecializedAgentResponse } from '@/types/specializedAgents';
import { SystemMessageBuilder } from '../core/SystemMessageBuilder';

/**
 * Service d'exécution en mode normal
 */
export class NormalModeExecutor {
  constructor(private systemMessageBuilder: SystemMessageBuilder) {}

  /**
   * Exécution normale via l'orchestrateur (mode non-multimodal)
   */
  async executeNormalMode(
    agent: SpecializedAgentConfig,
    input: Record<string, unknown>,
    userToken: string,
    sessionId: string | undefined,
    traceId: string
  ): Promise<SpecializedAgentResponse> {
    const systemMessage = this.systemMessageBuilder.buildSpecializedSystemMessage(agent, input);
    const userMessage = `Exécution de tâche spécialisée: ${JSON.stringify(input)}`;

    // Configurer l'agent avec les capabilities pour les tool calls
    const agentConfigWithTools = {
      ...agent,
      // S'assurer que l'agent a accès aux tools
      capabilities: Array.isArray(agent.capabilities) ? [...agent.capabilities] : ['text', 'function_calling'],
      api_v2_capabilities: Array.isArray(agent.api_v2_capabilities) ? [...agent.api_v2_capabilities] : ['get_note', 'update_note', 'search_notes', 'list_notes', 'create_note', 'delete_note'],
      context_template: agent.context_template ?? undefined
    };

    // DEBUG: Vérifier l'agent config avant d'appeler l'orchestrateur
    logger.info(`[NormalModeExecutor] 🔍 Agent config avant orchestrateur:`, { 
      traceId,
      agentId: agent.id,
      agentSlug: agent.slug,
      agentName: agent.name || agent.display_name,
      hasId: !!agent.id,
      configKeys: Object.keys(agentConfigWithTools)
    });

    const orchestratorResult = await agentOrchestrator.processMessage(
      userMessage,
      {
        userToken,
        sessionId: sessionId || `specialized-${agent.id || agent.slug || 'unknown'}-${Date.now()}`,
        agentConfig: agentConfigWithTools
      },
      [] // history vide
    );
    
    // Validation de la réponse de l'orchestrateur
    if (!orchestratorResult || typeof orchestratorResult !== 'object') {
      logger.error(`[NormalModeExecutor] ❌ Réponse orchestrateur invalide`, { 
        traceId, 
        orchestratorResult 
      });
      return {
        success: false,
        result: {
          response: 'Erreur: Réponse orchestrateur invalide',
          model: agent.model,
          provider: 'groq'
        },
        error: 'Réponse orchestrateur invalide',
        metadata: {
          agentId: agent.id || agent.slug || 'unknown',
          executionTime: 0,
          model: agent.model
        }
      };
    }
    
    // Convertir ChatResponse en SpecializedAgentResponse
    logger.info(`[NormalModeExecutor] 🔍 Résultat orchestrateur brut:`, { 
      traceId, 
      content: orchestratorResult.content,
      contentLength: orchestratorResult.content?.length || 0,
      finishReason: orchestratorResult.finishReason,
      orchestratorKeys: Object.keys(orchestratorResult)
    });
    
    // Améliorer la gestion des réponses vides
    const responseContent = orchestratorResult.content || '';
    const hasContent = typeof responseContent === 'string' && responseContent.trim().length > 0;
    
    if (!hasContent) {
      logger.warn(`[NormalModeExecutor] ⚠️ Réponse vide de l'orchestrateur`, { 
        traceId, 
        orchestratorResult: {
          hasContent: !!orchestratorResult.content,
          finishReason: orchestratorResult.finishReason
        }
      });
    }
    
    return {
      success: hasContent,
      result: {
        response: hasContent ? responseContent : 'Aucune réponse générée',
        model: agent.model,
        provider: 'groq'
      },
      error: hasContent ? undefined : 'Réponse orchestrateur vide',
      metadata: {
        agentId: agent.id || agent.slug || 'unknown',
        executionTime: 0, // Sera calculé plus tard
        model: agent.model
      }
    };
  }
}

