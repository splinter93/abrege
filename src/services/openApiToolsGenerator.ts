import { getOpenAPISchemaService, type OpenAPISchema } from './openApiSchemaService';

/**
 * Interface pour les tools générés depuis OpenAPI
 */
export interface OpenAPITool {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required: string[];
  };
  endpoint: string;
  method: string;
}

/**
 * Générateur de tools depuis un schéma OpenAPI V2
 */
export class OpenAPIToolsGenerator {
  private schema: OpenAPISchema;
  private schemaService = getOpenAPISchemaService();

  constructor(openApiSchema?: OpenAPISchema) {
    // Utiliser le schéma fourni ou charger depuis le service
    this.schema = openApiSchema || this.schemaService.getSchema();
  }

  /**
   * Générer tous les tools depuis le schéma OpenAPI
   */
  generateTools(): OpenAPITool[] {
    const tools: OpenAPITool[] = [];
    const endpoints = Object.keys(this.schema.paths);

    console.log('[OpenAPIToolsGenerator] 🔧 Génération des tools depuis OpenAPI');
    console.log(`[OpenAPIToolsGenerator] 📊 Endpoints trouvés: ${endpoints.length}`);

    endpoints.forEach(endpoint => {
      const path = this.schema.paths[endpoint];
      const methods = Object.keys(path);

      methods.forEach(method => {
        const operation = path[method];
        const tool = this.createTool(endpoint, method, operation);
        
        if (tool) {
          tools.push(tool);
        }
      });
    });

    console.log(`[OpenAPIToolsGenerator] ✅ ${tools.length} tools générés`);
    return tools;
  }

  /**
   * Créer un tool à partir d'un endpoint et d'une opération
   */
  private createTool(endpoint: string, method: string, operation: any): OpenAPITool | null {
    try {
      // Nom du tool (format compatible avec votre système)
      const toolName = this.generateToolName(endpoint, method);
      
      // Description
      const description = operation.summary || 
                        operation.description || 
                        `${method.toUpperCase()} operation on ${endpoint}`;

      // Paramètres
      const parameters = this.extractParameters(operation);

      // Vérifier si le tool est utile pour les LLMs
      if (!this.isToolUseful(operation, method, endpoint)) {
        return null;
      }

      return {
        name: toolName,
        description,
        parameters,
        endpoint,
        method: method.toUpperCase()
      };
    } catch (error) {
      console.error(`[OpenAPIToolsGenerator] ❌ Erreur lors de la création du tool ${endpoint}:`, error);
      return null;
    }
  }

