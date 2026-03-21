/**
 * Gestionnaire de concurrence pour éviter les chargements multiples
 * Améliore les performances et évite les conditions de course
 */

import { simpleLogger } from '@/utils/logger';

export interface LoadingPromise {
  promise: Promise<unknown>;
  timestamp: number;
  aborted: boolean;
}

export class ConcurrencyManager {
  private loadingPromises = new Map<string, LoadingPromise>();
  private readonly maxAge: number; // Âge maximum d'une promesse en ms
  private readonly cleanupInterval: number; // Intervalle de nettoyage en ms
  
  constructor(maxAge = 30000, cleanupInterval = 60000) {
    this.maxAge = maxAge;
    this.cleanupInterval = cleanupInterval;
    
    // Nettoyage automatique des promesses expirées
    setInterval(() => this.cleanup(), this.cleanupInterval);
  }
  
  /**
   * Récupère ou crée une promesse de chargement
   * Évite les chargements multiples de la même ressource
   */
  getOrCreateLoadingPromise<R>(
    key: string,
    loader: () => Promise<R>,
    options: { 
      maxAge?: number;
      abortSignal?: AbortSignal;
    } = {}
  ): Promise<R> {
    const finalMaxAge = options.maxAge || this.maxAge;
    
    // Vérifier si une promesse existe déjà et n'est pas expirée
    const existing = this.loadingPromises.get(key);
    if (existing && !this.isExpired(existing, finalMaxAge) && !existing.aborted) {
      simpleLogger.dev(`[ConcurrencyManager] 🔄 Réutilisation promesse existante pour: ${key}`);
      return existing.promise as Promise<R>;
    }
    
    // Créer une nouvelle promesse
    simpleLogger.dev(`[ConcurrencyManager] ➕ Création nouvelle promesse pour: ${key}`);
    
    const promise = loader().finally(() => {
      // Nettoyer après résolution
      setTimeout(() => {
        this.loadingPromises.delete(key);
        simpleLogger.dev(`[ConcurrencyManager] 🗑️ Promesse nettoyée pour: ${key}`);
      }, 1000); // Délai pour éviter les suppressions trop rapides
    });
    
    const loadingPromise: LoadingPromise = {
      promise,
      timestamp: Date.now(),
      aborted: false
    };
    
    // Gérer l'abort signal si fourni
    if (options.abortSignal) {
      options.abortSignal.addEventListener('abort', () => {
        loadingPromise.aborted = true;
        simpleLogger.dev(`[ConcurrencyManager] ⏹️ Promesse annulée pour: ${key}`);
      });
    }
    
    this.loadingPromises.set(key, loadingPromise);
    
    return promise;
  }
  
  /**
   * Vérifie si une promesse est expirée
   */
  private isExpired(loadingPromise: LoadingPromise, maxAge: number): boolean {
    return Date.now() - loadingPromise.timestamp > maxAge;
  }
  
  /**
   * Annule une promesse en cours
   */
  abort(key: string): boolean {
    const loadingPromise = this.loadingPromises.get(key);
    if (loadingPromise) {
      loadingPromise.aborted = true;
      this.loadingPromises.delete(key);
      simpleLogger.dev(`[ConcurrencyManager] ⏹️ Promesse annulée manuellement pour: ${key}`);
      return true;
    }
    return false;
  }
  
  /**
   * Annule toutes les promesses
   */
  abortAll(): void {
    for (const [key] of this.loadingPromises) {
      this.abort(key);
    }
    simpleLogger.dev('[ConcurrencyManager] ⏹️ Toutes les promesses annulées');
  }
  
  /**
   * Nettoyage des promesses expirées
   */
  private cleanup(): void {
    let cleanedCount = 0;
    
    for (const [key, loadingPromise] of this.loadingPromises.entries()) {
      if (this.isExpired(loadingPromise, this.maxAge) || loadingPromise.aborted) {
        this.loadingPromises.delete(key);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      simpleLogger.dev(`[ConcurrencyManager] 🧹 Nettoyage: ${cleanedCount} promesses expirées supprimées`);
    }
  }
  
  /**
   * Obtient les statistiques du gestionnaire
   */
  getStats(): {
    activePromises: number;
    totalKeys: number;
    oldestPromise: number;
  } {
    const now = Date.now();
    let oldestTimestamp = now;
    
    for (const loadingPromise of this.loadingPromises.values()) {
      if (loadingPromise.timestamp < oldestTimestamp) {
        oldestTimestamp = loadingPromise.timestamp;
      }
    }
    
    return {
      activePromises: this.loadingPromises.size,
      totalKeys: this.loadingPromises.size,
      oldestPromise: now - oldestTimestamp
    };
  }
  
  /**
   * Vérifie si une clé est en cours de chargement
   */
  isLoading(key: string): boolean {
    const loadingPromise = this.loadingPromises.get(key);
    return loadingPromise !== undefined && !this.isExpired(loadingPromise, this.maxAge) && !loadingPromise.aborted;
  }
  
  /**
   * Obtient la liste des clés en cours de chargement
   */
  getLoadingKeys(): string[] {
    return Array.from(this.loadingPromises.entries())
      .filter(([, loadingPromise]) => 
        !this.isExpired(loadingPromise, this.maxAge) && !loadingPromise.aborted
      )
      .map(([key]) => key);
  }
}

/**
 * Instance globale pour les notes
 */
export const noteConcurrencyManager = new ConcurrencyManager();

/**
 * Instance globale pour les classeurs
 */
export const classeurConcurrencyManager = new ConcurrencyManager();

/**
 * Instance globale pour les dossiers
 */
export const folderConcurrencyManager = new ConcurrencyManager(); 