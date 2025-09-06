/**
 * Types TypeScript pour l'éditeur OpenAPI
 * Définit la structure des schémas OpenAPI et des endpoints
 */

export namespace OpenAPITypes {
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
      schemas?: Record<string, any>;
      parameters?: Record<string, any>;
      responses?: Record<string, any>;
      requestBodies?: Record<string, any>;
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
    schema?: any;
  }

  export interface RequestBody {
    description?: string;
    content: Record<string, MediaType>;
    required?: boolean;
  }

  export interface MediaType {
    schema?: any;
    example?: any;
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
