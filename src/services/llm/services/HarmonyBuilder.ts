/**
 * Service HarmonyBuilder - Construction de conversations Harmony
 * Production-ready, format strict, zéro any
 */

import {
  HarmonyMessage,
  HarmonyMessageSchema,
  HarmonyConversation,
  HarmonyConversationSchema,
  HARMONY_ROLES,
  HARMONY_CHANNELS,
  HarmonyRole,
  HarmonyChannel,
} from '../types/harmonyTypes';
import { HarmonyFormatter } from './HarmonyFormatter';
import { simpleLogger as logger } from '@/utils/logger';

/**
 * Interface pour les paramètres de construction
 */
interface BuildContext {
  sessionId?: string;
  traceId?: string;
  enableAnalysis?: boolean;
  enableCommentary?: boolean;
  enableFinal?: boolean;
}

/**
 * Interface pour les outils (format Harmony)
 */
interface HarmonyTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

/**
 * Service de construction de conversations Harmony
 */
export class HarmonyBuilder {
  private readonly formatter: HarmonyFormatter;

  constructor() {
    this.formatter = new HarmonyFormatter({
      strictValidation: true,
      enableAnalysisChannel: true,
      enableCommentaryChannel: true,
      enableFinalChannel: true,
    });
  }

  /**
   * Construit un message système Harmony avec métadonnées officielles
   */
  buildSystemMessage(
    content: string,
    context?: BuildContext
  ): HarmonyMessage {
    const currentDate = new Date().toISOString().split('T')[0];
    
    const systemContent = `Vous êtes ChatGPT, un grand modèle de langage entraîné par OpenAI.
Date de coupure des connaissances : 2024-06
Date actuelle : ${currentDate}

Raisonnement : élevé

# Canaux valides : analysis, commentary, final. Chaque message doit inclure un canal.
Les appels à ces outils doivent aller au canal commentary : 'functions'.

${content}`;

    const message: HarmonyMessage = {
      role: HARMONY_ROLES.SYSTEM,
      content: systemContent.trim(),
      timestamp: new Date().toISOString(),
    };

    return this.validateAndReturn(message);
  }

  /**
   * Construit un message developer Harmony avec outils (format officiel)
   */
  buildDeveloperMessage(
    instructions: string,
    tools: HarmonyTool[],
    context?: BuildContext
  ): HarmonyMessage {
    const toolDefinitions = this.formatToolsAsHarmony(tools);
    
    const content = `# Instructions

${instructions}

# Outils

## functions

namespace functions {

${toolDefinitions}

} // namespace functions`;

    const message: HarmonyMessage = {
      role: HARMONY_ROLES.DEVELOPER,
      content: content.trim(),
      timestamp: new Date().toISOString(),
    };

    return this.validateAndReturn(message);
  }

  /**
   * Construit un message utilisateur Harmony
   */
  buildUserMessage(
    content: string,
    context?: BuildContext
  ): HarmonyMessage {
    const message: HarmonyMessage = {
      role: HARMONY_ROLES.USER,
      content: content.trim(),
      timestamp: new Date().toISOString(),
    };

    return this.validateAndReturn(message);
  }

  /**
   * Construit un message assistant Harmony (réponse finale)
   */
  buildAssistantFinalMessage(
    content: string,
    context?: BuildContext
  ): HarmonyMessage {
    const message: HarmonyMessage = {
      role: HARMONY_ROLES.ASSISTANT,
      channel: HARMONY_CHANNELS.FINAL,
      content: content.trim(),
      timestamp: new Date().toISOString(),
    };

    return this.validateAndReturn(message);
  }

  /**
   * Construit un message assistant Harmony (raisonnement)
   */
  buildAssistantAnalysisMessage(
    content: string,
    context?: BuildContext
  ): HarmonyMessage {
    const message: HarmonyMessage = {
      role: HARMONY_ROLES.ASSISTANT,
      channel: HARMONY_CHANNELS.ANALYSIS,
      content: content.trim(),
      timestamp: new Date().toISOString(),
    };

    return this.validateAndReturn(message);
  }

  /**
   * Construit un message assistant Harmony (commentaire/outils)
   */
  buildAssistantCommentaryMessage(
    content: string,
    toolCalls?: Array<{
      id: string;
      type: 'function';
      function: {
        name: string;
        arguments: string;
      };
    }>,
    context?: BuildContext
  ): HarmonyMessage {
    let finalContent = content.trim();

    // Selon la spec Harmony, les tool_calls sont sérialisés dans le content du message.
    if (toolCalls && toolCalls.length > 0) {
      try {
        const toolCallsString = JSON.stringify(toolCalls, null, 2);
        finalContent += `\n\n<|tool_calls|>\n${toolCallsString}\n<|/tool_calls|>`;
      } catch (error) {
        logger.warn('[HarmonyBuilder] Erreur de sérialisation des tool_calls:', error);
      }
    }

    const message: HarmonyMessage = {
      role: HARMONY_ROLES.ASSISTANT,
      channel: HARMONY_CHANNELS.COMMENTARY,
      content: finalContent,
      timestamp: new Date().toISOString(),
    };

    return this.validateAndReturn(message);
  }

