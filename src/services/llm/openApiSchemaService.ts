/**
 * Service pour convertir les schémas OpenAPI en tools function
 * 
 * Lit les schémas depuis la table openapi_schemas et les convertit
 * en format OpenAI function calling pour les LLMs (xAI, etc.)
 */

import { createClient } from '@supabase/supabase-js';
import { simpleLogger as logger } from '@/utils/logger';
import type { Tool } from './types/strictTypes';

/**
 * Lazy-load du client Supabase pour éviter les erreurs d'init
 */
function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Structure d'un schéma OpenAPI en BDD
 */
interface OpenAPISchema {
  id: string;
  name: string;
  description: string;
  version: string;
  content: Record<string, unknown>;
  status: string;
  tags: string[];
}

/**
 * Service pour gérer les schémas OpenAPI
 */
export class OpenAPISchemaService {
  private static instance: OpenAPISchemaService;
  private schemasCache: Map<string, Tool[]> = new Map();
  private cacheTimestamp: number = 0;
  private readonly CACHE_TTL = 300000; // 5 minutes

  private constructor() {}

  static getInstance(): OpenAPISchemaService {
    if (!OpenAPISchemaService.instance) {
      OpenAPISchemaService.instance = new OpenAPISchemaService();
    }
    return OpenAPISchemaService.instance;
  }

  /**
   * ✅ NOUVEAU : Récupère les tools depuis un schéma par ID
   */
  async getToolsFromSchemaById(schemaId: string): Promise<Tool[]> {
    try {
      const cacheKey = `id:${schemaId}`;
      
      // Vérifier le cache
      const now = Date.now();
      if (this.schemasCache.has(cacheKey) && now - this.cacheTimestamp < this.CACHE_TTL) {
        logger.dev(`[OpenAPISchemaService] ✅ Cache hit pour schema ID ${schemaId}`);
        return this.schemasCache.get(cacheKey)!;
      }

      logger.dev(`[OpenAPISchemaService] 📥 Chargement du schéma ${schemaId} depuis BDD...`);

      // Récupérer depuis la BDD
      const supabase = getSupabaseClient();
      const { data: schema, error } = await supabase
        .from('openapi_schemas')
        .select('*')
        .eq('id', schemaId)
        .eq('status', 'active')
        .single();

      if (error || !schema) {
        logger.error(`[OpenAPISchemaService] ❌ Schéma ID ${schemaId} non trouvé:`, error);
        return [];
      }

      logger.dev(`[OpenAPISchemaService] ✅ Schéma chargé: ${schema.name} v${schema.version}`);

      // Convertir en tools avec nom du schéma pour contexte
      const tools = this.convertOpenAPIToTools(schema.content, schema.name);

      // Mettre en cache
      this.schemasCache.set(cacheKey, tools);
      this.cacheTimestamp = now;

      logger.dev(`[OpenAPISchemaService] ✅ ${tools.length} tools générés depuis le schéma`);

      return tools;

    } catch (error) {
      logger.error('[OpenAPISchemaService] ❌ Erreur lors du chargement par ID:', error);
      return [];
    }
  }

  /**
   * Récupère les tools depuis un schéma OpenAPI par nom
   */
  async getToolsFromSchema(schemaName: string = 'scrivia-api-v2'): Promise<Tool[]> {
    try {
      const cacheKey = `name:${schemaName}`;
      
      // Vérifier le cache
      const now = Date.now();
      if (this.schemasCache.has(cacheKey) && now - this.cacheTimestamp < this.CACHE_TTL) {
        logger.dev(`[OpenAPISchemaService] ✅ Cache hit pour ${schemaName}`);
        return this.schemasCache.get(cacheKey)!;
      }

      logger.dev(`[OpenAPISchemaService] 📥 Chargement du schéma ${schemaName} depuis BDD...`);

      // Récupérer depuis la BDD
      const supabase = getSupabaseClient();
      const { data: schema, error } = await supabase
        .from('openapi_schemas')
        .select('*')
        .eq('name', schemaName)
        .eq('status', 'active')
        .single();

      if (error || !schema) {
        logger.error(`[OpenAPISchemaService] ❌ Schéma ${schemaName} non trouvé:`, error);
        return [];
      }

      logger.dev(`[OpenAPISchemaService] ✅ Schéma chargé: ${schema.name} v${schema.version}`);

      // Convertir en tools avec nom du schéma pour contexte
      const tools = this.convertOpenAPIToTools(schema.content, schema.name);

      // Mettre en cache
      this.schemasCache.set(cacheKey, tools);
      this.cacheTimestamp = now;

      logger.dev(`[OpenAPISchemaService] ✅ ${tools.length} tools générés depuis le schéma`);

      return tools;

    } catch (error) {
      logger.error('[OpenAPISchemaService] ❌ Erreur lors du chargement:', error);
      return [];
    }
  }

