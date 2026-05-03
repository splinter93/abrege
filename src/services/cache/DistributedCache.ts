/**
 * Cache distribué Redis avec fallback mémoire
 * Optimisé pour les performances de production
 */

import { simpleLogger as logger } from '@/utils/logger';
import { getCacheConfig, logCacheConfig } from './CacheConfig';

// Types Redis (import conditionnel)
type RedisClientType = {
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  isReady: boolean;
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, options?: { EX: number }) => Promise<void>;
  setEx?: (key: string, ttl: number, value: string) => Promise<void>;
  del: (key: string) => Promise<number>;
  keys: (pattern: string) => Promise<string[]>;
  on?: (event: 'error' | 'connect' | 'disconnect' | string, listener: (...args: unknown[]) => void) => void;
  flushDb?: () => Promise<void>;
  quit?: () => Promise<void>;
} | null;

type CreateClientFn = ((options: {
  socket: { host: string; port: number };
  password?: string;
  database?: number;
}) => RedisClientType) | null;

// Import conditionnel de Redis
let createClient: CreateClientFn;

try {
  const redis = require('redis');
  createClient = redis.createClient;
} catch (error) {
  logger.warn('[DistributedCache] Redis non disponible, utilisation du cache mémoire uniquement');
  createClient = null;
}

export interface CacheConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
    db?: number;
    ttl: {
      agents: number;      // 1 heure
      tools: number;       // 30 minutes
      userId: number;      // 5 minutes
      classeurs: number;   // 15 minutes
      notes: number;       // 10 minutes
    };
  };
  memory: {
    fallback: boolean;
    maxSize: number;
    defaultTtl: number;
  };
}

export interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  ttl: number;
  key: string;
}

export class DistributedCache {
  private static instance: DistributedCache;
  private redis: RedisClientType | null = null;
  private memory: Map<string, CacheEntry> = new Map();
  private config: CacheConfig;
  private isConnected = false;
  private connectionPromise: Promise<void> | null = null;

  private constructor(config: CacheConfig) {
    this.config = config;
    this.initializeRedis();
    this.startMemoryCleanup();
  }

  public static getInstance(config?: CacheConfig): DistributedCache {
    if (!DistributedCache.instance) {
      if (!config) {
        throw new Error('Cache configuration required for first initialization');
      }
      DistributedCache.instance = new DistributedCache(config);
    }
    return DistributedCache.instance;
  }

  /**
   * Initialiser la connexion Redis
   */
  private async initializeRedis(): Promise<void> {
    try {
      // Vérifier si Redis est disponible
      if (!createClient) {
        logger.warn('[DistributedCache] Redis non disponible, utilisation du cache mémoire uniquement');
        this.isConnected = false;
        return;
      }

      // Vérifier si Redis est configuré et activé
      const cacheConfig = getCacheConfig();
      if (!cacheConfig.redis.enabled || !cacheConfig.redis.host) {
        logger.warn('[DistributedCache] Redis désactivé, utilisation du cache mémoire uniquement');
        this.isConnected = false;
        return;
      }

      this.redis = createClient({
        socket: {
          host: cacheConfig.redis.host,
          port: cacheConfig.redis.port
        },
        password: cacheConfig.redis.password,
        database: cacheConfig.redis.db || 0,
      });

      if (this.redis?.on) {
        this.redis.on('error', (error) => {
          // Ne logger l'erreur qu'une seule fois pour éviter le spam
          if (!this.isConnected) {
            logger.warn('[DistributedCache] ⚠️ Redis non accessible, utilisation du cache mémoire uniquement');
            this.isConnected = false;
          }
        });

        this.redis.on('connect', () => {
          logger.info('[DistributedCache] ✅ Redis connected');
          this.isConnected = true;
        });

        this.redis.on('disconnect', () => {
          logger.warn('[DistributedCache] ⚠️ Redis disconnected');
          this.isConnected = false;
        });
      }

      // Tentative de connexion avec timeout
      if (!this.redis) {
        this.isConnected = false;
        return;
      }
      try {
        await Promise.race([
          this.redis.connect(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Redis connection timeout')), 5000)
          )
        ]);
      } catch (connectError) {
        logger.warn('[DistributedCache] ⚠️ Redis connection failed, utilisation du cache mémoire uniquement');
        this.isConnected = false;
        this.redis = null;
      }
    } catch (error) {
      logger.warn('[DistributedCache] ⚠️ Redis initialization failed, utilisation du cache mémoire uniquement');
      this.isConnected = false;
      this.redis = null;
    }
  }

  /**
   * Obtenir une valeur du cache
   */
  async get<T = unknown>(key: string): Promise<T | null> {
    try {
      // 1. Essayer Redis d'abord
      if (this.isConnected && this.redis) {
        const redisValue = await this.redis.get(key);
        if (redisValue) {
          const parsed = JSON.parse(redisValue) as CacheEntry<T>;
          if (this.isValidEntry(parsed)) {
            logger.dev(`[DistributedCache] 📦 Cache HIT (Redis): ${key}`);
            return parsed.data;
          } else {
            // Entrée expirée, la supprimer
            await this.redis.del(key);
          }
        }
      }

      // 2. Fallback mémoire
      if (this.config.memory.fallback) {
        const memoryValue = this.memory.get(key);
        if (memoryValue && this.isValidEntry(memoryValue)) {
          logger.dev(`[DistributedCache] 📦 Cache HIT (Memory): ${key}`);
          return memoryValue.data as T;
        } else if (memoryValue) {
          // Entrée expirée, la supprimer
          this.memory.delete(key);
        }
      }

      logger.dev(`[DistributedCache] ❌ Cache MISS: ${key}`);
      return null;
    } catch (error) {
      logger.error(`[DistributedCache] ❌ Error getting ${key}:`, error);
      return null;
    }
  }