  /**
   * Construit un message tool Harmony
   */
  buildToolMessage(
    toolCallId: string,
    toolName: string,
    content: string,
    success: boolean = true,
    context?: BuildContext
  ): HarmonyMessage {
    const message: HarmonyMessage = {
      role: HARMONY_ROLES.TOOL,
      tool_call_id: toolCallId,
      name: toolName,
      content: content.trim(),
      timestamp: new Date().toISOString(),
    };

    return this.validateAndReturn(message);
  }

  /**
   * Construit une conversation Harmony complète
   */
  buildConversation(
    messages: HarmonyMessage[],
    context?: BuildContext
  ): HarmonyConversation {
    const conversation: HarmonyConversation = {
      messages,
      metadata: {
        sessionId: context?.sessionId,
        traceId: context?.traceId,
        timestamp: new Date().toISOString(),
      },
    };

    return this.validateConversation(conversation);
  }

  /**
   * Formate une conversation en texte Harmony
   */
  formatConversation(conversation: HarmonyConversation): string {
    return this.formatter.formatConversation(conversation.messages);
  }

  /**
   * Construit un message d'erreur Harmony
   */
  buildErrorMessage(
    error: Error,
    context?: BuildContext
  ): HarmonyMessage {
    const content = `Erreur: ${error.message}

Détails techniques:
- Type: ${error.constructor.name}
- Timestamp: ${new Date().toISOString()}
${context?.traceId ? `- Trace ID: ${context.traceId}` : ''}

Veuillez réessayer ou contacter le support si le problème persiste.`;

    return this.buildAssistantFinalMessage(content, context);
  }

  /**
   * Construit un message de fallback Harmony
   */
  buildFallbackMessage(
    reason: string,
    context?: BuildContext
  ): HarmonyMessage {
    const content = `Je rencontre un problème technique: ${reason}

Réessaie dans un instant ou reformule ta demande.`;

    return this.buildAssistantFinalMessage(content, context);
  }

  // ============================================================================
  // MÉTHODES PRIVÉES
  // ============================================================================

  /**
   * Formate les outils au format Harmony (format officiel TypeScript)
   */
  private formatToolsAsHarmony(tools: HarmonyTool[]): string {
    return tools
      .map(tool => {
        const params = this.formatToolParameters(tool.parameters);
        return `  // ${tool.description}
  type ${tool.name} = (${params}) => any;`;
      })
      .join('\n\n');
  }

  /**
   * Formate les paramètres d'un outil
   */
  private formatToolParameters(parameters: Record<string, unknown>): string {
    if (!parameters || Object.keys(parameters).length === 0) {
      return '';
    }

    const paramStrings = Object.entries(parameters).map(([key, value]) => {
      const type = this.inferParameterType(value);
      return `${key}: ${type}`;
    });

    return `_: {\n    ${paramStrings.join(',\n    ')}\n  }`;
  }

  /**
   * Infère le type d'un paramètre
   */
  private inferParameterType(value: unknown): string {
    if (typeof value === 'string') {
      return 'string';
    }
    if (typeof value === 'number') {
      return 'number';
    }
    if (typeof value === 'boolean') {
      return 'boolean';
    }
    if (Array.isArray(value)) {
      return 'any[]';
    }
    if (value && typeof value === 'object') {
      return 'Record<string, any>';
    }
    return 'any';
  }

  /**
   * Valide et retourne un message
   */
  private validateAndReturn(message: HarmonyMessage): HarmonyMessage {
    const validationResult = HarmonyMessageSchema.safeParse(message);
    
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
      logger.error('[HarmonyBuilder] Message invalide:', { message, errors });
      throw new Error(`Message Harmony invalide: ${errors.join(', ')}`);
    }

    return validationResult.data;
  }

  /**
   * Valide une conversation
   */
  private validateConversation(conversation: HarmonyConversation): HarmonyConversation {
    const validationResult = HarmonyConversationSchema.safeParse(conversation);
    
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
      logger.error('[HarmonyBuilder] Conversation invalide:', { conversation, errors });
      throw new Error(`Conversation Harmony invalide: ${errors.join(', ')}`);
    }

    return validationResult.data;
  }
}

/**
 * Instance singleton pour usage global
 */
export const harmonyBuilder = new HarmonyBuilder();
