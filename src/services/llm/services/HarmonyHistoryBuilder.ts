/**
 * Service HarmonyHistoryBuilder - Construction d'historique Harmony
 * Production-ready, format strict, zéro any
 */

import {
  HarmonyMessage,
  HarmonyConversation,
  HARMONY_ROLES,
  HARMONY_CHANNELS,
} from '../types/harmonyTypes';
import { HarmonyBuilder } from './HarmonyBuilder';
import { HarmonyFormatter } from './HarmonyFormatter';
import type { GroqLimits } from '../types/groqTypes';
import { simpleLogger as logger } from '@/utils/logger';

/**
 * Interface pour le contexte de construction Harmony
 */
interface HarmonyBuildContext {
  sessionId?: string;
  traceId?: string;
  enableAnalysis?: boolean;
  enableCommentary?: boolean;
  enableFinal?: boolean;
  maxContextMessages?: number;
  maxHistoryMessages?: number;
}

/**
 * Interface pour les résultats de construction
 */
interface HarmonyBuildResult {
  conversation: HarmonyConversation;
  formattedText: string;
  validationErrors: string[];
  isValid: boolean;
}

/**
 * Interface pour les outils Harmony
 */
interface HarmonyTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

/**
 * Service de construction d'historique Harmony
 */
export class HarmonyHistoryBuilder {
  private readonly limits: GroqLimits;
  private readonly builder: HarmonyBuilder;
  private readonly formatter: HarmonyFormatter;

  constructor(limits: GroqLimits) {
    this.limits = limits;
    this.builder = new HarmonyBuilder();
    this.formatter = new HarmonyFormatter({
      strictValidation: true,
      enableAnalysisChannel: true,
      enableCommentaryChannel: true,
      enableFinalChannel: true,
    });
  }

  /**
   * Construit l'historique Harmony pour le premier appel LLM
   */
  buildInitialHistory(
    systemContent: string,
    userMessage: string,
    cleanedHistory: HarmonyMessage[],
    tools: HarmonyTool[] = [],
    context?: HarmonyBuildContext
  ): HarmonyBuildResult {
    const validationErrors: string[] = [];
    const messages: HarmonyMessage[] = [];

    try {
      // 1. Message système (si contenu non vide)
      if (systemContent && systemContent.trim().length > 0) {
        const systemMessage = this.builder.buildSystemMessage(systemContent, context);
        messages.push(systemMessage);
      }

      // 2. Message developer avec outils (si outils disponibles)
      if (tools.length > 0) {
        const developerMessage = this.builder.buildDeveloperMessage(
          'Utilise les outils disponibles pour répondre à la demande de l\'utilisateur.',
          tools,
          context
        );
        messages.push(developerMessage);
      }

      // 3. Historique nettoyé (sans analysis), borné
      const historyWithoutAnalysis = this.purgeAnalysisMessages(cleanedHistory);
      const contextMessages = historyWithoutAnalysis.slice(-(context?.maxContextMessages || this.limits.maxContextMessages));
      messages.push(...contextMessages);

      // 4. Message utilisateur
      const userMsg = this.builder.buildUserMessage(userMessage, context);
      messages.push(userMsg);

      // 5. Construction de la conversation
      const conversation = this.builder.buildConversation(messages, context);
      
      // 6. Formatage en texte Harmony
      const formattedText = this.formatter.formatConversation(conversation);

      return {
        conversation,
        formattedText,
        validationErrors,
        isValid: true,
      };

    } catch (error) {
      logger.error('[HarmonyHistoryBuilder] Erreur lors de la construction initiale:', error);
      validationErrors.push(error instanceof Error ? error.message : 'Erreur inconnue');
      
      return {
        conversation: { messages: [] },
        formattedText: '',
        validationErrors,
        isValid: false,
      };
    }
  }

