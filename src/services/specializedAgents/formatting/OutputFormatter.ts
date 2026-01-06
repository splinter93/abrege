/**
 * Service de formatage des sorties pour les agents spécialisés
 * Extrait de SpecializedAgentManager pour respecter limite 300 lignes
 */

import { simpleLogger as logger } from '@/utils/logger';
import type { OpenAPISchema, OpenAPIProperty } from '@/types/specializedAgents';

/**
 * Service de formatage des sorties
 */
export class OutputFormatter {
  /**
   * Normaliser les caractères Unicode pour éviter les erreurs d'encodage ByteString
   */
  normalizeUnicode(text: string): string {
    if (!text || typeof text !== 'string') return text;
    
    return text
      .replace(/—/g, '-') // Tiret cadratin vers tiret normal
      .replace(/–/g, '-') // Tiret en vers tiret normal
      .replace(/"/g, '"') // Guillemets courbes vers guillemets droits
      .replace(/"/g, '"') // Guillemets courbes vers guillemets droits
      .replace(/'/g, "'") // Apostrophe courbe vers apostrophe droite
      .replace(/…/g, '...') // Points de suspension vers trois points
      .replace(/–/g, '-') // Tiret en vers tiret normal
      .replace(/—/g, '-') // Tiret cadratin vers tiret normal
      .replace(/[\u2010-\u2015]/g, '-') // Tous les types de tirets vers tiret normal
      .replace(/[\u2018\u2019]/g, "'") // Guillemets simples vers apostrophe droite
      .replace(/[\u201C\u201D]/g, '"') // Guillemets doubles vers guillemets droits
      .replace(/[\u2026]/g, '...') // Points de suspension vers trois points
      .replace(/[\u00A0]/g, ' ') // Espace insécable vers espace normal
      .replace(/[\u2000-\u200F]/g, ' ') // Espaces spéciaux vers espace normal
      .replace(/[\u2028\u2029]/g, '\n'); // Séparateurs de ligne vers newline
  }

  /**
   * Formater la sortie selon le schéma
   */
  formatSpecializedOutput(result: unknown, outputSchema?: OpenAPISchema): Record<string, unknown> {
    logger.info(`[OutputFormatter] 🔍 formatSpecializedOutput:`, { 
      hasOutputSchema: !!outputSchema,
      hasProperties: !!(outputSchema?.properties),
      resultType: typeof result,
      resultKeys: result && typeof result === 'object' ? Object.keys(result) : 'N/A'
    });
    
    if (!outputSchema || !outputSchema.properties) {
      const resultObj = result as Record<string, unknown>;
      
      // Essayer d'extraire la réponse de différentes propriétés possibles
      const nestedResult = resultObj?.result as Record<string, unknown> | undefined;
      const extractedResponse = resultObj?.content || 
                               resultObj?.response || 
                               resultObj?.message || 
                               resultObj?.text || 
                               nestedResult?.response ||
                               nestedResult?.content ||
                               result;
      
      // Normaliser les caractères Unicode pour éviter les erreurs d'encodage
      const normalizedResponse = typeof extractedResponse === 'string' 
        ? this.normalizeUnicode(extractedResponse) 
        : extractedResponse;
      
      const formatted = { 
        result: normalizedResponse,
        response: normalizedResponse,
        content: normalizedResponse
      };
      logger.info(`[OutputFormatter] 🔍 Format simple (pas de schéma):`, { 
        extractedResponse,
        resultObjKeys: Object.keys(resultObj || {}),
        formatted 
      });
      return formatted;
    }

    const formatted: Record<string, unknown> = {};
    const resultObj = result as Record<string, unknown>;
    
    // Mapper les propriétés du schéma
    for (const [key, schema] of Object.entries(outputSchema.properties)) {
      if (key === 'answer' || key === 'result' || key === 'response') {
        const rawContent = resultObj?.content || resultObj?.message || 'Tâche exécutée';
        formatted[key] = typeof rawContent === 'string' ? this.normalizeUnicode(rawContent) : rawContent;
      } else if (key === 'success') {
        formatted[key] = resultObj?.success !== false;
      } else if (key === 'confidence') {
        // Essayer d'extraire un niveau de confiance du résultat
        formatted[key] = this.extractConfidence(result);
      } else if (key === 'formattedContent') {
        const rawContent = resultObj?.content || resultObj?.message || '';
        formatted[key] = typeof rawContent === 'string' ? this.normalizeUnicode(rawContent) : rawContent;
      } else if (key === 'changes') {
        formatted[key] = this.extractChanges(result);
      } else {
        // Valeur par défaut selon le type
        formatted[key] = this.getDefaultValue(schema);
      }
    }

    return formatted;
  }

  /**
   * Extraire le niveau de confiance du résultat
   */
  private extractConfidence(result: unknown): number {
    const resultObj = result as Record<string, unknown>;
    if (typeof resultObj?.confidence === 'number') {
      return resultObj.confidence;
    }
    if (typeof resultObj?.reasoning === 'string' && resultObj.reasoning.includes('confiance')) {
      // Essayer d'extraire un pourcentage de confiance du texte
      const match = resultObj.reasoning.match(/(\d+(?:\.\d+)?)%/);
      if (match) {
        return parseFloat(match[1]) / 100;
      }
    }
    return 0.8; // Confiance par défaut
  }

  /**
   * Extraire les changements du résultat
   */
  private extractChanges(result: unknown): string[] {
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
  private getDefaultValue(schema: OpenAPIProperty): unknown {
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

