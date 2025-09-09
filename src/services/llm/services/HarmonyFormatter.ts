/**
 * Service HarmonyFormatter - Formatage et parsing du format Harmony GPT-OSS
 * Production-ready, validation stricte, zéro any
 */

import {
  HarmonyMessage,
  HarmonyMessageSchema,
  ParsedHarmonyMessage,
  ParsedHarmonyMessageSchema,
  HarmonyFormatResult,
  HarmonyParseResult,
  HarmonyConfig,
  HarmonyConfigSchema,
  HarmonyError,
  HarmonyValidationError,
  HarmonyParseError,
  HARMONY_TOKENS,
  HARMONY_ROLES,
  HARMONY_CHANNELS,
  HarmonyRole,
  HarmonyChannel,
} from '../types/harmonyTypes';
import { simpleLogger as logger } from '@/utils/logger';

/**
 * Service principal pour le formatage et parsing Harmony
 */
export class HarmonyFormatter {
  private readonly config: HarmonyConfig;

  constructor(config: Partial<HarmonyConfig> = {}) {
    // Validation stricte de la configuration
    const validatedConfig = HarmonyConfigSchema.parse({
      enableAnalysisChannel: true,
      enableCommentaryChannel: true,
      enableFinalChannel: true,
      strictValidation: true,
      maxMessageLength: 50000,
      preserveRawTokens: false,
      ...config,
    });
    
    this.config = validatedConfig;
  }

  /**
   * Formate un message en format Harmony strict
   */
  formatMessage(message: HarmonyMessage): HarmonyFormatResult {
    try {
      // Validation stricte du message d'entrée
      if (this.config.strictValidation) {
        const validationResult = HarmonyMessageSchema.safeParse(message);
        if (!validationResult.success) {
          const errors = validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
          throw new HarmonyValidationError(
            'Message invalide pour le formatage Harmony',
            errors,
            message
          );
        }
      }

      // Validation de la longueur
      if (message.content.length > this.config.maxMessageLength) {
        throw new HarmonyError(
          `Message trop long: ${message.content.length} > ${this.config.maxMessageLength}`,
          'MESSAGE_TOO_LONG',
          { contentLength: message.content.length, maxLength: this.config.maxMessageLength }
        );
      }

      // Construction du message Harmony
      const formattedMessage = this.buildHarmonyMessage(message);

      return {
        success: true,
        formattedMessage,
        originalMessage: message,
      };

    } catch (error) {
      logger.error('[HarmonyFormatter] Erreur lors du formatage:', error);
      
      if (error instanceof HarmonyError) {
        return {
          success: false,
          formattedMessage: '',
          originalMessage: message,
          errors: [error.message],
        };
      }

      return {
        success: false,
        formattedMessage: '',
        originalMessage: message,
        errors: [error instanceof Error ? error.message : 'Erreur inconnue'],
      };
    }
  }

  /**
   * Parse un message Harmony en structure typée
   */
  parseMessage(harmonyText: string): HarmonyParseResult {
    try {
      if (!harmonyText || typeof harmonyText !== 'string') {
        throw new HarmonyParseError('Input invalide: doit être une string non-vide', harmonyText);
      }

      const parsed = this.parseHarmonyTokens(harmonyText);
      
      if (!parsed.isValid) {
        return {
          success: false,
          rawInput: harmonyText,
          errors: parsed.errors,
        };
      }

      // Validation du message parsé
      if (this.config.strictValidation) {
        const validationResult = HarmonyMessageSchema.safeParse({
          role: parsed.role,
          channel: parsed.channel,
          content: parsed.content,
        });

        if (!validationResult.success) {
          const errors = validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
          return {
            success: false,
            rawInput: harmonyText,
            errors: [`Message parsé invalide: ${errors.join(', ')}`],
          };
        }
      }

      return {
        success: true,
        parsedMessage: parsed,
        rawInput: harmonyText,
      };

    } catch (error) {
      logger.error('[HarmonyFormatter] Erreur lors du parsing:', error);
      
      return {
        success: false,
        rawInput: harmonyText,
        errors: [error instanceof Error ? error.message : 'Erreur de parsing inconnue'],
      };
    }
  }

  /**
   * Formate une conversation complète en Harmony
   */
  formatConversation(messages: HarmonyMessage[]): string {
    if (!Array.isArray(messages)) {
      logger.warn('[HarmonyFormatter] messages n\'est pas un tableau:', typeof messages);
      return '';
    }
    
    const formattedMessages = messages.map(msg => {
      const result = this.formatMessage(msg);
      if (!result.success) {
        throw new HarmonyError(
          `Impossible de formater le message: ${result.errors?.join(', ')}`,
          'CONVERSATION_FORMAT_ERROR',
          { message: msg, errors: result.errors }
        );
      }
      return result.formattedMessage;
    });

    return formattedMessages.join('\n\n');
  }

  /**
   * Parse une conversation Harmony complète
   */
  parseConversation(harmonyText: string): ParsedHarmonyMessage[] {
    const messages: ParsedHarmonyMessage[] = [];
    const messageBlocks = this.splitHarmonyMessages(harmonyText);

    for (const block of messageBlocks) {
      const result = this.parseMessage(block);
      if (result.success && result.parsedMessage) {
        messages.push(result.parsedMessage);
      } else {
        logger.warn('[HarmonyFormatter] Message ignoré lors du parsing:', {
          block: block.substring(0, 100) + '...',
          errors: result.errors,
        });
      }
    }

    return messages;
  }

  // ============================================================================
  // MÉTHODES PRIVÉES
  // ============================================================================

