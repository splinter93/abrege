/**
 * Service d'exécution spécialisé pour les agents
 * Gère l'exécution multimodale et normale avec fallback intelligent
 */

import { 
  ExecutionContext, 
  ExecutionResult, 
  SpecializedAgentConfig,
  AgentInput,
  MultimodalInput,
  GroqMultimodalPayload
} from '../types/AgentTypes';
import { MultimodalHandler } from '../multimodalHandler';
import { agenticOrchestrator } from '@/services/llm/services/AgenticOrchestrator';
import { simpleLogger as logger } from '@/utils/logger';

export class AgentExecutor {
  private readonly groqApiKey: string;

  constructor() {
    this.groqApiKey = process.env.GROQ_API_KEY || '';
    if (!this.groqApiKey) {
      throw new Error('GROQ_API_KEY manquante dans les variables d\'environnement');
    }
  }

  /**
   * Exécute un agent avec détection automatique du mode (multimodal/normal)
   */
  async execute(
    agent: SpecializedAgentConfig,
    context: ExecutionContext
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    
    try {
      logger.info(`[AgentExecutor] 🚀 Exécution agent ${agent.slug}`, {
        traceId: context.traceId,
        model: agent.model,
        hasImage: this.hasImage(context.input)
      });

      // Détecter si l'input contient une image
      const hasImage = this.hasImage(context.input);
      const isMultimodalModel = MultimodalHandler.isMultimodalModel(agent.model);

      if (hasImage && isMultimodalModel) {
        // Mode multimodale
        return await this.executeMultimodal(agent, context, startTime);
      } else {
        // Mode normal
        return await this.executeNormal(agent, context, startTime);
      }

    } catch (error) {
      const executionTime = Date.now() - startTime;
      logger.error(`[AgentExecutor] ❌ Erreur exécution agent ${agent.slug}:`, {
        traceId: context.traceId,
        error: error instanceof Error ? error.message : String(error),
        executionTime
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur interne du serveur',
        isMultimodal: false,
        executionTime
      };
    }
  }

  /**
   * Exécution multimodale directe avec l'API Groq
   */
  private async executeMultimodal(
    agent: SpecializedAgentConfig,
    context: ExecutionContext,
    startTime: number
  ): Promise<ExecutionResult> {
    try {
      logger.info(`[AgentExecutor] 🖼️ Exécution multimodale pour ${agent.slug}`, {
        traceId: context.traceId,
        model: agent.model
      });

      // Préparer le contenu multimodale
      const multimodalPrep = MultimodalHandler.prepareGroqContent(context.input, agent.model);
      
      if (multimodalPrep.error) {
        logger.warn(`[AgentExecutor] ❌ Erreur préparation multimodale:`, {
          traceId: context.traceId,
          error: multimodalPrep.error
        });
        
        // Fallback vers le mode normal
        return await this.executeNormal(agent, context, startTime);
      }

      // Créer le payload Groq
      const groqPayload = MultimodalHandler.createGroqPayload(
        agent.model,
        multimodalPrep.text,
        multimodalPrep.imageUrl,
        {
          temperature: agent.temperature,
          max_completion_tokens: agent.max_tokens,
          stream: false // Important: pas de streaming pour le multimodal
        }
      );

      // Ajouter le message système
      const systemMessage = {
        role: 'system' as const,
        content: agent.system_instructions || 'Tu es un assistant IA spécialisé.'
      };
      
      const payloadWithSystem: GroqMultimodalPayload = {
        ...groqPayload,
        messages: [systemMessage, ...groqPayload.messages]
      };

      // Appel à l'API Groq
      const response = await this.callGroqAPI(payloadWithSystem, context.traceId);
      
      const executionTime = Date.now() - startTime;
      
      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Erreur API Groq multimodale',
          isMultimodal: true,
          executionTime
        };
      }

      logger.info(`[AgentExecutor] ✅ Exécution multimodale réussie`, {
        traceId: context.traceId,
        executionTime,
        responseLength: response.content?.length || 0
      });

      return {
        success: true,
        response: response.content || 'Aucune réponse générée',
        isMultimodal: true,
        executionTime
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      logger.error(`[AgentExecutor] ❌ Erreur exécution multimodale:`, {
        traceId: context.traceId,
        error: error instanceof Error ? error.message : String(error),
        executionTime
      });

      // Fallback vers le mode normal en cas d'erreur multimodale
      logger.info(`[AgentExecutor] 🔄 Fallback vers mode normal après erreur multimodale`);
      return await this.executeNormal(agent, context, startTime);
    }
  }