  /**
   * Construit l'historique Harmony pour le second appel (après exécution des outils)
   */
  buildSecondCallHistory(
    systemContent: string,
    userMessage: string,
    cleanedHistory: HarmonyMessage[],
    toolCalls: Array<{
      id: string;
      type: 'function';
      function: {
        name: string;
        arguments: string;
      };
    }>,
    toolResults: Array<{
      tool_call_id: string;
      tool_name: string;
      details: unknown;
      success: boolean;
      timestamp: string;
    }>,
    tools: HarmonyTool[] = [],
    context?: HarmonyBuildContext
  ): HarmonyBuildResult {
    const validationErrors: string[] = [];
    const messages: HarmonyMessage[] = [];

    try {
      // 1. Message système (si contenu non vide)
      if (systemContent && systemContent.trim().length > 0) {
        const systemMessage = this.builder.buildSystemMessage(systemContent, context);
        messages.push(systemMessage);
      }

      // 2. Message developer avec outils (si outils disponibles)
      if (tools.length > 0) {
        const developerMessage = this.builder.buildDeveloperMessage(
          'Analyse les résultats des outils et fournis une réponse finale.',
          tools,
          context
        );
        messages.push(developerMessage);
      }

      // 3. Historique nettoyé (sans analysis), borné
      const historyWithoutAnalysis = this.purgeAnalysisMessages(cleanedHistory);
      const contextMessages = historyWithoutAnalysis.slice(-(context?.maxContextMessages || this.limits.maxContextMessages));
      messages.push(...contextMessages);

      // 4. Message utilisateur
      if (userMessage && userMessage.trim().length > 0) {
        const userMsg = this.builder.buildUserMessage(userMessage, context);
        messages.push(userMsg);
      }

      // 5. Message assistant avec tool calls (commentary) - Format Harmony strict
      const assistantMessage = this.builder.buildAssistantCommentaryMessage(
        'Je vais utiliser les outils disponibles pour répondre à votre demande.',
        toolCalls,
        context
      );
      messages.push(assistantMessage);

      // 6. Messages tool
      const toolMessages = this.buildToolMessages(toolResults, validationErrors);
      messages.push(...toolMessages);

      // 7. Construction de la conversation
      const conversation = this.builder.buildConversation(messages, context);
      
      // 8. Formatage en texte Harmony
      const formattedText = this.formatter.formatConversation(conversation);

      return {
        conversation,
        formattedText,
        validationErrors,
        isValid: validationErrors.length === 0,
      };

    } catch (error) {
      logger.error('[HarmonyHistoryBuilder] Erreur lors de la construction du second appel:', error);
      validationErrors.push(error instanceof Error ? error.message : 'Erreur inconnue');
      
      return {
        conversation: { messages: [] },
        formattedText: '',
        validationErrors,
        isValid: false,
      };
    }
  }

  /**
   * Construit un historique Harmony avec séparation analysis/final
   */
  buildAnalysisFinalHistory(
    systemContent: string,
    userMessage: string,
    cleanedHistory: HarmonyMessage[],
    toolCalls: Array<{
      id: string;
      type: 'function';
      function: {
        name: string;
        arguments: string;
      };
    }>,
    toolResults: Array<{
      tool_call_id: string;
      tool_name: string;
      details: unknown;
      success: boolean;
      timestamp: string;
    }>,
    analysisContent: string,
    finalContent: string,
    tools: HarmonyTool[] = [],
    context?: HarmonyBuildContext
  ): HarmonyBuildResult {
    const validationErrors: string[] = [];
    const messages: HarmonyMessage[] = [];

    try {
      // 1. Message système
      if (systemContent && systemContent.trim().length > 0) {
        const systemMessage = this.builder.buildSystemMessage(systemContent, context);
        messages.push(systemMessage);
      }

      // 2. Message developer
      if (tools.length > 0) {
        const developerMessage = this.builder.buildDeveloperMessage(
          'Analyse les résultats et fournis une réponse structurée.',
          tools,
          context
        );
        messages.push(developerMessage);
      }

      // 3. Historique nettoyé
      const historyWithoutAnalysis = this.purgeAnalysisMessages(cleanedHistory);
      const contextMessages = historyWithoutAnalysis.slice(-(context?.maxContextMessages || this.limits.maxContextMessages));
      messages.push(...contextMessages);

      // 4. Message utilisateur
      const userMsg = this.builder.buildUserMessage(userMessage, context);
      messages.push(userMsg);

      // 5. Message assistant avec tool calls (commentary) - Format Harmony strict
      const assistantMessage = this.builder.buildAssistantCommentaryMessage(
        'Je vais utiliser les outils disponibles pour répondre à votre demande.',
        toolCalls,
        context
      );
      messages.push(assistantMessage);

      // 6. Messages tool
      const toolMessages = this.buildToolMessages(toolResults, validationErrors);
      messages.push(...toolMessages);

      // 7. Message analysis (raisonnement interne)
      if (analysisContent && analysisContent.trim().length > 0) {
        const analysisMessage = this.builder.buildAssistantAnalysisMessage(analysisContent, context);
        messages.push(analysisMessage);
      }

      // 8. Message final (réponse utilisateur)
      if (finalContent && finalContent.trim().length > 0) {
        const finalMessage = this.builder.buildAssistantFinalMessage(finalContent, context);
        messages.push(finalMessage);
      }

      // 9. Construction de la conversation
      const conversation = this.builder.buildConversation(messages, context);
      
      // 10. Formatage en texte Harmony
      const formattedText = this.formatter.formatConversation(conversation);

      return {
        conversation,
        formattedText,
        validationErrors,
        isValid: validationErrors.length === 0,
      };

    } catch (error) {
      logger.error('[HarmonyHistoryBuilder] Erreur lors de la construction analysis/final:', error);
      validationErrors.push(error instanceof Error ? error.message : 'Erreur inconnue');
      
      return {
        conversation: { messages: [] },
        formattedText: '',
        validationErrors,
        isValid: false,
      };
    }
  }

