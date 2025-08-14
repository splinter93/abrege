import { simpleLogger as logger } from '@/utils/logger';
import type { NormalizedToolResult } from './ToolCallPersistenceService';

export class ToolResultNormalizer {
  /**
   * B)4 - Normalisation de TOUT retour de tool dans un schéma unique
   */
  static normalizeToolResult(
    toolName: string,
    toolCallId: string,
    toolArgs: any,
    rawResult: any
  ): NormalizedToolResult {
    const timestamp = new Date().toISOString();
    
    // Redacter les arguments sensibles
    const redactedArgs = this.redactSensitiveArgs(toolArgs);
    
    // Analyser le résultat brut
    const analysis = this.analyzeRawResult(rawResult);
    
    return {
      success: analysis.success,
      code: analysis.code,
      message: analysis.message,
      details: analysis.details,
      tool_name: toolName,
      tool_args: redactedArgs,
      tool_call_id: toolCallId,
      timestamp
    };
  }

  /**
   * F)2 - Redacter arguments sensibles
   */
  private static redactSensitiveArgs(args: any): any {
    if (!args || typeof args !== 'object') return args;
    
    const sensitiveKeys = ['token', 'api_key', 'password', 'secret', 'auth', 'key'];
    const redacted = { ...args };
    
    for (const key of Object.keys(redacted)) {
      const value = redacted[key];
      
      // Redacter les clés sensibles
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        redacted[key] = '[REDACTED]';
        continue;
      }
      
      // Couper les strings > 256 chars
      if (typeof value === 'string' && value.length > 256) {
        redacted[key] = value.substring(0, 256) + '...';
        continue;
      }
      
      // Récursion pour les objets imbriqués
      if (typeof value === 'object' && value !== null) {
        redacted[key] = this.redactSensitiveArgs(value);
      }
    }
    
    return redacted;
  }

  /**
   * Analyser le résultat brut et dériver code/message
   */
  private static analyzeRawResult(rawResult: any): {
    success: boolean;
    code?: string;
    message?: string;
    details?: any;
  } {
    // Si le résultat est déjà normalisé
    if (rawResult && typeof rawResult === 'object') {
      if (rawResult.success !== undefined) {
        return {
          success: rawResult.success,
          code: rawResult.code,
          message: rawResult.message,
          details: rawResult.details || rawResult
        };
      }
    }

    // Analyser les erreurs communes
    const errorAnalysis = this.analyzeError(rawResult);
    if (errorAnalysis) {
      return errorAnalysis;
    }

    // Succès par défaut
    return {
      success: true,
      code: 'SUCCESS',
      message: 'Opération réussie',
      details: rawResult
    };
  }

  /**
   * Analyser les erreurs et dériver le code
   */
  private static analyzeError(result: any): {
    success: boolean;
    code: string;
    message: string;
    details?: any;
  } | null {
    if (!result) return null;

    const resultStr = typeof result === 'string' ? result : JSON.stringify(result);
    const lowerResult = resultStr.toLowerCase();

    // Patterns d'erreur connus
    const errorPatterns = [
      { pattern: /not found|not_found|404/i, code: 'NOT_FOUND', message: 'Ressource introuvable' },
      { pattern: /forbidden|403|unauthorized|401/i, code: 'FORBIDDEN', message: 'Accès refusé' },
      { pattern: /validation|invalid|malformed/i, code: 'VALIDATION_ERROR', message: 'Données invalides' },
      { pattern: /timeout|timed out/i, code: 'TIMEOUT', message: 'Délai d\'attente dépassé' },
      { pattern: /rate limit|too many requests/i, code: 'RATE_LIMIT', message: 'Limite de taux dépassée' },
      { pattern: /network|connection|fetch/i, code: 'NETWORK_ERROR', message: 'Erreur réseau' },
      { pattern: /rls|row level security/i, code: 'RLS_DENIED', message: 'Accès refusé par la sécurité' }
    ];

    for (const { pattern, code, message } of errorPatterns) {
      if (pattern.test(lowerResult)) {
        return {
          success: false,
          code,
          message,
          details: result
        };
      }
    }

    // Erreur générique si on a un message d'erreur mais pas de pattern reconnu
    if (typeof result === 'string' && result.length > 0) {
      return {
        success: false,
        code: 'UNKNOWN',
        message: result.length > 100 ? result.substring(0, 100) + '...' : result,
        details: result
      };
    }

    return null;
  }

  /**
   * B)1 - Déduplication des tool calls
   */
  static createToolCallSignature(toolCall: any): string {
    const { name, function: func } = toolCall;
    if (!func || !func.arguments) return `${name}::{}`;
    
    try {
      const args = JSON.parse(func.arguments);
      const sortedArgs = this.sortObjectKeys(args);
      return `${name}::${JSON.stringify(sortedArgs)}`;
    } catch (error) {
      logger.warn(`[ToolResultNormalizer] ⚠️ Erreur parsing arguments:`, error);
      return `${name}::${func.arguments}`;
    }
  }

  /**
   * Trier les clés d'un objet pour la déduplication
   */
  private static sortObjectKeys(obj: any): any {
    if (typeof obj !== 'object' || obj === null) return obj;
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.sortObjectKeys(item));
    }
    
    const sorted: any = {};
    Object.keys(obj).sort().forEach(key => {
      sorted[key] = this.sortObjectKeys(obj[key]);
    });
    
    return sorted;
  }

  /**
   * B)2 - Validation JSON des arguments
   */
  static validateToolArguments(toolCall: any): { isValid: boolean; error?: string } {
    const { function: func } = toolCall;
    if (!func || !func.arguments) {
      return { isValid: false, error: 'Arguments manquants' };
    }
    
    try {
      JSON.parse(func.arguments);
      return { isValid: true };
    } catch (error) {
      return { 
        isValid: false, 
        error: `Arguments JSON invalides: ${error instanceof Error ? error.message : 'Erreur inconnue'}` 
      };
    }
  }
} 