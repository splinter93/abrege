/**
 * Service de construction des réponses pour les agents spécialisés
 * Extrait de SpecializedAgentManager pour respecter limite 300 lignes
 */

import { simpleLogger as logger } from '@/utils/logger';
import type { SpecializedAgentResponse, SpecializedAgentConfig } from '@/types/specializedAgents';
import { OutputFormatter } from './OutputFormatter';

/**
 * Service de construction des réponses
 */
export class ResponseBuilder {
  constructor(private outputFormatter: OutputFormatter) {}

  /**
   * Construire une réponse spécialisée à partir du résultat brut
   */
  buildResponse(
    result: unknown,
    agent: SpecializedAgentConfig,
    executionTime: number,
    traceId: string
  ): SpecializedAgentResponse {
    // Formater selon le schéma de sortie
    logger.info(`[ResponseBuilder] 🔍 Résultat brut de l'orchestrateur:`, { 
      traceId, 
      resultType: typeof result,
      resultKeys: result && typeof result === 'object' ? Object.keys(result) : 'N/A',
      resultContent: result && typeof result === 'object' && 'content' in result ? (result as { content?: unknown }).content : 'N/A',
      resultSuccess: result && typeof result === 'object' && 'success' in result ? (result as { success?: unknown }).success : 'N/A'
    });
    
    const formattedResult = this.outputFormatter.formatSpecializedOutput(result, agent.output_schema);
    
    logger.info(`[ResponseBuilder] 🔍 Résultat formaté:`, { 
      traceId, 
      formattedKeys: Object.keys(formattedResult),
      formattedResult: formattedResult
    });

    // Extraire la réponse finale avec une logique plus robuste
    let finalResponse = 'Aucune réponse générée';
    
    if (typeof formattedResult.result === 'string' && formattedResult.result.trim()) {
      finalResponse = formattedResult.result;
    } else if (typeof formattedResult.content === 'string' && formattedResult.content.trim()) {
      finalResponse = formattedResult.content;
    } else if (typeof formattedResult.response === 'string' && formattedResult.response.trim()) {
      finalResponse = formattedResult.response;
    } else if (typeof formattedResult.answer === 'string' && formattedResult.answer.trim()) {
      finalResponse = formattedResult.answer;
    } else if (typeof formattedResult.message === 'string' && formattedResult.message.trim()) {
      finalResponse = formattedResult.message;
    } else if (typeof formattedResult.text === 'string' && formattedResult.text.trim()) {
      finalResponse = formattedResult.text;
    } else if (result && typeof result === 'object' && 'content' in result) {
      const content = (result as { content?: unknown }).content;
      if (typeof content === 'string' && content.trim()) {
        finalResponse = content;
      }
    }

    logger.info(`[ResponseBuilder] ✅ Réponse finale extraite:`, { 
      traceId, 
      finalResponseLength: finalResponse.length,
      finalResponsePreview: finalResponse.substring(0, 100)
    });

    return {
      success: true,
      result: formattedResult,
      metadata: {
        agentId: agent.id || agent.slug || 'unknown',
        executionTime,
        model: agent.model
      }
    };
  }

  /**
   * Construire une réponse d'erreur
   */
  buildErrorResponse(
    error: string,
    agentId: string,
    executionTime: number,
    model: string
  ): SpecializedAgentResponse {
    return {
      success: false,
      error,
      metadata: {
        agentId,
        executionTime,
        model
      }
    };
  }
}

