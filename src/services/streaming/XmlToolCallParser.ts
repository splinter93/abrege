/**
 * XmlToolCallParser - Parser de secours pour détecter et convertir les tool calls XML
 * 
 * PROBLÈME: Grok (xAI) peut parfois envoyer des tool calls dans du XML dans le content
 * au lieu d'utiliser le format natif delta.tool_calls
 * 
 * SOLUTION: Détecter ce format incorrect et le convertir automatiquement
 * 
 * @module services/streaming/XmlToolCallParser
 */

import { simpleLogger as logger } from '@/utils/logger';
import type { ToolCall } from '@/hooks/useChatHandlers';

/**
 * Parser de secours pour les tool calls XML
 */
export class XmlToolCallParser {
  /**
   * Détecte si le content contient des balises <tool_calls>
   */
  static hasXmlToolCalls(content: string): boolean {
    if (!content || typeof content !== 'string') {
      return false;
    }
    
    // Pattern pour détecter <tool_calls>...</tool_calls>
    return /<tool_calls>[\s\S]*?<\/tool_calls>/i.test(content);
  }

  /**
   * Extrait et convertit les tool calls XML en format natif
   * @param content - Content qui peut contenir du XML
   * @returns Content nettoyé + tool calls au format natif
   */
  static parseXmlToolCalls(content: string): {
    cleanContent: string;
    toolCalls: ToolCall[];
  } {
    if (!content || typeof content !== 'string') {
      return { cleanContent: content, toolCalls: [] };
    }

    // Chercher le pattern XML
    const xmlMatch = content.match(/<tool_calls>([\s\S]*?)<\/tool_calls>/i);
    if (!xmlMatch || !xmlMatch[1]) {
      return { cleanContent: content.trim(), toolCalls: [] };
    }

    try {
      logger.warn('[XmlToolCallParser] ⚠️ XML tool calls détectés dans content (format incorrect) - Conversion en cours...');
      
      // Extraire le JSON du XML (peut être sur plusieurs lignes)
      const jsonStr = xmlMatch[1].trim();
      
      // Parser le JSON
      const toolCallsArray = JSON.parse(jsonStr);
      
      if (!Array.isArray(toolCallsArray)) {
        logger.error('[XmlToolCallParser] ❌ Le contenu XML n\'est pas un array:', typeof toolCallsArray);
        return { cleanContent: content.replace(/<tool_calls>[\s\S]*?<\/tool_calls>/i, '').trim(), toolCalls: [] };
      }

      // Convertir au format natif ToolCall
      const toolCalls = toolCallsArray.map((tc: unknown, index: number): ToolCall | null => {
        const t = tc as {
          type?: string;
          function?: {
            name?: string;
            arguments?: string | unknown;
          };
        };

        // Validation du tool call
        if (!t.function?.name) {
          logger.error(`[XmlToolCallParser] ❌ Tool call ${index + 1} invalide (pas de nom)`, {
            toolCall: JSON.stringify(tc, null, 2)
          });
          return null;
        }

        // Convertir arguments en string JSON si nécessaire
        let argumentsStr: string;
        if (typeof t.function.arguments === 'string') {
          argumentsStr = t.function.arguments;
        } else if (t.function.arguments !== undefined && t.function.arguments !== null) {
          argumentsStr = JSON.stringify(t.function.arguments);
        } else {
          argumentsStr = '{}';
        }

        return {
          id: `call_${Date.now()}_${index}_${Math.random().toString(36).substring(7)}`,
          type: 'function',
          function: {
            name: t.function.name,
            arguments: argumentsStr
          }
        };
      }).filter((tc): tc is ToolCall => tc !== null); // Filtrer les nulls

      // Nettoyer le content (retirer le XML et les lignes vides autour)
      let cleanContent = content
        .replace(/<tool_calls>[\s\S]*?<\/tool_calls>/i, '')
        .replace(/\n\s*\n\s*\n/g, '\n\n') // Nettoyer les lignes vides multiples
        .trim();

      if (toolCalls.length > 0) {
        logger.info(`[XmlToolCallParser] ${toolCalls.length} tool calls extraits du XML`);
      }

      return { cleanContent, toolCalls };
    } catch (error) {
      logger.error('[XmlToolCallParser] Erreur parsing XML', {
        error: error instanceof Error ? error.message : String(error)
      });
      
      // En cas d'erreur, retourner le content nettoyé sans tool calls
      return {
        cleanContent: content.replace(/<tool_calls>[\s\S]*?<\/tool_calls>/i, '').trim(),
        toolCalls: []
      };
    }
  }

  /**
   * Nettoie le content en retirant seulement les balises XML (sans parser)
   * Utile pour garder le reste du contenu intact
   */
  static removeXmlToolCalls(content: string): string {
    return content.replace(/<tool_calls>[\s\S]*?<\/tool_calls>/i, '').trim();
  }
}

