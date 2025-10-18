/**
 * Types TypeScript pour l'éditeur OpenAPI
 * Définit la structure des schémas OpenAPI et des endpoints
 */

export namespace OpenAPITypes {
  /**
   * Type strict pour les schémas JSON Schema utilisés dans OpenAPI
   */
  export interface JSONSchema {
    type?: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object' | 'null';
    format?: string;
    description?: string;
    enum?: unknown[];
    default?: unknown;
    
    // Pour les objets
    properties?: Record<string, JSONSchema>;
    required?: string[];
    additionalProperties?: boolean | JSONSchema;
    
    // Pour les tableaux
    items?: JSONSchema;
    minItems?: number;
    maxItems?: number;
    
    // Pour les nombres
    minimum?: number;
    maximum?: number;
    multipleOf?: number;
    
    // Pour les chaînes
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    
    // Composition de schémas
    allOf?: JSONSchema[];
    oneOf?: JSONSchema[];
    anyOf?: JSONSchema[];
    not?: JSONSchema;
    
    // Métadonnées
    title?: string;
    example?: unknown;
    deprecated?: boolean;
    readOnly?: boolean;
    writeOnly?: boolean;
    
    // OpenAPI extensions
    'x-nullable'?: boolean;
    [key: string]: unknown; // Permet les extensions personnalisées
  }

  // Types de base OpenAPI
  export interface OpenAPISchema {
    openapi?: string;
    swagger?: string;
    info: {
      title: string;
      version: string;
      description?: string;
    };
    paths: Record<string, PathItem>;
    components?: {
      schemas?: Record<string, JSONSchema>;
      parameters?: Record<string, Parameter>;
      responses?: Record<string, Response>;
      requestBodies?: Record<string, RequestBody>;
    };
  }

  export interface PathItem {
    [method: string]: Operation;
  }

  export interface Operation {
    operationId?: string;
    summary?: string;
    description?: string;
    tags?: string[];
    parameters?: Parameter[];
    requestBody?: RequestBody;
    responses: Record<string, Response>;
  }

  export interface Parameter {
    name: string;
    in: 'query' | 'header' | 'path' | 'cookie';
    description?: string;
    required?: boolean;
    schema?: JSONSchema;
  }

  export interface RequestBody {
    description?: string;
    content: Record<string, MediaType>;
    required?: boolean;
  }

  export interface MediaType {
    schema?: JSONSchema;
    example?: unknown;
  }

  export interface Response {
    description: string;
    content?: Record<string, MediaType>;
  }

  // Types pour l'éditeur
  export interface Endpoint {
    id: string;
    operationId: string;
    method: string;
    path: string;
    summary: string;
    description: string;
    tags: string[];
    parameters: Parameter[];
    requestBody?: RequestBody;
    responses: Record<string, Response>;
  }

  export interface EndpointFormData {
    operationId: string;
    method: string;
    path: string;
    summary: string;
    description: string;
    tags: string[];
  }

  // Types pour les actions
  export interface ExportOptions {
    format: 'json' | 'yaml';
    includeExamples: boolean;
    minify: boolean;
  }
}
