/**
 * Utilitaire pour parser un schéma OpenAPI et générer des tools au format XAI Voice
 * 
 * Format XAI Voice : format aplati (pas de structure function imbriquée)
 * { type: 'function', name: string, description: string, parameters: {...} }
 */

import { logger, LogCategory } from '@/utils/logger';
import type { XAIVoiceFunctionTool } from '../types';

/**
 * Parse un schéma OpenAPI (JSON string ou object) et génère des tools au format XAI Voice
 * 
 * @param schema - Schéma OpenAPI (string JSON ou object)
 * @returns Array de tools au format aplati XAI Voice
 * @throws {Error} Si le schéma est invalide
 */
export function parseOpenApiToVoiceTools(
  schema: string | Record<string, unknown>
): XAIVoiceFunctionTool[] {
  try {
    // Parser JSON si string
    let openApiContent: Record<string, unknown>;
    if (typeof schema === 'string') {
      try {
        openApiContent = JSON.parse(schema) as Record<string, unknown>;
      } catch (parseError) {
        logger.error(LogCategory.AUDIO, '[parseOpenApiToVoiceTools] Erreur parsing JSON', undefined, parseError instanceof Error ? parseError : new Error(String(parseError)));
        throw new Error('Schéma OpenAPI invalide : JSON malformé');
      }
    } else {
      openApiContent = schema;
    }

    // Extraire paths
    const paths = openApiContent.paths as Record<string, Record<string, unknown>> | undefined;
    if (!paths) {
      logger.warn(LogCategory.AUDIO, '[parseOpenApiToVoiceTools] Aucun path trouvé dans le schéma');
      return [];
    }

    const tools: XAIVoiceFunctionTool[] = [];

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

        if (!operationId) {
          logger.warn(LogCategory.AUDIO, '[parseOpenApiToVoiceTools] Opération sans operationId', {
            method,
            pathName
          });
          continue;
        }

        // Construire les paramètres du tool
        const parameters = buildToolParameters(op, pathName, openApiContent);

        // Construire la description
        const enrichedDescription = description || summary || `${method.toUpperCase()} ${pathName}`;

        // Créer le tool au format aplati XAI Voice
        const tool: XAIVoiceFunctionTool = {
          type: 'function',
          name: operationId,
          description: enrichedDescription,
          parameters: parameters
        };

        tools.push(tool);

        logger.debug(LogCategory.AUDIO, '[parseOpenApiToVoiceTools] Tool créé', {
          name: operationId,
          method: method.toUpperCase(),
          pathName
        });
      }
    }

    // Tri alphabétique des tools (déterministe)
    tools.sort((a, b) => a.name.localeCompare(b.name));

    logger.info(LogCategory.AUDIO, '[parseOpenApiToVoiceTools] Tools générés', {
      count: tools.length
    });

    return tools;

  } catch (error) {
    logger.error(LogCategory.AUDIO, '[parseOpenApiToVoiceTools] Erreur lors de la conversion', undefined, error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Construit les paramètres d'un tool depuis une opération OpenAPI
 */
function buildToolParameters(
  operation: Record<string, unknown>,
  pathName: string,
  openApiContent: Record<string, unknown>
): {
  type: 'object';
  properties: Record<string, {
    type: string;
    description?: string;
    enum?: string[];
    [key: string]: unknown;
  }>;
  required?: string[];
} {
  const properties: Record<string, {
    type: string;
    description?: string;
    enum?: string[];
    [key: string]: unknown;
  }> = {};
  const required: string[] = [];

  // 1. Paramètres de path (ex: /note/{ref})
  const pathParams = extractPathParameters(pathName);
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
        const cleanedParam = cleanSchemaForXAI({
          ...paramSchema,
          description: param.description as string | undefined || (paramIn === 'path' ? `Paramètre de path: ${name}` : undefined)
        }) as { type: string; description?: string; enum?: string[]; [key: string]: unknown };

        properties[name] = cleanedParam;

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
    let bodySchema = jsonContent?.schema as Record<string, unknown> | undefined;

    if (bodySchema) {
      bodySchema = resolveSchemaRef(bodySchema, openApiContent);

      const bodyProperties = bodySchema?.properties as Record<string, unknown> | undefined;
      const bodyRequired = bodySchema?.required as string[] | undefined;

      if (bodyProperties) {
        for (const [key, value] of Object.entries(bodyProperties)) {
          const resolvedProperty = resolveSchemaRef(value as Record<string, unknown>, openApiContent);
          properties[key] = cleanSchemaForXAI(resolvedProperty) as { type: string; description?: string; enum?: string[]; [key: string]: unknown };
        }
      }

      if (bodyRequired) {
        required.push(...bodyRequired);
      }
    }
  }

  // Dédupliquer le array required
  const uniqueRequired = [...new Set(required)];

  return {
    type: 'object',
    properties,
    ...(uniqueRequired.length > 0 && { required: uniqueRequired })
  };
}

/**
 * Résout les références $ref dans un schéma OpenAPI
 */
function resolveSchemaRef(
  schema: Record<string, unknown> | undefined,
  openApiContent: Record<string, unknown>
): Record<string, unknown> {
  if (!schema) {
    return {};
  }

  const ref = schema.$ref as string | undefined;
  if (ref && typeof ref === 'string' && ref.startsWith('#/')) {
    const pathParts = ref.slice(2).split('/');
    let current: unknown = openApiContent;

    for (const part of pathParts) {
      if (current && typeof current === 'object') {
        current = (current as Record<string, unknown>)[part];
      } else {
        current = undefined;
        break;
      }
    }

    if (current && typeof current === 'object') {
      return current as Record<string, unknown>;
    }
  }

  return schema;
}

/**
 * Nettoie un schéma JSON pour être compatible XAI
 * 
 * XAI supporte uniquement les champs basiques de JSON Schema:
 * - type, description, enum, items, properties, required
 */
function cleanSchemaForXAI(schema: Record<string, unknown>): Record<string, unknown> {
  if (!schema || typeof schema !== 'object') {
    return schema;
  }

  const cleaned: Record<string, unknown> = {};

  // Champs autorisés par XAI (whitelist stricte)
  const allowedFields = ['type', 'description', 'enum', 'items', 'properties', 'required'];

  for (const [key, value] of Object.entries(schema)) {
    if (!allowedFields.includes(key)) {
      continue;
    }

    if (key === 'items' && typeof value === 'object' && value !== null) {
      cleaned.items = cleanSchemaForXAI(value as Record<string, unknown>);
    } else if (key === 'properties' && typeof value === 'object' && value !== null) {
      const props = value as Record<string, unknown>;
      cleaned.properties = {};
      for (const [propKey, propValue] of Object.entries(props)) {
        (cleaned.properties as Record<string, unknown>)[propKey] = cleanSchemaForXAI(propValue as Record<string, unknown>);
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
function extractPathParameters(pathName: string): string[] {
  const matches = pathName.match(/\{([^}]+)\}/g);
  if (!matches) return [];

  return matches.map(match => match.slice(1, -1)); // Supprimer les {}
}

