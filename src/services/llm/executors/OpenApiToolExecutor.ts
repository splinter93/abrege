/**
 * OpenApiToolExecutor - Exécuteur pour les tools OpenAPI
 * Gère l'exécution des tools basés sur des schémas OpenAPI externes
 */

import { ToolCall, ToolResult } from '../types/apiV2Types';
import { simpleLogger as logger } from '@/utils/logger';

/**
 * Type pour les endpoints OpenAPI
 */
interface OpenApiEndpoint {
  method: string;
  path: string;
  apiKey?: string;
  headerName?: string;
}

/**
 * Exécuteur de tools OpenAPI
 * Fait des appels HTTP vers les APIs externes définies dans les schémas OpenAPI
 */
export class OpenApiToolExecutor {
  private readonly baseUrl: string;
  public readonly endpoints: Map<string, OpenApiEndpoint>;

  constructor(baseUrl?: string, endpoints?: Map<string, OpenApiEndpoint>) {
    this.baseUrl = baseUrl || '';
    this.endpoints = endpoints || new Map();
    
    // Validation : avertir si l'URL de base ou les endpoints sont vides
    if (!this.baseUrl) {
      logger.warn(`[OpenApiToolExecutor] ⚠️ Exécuteur créé sans URL de base`);
    }
    if (this.endpoints.size === 0) {
      logger.warn(`[OpenApiToolExecutor] ⚠️ Exécuteur créé sans endpoints configurés`);
    }
  }

  /**
   * Exécuter un tool call OpenAPI
   */
  async executeToolCall(toolCall: ToolCall, userToken: string): Promise<ToolResult> {
    const { id, function: func } = toolCall;
    const startTime = Date.now();

    try {
      // Validation des paramètres d'entrée
      if (!toolCall || !func || !func.name) {
        throw new Error('Tool call invalide: fonction manquante');
      }

      logger.info(`[OpenApiToolExecutor] 🚀 Executing OpenAPI tool: ${func.name}`);

      // Parser les arguments avec validation
      const args = this.parseArguments(func.arguments, func.name);
      
      // Exécuter le tool
      const result = await this.executeOpenApiFunction(func.name, args, userToken);

      const executionTime = Date.now() - startTime;
      logger.info(`[OpenApiToolExecutor] ✅ OpenAPI tool executed: ${func.name} (${executionTime}ms)`);

      return {
        tool_call_id: id,
        name: func.name,
        content: JSON.stringify(result),
        success: true,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      logger.error(`[OpenApiToolExecutor] ❌ OpenAPI tool failed: ${func.name} (${executionTime}ms)`, error);

      return {
        tool_call_id: id,
        name: func.name,
        content: JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Erreur inconnue'
        }),
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Exécuter plusieurs tool calls OpenAPI
   */
  async executeToolCalls(toolCalls: ToolCall[], userToken: string): Promise<ToolResult[]> {
    const results: ToolResult[] = [];

    for (const toolCall of toolCalls) {
      try {
        const result = await this.executeToolCall(toolCall, userToken);
        results.push(result);
      } catch (error) {
        logger.error(`[OpenApiToolExecutor] Tool ${toolCall.function.name} failed:`, error);
        results.push({
          tool_call_id: toolCall.id,
          name: toolCall.function.name,
          content: JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Erreur inconnue'
          }),
          success: false,
          error: error instanceof Error ? error.message : 'Erreur inconnue',
          timestamp: new Date().toISOString()
        });
      }
    }

    return results;
  }