  /**
   * Convertit un schéma OpenAPI en array de tools function
   * @param openApiContent - Contenu du schéma OpenAPI
   * @param schemaName - Nom du schéma pour contexte (optionnel, enrichit les descriptions)
   */
  private convertOpenAPIToTools(openApiContent: Record<string, unknown>, schemaName?: string): Tool[] {
    const tools: Tool[] = [];

    try {
      const paths = openApiContent.paths as Record<string, Record<string, unknown>> | undefined;

      if (!paths) {
        logger.warn('[OpenAPISchemaService] ⚠️ Aucun path trouvé dans le schéma');
        return [];
      }

      // Parser chaque path et méthode
      for (const [pathName, pathItem] of Object.entries(paths)) {
        const pathMethods = pathItem as Record<string, unknown>;

        for (const [method, operation] of Object.entries(pathMethods)) {
          // Ignorer les clés spéciales
          if (['parameters', 'servers', '$ref'].includes(method)) {
            continue;
          }

          const op = operation as Record<string, unknown>;

          // Extraire les infos de l'opération
          const operationId = op.operationId as string | undefined;
          const summary = op.summary as string | undefined;
          const description = op.description as string | undefined;
          const tags = op.tags as string[] | undefined;

          if (!operationId) {
            logger.warn(`[OpenAPISchemaService] ⚠️ Opération sans operationId: ${method} ${pathName}`);
            continue;
          }

          // Construire les paramètres du tool
          const parameters = this.buildToolParameters(op, pathName);

          // ✅ WORKAROUND : Exclure les tools trop complexes pour xAI
          const excludedTools = [
            'applyContentOperations', // Trop complexe (nested objects profonds)
          ];

          if (excludedTools.includes(operationId)) {
            logger.dev(`[OpenAPISchemaService] ⚠️ Tool exclu (trop complexe): ${operationId}`);
            continue;
          }

          // ✅ Enrichir la description avec le nom du schéma pour contexte LLM
          let enrichedDescription = description || summary || `${method.toUpperCase()} ${pathName}`;
          
          if (schemaName) {
            // Normaliser le nom du schéma pour affichage
            const displayName = schemaName
              .replace(/-/g, ' ')
              .replace(/api/gi, '')
              .replace(/v\d+/gi, '')
              .trim()
              .toUpperCase();
            
            enrichedDescription = `[${displayName}] ${enrichedDescription}`;
          }

          // Créer le tool
          const tool: Tool = {
            type: 'function',
            function: {
              name: operationId,
              description: enrichedDescription,
              parameters: parameters
            }
          };

          tools.push(tool);

          logger.dev(`[OpenAPISchemaService] ✅ Tool créé: ${operationId} (${method.toUpperCase()} ${pathName})`);
        }
      }

      logger.dev(`[OpenAPISchemaService] ✅ Total: ${tools.length} tools générés`);

      return tools;

    } catch (error) {
      logger.error('[OpenAPISchemaService] ❌ Erreur lors de la conversion:', error);
      return [];
    }
  }

  /**
   * Construit les paramètres d'un tool depuis une opération OpenAPI
   * ✅ CLEAN : Supprime les champs non-standard pour xAI
   * ✅ FIXED : Déduplique les paramètres required pour éviter ["ref", "ref"]
   */
  private buildToolParameters(
    operation: Record<string, unknown>,
    pathName: string
  ): {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  } {
    const properties: Record<string, unknown> = {};
    const required: string[] = [];

    // 1. Paramètres de path (ex: /note/{ref})
    const pathParams = this.extractPathParameters(pathName);
    for (const param of pathParams) {
      properties[param] = {
        type: 'string',
        description: `Paramètre de path: ${param}`
      };
      required.push(param);
    }

    // 2. Paramètres d'URL (query params et path params depuis OpenAPI spec)
    const parameters = operation.parameters as Array<Record<string, unknown>> | undefined;
    if (parameters) {
      for (const param of parameters) {
        const name = param.name as string;
        const paramIn = param.in as string | undefined;
        const paramSchema = param.schema as Record<string, unknown> | undefined;
        const isRequired = param.required as boolean | undefined;

        if (name && paramSchema) {
          // ✅ Enrichir la description des path params (déjà ajoutés à l'étape 1)
          if (paramIn === 'path' && properties[name]) {
            properties[name] = this.cleanSchemaForXAI({
              ...paramSchema,
              description: param.description as string | undefined || `Paramètre de path: ${name}`
            });
          } else {
            // Query params ou autres
            properties[name] = this.cleanSchemaForXAI({
              ...paramSchema,
              description: param.description as string | undefined
            });
          }

          if (isRequired) {
            required.push(name);
          }
        }
      }
    }

    // 3. Body parameters (requestBody)
    const requestBody = operation.requestBody as Record<string, unknown> | undefined;
    if (requestBody) {
      const content = requestBody.content as Record<string, unknown> | undefined;
      const jsonContent = content?.['application/json'] as Record<string, unknown> | undefined;
      const bodySchema = jsonContent?.schema as Record<string, unknown> | undefined;

      if (bodySchema) {
        const bodyProperties = bodySchema.properties as Record<string, unknown> | undefined;
        const bodyRequired = bodySchema.required as string[] | undefined;

        if (bodyProperties) {
          // ✅ Nettoyer chaque property
          for (const [key, value] of Object.entries(bodyProperties)) {
            properties[key] = this.cleanSchemaForXAI(value as Record<string, unknown>);
          }
        }

        if (bodyRequired) {
          required.push(...bodyRequired);
        }
      }
    }

    // ✅ CRITICAL FIX : Dédupliquer le array required
    // Les path parameters peuvent être ajoutés deux fois :
    // - Une fois depuis extractPathParameters()
    // - Une fois depuis operation.parameters
    const uniqueRequired = [...new Set(required)];

    return {
      type: 'object',
      properties,
      ...(uniqueRequired.length > 0 && { required: uniqueRequired })
    };
  }

