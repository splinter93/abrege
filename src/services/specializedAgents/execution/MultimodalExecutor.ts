/**
 * Service d'exécution multimodale pour les agents spécialisés
 * Extrait de SpecializedAgentManager pour respecter limite 300 lignes
 */

import { simpleLogger as logger } from '@/utils/logger';
import type { SpecializedAgentConfig, SpecializedAgentResponse } from '@/types/specializedAgents';
import { GroqErrorHandler } from '../errors/GroqErrorHandler';

/**
 * Service d'exécution multimodale
 */
export class MultimodalExecutor {
  constructor(private errorHandler: GroqErrorHandler) {}

  /**
   * Exécute directement un modèle multimodal avec l'API Groq
   */
  async executeMultimodalDirect(
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
      // Ajouter le message système au payload
      const systemMessage = {
        role: 'system',
        content: agent.system_instructions || 'Tu es un assistant IA spécialisé.'
      };
      
      groqPayload.messages.unshift(systemMessage);

      logger.info(`[MultimodalExecutor] 🖼️ Payload Groq multimodale:`, { 
        traceId, 
        model: agent.model,
        messagesCount: groqPayload.messages.length,
        hasImage: groqPayload.messages.some((msg) => 
          Array.isArray(msg.content) && msg.content.some((c) => c.type === 'image_url')
        ),
        payload: JSON.stringify(groqPayload, null, 2)
      });

      // Validation de la clé API Groq
      const groqApiKey = process.env.GROQ_API_KEY;
      if (!groqApiKey || typeof groqApiKey !== 'string' || groqApiKey.trim().length === 0) {
        logger.error(`[MultimodalExecutor] ❌ Clé API Groq manquante`, { traceId });
        return {
          success: false,
          error: 'Configuration API Groq manquante'
        };
      }

      // Appel direct à l'API Groq
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqApiKey}`
        },
        body: JSON.stringify(groqPayload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`[MultimodalExecutor] ❌ Erreur API Groq multimodale: ${response.status}`, {
          traceId,
          error: errorText
        });
        
        // Gestion intelligente des erreurs Groq
        if (response.status === 400) {
          return this.errorHandler.handleGroq400Error(errorText, traceId, agent.model);
        } else if (response.status === 413) {
          return this.errorHandler.handleGroq413Error(errorText, traceId, agent.model);
        } else {
          throw new Error(`API Groq error: ${response.status} - ${errorText}`);
        }
      }

      const data = await response.json();
      
      // Validation de la réponse de l'API Groq
      if (!data || !data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
        logger.error(`[MultimodalExecutor] ❌ Réponse API Groq invalide`, {
          traceId,
          model: agent.model,
          response: data
        });
        return {
          success: false,
          error: 'Réponse API Groq invalide ou vide'
        };
      }

      const choice = data.choices[0];
      if (!choice || !choice.message || typeof choice.message.content !== 'string') {
        logger.error(`[MultimodalExecutor] ❌ Contenu de réponse invalide`, {
          traceId,
          model: agent.model,
          choice
        });
        return {
          success: false,
          error: 'Contenu de réponse invalide'
        };
      }
      
      logger.info(`[MultimodalExecutor] ✅ Réponse multimodale reçue`, {
        traceId,
        model: agent.model,
        hasImage: groqPayload.messages.some((msg) => 
          Array.isArray(msg.content) && msg.content.some((c) => c.type === 'image_url')
        ),
        responseLength: choice.message.content.length
      });

      return {
        success: true,
        result: {
          response: choice.message.content,
          model: agent.model,
          provider: 'groq'
        }
      };

    } catch (error) {
      logger.error(`[MultimodalExecutor] ❌ Erreur exécution multimodale:`, {
        traceId,
        error: error instanceof Error ? error.message : String(error)
      });
      
      return {
        success: false,
        error: `Erreur multimodale: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
}