  /**
   * Exécuter une fonction OpenAPI spécifique
   */
  private async executeOpenApiFunction(functionName: string, args: Record<string, unknown>, userToken: string): Promise<unknown> {
    // Récupérer l'endpoint depuis la Map
    const endpoint = this.endpoints.get(functionName);

    if (!endpoint) {
      logger.error(`[OpenApiToolExecutor] ❌ Fonction non trouvée dans endpoints: ${functionName}`);
      logger.error(`[OpenApiToolExecutor] 📋 Endpoints disponibles:`, Array.from(this.endpoints.keys()));
      throw new Error(`Fonction OpenAPI non supportée: ${functionName}`);
    }

    logger.dev(`[OpenApiToolExecutor] 🔧 Endpoint trouvé: ${endpoint.method} ${endpoint.path}`);

    // Construire l'URL de l'endpoint
    const url = this.buildEndpointUrl(endpoint, args);
    
    // Construire les headers
    const headers = this.buildHeaders(endpoint, userToken);

    logger.dev(`[OpenApiToolExecutor] 🔧 Headers:`, headers);

    // Validation de l'URL
    try {
      new URL(url);
    } catch (error) {
      throw new Error(`URL invalide: ${url}`);
    }

    // Faire l'appel HTTP avec timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

    try {
      const response = await fetch(url, {
        method: endpoint.method,
        headers,
        body: endpoint.method === 'POST' || endpoint.method === 'PUT' || endpoint.method === 'PATCH' 
          ? JSON.stringify(args) 
          : undefined,
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText);
        logger.error(`[OpenApiToolExecutor] ❌ Erreur HTTP ${response.status}:`, errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Vérifier que la réponse est bien du JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        logger.warn(`[OpenApiToolExecutor] ⚠️ Réponse non-JSON: ${contentType}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeout);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Timeout: La requête a dépassé 30 secondes');
      }
      throw error;
    }
  }


  /**
   * Construire l'URL de l'endpoint
   */
  private buildEndpointUrl(endpoint: { method: string; path: string }, args: Record<string, unknown>): string {
    let url = this.baseUrl + endpoint.path;
    
    // Debug: Afficher l'URL construite
    logger.dev(`[OpenApiToolExecutor] 🔧 URL construite: ${url}`);
    logger.dev(`[OpenApiToolExecutor] 🔧 Base URL: ${this.baseUrl}`);
    logger.dev(`[OpenApiToolExecutor] 🔧 Endpoint path: ${endpoint.path}`);

    if (endpoint.method === 'GET') {
      // Ajouter les paramètres de requête
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(args)) {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      }
      if (params.toString()) {
        url += '?' + params.toString();
      }
    }

    logger.dev(`[OpenApiToolExecutor] 🔧 URL finale: ${url}`);
    return url;
  }

  /**
   * Construire les headers pour l'appel HTTP
   * Combine le nom du header et la clé API
   */
  private buildHeaders(endpoint: OpenApiEndpoint, userToken: string): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Scrivia-OpenAPI-Executor/1.0'
    };

    // Combiner header name + api key (comme dans MCP servers)
    if (endpoint.apiKey && endpoint.headerName) {
      headers[endpoint.headerName] = endpoint.apiKey;
      logger.dev(`[OpenApiToolExecutor] 🔑 Clé API ajoutée au header "${endpoint.headerName}"`);
    } else if (endpoint.apiKey) {
      // Fallback sur Authorization si pas de header name spécifié
      headers['Authorization'] = endpoint.apiKey;
      logger.dev(`[OpenApiToolExecutor] 🔑 Clé API ajoutée au header "Authorization" (fallback)`);
    }

    return headers;
  }


  /**
   * Parser et valider les arguments JSON
   */
  private parseArguments(argumentsStr: string, toolName: string): Record<string, unknown> {
    try {
      // Validation du type
      if (typeof argumentsStr !== 'string') {
        throw new Error(`Arguments doivent être une chaîne JSON, reçu: ${typeof argumentsStr}`);
      }

      const parsed = JSON.parse(argumentsStr || '{}');
      
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

      logger.dev(`[OpenApiToolExecutor] 🧹 Arguments nettoyés: ${Object.keys(cleaned).length} paramètres`);

      return cleaned;
    } catch (error) {
      logger.error(`[OpenApiToolExecutor] ❌ Erreur parsing arguments pour ${toolName}:`, error);
      throw new Error(`Arguments JSON invalides pour ${toolName}: ${error instanceof Error ? error.message : 'erreur inconnue'}`);
    }
  }
}