  /**
   * Exécution normale via l'orchestrateur
   */
  private async executeNormal(
    agent: SpecializedAgentConfig,
    context: ExecutionContext,
    startTime: number
  ): Promise<ExecutionResult> {
    try {
      logger.info(`[AgentExecutor] 📝 Exécution normale pour ${agent.slug}`, {
        traceId: context.traceId,
        model: agent.model
      });

      // Construire le message utilisateur
      const userMessage = this.buildUserMessage(context.input);
      
      // Configurer l'agent avec les capabilities
      const agentConfigWithTools = {
        ...agent,
        capabilities: agent.capabilities || ['text', 'function_calling'],
        api_v2_capabilities: agent.api_v2_capabilities || [
          'get_note', 'update_note', 'search_notes', 
          'list_notes', 'create_note', 'delete_note'
        ]
      };

      // ✨ Appel à l'orchestrateur agentique V2
      const orchestratorResult = await agenticOrchestrator.processMessage(
        userMessage,
        [], // Pas d'historique pour les agents spécialisés
        {
          userToken: context.userToken.value,
          sessionId: context.sessionId?.value || `specialized-${agent.slug}-${Date.now()}`,
          agentConfig: agentConfigWithTools
        }
      );

      const executionTime = Date.now() - startTime;

      if (!orchestratorResult.success) {
        return {
          success: false,
          error: orchestratorResult.error || 'Erreur orchestrateur',
          isMultimodal: false,
          executionTime
        };
      }

      logger.info(`[AgentExecutor] ✅ Exécution normale réussie`, {
        traceId: context.traceId,
        executionTime,
        responseLength: orchestratorResult.content?.length || 0
      });

      return {
        success: true,
        response: orchestratorResult.content || 'Aucune réponse générée',
        isMultimodal: false,
        executionTime
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      logger.error(`[AgentExecutor] ❌ Erreur exécution normale:`, {
        traceId: context.traceId,
        error: error instanceof Error ? error.message : String(error),
        executionTime
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur interne du serveur',
        isMultimodal: false,
        executionTime
      };
    }
  }

  /**
   * Appel direct à l'API Groq
   */
  private async callGroqAPI(
    payload: GroqMultimodalPayload,
    traceId: string
  ): Promise<{ success: boolean; content?: string; error?: string }> {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.groqApiKey}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`[AgentExecutor] ❌ Erreur API Groq: ${response.status}`, {
          traceId,
          error: errorText
        });
        return {
          success: false,
          error: `API Groq error: ${response.status} - ${errorText}`
        };
      }

      const data = await response.json();
      
      if (!data?.choices?.[0]?.message?.content) {
        logger.error(`[AgentExecutor] ❌ Réponse API Groq invalide`, {
          traceId,
          response: data
        });
        return {
          success: false,
          error: 'Réponse API Groq invalide ou vide'
        };
      }

      return {
        success: true,
        content: data.choices[0].message.content
      };

    } catch (error) {
      logger.error(`[AgentExecutor] ❌ Erreur appel API Groq:`, {
        traceId,
        error: error instanceof Error ? error.message : String(error)
      });
      
      return {
        success: false,
        error: `Erreur réseau: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      };
    }
  }

  /**
   * Vérifie si l'input contient une image
   */
  private hasImage(input: AgentInput): boolean {
    return !!(input.image || input.imageUrl || input.image_url);
  }

  /**
   * Construit le message utilisateur à partir de l'input
   */
  private buildUserMessage(input: AgentInput): string {
    // Extraire le texte principal
    const text = input.text || 
                 input.query || 
                 input.question || 
                 input.prompt || 
                 input.input || 
                 '';

    // Si c'est une chaîne simple, la retourner
    if (typeof input === 'string') {
      return input;
    }

    // Si on a du texte, le retourner
    if (text && typeof text === 'string') {
      return text;
    }

    // Sinon, sérialiser l'input
    return JSON.stringify(input);
  }
}
