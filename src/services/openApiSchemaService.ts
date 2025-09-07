/**
 * Service centralisé pour la gestion du schéma OpenAPI V2
 * Charge et fournit le schéma OpenAPI V2 actuel pour l'intégration LLM
 */

import { readFileSync } from 'fs';
import { join } from 'path';

export interface OpenAPISchema {
  openapi: string;
  info: {
    title: string;
    description: string;
    version: string;
  };
  paths: Record<string, any>;
  components: {
    schemas: Record<string, any>;
    securitySchemes: Record<string, any>;
  };
  tags: Array<{
    name: string;
    description: string;
  }>;
}

export class OpenAPISchemaService {
  private static instance: OpenAPISchemaService;
  private schema: OpenAPISchema | null = null;
  private schemaPath: string;

  private constructor() {
    // Chemin vers le schéma OpenAPI V2 pour ChatGPT
    this.schemaPath = join(process.cwd(), 'docs/api/OPENAPI CHAT GPT 30 ENDPOINTS.json');
  }

  /**
   * Singleton pattern
   */
  public static getInstance(): OpenAPISchemaService {
    if (!OpenAPISchemaService.instance) {
      OpenAPISchemaService.instance = new OpenAPISchemaService();
    }
    return OpenAPISchemaService.instance;
  }

  /**
   * Charger le schéma OpenAPI V2 depuis le fichier local
   */
  public loadSchema(): OpenAPISchema {
    if (this.schema) {
      return this.schema;
    }

    // 🔧 CORRECTION: Vérifier que nous sommes côté serveur
    if (typeof window !== 'undefined') {
      console.warn('[OpenAPISchemaService] ⚠️ Tentative de chargement côté client - utilisation du schéma par défaut');
      // Retourner un schéma minimal pour éviter les erreurs côté client
      this.schema = {
        openapi: '3.0.0',
        info: { title: 'API V2', description: 'API par défaut', version: '1.0.0' },
        paths: {},
        components: { schemas: {}, securitySchemes: {} },
        tags: []
      };
      return this.schema;
    }

    try {
      console.log('[OpenAPISchemaService] 🔧 Chargement du schéma OpenAPI V2...');
      
      const schemaContent = readFileSync(this.schemaPath, 'utf-8');
      this.schema = JSON.parse(schemaContent) as OpenAPISchema;
      
      console.log(`[OpenAPISchemaService] ✅ Schéma chargé: ${this.schema.info.title} v${this.schema.info.version}`);
      console.log(`[OpenAPISchemaService] 📊 ${Object.keys(this.schema.paths).length} endpoints disponibles`);
      
      return this.schema;
    } catch (error) {
      console.error('[OpenAPISchemaService] ❌ Erreur lors du chargement du schéma:', error);
      throw new Error(`Impossible de charger le schéma OpenAPI V2: ${error}`);
    }
  }

  /**
   * Obtenir le schéma (charge si nécessaire)
   */
  public getSchema(): OpenAPISchema {
    return this.loadSchema();
  }

  /**
   * Vérifier si le schéma est chargé
   */
  public isLoaded(): boolean {
    return this.schema !== null;
  }

  /**
   * Obtenir les endpoints disponibles
   */
  public getEndpoints(): string[] {
    const schema = this.getSchema();
    return Object.keys(schema.paths);
  }

  /**
   * Obtenir les schémas de composants
   */
  public getSchemas(): Record<string, any> {
    const schema = this.getSchema();
    return schema.components.schemas;
  }

  /**
   * Obtenir les tags disponibles
   */
  public getTags(): Array<{ name: string; description: string }> {
    const schema = this.getSchema();
    return schema.tags;
  }

  /**
   * Rechercher un endpoint par nom ou pattern
   */
  public findEndpoint(pattern: string): string[] {
    const endpoints = this.getEndpoints();
    return endpoints.filter(endpoint => 
      endpoint.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  /**
   * Obtenir les informations de debug
   */
  public getDebugInfo() {
    const schema = this.getSchema();
    return {
      title: schema.info.title,
      version: schema.info.version,
      openapiVersion: schema.openapi,
      totalEndpoints: Object.keys(schema.paths).length,
      totalSchemas: Object.keys(schema.components.schemas).length,
      totalTags: schema.tags.length,
      endpoints: Object.keys(schema.paths).slice(0, 10), // Premiers 10 endpoints
      tags: schema.tags.map(tag => tag.name)
    };
  }

  /**
   * Forcer le rechargement du schéma
   */
  public reload(): OpenAPISchema {
    this.schema = null;
    return this.loadSchema();
  }
}

/**
 * Factory function pour obtenir le service
 */
export function getOpenAPISchemaService(): OpenAPISchemaService {
  return OpenAPISchemaService.getInstance();
}

/**
 * Utilitaire pour charger le schéma directement
 */
export function loadOpenAPISchema(): OpenAPISchema {
  return getOpenAPISchemaService().getSchema();
}