  /**
   * Générer un nom de tool compatible avec votre système
   */
  private generateToolName(endpoint: string, method: string): string {
    // Convertir l'endpoint en nom de tool (API V2)
    let toolName = endpoint
      .replace(/^\/api\/v2\//, '') // Enlever le préfixe API V2
      .replace(/\/\{([^}]+)\}/g, '_$1') // Convertir les paramètres de path
      .replace(/\//g, '_') // Remplacer les slashes par des underscores
      .replace(/^_/, '') // Enlever le underscore initial
      .replace(/_+/g, '_'); // Nettoyer les underscores multiples

    // Ajouter le verbe HTTP
    const httpVerb = method.toLowerCase();
    toolName = `${httpVerb}_${toolName}`;

    // Noms plus lisibles pour les LLMs (API V2)
    const nameMappings: Record<string, string> = {
      // Notes
      'post_note_create': 'create_note',
      'get_note_ref': 'get_note',
      'put_note_ref_update': 'update_note',
      'delete_note_ref_delete': 'delete_note',
      'patch_note_ref_insert-content': 'insert_content_to_note',
      'put_note_ref_move': 'move_note',
      'get_note_ref_table-of-contents': 'get_note_toc',
      'get_note_ref_statistics': 'get_note_stats',
      'get_note_recent': 'get_recent_notes',
      
      // Classeurs
      'post_classeur_create': 'create_classeur',
      'get_classeurs': 'list_classeurs',
      'get_classeur_ref_tree': 'get_classeur_tree',
      
      // Dossiers
      'post_folder_create': 'create_folder',
      'get_folder_ref_tree': 'get_folder_tree',
      
      // Recherche
      'get_search': 'search_notes',
      'get_files_search': 'search_files',
      
      // Utilisateur
      'get_me': 'get_user_info',
      'get_stats': 'get_platform_stats',
      
      // Gestion unifiée
      'delete_delete_resource_ref': 'delete_resource'
    };

    return nameMappings[toolName] || toolName;
  }

  /**
   * Extraire les paramètres d'une opération OpenAPI
   */
  private extractParameters(operation: any) {
    const parameters = {
      type: 'object' as const,
      properties: {} as Record<string, any>,
      required: [] as string[]
    };

    // Paramètres de path, query et body
    if (operation.parameters) {
      operation.parameters.forEach((param: any) => {
        if (param.in === 'path' || param.in === 'query') {
          parameters.properties[param.name] = {
            type: param.schema?.type || 'string',
            description: param.description || `Parameter ${param.name}`,
            ...(param.schema?.enum && { enum: param.schema.enum }),
            ...(param.schema?.minimum !== undefined && { minimum: param.schema.minimum }),
            ...(param.schema?.maximum !== undefined && { maximum: param.schema.maximum }),
            ...(param.schema?.default !== undefined && { default: param.schema.default })
          };
          if (param.required) {
            parameters.required.push(param.name);
          }
        }
      });
    }

    // Paramètres de body
    if (operation.requestBody) {
      const content = operation.requestBody.content['application/json'];
      if (content && content.schema) {
        const bodySchema = this.resolveSchema(content.schema);
        if (bodySchema.properties) {
          Object.assign(parameters.properties, bodySchema.properties);
        }
        if (bodySchema.required) {
          parameters.required.push(...bodySchema.required);
        }
      }
    }

    return parameters;
  }

  /**
   * Résoudre les références de schéma
   */
  private resolveSchema(schema: any): any {
    if (schema.$ref) {
      const refPath = schema.$ref.replace('#/components/schemas/', '');
      return this.schema.components.schemas[refPath] || schema;
    }
    return schema;
  }

  /**
   * Déterminer si un tool est utile pour les LLMs
   */
  private isToolUseful(operation: any, method: string, endpoint: string): boolean {
    // Endpoints utiles pour les LLMs (API V2)
    const usefulEndpoints = [
      // Notes
      '/note/create',
      '/note/{ref}',
      '/note/{ref}/update',
      '/note/{ref}/move',
      '/note/{ref}/insert-content',
      '/note/{ref}/table-of-contents',
      '/note/recent',
      
      // Classeurs
      '/classeur/create',
      '/classeurs',
      '/classeur/{ref}/tree',
      
      // Dossiers
      '/folder/create',
      '/folder/{ref}/tree',
      
      // Recherche
      '/search',
      '/files/search',
      
      // Utilisateur
      '/me',
      '/stats',
      
      // Gestion unifiée
      '/delete/{resource}/{ref}'
    ];

    // Vérifier si l'endpoint est utile - LOGIQUE AMÉLIORÉE
    return usefulEndpoints.some(usefulEndpoint => {
      // Créer un pattern regex pour matcher les endpoints avec paramètres
      const pattern = usefulEndpoint
        .replace(/\{([^}]+)\}/g, '[^/]+') // Remplacer {param} par [^/]+
        .replace(/\//g, '\\/'); // Échapper les slashes
      
      const regex = new RegExp(`^${pattern}$`);
      return regex.test(endpoint);
    });
  }

  /**
   * Convertir les tools OpenAPI au format de votre système
   */
  generateToolsForFunctionCalling(): any[] {
    const openApiTools = this.generateTools();
    
    return openApiTools.map(tool => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }
    }));
  }

  /**
   * Obtenir les informations de debug
   */
  getDebugInfo() {
    const tools = this.generateTools();
    return {
      totalTools: tools.length,
      tools: tools.map(t => ({
        name: t.name,
        description: t.description.substring(0, 50) + '...',
        endpoint: t.endpoint,
        method: t.method
      }))
    };
  }
}

/**
 * Factory pour créer le générateur avec le schéma V2
 */
export function createOpenAPIToolsGenerator(): OpenAPIToolsGenerator {
  console.log('[OpenAPIToolsGenerator] 🔧 Création du générateur avec schéma V2');
  
  // Forcer le rechargement du schéma pour avoir les dernières modifications
  const schemaService = getOpenAPISchemaService();
  schemaService.reload();
  
  // Le schéma sera chargé automatiquement depuis le service
  return new OpenAPIToolsGenerator();
}

/**
 * Obtenir les tools OpenAPI V2 pour les function calls
 */
export function getOpenAPIV2Tools(): any[] {
  const generator = createOpenAPIToolsGenerator();
  return generator.generateToolsForFunctionCalling();
} 