/**
 * Utilitaire pour parser un schéma OpenAPI et extraire les endpoints
 * Réutilise la logique de OpenAPISchemaService mais côté client
 */

import type { OpenApiEndpoint } from '@/services/llm/executors/OpenApiToolExecutor';
import { logger, LogCategory } from '@/utils/logger';

/**
 * Parse un schéma OpenAPI et extrait les endpoints pour OpenApiToolExecutor
 * 
 * @param schemaContent - Contenu du schéma OpenAPI (object)
 * @param apiKey - Clé API optionnelle
 * @param headerName - Nom du header pour l'API key (optionnel)
 * @returns Map des endpoints (operationId -> OpenApiEndpoint)
 */
export function parseOpenApiEndpoints(
  schemaContent: Record<string, unknown>,
  apiKey?: string,
  headerName?: string
): Map<string, OpenApiEndpoint> {
  const endpoints = new Map<string, OpenApiEndpoint>();
  const allowedMethods: OpenApiEndpoint['method'][] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

  try {
    // Extraire baseUrl
    const servers = schemaContent.servers as Array<{ url: string }> | undefined;
    const baseUrl = servers?.[0]?.url || '';

    if (!baseUrl) {
      logger.warn(LogCategory.AUDIO, '[parseOpenApiEndpoints] URL de base manquante dans le schéma');
      return endpoints;
    }

    // Validation URL
    try {
      new URL(baseUrl);
    } catch {
      logger.warn(LogCategory.AUDIO, '[parseOpenApiEndpoints] URL invalide', { baseUrl });
      return endpoints;
    }

    const paths = schemaContent.paths as Record<string, Record<string, unknown>> | undefined;

    if (!paths || typeof paths !== 'object') {
      logger.warn(LogCategory.AUDIO, '[parseOpenApiEndpoints] Aucun path trouvé dans le schéma');
      return endpoints;
    }

    // Parser chaque path et méthode
    for (const [pathName, pathItem] of Object.entries(paths)) {
      if (!pathItem || typeof pathItem !== 'object') {
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
          const methodUpper = method.toUpperCase() as OpenApiEndpoint['method'];
          if (!allowedMethods.includes(methodUpper)) {
            continue;
          }

          // Extraire les query parameters
          const queryParams: string[] = [];
          const parameters = op.parameters as Array<Record<string, unknown>> | undefined;

          if (parameters && Array.isArray(parameters)) {
            for (const param of parameters) {
              const paramIn = param.in as string | undefined;
              if (paramIn === 'query') {
                const paramName = param.name as string | undefined;
                if (paramName) {
                  queryParams.push(paramName);
                }
              }
            }
          }

          const endpoint: OpenApiEndpoint = {
            method: methodUpper,
            path: pathName,
            baseUrl: baseUrl,
            apiKey: apiKey,
            headerName: headerName,
            queryParams: queryParams.length > 0 ? queryParams : undefined
          };

          endpoints.set(operationId, endpoint);
        }
      }
    }

    logger.info(LogCategory.AUDIO, '[parseOpenApiEndpoints] Endpoints extraits', { count: endpoints.size });
    return endpoints;

  } catch (error) {
    logger.error(LogCategory.AUDIO, '[parseOpenApiEndpoints] Erreur parsing schéma', undefined, error instanceof Error ? error : new Error(String(error)));
    return endpoints;
  }
}

