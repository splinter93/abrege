/**
 * 🔄 Service de Polling Unifié et Simplifié
 * 
 * Ce service remplace ToolCallPollingService + ToolCallPollingSyncService
 * avec une architecture plus simple et directe.
 */

import { simpleLogger as logger } from '@/utils/logger';
import { useFileSystemStore } from '@/store/useFileSystemStore';

export interface PollingConfig {
  entityType: 'notes' | 'folders' | 'classeurs' | 'files';
  operation: 'CREATE' | 'UPDATE' | 'DELETE' | 'MOVE' | 'RENAME';
  entityId?: string;
  userId: string;
  delay?: number;
  priority?: number;
  authToken?: string;
}

export interface PollingResult {
  success: boolean;
  entityType: string;
  operation: string;
  entityId?: string;
  userId: string;
  timestamp: number;
  dataCount?: number;
  error?: string;
  details?: any;
  data?: any[]; // Données récupérées lors du polling
}

export interface PollingStatus {
  isPolling: boolean;
  queueLength: number;
  lastResults: Map<string, PollingResult>;
  activePollings: Set<string>;
  totalPollings: number;
  successfulPollings: number;
  failedPollings: number;
}

class UnifiedPollingService {
  private isPolling = false;
  private pollingQueue: Array<PollingConfig> = [];
  private lastPollingResults = new Map<string, PollingResult>();
  private activePollings = new Set<string>();
  private totalPollings = 0;
  private successfulPollings = 0;
  private failedPollings = 0;
  private authToken: string | null = null;

  // Configuration par défaut
  private readonly DEFAULT_DELAY = 500; // Réduit à 500ms pour plus de réactivité
  private readonly MAX_RETRIES = 2; // Réduit à 2 tentatives
  private readonly RETRY_DELAY = 1000; // 1 seconde
  private readonly CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    // Nettoyer les anciens résultats périodiquement
    setInterval(() => this.cleanupOldResults(), this.CLEANUP_INTERVAL);
    
