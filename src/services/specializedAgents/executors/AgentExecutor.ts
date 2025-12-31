/**
 * Exécution des agents spécialisés (normal et multimodal)
 * Extrait de SpecializedAgentManager pour respecter limite 300 lignes
 */

import { agentOrchestrator } from '@/services/llm/services/AgentOrchestrator';
import { MultimodalHandler } from '../multimodalHandler';
import { simpleLogger as logger } from '@/utils/logger';
import { ErrorHandler } from '../errors/ErrorHandler';
import type { SpecializedAgentConfig, SpecializedAgentResponse } from '@/types/specializedAgents';
import { GroqRoundResult } from '@/services/llm/types/groqTypes';

export class AgentExecutor {
  /**
   * Construire le message système pour un agent
   */
  static buildSystemMessage(agent: SpecializedAgentConfig, input: Record<string, unknown>): string {
    let systemMessage = agent.system_instructions || '';

    // Remplacer les placeholders dans les instructions
    if (systemMessage.includes('{{input}}')) {
      systemMessage = systemMessage.replace('{{input}}', JSON.stringify(input, null, 2));
    }

    // Ajouter le schéma de sortie si défini
    if (agent.output_schema) {
      systemMessage += `\n\nFormat de sortie attendu (JSON):\n${JSON.stringify(agent.output_schema, null, 2)}`;
    }

    return systemMessage;
  }

  /**
   * Exécution normale via l'orchestrateur
   */
  static async executeNormalMode(
    agent: SpecializedAgentConfig,
    input: Record<string, unknown>,
    userToken: string,
    sessionId: string | undefined,
    traceId: string
  ): Promise<SpecializedAgentResponse> {
    const systemMessage = this.buildSystemMessage(agent, input);
    const userMessage = `Exécution de tâche spécialisée: ${JSON.stringify(input)}`;

    const agentConfigWithTools = {
      ...agent,
      capabilities: Array.isArray(agent.capabilities) ? [...agent.capabilities] : ['text', 'function_calling'],
      api_v2_capabilities: Array.isArray(agent.api_v2_capabilities) 
        ? [...agent.api_v2_capabilities] 
        : ['get_note', 'update_note', 'search_notes', 'list_notes', 'create_note', 'delete_note'],
      context_template: agent.context_template ?? undefined
    };

    logger.info(`[AgentExecutor] 🔍 Exécution normale`, { 
      traceId,
      agentId: agent.id,
      model: agent.model
    });

    const orchestratorResult = await agentOrchestrator.processMessage(
      userMessage,
      {
        userToken,
        sessionId: sessionId || `specialized-${agent.id || agent.slug || 'unknown'}-${Date.now()}`,
        agentConfig: agentConfigWithTools
      },
      []
    );
    
    if (!orchestratorResult || typeof orchestratorResult !== 'object') {
      logger.error(`[AgentExecutor] ❌ Réponse orchestrateur invalide`, { traceId });
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
    
    const responseContent = orchestratorResult.content || '';
    const hasContent = typeof responseContent === 'string' && responseContent.trim().length > 0;
    
    if (!hasContent) {
      logger.warn(`[AgentExecutor] ⚠️ Réponse vide`, { traceId });
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
        executionTime: 0,
        model: agent.model
      }
    };
  }

  /**
   * Exécution multimodale directe avec Groq
   */
  static async executeMultimodalDirect(
    groqPayload: {
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
    },
    agent: SpecializedAgentConfig,
    traceId: string
  ): Promise<SpecializedAgentResponse> {
    try {
      logger.info(`[AgentExecutor] 🖼️ Exécution multimodale directe`, { 
        traceId, 
        model: agent.model 
      });

      // Appel direct à l'API Groq (via fetch)
      const groqApiKey = process.env.GROQ_API_KEY;
      if (!groqApiKey) {
        throw new Error('GROQ_API_KEY non configurée');
      }

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(groqPayload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        
        if (response.status === 400) {
          return ErrorHandler.handleGroq400Error(errorText, traceId, agent.model);
        }
        
        if (response.status === 413) {
          return ErrorHandler.handleGroq413Error(errorText, traceId, agent.model);
        }

        throw new Error(`Groq API error ${response.status}: ${errorText}`);
      }

      const data = await response.json() as GroqRoundResult;
      // GroqRoundResult a 'content' directement, pas 'choices'
      const content = data.content || '';

      return {
        success: true,
        result: {
          response: content,
          model: agent.model,
          provider: 'groq'
        },
        metadata: {
          agentId: agent.id || agent.slug || 'unknown',
          executionTime: 0,
          model: agent.model
        }
      };

    } catch (error) {
      logger.error(`[AgentExecutor] ❌ Erreur exécution multimodale:`, error);
      return ErrorHandler.handleGenericError(error, agent.id || agent.slug || 'unknown', traceId, agent.model);
    }
  }
}

