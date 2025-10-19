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
   * Récupère les tools depuis un schéma OpenAPI
   */
  async getToolsFromSchema(schemaName: string = 'scrivia-api-v2'): Promise<Tool[]> {
    try {
      // Vérifier le cache
      const now = Date.now();
      if (this.schemasCache.has(schemaName) && now - this.cacheTimestamp < this.CACHE_TTL) {
        logger.dev(`[OpenAPISchemaService] ✅ Cache hit pour ${schemaName}`);
        return this.schemasCache.get(schemaName)!;
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

      // Convertir en tools
      const tools = this.convertOpenAPIToTools(schema.content);

      // Mettre en cache
      this.schemasCache.set(schemaName, tools);
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
   */
  private convertOpenAPIToTools(openApiContent: Record<string, unknown>): Tool[] {
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

          // Créer le tool
          const tool: Tool = {
            type: 'function',
            function: {
              name: operationId,
              description: description || summary || `${method.toUpperCase()} ${pathName}`,
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

    // 2. Paramètres d'URL (query params)
    const parameters = operation.parameters as Array<Record<string, unknown>> | undefined;
    if (parameters) {
      for (const param of parameters) {
        const name = param.name as string;
        const paramSchema = param.schema as Record<string, unknown> | undefined;
        const isRequired = param.required as boolean | undefined;

        if (name && paramSchema) {
          // ✅ Nettoyer le schéma pour xAI
          properties[name] = this.cleanSchemaForXAI({
            ...paramSchema,
            description: param.description as string | undefined
          });

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

    return {
      type: 'object',
      properties,
      ...(required.length > 0 && { required })
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
    const cleaned: Record<string, unknown> = {};

    // ✅ Champs autorisés par xAI
    const allowedFields = ['type', 'description', 'enum', 'items', 'properties', 'required'];

    for (const field of allowedFields) {
      if (field in schema) {
        if (field === 'items' && typeof schema.items === 'object' && schema.items !== null) {
          // Nettoyer récursivement les items (pour les arrays)
          cleaned.items = this.cleanSchemaForXAI(schema.items as Record<string, unknown>);
        } else if (field === 'properties' && typeof schema.properties === 'object' && schema.properties !== null) {
          // Nettoyer récursivement les properties (pour les objects)
          const props = schema.properties as Record<string, unknown>;
          cleaned.properties = {};
          for (const [key, value] of Object.entries(props)) {
            (cleaned.properties as Record<string, unknown>)[key] = this.cleanSchemaForXAI(value as Record<string, unknown>);
          }
        } else {
          cleaned[field] = schema[field];
        }
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

