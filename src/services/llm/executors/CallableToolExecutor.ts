/**
 * CallableToolExecutor - Exécuteur pour les callables Synesia
 * Gère l'exécution des callables via l'endpoint Synesia /execution/{callable_id}
 * 
 * Utilisé pour les providers non-Liminality (Groq, XAI, etc.) qui ne supportent
 * pas nativement les callables Synesia.
 */

import { ToolCall, ToolResult } from '../types/apiV2Types';
import { simpleLogger as logger } from '@/utils/logger';
import { TOOL_CALL_LIMITS } from '../config/constants';
import { getLLMConfig } from '../config';
import { parseToolArgumentsSafe } from '../schemas';

/**
 * Requête d'exécution d'un callable
 */
interface CallableExecutionRequest {
  args?: Record<string, unknown>;
  settings?: Record<string, unknown>;
}

/**
 * Réponse d'exécution d'un callable (asynchrone)
 */
interface CallableExecutionAsyncResponse {
  run_id: string;
}

/**
 * Réponse d'exécution d'un callable (synchrone)
 * D'après l'API, result peut être directement une string ou un objet
 */
interface CallableExecutionSyncResponse {
  run_id: string;
  result: string | {
    status: string;
    output: unknown;
  };
}

/**
 * Réponse d'erreur d'exécution
 */
interface CallableExecutionErrorResponse {
  run_id: string;
  result: null;
  error: string;
}

type CallableExecutionResponse = 
  | CallableExecutionAsyncResponse 
  | CallableExecutionSyncResponse 
  | CallableExecutionErrorResponse;

/**
 * Exécuteur de callables Synesia
 */
export class CallableToolExecutor {
  private readonly callableMapping: Map<string, string>;
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(callableMapping: Map<string, string>) {
    this.callableMapping = callableMapping;

    // Récupérer la configuration depuis LLM config (même que Liminality)
    const config = getLLMConfig();
    this.apiKey = config.providers.liminality.apiKey;
    this.baseUrl = config.providers.liminality.baseUrl;

    if (!this.apiKey) {
      throw new Error('LIMINALITY_API_KEY manquante dans la configuration');
    }

    if (!this.baseUrl) {
      throw new Error('LIMINALITY_BASE_URL manquante dans la configuration');
    }

    logger.dev(`[CallableToolExecutor] ✅ Exécuteur initialisé avec ${this.callableMapping.size} callables`);
  }

  /**
   * Exécuter un tool call de callable
   * 
   * @param toolCall - Tool call à exécuter
   * @param userToken - Token utilisateur (non utilisé pour Synesia mais gardé pour compatibilité)
   * @returns Résultat de l'exécution
   */
  async executeToolCall(toolCall: ToolCall, userToken: string): Promise<ToolResult> {
    const { id, function: func } = toolCall;
    const startTime = Date.now();

    try {
      // Validation des paramètres d'entrée
      if (!toolCall || !func || !func.name) {
        throw new Error('Tool call invalide: fonction manquante');
      }

      // Récupérer le callable_id depuis le mapping
      const callableId = this.callableMapping.get(func.name);
      if (!callableId) {
        throw new Error(`Callable non trouvé pour le tool: ${func.name}`);
      }

      logger.info(`[CallableToolExecutor] 🚀 Exécution callable: ${func.name} (${callableId})`);

      // Parser les arguments
      const args = this.parseArguments(func.arguments, func.name);

      // Construire la requête
      const requestBody = this.buildRequestBody(args);

      // Construire l'URL avec callable_id dans le path et wait=true pour réponse synchrone
      // wait=true permet d'attendre la fin de l'exécution et de recevoir le résultat
      // wait=false retourne seulement le run_id (mode async)
      const waitParam = args.wait !== undefined ? String(args.wait) : 'true';
      const url = `${this.baseUrl}/execution/${callableId}?wait=${waitParam}`;

      logger.dev(`[CallableToolExecutor] 🔧 URL construite: ${url}`);

      // Exécuter l'appel HTTP
      const response = await this.executeCallable(url, requestBody);

      const executionTime = Date.now() - startTime;
      logger.info(`[CallableToolExecutor] ✅ Callable exécuté: ${func.name} (${executionTime}ms)`);

      // ✅ Extraire le résultat depuis la réponse
      const resultContent = this.extractResultFromResponse(response);

      return {
        tool_call_id: id,
        name: func.name,
        content: JSON.stringify(resultContent),
        success: true
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      logger.error(`[CallableToolExecutor] ❌ Callable failed: ${func.name} (${executionTime}ms)`, error);

      return {
        tool_call_id: id,
        name: func.name,
        content: JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Erreur inconnue'
        }),
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Exécute l'appel HTTP vers l'endpoint Synesia
   * 
   * @param url - URL complète avec callable_id
   * @param requestBody - Corps de la requête
   * @returns Réponse de l'API
   */
  private async executeCallable(
    url: string,
    requestBody: CallableExecutionRequest
  ): Promise<CallableExecutionResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      TOOL_CALL_LIMITS.DEFAULT_TOOL_TIMEOUT_MS
    );

    try {
      // Construire les headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey
      };

      logger.info(`[CallableToolExecutor] 🔧 Appel: POST ${url}`, {
        url,
        hasWaitParam: url.includes('wait='),
        waitValue: url.includes('wait=true') ? 'true' : url.includes('wait=false') ? 'false' : 'unknown'
      });

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText);
        logger.error(`[CallableToolExecutor] ❌ Erreur HTTP ${response.status}:`, errorText);