  /**
   * Valide une conversation Harmony
   */
  validateConversation(conversation: HarmonyConversation): HarmonyBuildResult {
    const validationErrors: string[] = [];

    try {
      // Validation de la structure
      if (!conversation.messages || !Array.isArray(conversation.messages)) {
        validationErrors.push('Messages manquants ou invalides');
        return {
          conversation: { messages: [] },
          formattedText: '',
          validationErrors,
          isValid: false,
        };
      }

      // Validation de chaque message
      for (let i = 0; i < conversation.messages.length; i++) {
        const message = conversation.messages[i];
        const messageErrors = this.validateMessage(message, i);
        validationErrors.push(...messageErrors);
      }

      // Formatage pour validation
      const formattedText = this.formatter.formatConversation(conversation);

      return {
        conversation,
        formattedText,
        validationErrors,
        isValid: validationErrors.length === 0,
      };

    } catch (error) {
      logger.error('[HarmonyHistoryBuilder] Erreur lors de la validation:', error);
      validationErrors.push(error instanceof Error ? error.message : 'Erreur de validation inconnue');
      
      return {
        conversation: { messages: [] },
        formattedText: '',
        validationErrors,
        isValid: false,
      };
    }
  }

  // ============================================================================
  // MÉTHODES PRIVÉES
  // ============================================================================

  /**
   * Purge les messages d'analysis de l'historique
   */
  private purgeAnalysisMessages(history: HarmonyMessage[]): HarmonyMessage[] {
    const purgedHistory = history.filter(msg => msg.channel !== HARMONY_CHANNELS.ANALYSIS);
    const removedCount = history.length - purgedHistory.length;
    
    if (removedCount > 0) {
      logger.dev?.(`[HarmonyHistoryBuilder] 🧹 ${removedCount} message(s) analysis purgé(s) de l'historique`);
    }
    
    return purgedHistory;
  }

  /**
   * Construit les messages tool à partir des résultats
   */
  private buildToolMessages(
    toolResults: Array<{
      tool_call_id: string;
      tool_name: string;
      details: unknown;
      success: boolean;
      timestamp: string;
    }>,
    validationErrors: string[]
  ): HarmonyMessage[] {
    if (!Array.isArray(toolResults)) {
      logger.warn('[HarmonyHistoryBuilder] toolResults n\'est pas un tableau:', typeof toolResults);
      return [];
    }
    
    return toolResults
      .map(toolResult => {
        try {
          const content = typeof toolResult.details === 'string' 
            ? toolResult.details 
            : JSON.stringify(toolResult.details);

          return this.builder.buildToolMessage(
            toolResult.tool_call_id,
            toolResult.tool_name,
            content,
            toolResult.success,
            { traceId: `tool-${toolResult.tool_call_id}` }
          );
        } catch (error) {
          validationErrors.push(`Erreur construction message tool: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
          return null;
        }
      })
      .filter((msg): msg is HarmonyMessage => msg !== null);
  }

  /**
   * Valide un message Harmony
   */
  private validateMessage(message: HarmonyMessage, index: number): string[] {
    const errors: string[] = [];

    // Validation du rôle
    if (!Object.values(HARMONY_ROLES).includes(message.role)) {
      errors.push(`Message ${index}: rôle invalide '${message.role}'`);
    }

    // Validation du canal
    if (message.channel && !Object.values(HARMONY_CHANNELS).includes(message.channel)) {
      errors.push(`Message ${index}: canal invalide '${message.channel}'`);
    }

    // Validation du contenu
    if (!message.content || typeof message.content !== 'string') {
      errors.push(`Message ${index}: contenu manquant ou invalide`);
    }

    // Validation des tool results (tool uniquement)
    if ((message.tool_call_id || message.name) && message.role !== HARMONY_ROLES.TOOL) {
      errors.push(`Message ${index}: tool_call_id/name autorisés uniquement pour tool`);
    }

    return errors;
  }
}