  /**
   * Stocker une valeur dans le cache
   */
  async set<T = unknown>(key: string, data: T, ttl?: number): Promise<boolean> {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl: ttl || this.config.memory.defaultTtl,
        key,
      };

      // 1. Stocker dans Redis
      if (this.isConnected && this.redis) {
        const redisTtl = Math.floor(ttl || this.config.memory.defaultTtl / 1000); // Redis TTL en secondes
        if (this.redis.setEx) {
          await this.redis.setEx(key, redisTtl, JSON.stringify(entry));
        } else {
          await this.redis.set(key, JSON.stringify(entry), { EX: redisTtl });
        }
      }

      // 2. Stocker dans la mémoire (fallback)
      if (this.config.memory.fallback) {
        this.memory.set(key, entry);
        this.ensureMemorySizeLimit();
      }

      logger.dev(`[DistributedCache] 💾 Cache SET: ${key} (TTL: ${ttl || this.config.memory.defaultTtl}ms)`);
      return true;
    } catch (error) {
      logger.error(`[DistributedCache] ❌ Error setting ${key}:`, error);
      return false;
    }
  }

  /**
   * Supprimer une valeur du cache
   */
  async delete(key: string): Promise<boolean> {
    try {
      // Supprimer de Redis
      if (this.isConnected && this.redis) {
        await this.redis.del(key);
      }

      // Supprimer de la mémoire
      if (this.config.memory.fallback) {
        this.memory.delete(key);
      }

      logger.dev(`[DistributedCache] 🗑️ Cache DELETE: ${key}`);
      return true;
    } catch (error) {
      logger.error(`[DistributedCache] ❌ Error deleting ${key}:`, error);
      return false;
    }
  }

  /**
   * Vérifier si une entrée est valide
   */
  private isValidEntry(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp < entry.ttl;
  }

  /**
   * Nettoyage automatique de la mémoire
   */
  private startMemoryCleanup(): void {
    setInterval(() => {
      this.cleanupExpiredMemory();
    }, 5 * 60 * 1000); // Toutes les 5 minutes
  }

  /**
   * Nettoyer les entrées expirées de la mémoire
   */
  private cleanupExpiredMemory(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, entry] of this.memory.entries()) {
      if (!this.isValidEntry(entry)) {
        this.memory.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.dev(`[DistributedCache] 🗑️ Memory cleanup: ${cleanedCount} expired entries removed`);
    }
  }

  /**
   * Contrôler la taille de la mémoire
   */
  private ensureMemorySizeLimit(): void {
    if (this.memory.size > this.config.memory.maxSize) {
      // Supprimer les entrées les plus anciennes
      const entries = Array.from(this.memory.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

      const toRemove = entries.slice(0, this.memory.size - this.config.memory.maxSize);
      toRemove.forEach(([key]) => this.memory.delete(key));

      logger.dev(`[DistributedCache] 🗑️ Memory limit enforced: ${toRemove.length} old entries removed`);
    }
  }

  /**
   * Obtenir les statistiques du cache
   */
  getStats(): {
    redis: { connected: boolean; keys?: number };
    memory: { size: number; maxSize: number };
    performance: { hitRate: number };
  } {
    const memorySize = this.memory.size;
    const expiredCount = Array.from(this.memory.values()).filter(entry => !this.isValidEntry(entry)).length;

    return {
      redis: {
        connected: this.isConnected,
        keys: this.isConnected ? undefined : 0, // TODO: Implémenter la récupération du nombre de clés
      },
      memory: {
        size: memorySize,
        maxSize: this.config.memory.maxSize,
      },
      performance: {
        hitRate: 0, // TODO: Implémenter le calcul du hit rate
      },
    };
  }

  /**
   * Vider tout le cache
   */
  async clear(): Promise<boolean> {
    try {
      // Vider Redis
      if (this.isConnected && this.redis) {
        if (this.redis.flushDb) {
          await this.redis.flushDb();
        } else {
          await this.redis.del('*');
        }
      }

      // Vider la mémoire
      this.memory.clear();

      logger.info('[DistributedCache] 🗑️ All cache cleared');
      return true;
    } catch (error) {
      logger.error('[DistributedCache] ❌ Error clearing cache:', error);
      return false;
    }
  }

  /**
   * Fermer les connexions
   */
  async close(): Promise<void> {
    try {
      if (this.redis) {
        if (this.redis.quit) {
          await this.redis.quit();
        } else {
          await this.redis.disconnect();
        }
      }
      this.memory.clear();
      logger.info('[DistributedCache] 🔌 Cache connections closed');
    } catch (error) {
      logger.error('[DistributedCache] ❌ Error closing cache:', error);
    }
  }
}

/**
 * Configuration par défaut optimisée pour la production
 */
export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  redis: {
    host: process.env.REDIS_HOST || '', // Vide par défaut pour désactiver Redis
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
    ttl: {
      agents: 60 * 60 * 1000,      // 1 heure
      tools: 30 * 60 * 1000,       // 30 minutes
      userId: 5 * 60 * 1000,       // 5 minutes
      classeurs: 15 * 60 * 1000,   // 15 minutes
      notes: 10 * 60 * 1000,       // 10 minutes
    },
  },
  memory: {
    fallback: true,
    maxSize: 1000,
    defaultTtl: 5 * 60 * 1000, // 5 minutes
  },
};

/**
 * Instance singleton du cache distribué
 */
export const distributedCache = (() => {
  const cache = DistributedCache.getInstance(DEFAULT_CACHE_CONFIG);
  
  // Logger la configuration au démarrage
  const cacheConfig = getCacheConfig();
  logCacheConfig(cacheConfig);
  
  return cache;
})();