  /**
   * ✅ NOUVEAU : Nettoie un schéma JSON pour être compatible xAI
   * 
   * xAI supporte uniquement les champs basiques de JSON Schema:
   * - type, description, enum, items, properties, required
   * 
   * Supprime: format, maxLength, minLength, minimum, maximum, default, pattern, etc.
   */
  private cleanSchemaForXAI(schema: Record<string, unknown>): Record<string, unknown> {
    if (!schema || typeof schema !== 'object') {
      return schema;
    }

    const cleaned: Record<string, unknown> = {};

    // ✅ Champs autorisés par xAI (whitelist stricte)
    const allowedFields = ['type', 'description', 'enum', 'items', 'properties', 'required'];

    for (const [key, value] of Object.entries(schema)) {
      // ✅ Filtrer uniquement les champs autorisés
      if (!allowedFields.includes(key)) {
        continue; // Skip les champs non autorisés
      }

      if (key === 'items' && typeof value === 'object' && value !== null) {
        // Nettoyer récursivement les items (pour les arrays)
        cleaned.items = this.cleanSchemaForXAI(value as Record<string, unknown>);
      } else if (key === 'properties' && typeof value === 'object' && value !== null) {
        // Nettoyer récursivement les properties (pour les objects)
        const props = value as Record<string, unknown>;
        cleaned.properties = {};
        for (const [propKey, propValue] of Object.entries(props)) {
          (cleaned.properties as Record<string, unknown>)[propKey] = this.cleanSchemaForXAI(propValue as Record<string, unknown>);
        }
      } else {
        cleaned[key] = value;
      }
    }

    return cleaned;
  }

  /**
   * Extrait les paramètres de path (ex: {ref}, {id})
   */
  private extractPathParameters(pathName: string): string[] {
    const matches = pathName.match(/\{([^}]+)\}/g);
    if (!matches) return [];

