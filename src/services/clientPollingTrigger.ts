import { getRealtimeService } from './realtimeService';
import { simpleLogger as logger } from '@/utils/logger';

/**
 * Service de déclenchement de polling côté client
 * Déclenche immédiatement le polling après les opérations API
 */
export class ClientPollingTrigger {
  private static instance: ClientPollingTrigger;
  private realtimeService: any;

  constructor() {
    this.realtimeService = getRealtimeService();
  }

  static getInstance(): ClientPollingTrigger {
    if (!ClientPollingTrigger.instance) {
      ClientPollingTrigger.instance = new ClientPollingTrigger();
    }
    return ClientPollingTrigger.instance;
  }

  /**
   * Déclencher le polling côté client immédiatement
   */
  async triggerClientPolling(table: string, operation: 'INSERT' | 'UPDATE' | 'DELETE') {
    if (!this.realtimeService) {
      if (process.env.NODE_ENV === 'development') {
      logger.dev('[ClientPollingTrigger] ⚠️ Service de polling non disponible côté client');
      }
      return;
    }

    if (process.env.NODE_ENV === 'development') {
    logger.dev(`[ClientPollingTrigger] 🚀 Déclenchement polling client pour ${table} (${operation})`);
    }
    
    try {
      // Déclencher immédiatement la vérification côté client
      await this.realtimeService.triggerImmediateCheck(table, operation);
      if (process.env.NODE_ENV === 'development') {
      logger.dev(`[ClientPollingTrigger] ✅ Polling client terminé pour ${table}`);
      }
    } catch (error) {
      logger.error(`[ClientPollingTrigger] ❌ Erreur polling client ${table}:`, error);
    }
  }

  /**
   * Déclencher le polling pour les articles
   */
  async triggerArticlesPolling(operation: 'INSERT' | 'UPDATE' | 'DELETE') {
    await this.triggerClientPolling('articles', operation);
  }

  /**
   * Déclencher le polling pour les dossiers
   */
  async triggerFoldersPolling(operation: 'INSERT' | 'UPDATE' | 'DELETE') {
    await this.triggerClientPolling('folders', operation);
  }

  /**
   * Déclencher le polling pour les classeurs
   */
  async triggerClasseursPolling(operation: 'INSERT' | 'UPDATE' | 'DELETE') {
    await this.triggerClientPolling('classeurs', operation);
  }
}

// Export de l'instance singleton
export const clientPollingTrigger = ClientPollingTrigger.getInstance(); 