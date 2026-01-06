/**
 * Service d'orchestration de l'exécution des agents spécialisés
 * Extrait de SpecializedAgentManager pour respecter limite 300 lignes
 */

import { simpleLogger as logger } from '@/utils/logger';
import { MultimodalHandler } from '../multimodalHandler';
import type { SpecializedAgentConfig, SpecializedAgentResponse } from '@/types/specializedAgents';
import { MultimodalExecutor } from './MultimodalExecutor';
import { NormalModeExecutor } from './NormalModeExecutor';

/**
 * Service d'orchestration de l'exécution
 */
export class AgentExecutor {
  constructor(
    private multimodalExecutor: MultimodalExecutor,
    private normalModeExecutor: NormalModeExecutor
  ) {}

  /**
   * Exécuter un agent selon son mode (multimodal ou normal)
   */
  async executeAgent(
    agent: SpecializedAgentConfig,
    input: Record<string, unknown>,
    userToken: string,
    sessionId: string | undefined,
    traceId: string
  ): Promise<SpecializedAgentResponse> {
    // Préparation du contenu multimodale si le modèle le supporte
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
      if (!multimodalPrep.error) {
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
    }

    // Détection multimodale
    logger.info(`[AgentExecutor] 🔍 Détection multimodale: ${isMultimodal}, payload: ${!!groqPayload}`, { 
      traceId, 
      model: agent.model,
      hasImage: !!(input.image || input.imageUrl || input.image_url) ? 'yes' : 'no',
      inputKeys: Object.keys(input)
    });
    
    // Forcer l'exécution multimodale si une image est détectée
    const hasImage = !!(input.image || input.imageUrl || input.image_url);
    
    if (isMultimodal && groqPayload) {
      // Exécution directe avec l'API Groq pour les modèles multimodaux
      logger.info(`[AgentExecutor] 🖼️ Exécution multimodale directe pour ${agent.id || agent.slug}`, { traceId, model: agent.model });
      return await this.multimodalExecutor.executeMultimodalDirect(groqPayload, agent, traceId);
    } else if (hasImage && MultimodalHandler.isMultimodalModel(agent.model)) {
      // Fallback pour forcer l'exécution multimodale si image détectée
      logger.warn(`[AgentExecutor] ⚠️ Image détectée mais exécution multimodale non déclenchée, tentative de récupération`, { 
        traceId, 
        hasImage, 
        isMultimodal, 
        hasGroqPayload: !!groqPayload 
      });
      
      // Essayer de préparer le contenu multimodale à nouveau
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
        
        logger.info(`[AgentExecutor] 🔄 Exécution multimodale de fallback pour ${agent.id || agent.slug}`, { traceId });
        return await this.multimodalExecutor.executeMultimodalDirect(fallbackGroqPayload, agent, traceId);
      } else {
        logger.error(`[AgentExecutor] ❌ Impossible de préparer le contenu multimodale de fallback`, { 
          traceId, 
          error: fallbackMultimodalPrep.error 
        });
        // Continuer avec l'exécution normale
        return await this.normalModeExecutor.executeNormalMode(agent, input, userToken, sessionId, traceId);
      }
    } else {
      // Exécution normale via l'orchestrateur
      return await this.normalModeExecutor.executeNormalMode(agent, input, userToken, sessionId, traceId);
    }
  }
}

