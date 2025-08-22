/**
 * 🚀 Service de Polling Intelligent V2
 * 
 * Système de polling déclenché par API qui utilise uniquement les endpoints V2
 * pour maintenir la synchronisation entre le store Zustand et la base de données.
 */

import { simpleLogger as logger } from '@/utils/logger';

export interface PollingConfig {
  entityType: 'notes' | 'folders' | 'classeurs';
  operation: 'CREATE' | 'UPDATE' | 'DELETE' | 'MOVE';
  entityId?: string;
  delay?: number; // Délai avant le polling (ms)
}

export interface PollingResult {
  success: boolean;
  entityType: string;
  operation: string;
  timestamp: number;
  dataCount?: number;
  error?: string;
}

class IntelligentPollingServiceV2 {
  private isPolling = false;
  private pollingQueue: PollingConfig[] = [];
  private pollingTimeout: NodeJS.Timeout | null = null;
  private lastPollingResults = new Map<string, PollingResult>();
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 2000; // 2 secondes

  /**
   * Déclencher un polling intelligent après une action CRUD
   */
  async triggerPolling(config: PollingConfig): Promise<PollingResult> {
    if (process.env.NODE_ENV === 'development') {
      logger.dev(`[IntelligentPollingV2] 🔄 Déclenchement polling: ${config.entityType} ${config.operation}`);
    }

    // Ajouter à la queue avec priorité
    this.addToQueue(config);

    // Si pas de polling en cours, démarrer
    if (!this.isPolling) {
      return this.processPollingQueue();
    }

    // Retourner le résultat du dernier polling si disponible
    const lastResult = this.lastPollingResults.get(config.entityType);
    return lastResult || { 
      success: false, 
      entityType: config.entityType, 
      operation: config.operation, 
      timestamp: Date.now(),
      error: 'Polling en cours'
    };
  }

  /**
   * Ajouter une configuration à la queue avec priorité
   */
  private addToQueue(config: PollingConfig): void {
    // Priorité : DELETE > UPDATE > CREATE > MOVE
    const priority = {
      'DELETE': 1,
      'UPDATE': 2,
      'CREATE': 3,
      'MOVE': 4
    };

    const configPriority = priority[config.operation] || 5;
    
    // Insérer selon la priorité
    let inserted = false;
    for (let i = 0; i < this.pollingQueue.length; i++) {
      if (priority[this.pollingQueue[i].operation] > configPriority) {
        this.pollingQueue.splice(i, 0, config);
        inserted = true;
        break;
      }
    }
    
    if (!inserted) {
      this.pollingQueue.push(config);
    }

    if (process.env.NODE_ENV === 'development') {
      logger.dev(`[IntelligentPollingV2] 📋 Queue mise à jour: ${this.pollingQueue.length} éléments`);
    }
  }

  /**
   * Traiter la queue de polling
   */
  private async processPollingQueue(): Promise<PollingResult> {
    if (this.pollingQueue.length === 0) {
      this.isPolling = false;
      return { 
        success: false, 
        entityType: 'none', 
        operation: 'none', 
        timestamp: Date.now(),
        error: 'Queue vide'
      };
    }

    this.isPolling = true;
    const config = this.pollingQueue.shift()!;

    try {
      // 🚀 SUPPRESSIONS IMMÉDIATES, CRÉATIONS AVEC DÉLAI
      const delay = config.operation === 'DELETE' ? 0 : (config.delay || 1000);
      
      if (delay > 0) {
        if (process.env.NODE_ENV === 'development') {
          logger.dev(`[IntelligentPollingV2] ⏳ Attente ${delay}ms avant polling ${config.entityType} (${config.operation})`);
        }
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        if (process.env.NODE_ENV === 'development') {
          logger.dev(`[IntelligentPollingV2] 🚀 Polling immédiat pour ${config.entityType} (${config.operation})`);
        }
      }

      // Effectuer le polling avec retry
      const result = await this.performPollingWithRetry(config);
      
      // Stocker le résultat
      this.lastPollingResults.set(config.entityType, result);

      if (process.env.NODE_ENV === 'development') {
        logger.dev(`[IntelligentPollingV2] ✅ Polling ${config.entityType} terminé:`, result);
      }

      return result;

    } catch (error) {
      const errorResult: PollingResult = {
        success: false,
        entityType: config.entityType,
        operation: config.operation,
        timestamp: Date.now(),
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };

      this.lastPollingResults.set(config.entityType, errorResult);
      logger.error(`[IntelligentPollingV2] ❌ Erreur polling ${config.entityType}:`, error);
      
      return errorResult;
    } finally {
      // Traiter le prochain polling
      this.processPollingQueue();
    }
  }

