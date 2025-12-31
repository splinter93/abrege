/**
 * Formatage des outputs pour les agents spécialisés
 * Extrait de SpecializedAgentManager pour respecter limite 300 lignes
 */

import { simpleLogger as logger } from '@/utils/logger';
import type { OpenAPISchema, OpenAPIProperty } from '@/types/specializedAgents';

export class OutputFormatter {
  /**
   * Normaliser les caractères Unicode
   */
  static normalizeUnicode(text: string): string {
    if (!text || typeof text !== 'string') return text;
    
    return text
      .replace(/—/g, '-')
      .replace(/–/g, '-')
      .replace(/"/g, '"')
      .replace(/"/g, '"')
      .replace(/'/g, "'")
      .replace(/…/g, '...')
      .replace(/[\u2010-\u2015]/g, '-')
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2026]/g, '...')
      .replace(/[\u00A0]/g, ' ')
      .replace(/[\u2000-\u200F]/g, ' ')
      .replace(/[\u2028\u2029]/g, '\n');
  }

  /**
   * Formater la sortie selon le schéma
   */
  static formatOutput(result: unknown, outputSchema?: OpenAPISchema): Record<string, unknown> {
    logger.info(`[OutputFormatter] 🔍 formatOutput:`, { 
      hasOutputSchema: !!outputSchema,
      hasProperties: !!(outputSchema?.properties),
      resultType: typeof result
    });
    
    if (!outputSchema || !outputSchema.properties) {
      const resultObj = result as Record<string, unknown>;
      
      const nestedResult = resultObj?.result as Record<string, unknown> | undefined;
      const extractedResponse = resultObj?.content || 
                               resultObj?.response || 
                               resultObj?.message || 
                               resultObj?.text || 
                               nestedResult?.response ||
                               nestedResult?.content ||
                               result;
      
      const normalizedResponse = typeof extractedResponse === 'string' 
        ? this.normalizeUnicode(extractedResponse) 
        : extractedResponse;
      
      return { 
        result: normalizedResponse,
        response: normalizedResponse,
        content: normalizedResponse
      };
    }

    const formatted: Record<string, unknown> = {};
    const resultObj = result as Record<string, unknown>;
    
    for (const [key, schema] of Object.entries(outputSchema.properties)) {
      if (key === 'answer' || key === 'result' || key === 'response') {
        const rawContent = resultObj?.content || resultObj?.message || 'Tâche exécutée';
        formatted[key] = typeof rawContent === 'string' ? this.normalizeUnicode(rawContent) : rawContent;
      } else if (key === 'success') {
        formatted[key] = resultObj?.success !== false;
      } else if (key === 'confidence') {
        formatted[key] = this.extractConfidence(result);
      } else if (key === 'formattedContent') {
        const rawContent = resultObj?.content || resultObj?.message || '';
        formatted[key] = typeof rawContent === 'string' ? this.normalizeUnicode(rawContent) : rawContent;
      } else if (key === 'changes') {
        formatted[key] = this.extractChanges(result);
      } else {
        formatted[key] = this.getDefaultValue(schema);
      }
    }

    return formatted;
  }

  /**
   * Extraire le niveau de confiance
   */
  private static extractConfidence(result: unknown): number {
    const resultObj = result as Record<string, unknown>;
    if (typeof resultObj?.confidence === 'number') {
      return resultObj.confidence;
    }
    if (typeof resultObj?.reasoning === 'string' && resultObj.reasoning.includes('confiance')) {
      const match = resultObj.reasoning.match(/(\d+(?:\.\d+)?)%/);
      if (match) {
        return parseFloat(match[1]) / 100;
      }
    }
    return 0.8;
  }

  /**
   * Extraire les changements
   */
  private static extractChanges(result: unknown): string[] {
    const resultObj = result as Record<string, unknown>;
    if (Array.isArray(resultObj?.changes)) {
      return resultObj.changes.map(change => 
        typeof change === 'string' ? this.normalizeUnicode(change) : change
      ) as string[];
    }
    if (typeof resultObj?.reasoning === 'string' && resultObj.reasoning.includes('modifié')) {
      return ['Contenu reformaté selon les instructions'];
    }
    return [];
  }

  /**
   * Obtenir une valeur par défaut selon le schéma
   */
  private static getDefaultValue(schema: OpenAPIProperty): unknown {
    if (schema.default !== undefined) {
      return schema.default;
    }
    
    switch (schema.type) {
      case 'string': return '';
      case 'number': return 0;
      case 'boolean': return false;
      case 'array': return [];
      case 'object': return {};
      default: return null;
    }
  }
}

