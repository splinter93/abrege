/**
 * Service de cache robuste pour les agents spécialisés
 * Cache thread-safe avec TTL automatique et invalidation intelligente
 */

import { SpecializedAgentConfig, CachedAgent } from '../types/AgentTypes';
import { simpleLogger as logger } from '@/utils/logger';

export class AgentCache {
  private readonly cache = new Map<string, CachedAgent>();
  private readonly defaultTTL: number;
  private readonly maxSize: number;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(defaultTTL: number = 5 * 60 * 1000, maxSize: number = 1000) {
    this.defaultTTL = defaultTTL;
    this.maxSize = maxSize;
    this.startCleanupInterval();
  }

  /**
   * Récupère un agent du cache
   */
  get(key: string): SpecializedAgentConfig | null {
    const cached = this.cache.get(key);
    
    if (!cached) {
      return null;
    }

    // Vérifier l'expiration
    if (this.isExpired(cached)) {
      this.cache.delete(key);
      logger.dev(`[AgentCache] 🗑️ Cache expiré pour: ${key}`);
      return null;
    }

    logger.dev(`[AgentCache] 📦 Cache hit pour: ${key}`);
    return cached.agent;
  }

  /**
   * Met un agent en cache
   */
  set(key: string, agent: SpecializedAgentConfig, ttl?: number): void {
    // Vérifier la taille maximale
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    const cachedAgent: CachedAgent = {
      agent,
      timestamp: Date.now(),
      ttl: ttl ?? this.defaultTTL
    };

    this.cache.set(key, cachedAgent);
    logger.dev(`[AgentCache] 💾 Agent mis en cache: ${key} (TTL: ${ttl ?? this.defaultTTL}ms)`);
  }

  /**
   * Supprime un agent du cache
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      logger.dev(`[AgentCache] 🗑️ Agent supprimé du cache: ${key}`);
    }
    return deleted;
  }

  /**
   * Vide tout le cache
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    logger.dev(`[AgentCache] 🗑️ Cache vidé (${size} entrées supprimées)`);
  }

  /**
   * Invalide le cache pour un agent spécifique
   */
  invalidate(agentId: string): void {
    this.delete(agentId);
  }

  /**
   * Invalide le cache pour plusieurs agents
   */
  invalidateMultiple(agentIds: readonly string[]): void {
    let count = 0;
    for (const agentId of agentIds) {
      if (this.delete(agentId)) {
        count++;
      }
    }
    logger.dev(`[AgentCache] 🗑️ ${count} agents invalidés du cache`);
  }

  /**
   * Vérifie si un agent est en cache
   */
  has(key: string): boolean {
    const cached = this.cache.get(key);
    if (!cached) {
      return false;
    }

    if (this.isExpired(cached)) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Retourne la taille du cache
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Retourne les statistiques du cache
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    oldestEntry: number;
    newestEntry: number;
  } {
    const entries = Array.from(this.cache.values());
    const timestamps = entries.map(e => e.timestamp);
    
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: 0, // TODO: Implémenter le calcul du hit rate
      oldestEntry: timestamps.length > 0 ? Math.min(...timestamps) : 0,
      newestEntry: timestamps.length > 0 ? Math.max(...timestamps) : 0
    };
  }

  /**
   * Nettoie les entrées expirées
   */
  private cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, cached] of this.cache.entries()) {
      if (this.isExpired(cached)) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.dev(`[AgentCache] 🧹 Nettoyage: ${cleanedCount} entrées expirées supprimées`);
    }
  }

  /**
   * Vérifie si une entrée est expirée
   */
  private isExpired(cached: CachedAgent): boolean {
    return Date.now() - cached.timestamp > cached.ttl;
  }

  /**
   * Supprime l'entrée la plus ancienne
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, cached] of this.cache.entries()) {
      if (cached.timestamp < oldestTime) {
        oldestTime = cached.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      logger.dev(`[AgentCache] 🗑️ Entrée la plus ancienne supprimée: ${oldestKey}`);
    }
  }

  /**
   * Démarre l'intervalle de nettoyage automatique
   */
  private startCleanupInterval(): void {
    // Nettoyage toutes les 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Arrête l'intervalle de nettoyage
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }

  /**
   * Préchauffe le cache avec des agents
   */
  async preload(agents: readonly SpecializedAgentConfig[]): Promise<void> {
    for (const agent of agents) {
      this.set(agent.id, agent);
      if (agent.slug && agent.slug !== agent.id) {
        this.set(agent.slug, agent);
      }
    }
    logger.dev(`[AgentCache] 🔥 Cache préchauffé avec ${agents.length} agents`);
  }

  /**
   * Recherche des agents par critères
   */
  search(criteria: {
    model?: string;
    provider?: string;
    isActive?: boolean;
    capabilities?: readonly string[];
  }): SpecializedAgentConfig[] {
    const results: SpecializedAgentConfig[] = [];

    for (const cached of this.cache.values()) {
      if (this.isExpired(cached)) {
        continue;
      }

      const agent = cached.agent;
      let matches = true;

      if (criteria.model && agent.model !== criteria.model) {
        matches = false;
      }

      if (criteria.provider && agent.provider !== criteria.provider) {
        matches = false;
      }

      if (criteria.isActive !== undefined && agent.is_active !== criteria.isActive) {
        matches = false;
      }

      if (criteria.capabilities && criteria.capabilities.length > 0) {
        const hasAllCapabilities = criteria.capabilities.every(cap => 
          agent.capabilities.includes(cap)
        );
        if (!hasAllCapabilities) {
          matches = false;
        }
      }

      if (matches) {
        results.push(agent);
      }
    }

    return results;
  }
}