        // Gérer les erreurs spécifiques
        if (response.status === 404) {
          throw new Error(`Callable non trouvé (404): ${errorText}`);
        }
        if (response.status === 401) {
          throw new Error(`Authentification invalide (401): ${errorText}`);
        }
        if (response.status === 400) {
          throw new Error(`Requête invalide (400): ${errorText}`);
        }
        if (response.status === 500) {
          throw new Error(`Erreur serveur (500): ${errorText}`);
        }

        throw new Error(`HTTP ${response.status}: ${response.statusText}\n\nDétails:\n${errorText}`);
      }

      // Parser la réponse JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        logger.warn(`[CallableToolExecutor] ⚠️ Réponse non-JSON: ${contentType}`);
        throw new Error(`Réponse non-JSON: ${contentType}`);
      }

      try {
        const jsonData = await response.json() as CallableExecutionResponse;
        logger.info(`[CallableToolExecutor] ✅ Réponse JSON parsée`, {
          hasRunId: 'run_id' in jsonData,
          hasResult: 'result' in jsonData && jsonData.result !== null && jsonData.result !== undefined,
          hasError: 'error' in jsonData,
          resultType: 'result' in jsonData && jsonData.result !== null && jsonData.result !== undefined 
            ? typeof jsonData.result 
            : 'none'
        });
        return jsonData;
      } catch (parseError) {
        logger.error(`[CallableToolExecutor] ❌ Erreur parsing JSON:`, parseError);
        throw new Error(`Réponse JSON invalide: ${parseError instanceof Error ? parseError.message : 'Erreur inconnue'}`);
      }
    } catch (error) {
      clearTimeout(timeout);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Timeout: La requête a dépassé ${TOOL_CALL_LIMITS.DEFAULT_TOOL_TIMEOUT_MS / 1000} secondes`);
      }
      throw error;
    }
  }

  /**
   * Extrait le résultat depuis la réponse de l'API
   * 
   * @param response - Réponse de l'API Synesia
   * @returns Contenu formaté pour le ToolResult
   */
  private extractResultFromResponse(response: CallableExecutionResponse): unknown {
    // Vérifier si c'est une réponse synchrone avec result
    if ('result' in response && response.result !== null && response.result !== undefined) {
      const syncResponse = response as CallableExecutionSyncResponse;
      
      // result peut être une string directement ou un objet avec status/output
      if (typeof syncResponse.result === 'string') {
        logger.dev(`[CallableToolExecutor] ✅ Résultat synchrone extrait (string, length: ${syncResponse.result.length})`);
        return {
          run_id: syncResponse.run_id,
          result: syncResponse.result
        };
      }
      
      if (typeof syncResponse.result === 'object' && 'status' in syncResponse.result && 'output' in syncResponse.result) {
        logger.dev(`[CallableToolExecutor] ✅ Résultat synchrone extrait (object, status: ${syncResponse.result.status})`);
        return {
          run_id: syncResponse.run_id,
          status: syncResponse.result.status,
          output: syncResponse.result.output
        };
      }
      
      // Cas inattendu : retourner tel quel
      logger.warn(`[CallableToolExecutor] ⚠️ Format de résultat inattendu, retourné tel quel`);
      return {
        run_id: syncResponse.run_id,
        result: syncResponse.result
      };
    }
    
    // Erreur d'exécution
    if ('error' in response && response.error) {
      const errorResponse = response as CallableExecutionErrorResponse;
      logger.warn(`[CallableToolExecutor] ⚠️ Erreur dans la réponse: ${errorResponse.error}`);
      return {
        run_id: errorResponse.run_id,
        error: errorResponse.error
      };
    }
    
    // Mode async : seulement run_id
    const asyncResponse = response as CallableExecutionAsyncResponse;
    logger.warn(`[CallableToolExecutor] ⚠️ Réponse async (seulement run_id). Attendu wait=true pour résultat synchrone.`);
    return {
      run_id: asyncResponse.run_id,
      message: 'Exécution lancée en mode asynchrone. Utilisez wait=true pour obtenir le résultat.'
    };
  }

  /**
   * Construit le corps de la requête depuis les arguments du tool call
   * 
   * @param args - Arguments parsés du tool call
   * @returns Corps de la requête formaté
   */
  private buildRequestBody(args: Record<string, unknown>): CallableExecutionRequest {
    const requestBody: CallableExecutionRequest = {};

    // Exclure 'wait' du body car c'est un query parameter
    const { wait, ...argsWithoutWait } = args;

    // Si args est présent, l'utiliser directement
    if (argsWithoutWait.args && typeof argsWithoutWait.args === 'object' && !Array.isArray(argsWithoutWait.args)) {
      requestBody.args = argsWithoutWait.args as Record<string, unknown>;
    } else if (Object.keys(argsWithoutWait).length > 0) {
      // Sinon, utiliser tous les args (sans wait) comme args du callable
      requestBody.args = argsWithoutWait;
    }

    // Si settings est présent, l'ajouter
    if (argsWithoutWait.settings && typeof argsWithoutWait.settings === 'object' && !Array.isArray(argsWithoutWait.settings)) {
      requestBody.settings = argsWithoutWait.settings as Record<string, unknown>;
    }

    return requestBody;
  }

  /**
   * Parse et valide les arguments JSON
   * 
   * @param argumentsStr - Arguments en string JSON
   * @param toolName - Nom du tool pour logging
   * @returns Arguments parsés
   */
  private parseArguments(argumentsStr: string, toolName: string): Record<string, unknown> {
    try {
      // Validation du type
      if (typeof argumentsStr !== 'string') {
        throw new Error(`Arguments doivent être une chaîne JSON, reçu: ${typeof argumentsStr}`);
      }

      const parsed = parseToolArgumentsSafe(argumentsStr || '{}');

      // Validation que c'est bien un objet
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error(`Arguments doivent être un objet JSON, reçu: ${typeof parsed}`);
      }
      
      // Nettoyer les paramètres null et undefined
      const cleaned: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(parsed)) {
        if (value !== null && value !== undefined) {
          cleaned[key] = value;
        }
      }

      logger.dev(`[CallableToolExecutor] 🧹 Arguments nettoyés: ${Object.keys(cleaned).length} paramètres`);

      return cleaned;
    } catch (error) {
      logger.error(`[CallableToolExecutor] ❌ Erreur parsing arguments pour ${toolName}:`, error);
      throw new Error(`Arguments JSON invalides pour ${toolName}: ${error instanceof Error ? error.message : 'erreur inconnue'}`);
    }
  }
}
