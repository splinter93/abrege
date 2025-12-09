import type { ToolExecutionResult, ErrorAnalysisResult } from '../types/groqTypes';
import { simpleLogger as logger } from '@/utils/logger';
import type { ToolCall } from '../types/strictTypes';

/**
 * Service responsable de la gestion et analyse des erreurs pour Groq
 */
export class GroqErrorHandler {
  /**
   * Analyse les résultats des tools pour déterminer le type d'erreur
   */
  analyzeToolResults(toolResults: ToolExecutionResult[]): ErrorAnalysisResult {
    const hasFailedTools = toolResults.some(result => !result.success);
    const errorCodes = toolResults
      .filter(result => !result.success)
      .map(result => {
        const errorMessage = (result as { result?: { error?: string } }).result?.error || 'Unknown error';
        return this.detectErrorCode(errorMessage);
      });

    const hasAuthErrors = this.hasAuthenticationErrors(toolResults);
    const canRetry = this.canRetryAfterErrors(toolResults);

    return {
      hasFailedTools,
      hasAuthErrors,
      errorCodes,
      canRetry
    };
  }

  /**
   * Détecte le code d'erreur à partir du texte d'erreur
   */
  detectErrorCode(errorText: string): string {
    const text = errorText.toLowerCase();
    
    if (text.includes('401') || text.includes('unauthorized')) return 'AUTH_ERROR';
    if (text.includes('403') || text.includes('forbidden')) return 'PERMISSION_ERROR';
    if (text.includes('404') || text.includes('not found')) return 'NOT_FOUND';
    if (text.includes('500') || text.includes('internal')) return 'SERVER_ERROR';
    if (text.includes('timeout') || text.includes('timeout')) return 'TIMEOUT';
    if (text.includes('rate limit') || text.includes('too many requests')) return 'RATE_LIMIT';
    if (text.includes('quota') || text.includes('quota exceeded')) return 'QUOTA_EXCEEDED';
    
    return 'UNKNOWN_ERROR';
  }

  /**
   * Vérifie s'il y a des erreurs d'authentification
   */
  private hasAuthenticationErrors(toolResults: ToolExecutionResult[]): boolean {
    return toolResults.some(result => {
      const errorTextRaw = (result as { result?: { error?: string } }).result?.error;
      if (!result.success && errorTextRaw) {
        const errorText = errorTextRaw.toLowerCase();
        return errorText.includes('impossible d\'extraire l\'utilisateur') ||
               errorText.includes('token invalide') ||
               errorText.includes('unauthorized') ||
               errorText.includes('authentication required');
      }
      return false;
    });
  }

  /**
   * Détermine si on peut retenter après les erreurs
   */
  private canRetryAfterErrors(toolResults: ToolExecutionResult[]): boolean {
    const failedResults = toolResults.filter(result => !result.success);
    
    // Si tous les tools ont échoué à cause d'erreurs d'auth, pas de retry
    if (this.hasAuthenticationErrors(toolResults)) {
      return false;
    }

    // Si certains tools ont réussi, on peut retenter
    const successfulResults = toolResults.filter(result => result.success);
    if (successfulResults.length > 0) {
      return true;
    }

    // Si tous ont échoué mais pas à cause d'auth, on peut retenter
    return failedResults.every(result => {
      const errorMessage = (result as { result?: { error?: string } }).result?.error || '';
      const errorCode = this.detectErrorCode(errorMessage);
      return !['AUTH_ERROR', 'PERMISSION_ERROR'].includes(errorCode);
    });
  }

  /**
   * Génère un message d'erreur utilisateur approprié
   */
  generateUserErrorMessage(analysis: ErrorAnalysisResult): string {
    if (analysis.hasAuthErrors) {
      return 'Je ne peux pas exécuter cette action car vous n\'êtes pas correctement authentifié. Veuillez vous connecter et réessayer.';
    }

    if (analysis.hasFailedTools) {
      return 'Certains outils ont échoué, mais j\'ai pu traiter votre demande. Je vais analyser les erreurs et vous donner une réponse utile.';
    }

    return 'Une erreur inattendue s\'est produite. Je vais essayer de vous aider malgré tout.';
  }

  /**
   * Génère un message de raisonnement pour le LLM
   */
  generateReasoningMessage(analysis: ErrorAnalysisResult): string {
    if (analysis.hasAuthErrors) {
      return 'Tools échoués à cause d\'erreurs d\'authentification';
    }

    if (analysis.hasFailedTools) {
      return 'Gestion intelligente des échecs de tools';
    }

    return 'Traitement normal des résultats';
  }

  /**
   * Log les erreurs de manière structurée
   */
  logToolErrors(toolResults: ToolExecutionResult[]): void {
    const failedResults = toolResults.filter(result => !result.success);
    
    if (failedResults.length === 0) {
      logger.info('[GroqErrorHandler] ✅ Tous les tools ont été exécutés avec succès');
      return;
    }

    logger.warn(`[GroqErrorHandler] ⚠️ ${failedResults.length} tool(s) ont échoué:`);
    
    failedResults.forEach((result, index) => {
      const errorMessage = (result as { result?: { error?: string } }).result?.error || 'Unknown error';
      const errorCode = this.detectErrorCode(errorMessage);
      logger.warn(`[GroqErrorHandler] Tool ${index + 1}: ${result.name} - ${errorCode} - ${errorMessage}`);
    });
  }

  /**
   * Détermine si on doit continuer après des erreurs
   */
  shouldContinueAfterErrors(analysis: ErrorAnalysisResult, newToolCalls: ToolCall[]): boolean {
    // Si des erreurs d'auth, ne pas continuer
    if (analysis.hasAuthErrors) {
      return false;
    }

    // Si le LLM a généré de nouveaux tool calls, continuer
    if (newToolCalls.length > 0) {
      return true;
    }

    // Si on peut retenter, continuer
    return analysis.canRetry;
  }
} 