/**
 * Service d'initialisation et de configuration de l'API V2
 * Initialise tous les handlers et configure le registry
 */

import { simpleLogger as logger } from '@/utils/logger';
import { toolRegistry } from './ToolRegistry';
import { NotesHandler } from '../handlers/NotesHandler';
import { FoldersHandler } from '../handlers/FoldersHandler';
import { ClasseursHandler } from '../handlers/ClasseursHandler';
import { AgentsHandler } from '../handlers/AgentsHandler';
import { SearchHandler } from '../handlers/SearchHandler';
import { UtilsHandler } from '../handlers/UtilsHandler';

export class ApiV2Service {
  private static instance: ApiV2Service;
  private initialized = false;

  private constructor() {}

  /**
   * Instance singleton
   */
  public static getInstance(): ApiV2Service {
    if (!ApiV2Service.instance) {
      ApiV2Service.instance = new ApiV2Service();
    }
    return ApiV2Service.instance;
  }

  /**
   * Initialiser le service API V2
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      logger.info('[ApiV2Service] ✅ Service déjà initialisé');
      return;
    }

    try {
      logger.info('[ApiV2Service] 🚀 Initialisation du service API V2...');

      // Créer et enregistrer tous les handlers
      const handlers = [
        new NotesHandler(),
        new FoldersHandler(),
        new ClasseursHandler(),
        new AgentsHandler(),
        new SearchHandler(),
        new UtilsHandler()
      ];

      // Enregistrer chaque handler dans le registry
      for (const handler of handlers) {
        toolRegistry.registerHandler(handler);
      }

      // Vérifier l'initialisation
      const stats = toolRegistry.getStats();
      logger.info('[ApiV2Service] ✅ Service API V2 initialisé avec succès', {
        totalHandlers: stats.totalHandlers,
        totalOperations: stats.totalOperations,
        handlers: stats.handlers.map(h => `${h.name}(${h.operations})`).join(', ')
      });

      this.initialized = true;

    } catch (error) {
      logger.error('[ApiV2Service] ❌ Erreur lors de l\'initialisation:', error);
      throw new Error(`Échec de l'initialisation du service API V2: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Vérifier si le service est initialisé
   */
  public isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Réinitialiser le service (utile pour les tests)
   */
  public async reinitialize(): Promise<void> {
    logger.info('[ApiV2Service] 🔄 Réinitialisation du service...');
    toolRegistry.clear();
    this.initialized = false;
    await this.initialize();
  }

  /**
   * Obtenir les statistiques du service
   */
  public getStats(): {
    initialized: boolean;
    registryStats: ReturnType<typeof toolRegistry.getStats>;
  } {
    return {
      initialized: this.initialized,
      registryStats: toolRegistry.getStats()
    };
  }
}

// Instance singleton exportée
export const apiV2Service = ApiV2Service.getInstance();