    return matches.map(match => match.slice(1, -1)); // Supprimer les {}
  }

  /**
   * Extraire les endpoints du schéma OpenAPI
   */
  private extractEndpointsFromSchema(
    content: Record<string, unknown>, 
    apiKey?: string, 
    headerName?: string,
    baseUrl?: string
  ): Map<string, { method: string; path: string; apiKey?: string; headerName?: string; baseUrl: string }> {
    const endpoints = new Map<string, { method: string; path: string; apiKey?: string; headerName?: string; baseUrl: string }>();
    
    try {
      const paths = content.paths as Record<string, Record<string, unknown>> | undefined;

      if (!paths || typeof paths !== 'object') {
        logger.warn(`[OpenAPISchemaService] ⚠️ Aucun path trouvé dans le schéma OpenAPI`);
        return endpoints;
      }

      // Parser chaque path et méthode
      for (const [pathName, pathItem] of Object.entries(paths)) {
        if (!pathItem || typeof pathItem !== 'object') {
          logger.warn(`[OpenAPISchemaService] ⚠️ PathItem invalide pour ${pathName}`);
          continue;
        }

        const pathMethods = pathItem as Record<string, unknown>;

        for (const [method, operation] of Object.entries(pathMethods)) {
          // Ignorer les clés spéciales
          if (['parameters', 'servers', '$ref'].includes(method)) {
            continue;
          }

          if (!operation || typeof operation !== 'object') {
            continue;
          }

          const op = operation as Record<string, unknown>;
          const operationId = op.operationId as string | undefined;

          if (operationId && typeof operationId === 'string') {
            endpoints.set(operationId, {
              method: method.toUpperCase(),
              path: pathName,
              apiKey,
              headerName,
              baseUrl: baseUrl || ''
            });
          }
        }
      }

      return endpoints;

    } catch (error) {
      logger.error('[OpenAPISchemaService] ❌ Erreur extraction endpoints:', error);
      return endpoints;
    }
  }

  /**
   * Détecter le nom du header d'authentification selon l'URL
   */
  private detectHeaderNameFromUrl(baseUrl: string): string {
    if (baseUrl.includes('pexels.com')) {
      return 'Authorization';
    }
    if (baseUrl.includes('exa.ai')) {
      return 'x-api-key';
    }
    // Par défaut, utiliser Authorization
    return 'Authorization';
  }

  /**
   * ✅ NOUVEAU : Récupère tools ET endpoints depuis plusieurs schémas
   * Évite le parsing dupliqué entre tools et endpoints
   */
  async getToolsAndEndpointsFromSchemas(
    schemaIds: string[]
  ): Promise<{
    tools: Tool[];
    endpoints: Map<string, { method: string; path: string; apiKey?: string; headerName?: string; baseUrl: string }>;
  }> {
    try {
      if (schemaIds.length === 0) {
        return { tools: [], endpoints: new Map() };
      }

      logger.dev(`[OpenAPISchemaService] 📥 Chargement de ${schemaIds.length} schémas...`);

      // Récupérer tous les schémas depuis la BDD
      const supabase = getSupabaseClient();
      const { data: schemas, error } = await supabase
        .from('openapi_schemas')
        .select('id, name, version, content, api_key, header')
        .in('id', schemaIds)
        .eq('status', 'active');

      if (error || !schemas || schemas.length === 0) {
        logger.error(`[OpenAPISchemaService] ❌ Erreur chargement schémas:`, error);
        return { tools: [], endpoints: new Map() };
      }

      const allTools: Tool[] = [];
      const allEndpoints = new Map<string, { method: string; path: string; apiKey?: string; headerName?: string; baseUrl: string }>();

      // Parser chaque schéma
      for (const schema of schemas) {
        const content = schema.content as Record<string, unknown>;
        if (!content || typeof content !== 'object') {
          logger.warn(`[OpenAPISchemaService] ⚠️ Contenu invalide pour schéma ${schema.id}`);
          continue;
        }

        // Extraire baseUrl
        const servers = content.servers as Array<{ url: string }> | undefined;
        const baseUrl = servers?.[0]?.url || '';
        
        if (!baseUrl) {
          logger.warn(`[OpenAPISchemaService] ⚠️ URL de base manquante pour schéma ${schema.id}`);
          continue;
        }

        // Validation URL
        try {
          new URL(baseUrl);
        } catch {
          logger.warn(`[OpenAPISchemaService] ⚠️ URL invalide: ${baseUrl}`);
          continue;
        }

        // Headers et API key
        const apiKey = schema.api_key || undefined;
        const headerName = schema.header || this.detectHeaderNameFromUrl(baseUrl);

        // Convertir en tools avec nom du schéma pour contexte
        const tools = this.convertOpenAPIToTools(content, schema.name);
        allTools.push(...tools);

        // Extraire endpoints
        const endpoints = this.extractEndpointsFromSchema(content, apiKey, headerName, baseUrl);
        endpoints.forEach((value, key) => allEndpoints.set(key, value));
      }

      logger.dev(`[OpenAPISchemaService] ✅ ${allTools.length} tools et ${allEndpoints.size} endpoints extraits`);

      return { tools: allTools, endpoints: allEndpoints };

    } catch (error) {
      logger.error('[OpenAPISchemaService] ❌ Erreur:', error);
      return { tools: [], endpoints: new Map() };
    }
  }

  /**
   * Invalide le cache (forcer un rechargement)
   */
  invalidateCache(): void {
    this.schemasCache.clear();
    this.cacheTimestamp = 0;
    logger.dev('[OpenAPISchemaService] 🔄 Cache invalidé');
  }

  /**
   * Liste tous les schémas disponibles
   */
  async listSchemas(): Promise<OpenAPISchema[]> {
    try {
      const supabase = getSupabaseClient();
      const { data: schemas, error } = await supabase
        .from('openapi_schemas')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('[OpenAPISchemaService] ❌ Erreur lors de la liste des schémas:', error);
        return [];
      }

      return schemas || [];

    } catch (error) {
      logger.error('[OpenAPISchemaService] ❌ Erreur:', error);
      return [];
    }
  }
}

/**
 * Instance singleton
 */
export const openApiSchemaService = OpenAPISchemaService.getInstance();

