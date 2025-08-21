/**
 * 🚀 Service de Polling Intelligent
 * 
 * Ce service remplace complètement le système de polling intermittent
 * et déclenche un seul polling après chaque action CRUD pour synchroniser
 * l'état local avec la base de données.
 */

import { simpleLogger as logger } from '@/utils/logger';

export interface PollingConfig {
  entityType: 'notes' | 'folders' | 'classeurs';
  operation: 'CREATE' | 'UPDATE' | 'DELETE' | 'MOVE';
  entityId?: string;
  delay?: number; // Délai avant le polling (ms)
}

class IntelligentPollingService {
  private isPolling = false;
  private pollingQueue: PollingConfig[] = [];
  private pollingTimeout: NodeJS.Timeout | null = null;

  /**
   * Déclencher un polling intelligent après une action CRUD
   */
  async triggerPolling(config: PollingConfig): Promise<void> {
    if (process.env.NODE_ENV === 'development') {
      logger.dev(`[IntelligentPolling] 🔄 Déclenchement polling: ${config.entityType} ${config.operation}`);
    }

    // Ajouter à la queue
    this.pollingQueue.push(config);

    // Si pas de polling en cours, démarrer
    if (!this.isPolling) {
      this.processPollingQueue();
    }
  }

  /**
   * Traiter la queue de polling
   */
  private async processPollingQueue(): Promise<void> {
    if (this.pollingQueue.length === 0) {
      this.isPolling = false;
      return;
    }

    this.isPolling = true;
    const config = this.pollingQueue.shift()!;

    try {
      // Attendre un délai pour laisser le temps à la base de se synchroniser
      const delay = config.delay || 1000; // 1 seconde par défaut
      
      if (process.env.NODE_ENV === 'development') {
        logger.dev(`[IntelligentPolling] ⏳ Attente ${delay}ms avant polling ${config.entityType}`);
      }

      await new Promise(resolve => setTimeout(resolve, delay));

      // Effectuer le polling
      await this.performPolling(config);

      if (process.env.NODE_ENV === 'development') {
        logger.dev(`[IntelligentPolling] ✅ Polling ${config.entityType} terminé`);
      }

    } catch (error) {
      logger.error(`[IntelligentPolling] ❌ Erreur polling ${config.entityType}:`, error);
    }

    // Traiter le prochain polling
    this.processPollingQueue();
  }

  /**
   * Effectuer le polling réel
   */
  private async performPolling(config: PollingConfig): Promise<void> {
    try {
      switch (config.entityType) {
        case 'notes':
          await this.pollNotes();
          break;
        case 'folders':
          await this.pollFolders();
          break;
        case 'classeurs':
          await this.pollClasseurs();
          break;
      }
    } catch (error) {
      logger.error(`[IntelligentPolling] ❌ Erreur polling ${config.entityType}:`, error);
    }
  }

  /**
   * Polling des notes
   */
  private async pollNotes(): Promise<void> {
    try {
      const response = await fetch('/api/v2/notes', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const notes = await response.json();
        // Mettre à jour le store Zustand
        const { useFileSystemStore } = await import('@/store/useFileSystemStore');
        useFileSystemStore.getState().setNotes(notes);
        
        if (process.env.NODE_ENV === 'development') {
          logger.dev(`[IntelligentPolling] ✅ ${notes.length} notes synchronisées`);
        }
      }
    } catch (error) {
      logger.error('[IntelligentPolling] ❌ Erreur polling notes:', error);
    }
  }

  /**
   * Polling des dossiers
   */
  private async pollFolders(): Promise<void> {
    try {
      const response = await fetch('/api/v2/folders', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const folders = await response.json();
        // Mettre à jour le store Zustand
        const { useFileSystemStore } = await import('@/store/useFileSystemStore');
        useFileSystemStore.getState().setFolders(folders);
        
        if (process.env.NODE_ENV === 'development') {
          logger.dev(`[IntelligentPolling] ✅ ${folders.length} dossiers synchronisés`);
        }
      }
    } catch (error) {
      logger.error('[IntelligentPolling] ❌ Erreur polling dossiers:', error);
    }
  }

  /**
   * Polling des classeurs
   */
  private async pollClasseurs(): Promise<void> {
    try {
      const response = await fetch('/api/v2/classeurs', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const classeurs = await response.json();
        // Mettre à jour le store Zustand
        const { useFileSystemStore } = await import('@/store/useFileSystemStore');
        useFileSystemStore.getState().setClasseurs(classeurs);
        
        if (process.env.NODE_ENV === 'development') {
          logger.dev(`[IntelligentPolling] ✅ ${classeurs.length} classeurs synchronisés`);
        }
      }
    } catch (error) {
      logger.error('[IntelligentPolling] ❌ Erreur polling classeurs:', error);
    }
  }

  /**
   * Arrêter le service
   */
  stop(): void {
    this.isPolling = false;
    this.pollingQueue = [];
    if (this.pollingTimeout) {
      clearTimeout(this.pollingTimeout);
      this.pollingTimeout = null;
    }
  }
}

// Instance singleton
export const intelligentPollingService = new IntelligentPollingService();

// Fonction d'aide pour déclencher le polling
export const triggerIntelligentPolling = (config: PollingConfig): Promise<void> => {
  return intelligentPollingService.triggerPolling(config);
}; 