  /**
   * Effectuer le polling avec système de retry
   */
  private async performPollingWithRetry(config: PollingConfig): Promise<PollingResult> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        if (process.env.NODE_ENV === 'development') {
          logger.dev(`[IntelligentPollingV2] 🔄 Tentative ${attempt}/${this.MAX_RETRIES} pour ${config.entityType}`);
        }

        const result = await this.performPolling(config);
        return result;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < this.MAX_RETRIES) {
          if (process.env.NODE_ENV === 'development') {
            logger.warn(`[IntelligentPollingV2] ⚠️ Tentative ${attempt} échouée, retry dans ${this.RETRY_DELAY}ms`);
          }
          await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY));
        }
      }
    }

    throw lastError || new Error(`Polling échoué après ${this.MAX_RETRIES} tentatives`);
  }

  /**
   * Effectuer le polling réel
   */
  private async performPolling(config: PollingConfig): Promise<PollingResult> {
    const startTime = Date.now();

    try {
      let result: PollingResult;

      switch (config.entityType) {
        case 'notes':
          result = await this.pollNotesV2();
          break;
        case 'folders':
          result = await this.pollFoldersV2();
          break;
        case 'classeurs':
          result = await this.pollClasseursV2();
          break;
        default:
          throw new Error(`Type d'entité non supporté: ${config.entityType}`);
      }

      result.timestamp = Date.now();
      result.operation = config.operation;
      
      return result;

    } catch (error) {
      throw new Error(`Erreur polling ${config.entityType}: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }

  /**
   * Polling des notes via endpoint V2
   */
  private async pollNotesV2(): Promise<PollingResult> {
    try {
      const authToken = await this.getAuthToken();
      if (!authToken) {
        throw new Error('Token d\'authentification manquant');
      }

      // ✅ CORRECTION: Utiliser l'endpoint avec contenu complet pour détecter les suppressions
      const response = await fetch('/api/v2/classeurs/with-content', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      const { classeurs, folders, notes } = result;
      
      // ✅ Mise à jour complète du store (classeurs + dossiers + notes)
      await this.updateCompleteStore(classeurs, folders, notes);
      
      return {
        success: true,
        entityType: 'notes',
        operation: 'POLL',
        timestamp: Date.now(),
        dataCount: notes.length
      };

    } catch (error) {
      logger.error('[IntelligentPollingV2] ❌ Erreur polling notes V2:', error);
      throw error;
    }
  }

  /**
   * Polling des dossiers via endpoint V2
   */
  private async pollFoldersV2(): Promise<PollingResult> {
    try {
      const authToken = await this.getAuthToken();
      if (!authToken) {
        throw new Error('Token d\'authentification manquant');
      }

      const response = await fetch('/api/v2/classeurs/with-content', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      const { classeurs, folders, notes } = result;
      
      // ✅ Mise à jour complète du store
      await this.updateCompleteStore(classeurs, folders, notes);
      
      return {
        success: true,
        entityType: 'folders',
        operation: 'POLL',
        timestamp: Date.now(),
        dataCount: folders.length
      };

    } catch (error) {
      logger.error('[IntelligentPollingV2] ❌ Erreur polling dossiers V2:', error);
      throw error;
    }
  }

  /**
   * Polling des classeurs via endpoint V2
   */
  private async pollClasseursV2(): Promise<PollingResult> {
    try {
      const authToken = await this.getAuthToken();
      if (!authToken) {
        throw new Error('Token d\'authentification manquant');
      }

      const response = await fetch('/api/v2/classeurs/with-content', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      const { classeurs, folders, notes } = result;
      
      // ✅ Mise à jour complète du store
      await this.updateCompleteStore(classeurs, folders, notes);
      
      return {
        success: true,
        entityType: 'classeurs',
        operation: 'POLL',
        timestamp: Date.now(),
        dataCount: classeurs.length
      };

    } catch (error) {
      logger.error('[IntelligentPollingV2] ❌ Erreur polling classeurs V2:', error);
      throw error;
    }
  }

  /**
   * Mettre à jour le store des notes avec merge
   */
  private async updateNotesStore(newNotes: any[]): Promise<void> {
    try {
      const { useFileSystemStore } = await import('@/store/useFileSystemStore');
      const store = useFileSystemStore.getState();
      
      // Merger les nouvelles notes avec les existantes
      const mergedNotes = { ...store.notes };
      newNotes.forEach(note => {
        if (note.id) {
          mergedNotes[note.id] = note;
        }
      });
      
      // Mettre à jour le store
      store.setNotes(Object.values(mergedNotes));
      
      if (process.env.NODE_ENV === 'development') {
        logger.dev(`[IntelligentPollingV2] ✅ Store notes mis à jour: ${newNotes.length} notes mergées`);
      }
    } catch (error) {
      logger.error('[IntelligentPollingV2] ❌ Erreur mise à jour store notes:', error);
      throw error;
    }
  }

  /**
   * Mettre à jour le store complet (classeurs + dossiers + notes)
   */
  private async updateCompleteStore(classeurs: any[], folders: any[], notes: any[]): Promise<void> {
    try {
      const { useFileSystemStore } = await import('@/store/useFileSystemStore');
      const store = useFileSystemStore.getState();
      
      // ✅ CORRECTION: Ne mettre à jour que si les données ne sont pas vides
      // Cela évite de vider le store quand l'API retourne des tableaux vides
      const currentStoreState = {
        classeurs: Object.keys(store.classeurs).length,
        folders: Object.keys(store.folders).length,
        notes: Object.keys(store.notes).length
      };
      
      if (process.env.NODE_ENV === 'development') {
        logger.dev(`[IntelligentPollingV2] 🔍 État avant mise à jour:`, {
          store: currentStoreState,
          incoming: { classeurs: classeurs.length, folders: folders.length, notes: notes.length }
        });
      }
      
      if (classeurs.length > 0) {
        store.setClasseurs(classeurs);
      }
      if (folders.length > 0) {
        store.setFolders(folders);
      }
      if (notes.length > 0) {
        store.setNotes(notes);
      }
      
      // Vérifier l'état après mise à jour
      const finalStoreState = {
        classeurs: Object.keys(store.classeurs).length,
        folders: Object.keys(store.folders).length,
        notes: Object.keys(store.notes).length
      };
      
      if (process.env.NODE_ENV === 'development') {
        logger.dev(`[IntelligentPollingV2] 🔍 État après mise à jour:`, finalStoreState);
      }
      
      if (process.env.NODE_ENV === 'development') {
        logger.dev(`[IntelligentPollingV2] ✅ Store complet mis à jour:`, {
          classeurs: classeurs.length,
          folders: folders.length,
          notes: notes.length,
          storeUpdated: {
            classeurs: classeurs.length > 0,
            folders: folders.length > 0,
            notes: notes.length > 0
          }
        });
      }
    } catch (error) {
      logger.error('[IntelligentPollingV2] ❌ Erreur mise à jour store complet:', error);
      throw error;
    }
  }

  /**
   * Récupérer le token d'authentification
   */
  private async getAuthToken(): Promise<string> {
    try {
      const { supabase } = await import('@/supabaseClient');
      const { data: { session } } = await supabase.auth.getSession();
      return session?.access_token || '';
    } catch (error) {
      logger.error('[IntelligentPollingV2] ❌ Erreur récupération token:', error);
      return '';
    }
  }

  /**
   * Obtenir le statut du service
   */
  getStatus(): {
    isPolling: boolean;
    queueLength: number;
    lastResults: Map<string, PollingResult>;
  } {
    return {
      isPolling: this.isPolling,
      queueLength: this.pollingQueue.length,
      lastResults: new Map(this.lastPollingResults)
    };
  }

  /**
   * Arrêter le service
   */
  stop(): void {
    this.isPolling = false;
    this.pollingQueue = [];
    this.lastPollingResults.clear();
    
    if (this.pollingTimeout) {
      clearTimeout(this.pollingTimeout);
      this.pollingTimeout = null;
    }
    
    logger.dev('[IntelligentPollingV2] 🛑 Service arrêté');
  }

  /**
   * Nettoyer les anciens résultats
   */
  cleanup(): void {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes
    
    for (const [key, result] of this.lastPollingResults.entries()) {
      if (now - result.timestamp > maxAge) {
        this.lastPollingResults.delete(key);
      }
    }
    
    if (process.env.NODE_ENV === 'development') {
      logger.dev(`[IntelligentPollingV2] 🗑️ Nettoyage: ${this.lastPollingResults.size} résultats conservés`);
    }
  }
}

// Instance singleton
export const intelligentPollingServiceV2 = new IntelligentPollingServiceV2();

// Fonction d'aide pour déclencher le polling
export const triggerIntelligentPolling = (config: PollingConfig): Promise<PollingResult> => {
  return intelligentPollingServiceV2.triggerPolling(config);
};

// Fonction d'aide pour obtenir le statut
export const getPollingStatus = () => intelligentPollingServiceV2.getStatus();

// Fonction d'aide pour arrêter le service
export const stopPollingService = () => intelligentPollingServiceV2.stop(); 