/**
 * Service de formatage des réponses pour les agents spécialisés
 * Formatage intelligent selon les schémas de sortie
 */

import { 
  SpecializedAgentConfig, 
  AgentResponse, 
  AgentMetadata,
  OpenAPISchema,
  OpenAPIProperty
} from '../types/AgentTypes';
import { simpleLogger as logger } from '@/utils/logger';

export class AgentFormatter {
  /**
   * Formate une réponse d'agent selon son schéma de sortie
   */
  static formatResponse(
    result: unknown,
    agent: SpecializedAgentConfig,
    metadata: AgentMetadata
  ): AgentResponse {
    try {
      logger.dev(`[AgentFormatter] 🔍 Formatage réponse pour ${agent.slug}`, {
        traceId: metadata.traceId,
        hasOutputSchema: !!agent.output_schema,
        resultType: typeof result
      });

      if (!agent.output_schema) {
        return this.formatSimpleResponse(result, metadata);
      }

      return this.formatSchemaResponse(result, agent.output_schema, metadata);

    } catch (error) {
      logger.error(`[AgentFormatter] ❌ Erreur formatage:`, {
        traceId: metadata.traceId,
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        success: false,
        error: 'Erreur de formatage de la réponse',
        metadata
      };
    }
  }

  /**
   * Formatage simple sans schéma
   */
  private static formatSimpleResponse(
    result: unknown,
    metadata: AgentMetadata
  ): AgentResponse {
    const response = this.extractResponseContent(result);
    const normalizedResponse = this.normalizeUnicode(response);

    return {
      success: true,
      data: {
        response: normalizedResponse,
        model: metadata.model,
        provider: 'groq'
      },
      metadata
    };
  }

  /**
   * Formatage selon le schéma de sortie
   */
  private static formatSchemaResponse(
    result: unknown,
    outputSchema: OpenAPISchema,
    metadata: AgentMetadata
  ): AgentResponse {
    const formattedData: Record<string, unknown> = {};
    const resultObj = result as Record<string, unknown>;

    // Mapper chaque propriété du schéma
    for (const [key, schema] of Object.entries(outputSchema.properties)) {
      formattedData[key] = this.formatProperty(key, schema, resultObj);
    }

    // Extraire la réponse principale
    const mainResponse = this.extractMainResponse(formattedData, resultObj);
    const normalizedResponse = this.normalizeUnicode(mainResponse);

    return {
      success: true,
      data: {
        response: normalizedResponse,
        model: metadata.model,
        provider: 'groq',
        confidence: this.extractConfidence(formattedData),
        changes: this.extractChanges(formattedData)
      },
      metadata
    };
  }

  /**
   * Formate une propriété selon son schéma
   */
  private static formatProperty(
    key: string,
    schema: OpenAPIProperty,
    resultObj: Record<string, unknown>
  ): unknown {
    // Propriétés spéciales
    if (key === 'answer' || key === 'result' || key === 'response') {
      const rawContent = resultObj?.content || 
                        resultObj?.message || 
                        resultObj?.response || 
                        'Tâche exécutée';
      return typeof rawContent === 'string' ? rawContent : String(rawContent);
    }

    if (key === 'success') {
      return resultObj?.success !== false;
    }

    if (key === 'confidence') {
      return this.extractConfidence(resultObj);
    }

    if (key === 'formattedContent') {
      const rawContent = resultObj?.content || resultObj?.message || '';
      return typeof rawContent === 'string' ? rawContent : String(rawContent);
    }

    if (key === 'changes') {
      return this.extractChanges(resultObj);
    }

    // Valeur par défaut selon le type
    return this.getDefaultValue(schema);
  }

  /**
   * Extrait le contenu de réponse principal
   */
  private static extractResponseContent(result: unknown): string {
    if (typeof result === 'string' && result.trim()) {
      return result;
    }

    if (typeof result === 'object' && result !== null) {
      const obj = result as Record<string, unknown>;
      
      // Chercher dans différentes propriétés possibles
      const possibleKeys = ['content', 'response', 'message', 'text', 'result'];
      
      for (const key of possibleKeys) {
        const value = obj[key];
        if (typeof value === 'string' && value.trim()) {
          return value;
        }
      }

      // Si c'est un objet avec une propriété result
      if (obj.result && typeof obj.result === 'object') {
        const resultObj = obj.result as Record<string, unknown>;
        for (const key of possibleKeys) {
          const value = resultObj[key];
          if (typeof value === 'string' && value.trim()) {
            return value;
          }
        }
      }
    }

    return 'Aucune réponse générée';
  }

  /**
   * Extrait la réponse principale des données formatées
   */
  private static extractMainResponse(
    formattedData: Record<string, unknown>,
    resultObj: Record<string, unknown>
  ): string {
    // Priorité aux propriétés formatées
    const responseKeys = ['response', 'answer', 'result', 'content'];
    
    for (const key of responseKeys) {
      const value = formattedData[key];
      if (typeof value === 'string' && value.trim()) {
        return value;
      }
    }

    // Fallback vers l'extraction simple
    return this.extractResponseContent(resultObj);
  }

  /**
   * Extrait le niveau de confiance
   */
  private static extractConfidence(data: Record<string, unknown>): number {
    if (typeof data.confidence === 'number') {
      return Math.max(0, Math.min(1, data.confidence));
    }

    if (typeof data.reasoning === 'string' && data.reasoning.includes('confiance')) {
      const match = data.reasoning.match(/(\d+(?:\.\d+)?)%/);
      if (match) {
        return Math.max(0, Math.min(1, parseFloat(match[1]) / 100));
      }
    }

    return 0.8; // Confiance par défaut
  }

  /**
   * Extrait les changements
   */
  private static extractChanges(data: Record<string, unknown>): string[] {
    if (Array.isArray(data.changes)) {
      return data.changes
        .filter(change => typeof change === 'string')
        .map(change => this.normalizeUnicode(change));
    }

    if (typeof data.reasoning === 'string' && data.reasoning.includes('modifié')) {
      return ['Contenu reformaté selon les instructions'];
    }

    return [];
  }

  /**
   * Obtient une valeur par défaut selon le schéma
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

  /**
   * Normalise les caractères Unicode pour éviter les erreurs d'encodage
   */
  private static normalizeUnicode(text: string): string {
    if (!text || typeof text !== 'string') return text;
    
    return text
      .replace(/—/g, '-') // Tiret cadratin vers tiret normal
      .replace(/–/g, '-') // Tiret en vers tiret normal
      .replace(/"/g, '"') // Guillemets courbes vers guillemets droits
      .replace(/"/g, '"') // Guillemets courbes vers guillemets droits
      .replace(/'/g, "'") // Apostrophe courbe vers apostrophe droite
      .replace(/…/g, '...') // Points de suspension vers trois points
      .replace(/[\u2010-\u2015]/g, '-') // Tous les types de tirets vers tiret normal
      .replace(/[\u2018\u2019]/g, "'") // Guillemets simples vers apostrophe droite
      .replace(/[\u201C\u201D]/g, '"') // Guillemets doubles vers guillemets droits
      .replace(/[\u2026]/g, '...') // Points de suspension vers trois points
      .replace(/[\u00A0]/g, ' ') // Espace insécable vers espace normal
      .replace(/[\u2000-\u200F]/g, ' ') // Espaces spéciaux vers espace normal
      .replace(/[\u2028\u2029]/g, '\n'); // Séparateurs de ligne vers newline
  }

  /**
   * Valide une réponse formatée
   */
  static validateResponse(response: AgentResponse): boolean {
    if (!response.success) {
      return true; // Les erreurs sont valides
    }

    if (!response.data) {
      return false;
    }

    if (!response.data.response || typeof response.data.response !== 'string') {
      return false;
    }

    if (!response.data.model || typeof response.data.model !== 'string') {
      return false;
    }

    if (response.data.provider !== 'groq') {
      return false;
    }

    return true;
  }

  /**
   * Crée une réponse d'erreur standardisée
   */
  static createErrorResponse(
    error: string,
    metadata: AgentMetadata
  ): AgentResponse {
    return {
      success: false,
      error: this.normalizeUnicode(error),
      metadata
    };
  }
}