  /**
   * Construit un message Harmony avec tokens spéciaux
   */
  private buildHarmonyMessage(message: HarmonyMessage): string {
    const parts: string[] = [];
    
    // Token de début avec rôle
    parts.push(HARMONY_TOKENS.START + message.role);
    
    // Canal si spécifié
    if (message.channel) {
      parts.push(HARMONY_TOKENS.CHANNEL + message.channel);
    }
    
    // Token message
    parts.push(HARMONY_TOKENS.MESSAGE);
    parts.push(''); // Ligne vide pour la lisibilité
    
    // Contenu
    parts.push(message.content);
    
    // Token de fin
    parts.push('');
    parts.push(HARMONY_TOKENS.END);

    return parts.join('\n');
  }

  /**
   * Parse les tokens Harmony d'un message
   */
  private parseHarmonyTokens(harmonyText: string): ParsedHarmonyMessage {
    const errors: string[] = [];
    
    try {
      // Extraction des tokens
      const startMatch = harmonyText.match(new RegExp(`^${HARMONY_TOKENS.START}([^\\n]+)`, 'm'));
      const endMatch = harmonyText.match(new RegExp(`${HARMONY_TOKENS.END}$`, 'm'));
      const messageMatch = harmonyText.match(new RegExp(`${HARMONY_TOKENS.MESSAGE}\\s*\\n([\\s\\S]*?)\\n\\s*${HARMONY_TOKENS.END}`, 'm'));

      if (!startMatch) {
        errors.push(`Token de début manquant: ${HARMONY_TOKENS.START}`);
      }
      if (!endMatch) {
        errors.push(`Token de fin manquant: ${HARMONY_TOKENS.END}`);
      }
      if (!messageMatch) {
        errors.push(`Token message manquant: ${HARMONY_TOKENS.MESSAGE}`);
      }

      if (errors.length > 0) {
        return {
          role: HARMONY_ROLES.USER, // Valeur par défaut
          content: harmonyText,
          rawTokens: {
            start: startMatch?.[0] || '',
            end: endMatch?.[0] || '',
            message: messageMatch?.[0] || '',
          },
          isValid: false,
          errors,
        };
      }

      // Extraction du rôle et canal
      const roleAndChannel = startMatch[1].trim();
      const channelMatch = roleAndChannel.match(new RegExp(`^([^\\s]+)${HARMONY_TOKENS.CHANNEL}([^\\s]+)$`));
      
      let role: HarmonyRole;
      let channel: HarmonyChannel | undefined;

      if (channelMatch) {
        role = channelMatch[1] as HarmonyRole;
        channel = channelMatch[2] as HarmonyChannel;
      } else {
        role = roleAndChannel as HarmonyRole;
      }

      // Validation du rôle
      if (!Object.values(HARMONY_ROLES).includes(role)) {
        errors.push(`Rôle invalide: ${role}`);
      }

      // Validation du canal
      if (channel && !Object.values(HARMONY_CHANNELS).includes(channel)) {
        errors.push(`Canal invalide: ${channel}`);
      }

      // Extraction du contenu
      const content = messageMatch[1].trim();

      return {
        role,
        channel,
        content,
        rawTokens: {
          start: startMatch[0],
          end: endMatch[0],
          message: messageMatch[0],
          channel: channelMatch?.[0],
        },
        isValid: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined,
      };

    } catch (error) {
      return {
        role: HARMONY_ROLES.USER,
        content: harmonyText,
        rawTokens: {
          start: '',
          end: '',
          message: '',
        },
        isValid: false,
        errors: [error instanceof Error ? error.message : 'Erreur de parsing'],
      };
    }
  }

  /**
   * Sépare les messages Harmony dans un texte
   */
  private splitHarmonyMessages(harmonyText: string): string[] {
    const messages: string[] = [];
    const startPattern = new RegExp(HARMONY_TOKENS.START, 'g');
    let lastIndex = 0;
    let match;

    while ((match = startPattern.exec(harmonyText)) !== null) {
      if (match.index > lastIndex) {
        // Message précédent
        const prevMessage = harmonyText.substring(lastIndex, match.index).trim();
        if (prevMessage) {
          messages.push(prevMessage);
        }
      }
      lastIndex = match.index;
    }

    // Dernier message
    if (lastIndex < harmonyText.length) {
      const lastMessage = harmonyText.substring(lastIndex).trim();
      if (lastMessage) {
        messages.push(lastMessage);
      }
    }

    return messages;
  }

  /**
   * Valide un message Harmony
   */
  private validateMessage(message: HarmonyMessage): string[] {
    const errors: string[] = [];

    // Validation du rôle
    if (!Object.values(HARMONY_ROLES).includes(message.role)) {
      errors.push(`Rôle invalide: ${message.role}`);
    }

    // Validation du canal
    if (message.channel && !Object.values(HARMONY_CHANNELS).includes(message.channel)) {
      errors.push(`Canal invalide: ${message.channel}`);
    }

    // 🎼 NOUVELLE VALIDATION: Les messages assistant doivent avoir un canal
    if (message.role === HARMONY_ROLES.ASSISTANT && !message.channel) {
      errors.push('Les messages assistant doivent spécifier un canal (analysis, commentary, ou final)');
    }

    // Validation du contenu
    if (!message.content || typeof message.content !== 'string') {
      errors.push('Contenu manquant ou invalide');
    }

    // Validation de la longueur
    if (message.content.length > this.config.maxMessageLength) {
      errors.push(`Contenu trop long: ${message.content.length} > ${this.config.maxMessageLength}`);
    }

    // Validation des tool results (tool uniquement)
    if ((message.tool_call_id || message.name) && message.role !== HARMONY_ROLES.TOOL) {
      errors.push('tool_call_id et name autorisés uniquement pour le rôle tool');
    }

    return errors;
  }
}

/**
 * Instance singleton pour usage global
 */
export const harmonyFormatter = new HarmonyFormatter();
