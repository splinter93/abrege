/**
 * Service de rate limiting pour protéger contre les abus
 * Utilise une stratégie en mémoire (avec possibilité d'upgrade vers Redis)
 */

import { simpleLogger as logger } from '@/utils/logger';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyPrefix: string;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

/**
 * Rate Limiter en mémoire avec sliding window
 * Production-ready avec fallback Redis possible
 */
export class RateLimiter {
  private store: Map<string, RateLimitEntry>;
  private readonly config: RateLimitConfig;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.store = new Map();
    this.config = {
      windowMs: config.windowMs || 3600000, // 1 heure par défaut
      maxRequests: config.maxRequests || 100, // 100 requêtes par défaut
      keyPrefix: config.keyPrefix || 'ratelimit'
    };

    // Nettoyer les entrées expirées toutes les 5 minutes
    this.startCleanup();
  }

  /**
   * Vérifie si une requête est autorisée
   * @param identifier Identifiant unique (userId, IP, etc.)
   * @returns true si autorisé, false si rate limit dépassé
   */
  async check(identifier: string): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
    limit: number;
  }> {
    const key = `${this.config.keyPrefix}:${identifier}`;
    const now = Date.now();
    
    let entry = this.store.get(key);

    // Créer ou réinitialiser l'entrée si expirée
    if (!entry || now > entry.resetTime) {
      entry = {
        count: 0,
        resetTime: now + this.config.windowMs
      };
      this.store.set(key, entry);
    }

    // Incrémenter le compteur
    entry.count++;

    const allowed = entry.count <= this.config.maxRequests;
    const remaining = Math.max(0, this.config.maxRequests - entry.count);

    if (!allowed) {
      logger.warn(`[RateLimiter] Limite dépassée pour ${identifier}: ${entry.count}/${this.config.maxRequests}`);
    } else {
      logger.dev(`[RateLimiter] Requête autorisée pour ${identifier}: ${entry.count}/${this.config.maxRequests}`);
    }

    return {
      allowed,
      remaining,
      resetTime: entry.resetTime,
      limit: this.config.maxRequests
    };
  }

  /**
   * Réinitialise le compteur pour un identifiant
   */
  async reset(identifier: string): Promise<void> {
    const key = `${this.config.keyPrefix}:${identifier}`;
    this.store.delete(key);
    logger.dev(`[RateLimiter] Compteur réinitialisé pour ${identifier}`);
  }

  /**
   * Obtient les statistiques pour un identifiant
   */
  async getStats(identifier: string): Promise<{
    count: number;
    remaining: number;
    resetTime: number;
  } | null> {
    const key = `${this.config.keyPrefix}:${identifier}`;
    const entry = this.store.get(key);

    if (!entry) {
      return null;
    }

    const now = Date.now();
    
    // Si expiré, retourner null
    if (now > entry.resetTime) {
      return null;
    }

    return {
      count: entry.count,
      remaining: Math.max(0, this.config.maxRequests - entry.count),
      resetTime: entry.resetTime
    };
  }

  /**
   * Nettoyer les entrées expirées
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.dev(`[RateLimiter] ${cleaned} entrées expirées nettoyées`);
    }
  }

  /**
   * Démarrer le nettoyage périodique
   */
  private startCleanup(): void {
    // Nettoyer toutes les 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Arrêter le nettoyage périodique
   */
  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Obtenir les statistiques globales
   */
  getGlobalStats(): {
    totalEntries: number;
    activeEntries: number;
  } {
    const now = Date.now();
    let activeCount = 0;

    for (const entry of this.store.values()) {
      if (now <= entry.resetTime) {
        activeCount++;
      }
    }

    return {
      totalEntries: this.store.size,
      activeEntries: activeCount
    };
  }
}

// ✅ Instances préconfigurées pour différents usages
export const toolCallsRateLimiter = new RateLimiter({
  windowMs: 3600000, // 1 heure
  maxRequests: 100, // 100 tool calls par heure
  keyPrefix: 'toolcalls'
});

export const chatRateLimiter = new RateLimiter({
  windowMs: 60000, // 1 minute
  maxRequests: 20, // 20 messages par minute
  keyPrefix: 'chat'
});

export const apiRateLimiter = new RateLimiter({
  windowMs: 60000, // 1 minute
  maxRequests: 60, // 60 requêtes API par minute
  keyPrefix: 'api'
});

logger.info('[RateLimiter] Services de rate limiting initialisés');

