/**
 * OpenApiToolExecutor - Exécuteur pour les tools OpenAPI
 * Gère l'exécution des tools basés sur des schémas OpenAPI externes
 */

import { ToolCall, ToolResult } from '../types/apiV2Types';
import { simpleLogger as logger } from '@/utils/logger';

/**
 * Type pour les endpoints OpenAPI
 * ✅ STRICT: Types précis pour éviter les erreurs
 * ✅ NOUVEAU: Support des query parameters pour tous les verbes HTTP
 */
interface OpenApiEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  apiKey?: string;
  headerName?: string;
  baseUrl?: string;
  queryParams?: string[]; // Liste des noms de paramètres qui doivent aller dans la query string
}

/**
 * Type pour les résultats d'exécution
 */
interface ExecutionResult {
  success: boolean;
  data?: unknown;
  error?: string;
  statusCode?: number;
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
   * ✅ NOUVEAU : Cleanup pour éviter les memory leaks
   */
  cleanup(): void {
    this.endpoints.clear();
    logger.dev(`[OpenApiToolExecutor] 🧹 Cleanup effectué`);
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
   * ✅ STRICT: Types précis et validation renforcée
   * ✅ NAMESPACE: Support des noms préfixés (ex: pexels__search)
   */
  private async executeOpenApiFunction(functionName: string, args: Record<string, unknown>, userToken: string): Promise<unknown> {
    // ✅ Chercher l'endpoint (peut être préfixé ou non)
    let endpoint = this.endpoints.get(functionName);

    // Si pas trouvé avec le nom complet, essayer d'enlever le préfixe namespace
    if (!endpoint && functionName.includes('__')) {
      const parts = functionName.split('__');
      if (parts.length >= 2) {
        // Prendre tout après le premier '__' (au cas où il y a plusieurs __)
        const originalName = parts.slice(1).join('__');
        endpoint = this.endpoints.get(originalName);
        
        if (endpoint) {
          logger.dev(`[OpenApiToolExecutor] 🔧 Endpoint trouvé avec nom original: ${originalName} (appelé via ${functionName})`);
        }
      }
    }

    if (!endpoint) {
      logger.error(`[OpenApiToolExecutor] ❌ Fonction non trouvée dans endpoints: ${functionName}`);
      logger.error(`[OpenApiToolExecutor] 📋 Endpoints disponibles:`, Array.from(this.endpoints.keys()).slice(0, 10));
      throw new Error(`Fonction OpenAPI non supportée: ${functionName}`);
    }

    logger.dev(`[OpenApiToolExecutor] 🔧 Endpoint trouvé: ${endpoint.method} ${endpoint.path}`);

    // Construire l'URL de l'endpoint
    const url = this.buildEndpointUrl(endpoint, args);
    
    // Construire les headers
    const headers = this.buildHeaders(endpoint, userToken);

    logger.dev(`[OpenApiToolExecutor] 🔧 Headers:`, headers);

    // ✅ STRICT: Validation de l'URL avec types
    try {
      const urlObj = new URL(url);
      logger.dev(`[OpenApiToolExecutor] 🔧 URL validée: ${urlObj.origin}${urlObj.pathname}`);
    } catch (error) {
      throw new Error(`URL invalide: ${url} - ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }

    // Faire l'appel HTTP avec timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

    try {
      // ✅ FIXED: Construire le body correctement (exclure les path params)
      const body = this.buildRequestBody(endpoint, args);
      
      const response = await fetch(url, {
        method: endpoint.method,
        headers,
        body,
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText);
        logger.error(`[OpenApiToolExecutor] ❌ Erreur HTTP ${response.status}:`, errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // ✅ STRICT: Vérifier le content-type et gérer les erreurs de parsing
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        logger.warn(`[OpenApiToolExecutor] ⚠️ Réponse non-JSON: ${contentType}`);
      }

      try {
        const jsonData = await response.json();
        logger.dev(`[OpenApiToolExecutor] ✅ Réponse JSON parsée (${Object.keys(jsonData).length} clés)`);
        return jsonData;
      } catch (parseError) {
        logger.error(`[OpenApiToolExecutor] ❌ Erreur parsing JSON:`, parseError);
        throw new Error(`Réponse non-JSON valide: ${parseError instanceof Error ? parseError.message : 'Erreur inconnue'}`);
      }
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
   * ✅ FIXED: Remplace les path parameters {param} avant d'ajouter les query params
   * ✅ FIXED: Validation des path params manquants
   */
  private buildEndpointUrl(endpoint: OpenApiEndpoint, args: Record<string, unknown>): string {
    // Utiliser baseUrl de l'endpoint si disponible, sinon baseUrl de la classe
    const baseUrl = endpoint.baseUrl || this.baseUrl;
    let path = endpoint.path;
    
    // Debug: Afficher l'URL avant substitution
    logger.dev(`[OpenApiToolExecutor] 🔧 Path original: ${path}`);
    logger.dev(`[OpenApiToolExecutor] 🔧 Base URL: ${baseUrl}`);
    logger.dev(`[OpenApiToolExecutor] 🔧 Arguments:`, args);

    // ✅ CRITICAL FIX: Remplacer les path parameters {param} avec les vraies valeurs
    const usedParams = new Set<string>();
    const missingParams: string[] = [];
    
    // Extraire tous les placeholders du path
    const pathParamMatches = path.match(/\{([^}]+)\}/g) || [];
    const requiredParams = pathParamMatches.map(match => match.slice(1, -1)); // Enlever {}
    
    for (const paramName of requiredParams) {
      const value = args[paramName];
      if (value === undefined || value === null) {
        missingParams.push(paramName);
        continue;
      }
      
      const placeholder = `{${paramName}}`;
      path = path.replace(placeholder, String(value));
      usedParams.add(paramName);
      logger.dev(`[OpenApiToolExecutor] 🔧 Remplacé ${placeholder} par ${value}`);
    }
    
    // ✅ CRITICAL FIX: Valider qu'il ne reste plus de placeholders
    if (path.includes('{')) {
      const remainingPlaceholders = path.match(/\{[^}]+\}/g) || [];
      throw new Error(`Path parameters manquants: ${remainingPlaceholders.join(', ')}`);
    }
    
    if (missingParams.length > 0) {
      throw new Error(`Path parameters requis manquants: ${missingParams.join(', ')}`);
    }

    let url = baseUrl + path;
    logger.dev(`[OpenApiToolExecutor] 🔧 URL après substitution: ${url}`);

    // ✅ NOUVEAU: Ajouter les query parameters pour TOUTES les méthodes HTTP
    // Si l'endpoint définit explicitement des queryParams, on les utilise
    // Sinon (GET legacy), on inclut tous les params qui ne sont pas des path params
    const params = new URLSearchParams();
    
    if (endpoint.queryParams && endpoint.queryParams.length > 0) {
      // Cas 1: L'endpoint définit explicitement des query params (ex: Synesia avec "wait")
      logger.dev(`[OpenApiToolExecutor] 🔧 Query params définis dans le schéma:`, endpoint.queryParams);
      for (const paramName of endpoint.queryParams) {
        const value = args[paramName];
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            for (const item of value) {
              params.append(`${paramName}[]`, String(item));
            }
          } else {
            params.append(paramName, String(value));
          }
        }
      }
    } else if (endpoint.method === 'GET') {
      // Cas 2: GET legacy - tous les params non-path vont dans la query string
      for (const [key, value] of Object.entries(args)) {
        if (!usedParams.has(key) && value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            for (const item of value) {
              params.append(`${key}[]`, String(item));
            }
          } else {
            params.append(key, String(value));
          }
        }
      }
    }

    if (params.toString()) {
      url += '?' + params.toString();
      logger.dev(`[OpenApiToolExecutor] 🔧 Query params ajoutés: ${params.toString()}`);
    }

    logger.dev(`[OpenApiToolExecutor] 🔧 URL finale: ${url}`);
    return url;
  }

  /**
   * ✅ NOUVEAU: Construire le body pour POST/PUT/PATCH
   * Exclut les path parameters ET les query parameters du body
   */
  private buildRequestBody(endpoint: OpenApiEndpoint, args: Record<string, unknown>): string | undefined {
    // Seulement pour les méthodes qui envoient un body
    if (!['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
      return undefined;
    }

    // Extraire les path parameters du path
    const pathParamMatches = endpoint.path.match(/\{([^}]+)\}/g) || [];
    const pathParams = pathParamMatches.map(match => match.slice(1, -1)); // Enlever {}
    
    // Préparer la liste des params à exclure du body
    const excludedParams = new Set<string>(pathParams);
    
    // ✅ NOUVEAU: Exclure aussi les query parameters du body
    if (endpoint.queryParams) {
      for (const queryParam of endpoint.queryParams) {
        excludedParams.add(queryParam);
      }
    }
    
    // Filtrer les args pour exclure les path params et query params
    const bodyArgs: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(args)) {
      if (!excludedParams.has(key)) {
        bodyArgs[key] = value;
      }
    }

    // Si pas de body args, ne pas envoyer de body
    if (Object.keys(bodyArgs).length === 0) {
      return undefined;
    }

    logger.dev(`[OpenApiToolExecutor] 🔧 Body args (${Object.keys(bodyArgs).length}):`, Object.keys(bodyArgs));
    return JSON.stringify(bodyArgs);
  }

  /**
   * Construire les headers pour l'appel HTTP
   * ✅ FIXED: Utilise le userToken pour l'auth utilisateur
   * ✅ CRITICAL: Ne jamais écraser le Bearer token avec l'API Key
   */
  private buildHeaders(endpoint: OpenApiEndpoint, userToken: string): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Scrivia-OpenAPI-Executor/1.0'
    };

    // Détecter si c'est l'API Scrivia
    const isScriviaApi = endpoint.baseUrl?.includes('scrivia.app') || endpoint.baseUrl?.includes('localhost');
    
    // ✅ CRITICAL: Pour l'API Scrivia, utiliser l'API Key + X-User-Id pour impersonation
    if (isScriviaApi && endpoint.apiKey) {
      // API Key pour l'auth
      if (endpoint.headerName) {
        headers[endpoint.headerName] = endpoint.apiKey;
      } else {
        headers['X-API-Key'] = endpoint.apiKey;
      }
      
      // Extraire userId du JWT pour l'impersonation
      if (userToken && userToken.includes('.')) {
        try {
          const jwtPayload = JSON.parse(atob(userToken.split('.')[1]));
          const userId = jwtPayload.sub || jwtPayload.user_id;
          if (userId) {
            headers['X-User-Id'] = userId;
            logger.dev(`[OpenApiToolExecutor] 👤 API Scrivia: X-User-Id=${userId}`);
          }
        } catch (e) {
          logger.warn(`[OpenApiToolExecutor] ⚠️ Impossible d'extraire userId du JWT`);
        }
      }
      
      return headers;
    }

    // Pour les APIs externes (Pexels, Exa, etc.)
    if (endpoint.apiKey && endpoint.headerName) {
      headers[endpoint.headerName] = endpoint.apiKey;
      logger.dev(`[OpenApiToolExecutor] 🔑 API externe: ${endpoint.headerName}`);
    } else if (endpoint.apiKey) {
      headers['X-API-Key'] = endpoint.apiKey;
      logger.dev(`[OpenApiToolExecutor] 🔑 API externe: X-API-Key`);
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
