// import { logger } from '@/utils/logger';

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
 * Générateur de tools depuis un schéma OpenAPI
 */
export class OpenAPIToolsGenerator {
  private schema: any;

  constructor(openApiSchema: any) {
    this.schema = openApiSchema;
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
      if (!this.isToolUseful(operation, method)) {
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
    // Convertir l'endpoint en nom de tool
    let toolName = endpoint
      .replace(/^\/api\/v1\//, '') // Enlever le préfixe API
      .replace(/\/\{([^}]+)\}/g, '_$1') // Convertir les paramètres de path
      .replace(/\//g, '_') // Remplacer les slashes par des underscores
      .replace(/^_/, '') // Enlever le underscore initial
      .replace(/_+/g, '_'); // Nettoyer les underscores multiples

    // Ajouter le verbe HTTP
    const httpVerb = method.toLowerCase();
    toolName = `${httpVerb}_${toolName}`;

    // Noms plus lisibles pour les LLMs
    const nameMappings: Record<string, string> = {
      'post_note_create': 'create_note',
      'get_note_ref': 'get_note',
      'put_note_ref': 'update_note',
      'delete_note_ref': 'delete_note',
      'patch_note_ref_add-content': 'add_content_to_note',
      'put_note_ref_move': 'move_note',
      'get_note_ref_information': 'get_note_info',
      'get_note_ref_statistics': 'get_note_stats',
      'post_folder_create': 'create_folder',
      'get_folder_ref': 'get_folder',
      'put_folder_ref': 'update_folder',
      'delete_folder_ref': 'delete_folder',
      'post_notebook_create': 'create_notebook',
      'get_notebook_ref': 'get_notebook',
      'put_notebook_ref': 'update_notebook',
      'delete_notebook_ref': 'delete_notebook',
      'get_notebooks': 'list_notebooks',
      'post_slug_generate': 'generate_slug'
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

    // Paramètres de path
    if (operation.parameters) {
      operation.parameters.forEach((param: any) => {
        if (param.in === 'path') {
          parameters.properties[param.name] = {
            type: param.schema?.type || 'string',
            description: param.description || `Parameter ${param.name}`
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
  private isToolUseful(operation: any, method: string): boolean {
    // Exclure les endpoints de lecture pure qui ne modifient rien
    // const readOnlyEndpoints = [^;]+;

    // Inclure tous les endpoints de modification et les endpoints de lecture utiles
    const usefulEndpoints = [
      '/api/ui/note/create',
      '/api/ui/note/{ref}',
      '/api/ui/note/{ref}/add-content',
      '/api/ui/note/{ref}/move',
      '/api/ui/folder/create',
      '/api/ui/folder/{ref}',
      '/api/ui/notebook/create',
      '/api/ui/notebook/{ref}',
      '/api/ui/notebooks',
      '/api/ui/slug/generate'
    ];

    // Vérifier si l'endpoint est utile
    return usefulEndpoints.some(endpoint => 
      operation.endpoint?.includes(endpoint.replace('{ref}', '')) ||
      operation.path?.includes(endpoint.replace('{ref}', ''))
    );
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
 * Utilitaire pour charger le schéma OpenAPI
 */
export async function loadOpenAPISchema(): Promise<any> {
  try {
    // Charger le schéma OpenAPI V2 actuel
    const response = await fetch('/api/v2/openapi-schema');
    
    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }
    
    const schema = await response.json();
    console.log('[OpenAPIToolsGenerator] ✅ Schéma OpenAPI chargé avec succès');
    
    return schema;
  } catch (error) {
    console.error('[OpenAPIToolsGenerator] ❌ Erreur lors du chargement du schéma:', error);
    
    // Fallback vers un schéma par défaut si nécessaire
    console.log('[OpenAPIToolsGenerator] 🔄 Utilisation du schéma par défaut en fallback');
    throw error;
  }
}

/**
 * Factory pour créer le générateur avec le schéma par défaut
 */
export function createOpenAPIToolsGenerator(): OpenAPIToolsGenerator {
  // Utiliser le schéma OpenAPI V2 actuel
  console.log('[OpenAPIToolsGenerator] 🔧 Création du générateur avec schéma V2');
  
  // Le schéma sera chargé dynamiquement via loadOpenAPISchema()
  return new OpenAPIToolsGenerator({});
} 