    logger.info('[UnifiedPollingService] 🚀 Service de polling unifié initialisé');
  }

  /**
   * Définir le token d'authentification
   */
  setAuthToken(token: string): void {
    this.authToken = token;
    logger.dev?.('[UnifiedPollingService] 🔐 Token d\'authentification défini');
  }

  /**
   * Effacer le token d'authentification
   */
  clearAuthToken(): void {
    this.authToken = null;
    logger.dev?.('[UnifiedPollingService] 🗑️ Token d\'authentification effacé');
  }

  /**
   * Déclencher un polling intelligent après une opération CRUD
   */
  async triggerPolling(config: PollingConfig): Promise<PollingResult> {
    const { entityType, operation, entityId, userId, delay = this.DEFAULT_DELAY, priority = this.getDefaultPriority(operation) } = config;

    // Créer un identifiant unique pour ce polling
    const pollingId = `${entityType}_${operation}_${entityId || 'unknown'}_${userId}_${Date.now()}`;
    
    // Ajouter à la queue avec priorité
    this.addToQueueWithPriority({
      ...config,
      delay,
      priority
    });

    logger.dev?.(`[UnifiedPollingService] 🔄 Polling déclenché: ${entityType} ${operation} (ID: ${entityId}, User: ${userId.substring(0, 8)}...)`);

    // Traiter la queue si pas déjà en cours
    if (!this.isPolling) {
      this.processPollingQueue();
    }

    // Retourner un résultat immédiat
    return {
      success: true,
      entityType,
      operation,
      entityId,
      userId,
      timestamp: Date.now(),
      details: { pollingId, queued: true }
    };
  }

  /**
   * Obtenir la priorité par défaut selon l'opération
   */
  private getDefaultPriority(operation: string): number {
    const priorities: Record<string, number> = {
      'DELETE': 1,    // Haute priorité
      'UPDATE': 2,    // Priorité moyenne-haute
      'CREATE': 3,    // Priorité moyenne
      'MOVE': 4,      // Priorité moyenne-basse
      'RENAME': 5     // Basse priorité
    };
    return priorities[operation] || 5;
  }

  /**
   * Ajouter une configuration à la queue avec priorité
   */
  private addToQueueWithPriority(config: PollingConfig): void {
    const { priority = 5 } = config;
    
    // Insérer selon la priorité (plus petit = plus prioritaire)
    let inserted = false;
    for (let i = 0; i < this.pollingQueue.length; i++) {
      if ((this.pollingQueue[i].priority || 5) > priority) {
        this.pollingQueue.splice(i, 0, config);
        inserted = true;
        break;
      }
    }
    
    if (!inserted) {
      this.pollingQueue.push(config);
    }

    logger.dev?.(`[UnifiedPollingService] 📋 Queue mise à jour: ${this.pollingQueue.length} éléments`);
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
      // Attendre le délai spécifié
      if (config.delay && config.delay > 0) {
        logger.dev?.(`[UnifiedPollingService] ⏳ Attente ${config.delay}ms avant polling ${config.entityType} (${config.operation})`);
        await new Promise(resolve => setTimeout(resolve, config.delay));
      }

      // Exécuter le polling
      const result = await this.performPollingWithRetry(config);
      
      // Mettre à jour les statistiques
      this.totalPollings++;
      if (result.success) {
        this.successfulPollings++;
      } else {
        this.failedPollings++;
      }

      // Stocker le résultat
      const key = `${config.entityType}_${config.operation}_${config.entityId || 'unknown'}_${config.userId}`;
      this.lastPollingResults.set(key, result);

      // Synchroniser immédiatement avec le store Zustand
      await this.syncWithStore(result);

      logger.dev?.(`[UnifiedPollingService] ✅ Polling ${config.entityType} terminé:`, {
        operation: config.operation,
        success: result.success,
        dataCount: result.dataCount
      });

    } catch (error) {
      this.failedPollings++;
      logger.warn(`[UnifiedPollingService] ⚠️ Polling ${config.entityType} échoué:`, {
        operation: config.operation,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      });

      const errorResult: PollingResult = {
        success: false,
        entityType: config.entityType,
        operation: config.operation,
        entityId: config.entityId,
        userId: config.userId,
        timestamp: Date.now(),
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };

      const key = `${config.entityType}_${config.operation}_${config.entityId || 'unknown'}_${config.userId}`;
      this.lastPollingResults.set(key, errorResult);
    } finally {
      // Continuer avec le prochain élément de la queue
      this.processPollingQueue();
    }
  }

  /**
   * Exécuter le polling avec retry
   */
  private async performPollingWithRetry(config: PollingConfig): Promise<PollingResult> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        const result = await this.performPolling(config);
        if (attempt > 1) {
          logger.dev?.(`[UnifiedPollingService] ✅ Retry ${attempt} réussi pour ${config.entityType}`);
        }
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Erreur inconnue');
        
        if (attempt < this.MAX_RETRIES) {
          logger.warn(`[UnifiedPollingService] ⚠️ Tentative ${attempt} échouée pour ${config.entityType}, retry dans ${this.RETRY_DELAY}ms`);
          await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY));
        }
      }
    }

    logger.error(`[UnifiedPollingService] ❌ Échec après ${this.MAX_RETRIES} tentatives pour ${config.entityType}`);
    throw lastError;
  }

  /**
   * Exécuter le polling pour une entité spécifique
   */
  private async performPolling(config: PollingConfig): Promise<PollingResult> {
    const { entityType, operation, entityId, userId } = config;
    
    try {
      // Construire l'URL de l'API selon le type d'entité
      let url: string;
      let params = new URLSearchParams();
      
      switch (entityType) {
        case 'notes':
          url = '/api/v2/notes';
          params.append('user_id', userId);
          if (entityId) params.append('id', entityId);
          break;
        case 'folders':
          url = '/api/v2/folders';
          params.append('user_id', userId);
          if (entityId) params.append('id', entityId);
          break;
        case 'classeurs':
          url = '/api/v2/classeurs';
          params.append('user_id', userId);
          if (entityId) params.append('id', entityId);
          break;
        case 'files':
          url = '/api/v2/files';
          params.append('user_id', userId);
          if (entityId) params.append('id', entityId);
          break;
        default:
          throw new Error(`Type d'entité non supporté: ${entityType}`);
      }

      // Ajouter le token d'authentification
      if (this.authToken) {
        params.append('auth_token', this.authToken);
        logger.dev?.(`[UnifiedPollingService] 🔐 Token d'authentification ajouté`);
      } else {
        logger.warn(`[UnifiedPollingService] ⚠️ Pas de token d'authentification disponible`);
      }

      // Appeler l'API
      const fullUrl = `${url}?${params.toString()}`;
      logger.dev?.(`[UnifiedPollingService] 🔄 Appel endpoint: ${fullUrl}`);

      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(this.authToken && { 'Authorization': `Bearer ${this.authToken}` })
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      logger.dev?.(`[UnifiedPollingService] ✅ Réponse reçue:`, {
        entityType,
        operation,
        status: response.status,
        dataCount: Array.isArray(data.data) ? data.data.length : 
                   Array.isArray(data.notes) ? data.notes.length :
                   Array.isArray(data.folders) ? data.folders.length :
                   Array.isArray(data.classeurs) ? data.classeurs.length : 0
      });

      return {
        success: true,
        entityType,
        operation,
        entityId,
        userId,
        timestamp: Date.now(),
        dataCount: Array.isArray(data.data) ? data.data.length : 
                   Array.isArray(data.notes) ? data.notes.length :
                   Array.isArray(data.folders) ? data.folders.length :
                   Array.isArray(data.classeurs) ? data.classeurs.length : 0,
        data: data.data || data.notes || data.folders || data.classeurs || []
      };

    } catch (error) {
      logger.error(`[UnifiedPollingService] ❌ Erreur lors du polling ${entityType}:`, error);
      throw error;
    }
  }

  /**
   * Synchroniser immédiatement avec le store Zustand
   */
  private async syncWithStore(result: PollingResult): Promise<void> {
    try {
      const store = useFileSystemStore.getState();
      
      if (!result.success || !result.data) {
        return; // Pas de données à synchroniser
      }

      const { entityType, operation, data } = result;
      
      switch (entityType) {
        case 'notes':
          await this.syncNotes(store, operation, data);
          break;
        case 'folders':
          await this.syncFolders(store, operation, data);
          break;
        case 'classeurs':
          await this.syncClasseurs(store, operation, data);
          break;
        case 'files':
          await this.syncFiles(store, operation, data);
          break;
        default:
          logger.warn(`[UnifiedPollingService] ⚠️ Type d'entité non supporté: ${entityType}`);
      }

      logger.dev?.(`[UnifiedPollingService] ✅ Synchronisation ${entityType} ${operation} terminée avec succès`);
      
    } catch (error) {
      logger.error(`[UnifiedPollingService] ❌ Erreur lors de la synchronisation:`, error);
    }
  }

  /**
   * Synchroniser les notes
   */
  private async syncNotes(store: any, operation: string, data: any[]): Promise<void> {
    try {
      const notes = Array.isArray(data) ? data : [];
      
      switch (operation) {
        case 'CREATE':
          // Ajouter les nouvelles notes
          for (const note of notes) {
            store.addNote(note);
          }
          break;
        case 'UPDATE':
          // Mettre à jour les notes existantes
          for (const note of notes) {
            store.updateNote(note.id, note);
          }
          break;
        case 'DELETE':
          // Supprimer les notes
          for (const note of notes) {
            store.removeNote(note.id);
          }
          break;
        case 'MOVE':
          // Déplacer les notes
          for (const note of notes) {
            store.moveNote(note.id, note.folder_id, note.classeur_id);
          }
          break;
      }

      logger.dev?.(`[UnifiedPollingService] ✅ ${notes.length} notes synchronisées (${operation})`);
      
    } catch (error) {
      logger.error('[UnifiedPollingService] ❌ Erreur synchronisation notes:', error);
    }
  }

  /**
   * Synchroniser les dossiers
   */
  private async syncFolders(store: any, operation: string, data: any[]): Promise<void> {
    try {
      const folders = Array.isArray(data) ? data : [];
      
      switch (operation) {
        case 'CREATE':
          for (const folder of folders) {
            store.addFolder(folder);
          }
          break;
        case 'UPDATE':
          for (const folder of folders) {
            store.updateFolder(folder.id, folder);
          }
          break;
        case 'DELETE':
          for (const folder of folders) {
            store.removeFolder(folder.id);
          }
          break;
        case 'MOVE':
          for (const folder of folders) {
            store.moveFolder(folder.id, folder.parent_id, folder.classeur_id);
          }
          break;
      }

      logger.dev?.(`[UnifiedPollingService] ✅ ${folders.length} dossiers synchronisés (${operation})`);
      
    } catch (error) {
      logger.error('[UnifiedPollingService] ❌ Erreur synchronisation dossiers:', error);
    }
  }

  /**
   * Synchroniser les classeurs
   */
  private async syncClasseurs(store: any, operation: string, data: any[]): Promise<void> {
    try {
      const classeurs = Array.isArray(data) ? data : [];
      
      switch (operation) {
        case 'CREATE':
          for (const classeur of classeurs) {
            store.addClasseur(classeur);
          }
          break;
        case 'UPDATE':
          for (const classeur of classeurs) {
            store.updateClasseur(classeur.id, classeur);
          }
          break;
        case 'DELETE':
          for (const classeur of classeurs) {
            store.removeClasseur(classeur.id);
          }
          break;
      }

      logger.dev?.(`[UnifiedPollingService] ✅ ${classeurs.length} classeurs synchronisés (${operation})`);
      
    } catch (error) {
      logger.error('[UnifiedPollingService] ❌ Erreur synchronisation classeurs:', error);
    }
  }

  /**
   * Synchroniser les fichiers
   */
  private async syncFiles(store: any, operation: string, data: any[]): Promise<void> {
    try {
      const files = Array.isArray(data) ? data : [];
      
      switch (operation) {
        case 'CREATE':
          for (const file of files) {
            // store.addFile(file); // À implémenter si nécessaire
          }
          break;
        case 'UPDATE':
          for (const file of files) {
            // store.updateFile(file.id, file); // À implémenter si nécessaire
          }
          break;
        case 'DELETE':
          for (const file of files) {
            // store.removeFile(file.id); // À implémenter si nécessaire
          }
          break;
      }

      logger.dev?.(`[UnifiedPollingService] ✅ ${files.length} fichiers synchronisés (${operation})`);
      
    } catch (error) {
      logger.error('[UnifiedPollingService] ❌ Erreur synchronisation fichiers:', error);
    }
  }

  /**
   * Obtenir le statut complet du service
   */
  getStatus(): PollingStatus {
    return {
      isPolling: this.isPolling,
      queueLength: this.pollingQueue.length,
      lastResults: new Map(this.lastPollingResults),
      activePollings: new Set(this.activePollings),
      totalPollings: this.totalPollings,
      successfulPollings: this.successfulPollings,
      failedPollings: this.failedPollings
    };
  }

  /**
   * Nettoyer les anciens résultats
   */
  private cleanupOldResults(): void {
    const cutoff = Date.now() - this.CLEANUP_INTERVAL;
    let cleanedCount = 0;

    for (const [key, result] of this.lastPollingResults.entries()) {
      if (result.timestamp < cutoff) {
        this.lastPollingResults.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.dev?.(`[UnifiedPollingService] 🧹 Nettoyage: ${cleanedCount} anciens résultats supprimés`);
    }
  }

  /**
   * Arrêter le service de polling
   */
  stop(): void {
    this.isPolling = false;
    this.pollingQueue = [];
    this.activePollings.clear();
    logger.info('[UnifiedPollingService] 🛑 Service de polling arrêté');
  }

  /**
   * Vider la queue de polling
   */
  clearQueue(): void {
    const queueLength = this.pollingQueue.length;
    this.pollingQueue = [];
    logger.info(`[UnifiedPollingService] 🗑️ Queue vidée (${queueLength} éléments supprimés)`);
  }

  /**
   * Démarrer le service de synchronisation
   */
  start(): void {
    logger.info('[UnifiedPollingService] ✅ Service de synchronisation démarré');
  }

  /**
   * Synchronisation forcée
   */
  async forceSync(): Promise<void> {
    logger.info('[UnifiedPollingService] 🔄 Synchronisation forcée');
    
    // Forcer la synchronisation de toutes les entités
    const store = useFileSystemStore.getState();
    
    try {
      // Récupérer et synchroniser les notes
      if (this.authToken) {
        const notesResponse = await fetch('/api/v2/notes?auth_token=' + this.authToken);
        if (notesResponse.ok) {
          const notesData = await notesResponse.json();
          await this.syncNotes(store, 'UPDATE', notesData.notes || []);
        }
      }
    } catch (error) {
      logger.error('[UnifiedPollingService] ❌ Erreur synchronisation forcée:', error);
    }
  }
}

// Instance singleton
export const unifiedPollingService = new UnifiedPollingService();

// Fonctions d'export pour faciliter l'utilisation
export const triggerUnifiedPolling = (config: PollingConfig) => 
  unifiedPollingService.triggerPolling(config);

export const getUnifiedPollingStatus = () => 
  unifiedPollingService.getStatus();

export const stopUnifiedPollingService = () => 
  unifiedPollingService.stop();

export const clearUnifiedPollingQueue = () => 
  unifiedPollingService.clearQueue();

export const startUnifiedPollingSync = () => 
  unifiedPollingService.start();

export const stopUnifiedPollingSync = () => 
  unifiedPollingService.stop();

export const forceUnifiedPollingSync = () => 
  unifiedPollingService.forceSync();

export const setUnifiedPollingAuthToken = (token: string) => 
  unifiedPollingService.setAuthToken(token);

export const clearUnifiedPollingAuthToken = () => 
  unifiedPollingService.clearAuthToken(); 