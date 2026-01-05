/**
 * Rate Limiting Différencié Free/Premium
 * =======================================
 * 
 * Ce service adapte les limites de rate limiting selon le plan d'abonnement
 * de l'utilisateur. Ne pas utiliser dans le middleware Next.js (imports Node.js).
 */

import { logger, LogCategory } from '@/utils/logger';
import { SubscriptionService } from '@/services/subscriptionService';
import type { SubscriptionPlanType } from '@/config/storage';
import { RateLimiter } from './rateLimiter';

export interface DynamicRateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

/**
 * Cache pour les plans utilisateur (TTL 5 minutes)
 */
interface PlanCacheEntry {
  planType: SubscriptionPlanType;
  cachedAt: number;
}

const planCache = new Map<string, PlanCacheEntry>();
const PLAN_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Récupère le plan d'abonnement d'un utilisateur avec cache
 */
async function getUserPlanType(userId: string): Promise<SubscriptionPlanType> {
  // Vérifier le cache
  const cached = planCache.get(userId);
  const now = Date.now();
  
  if (cached && (now - cached.cachedAt) < PLAN_CACHE_TTL) {
    return cached.planType;
  }

  // Récupérer le plan depuis la DB
  try {
    const plan = await SubscriptionService.getUserActivePlan(userId);
    const planType = plan?.type || 'free';
    
    // Mettre en cache
    planCache.set(userId, {
      planType,
      cachedAt: now
    });
    
    return planType;
  } catch (error) {
    logger.error(LogCategory.API, '[DynamicRateLimiter] Erreur récupération plan utilisateur', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, error instanceof Error ? error : undefined);
    
    // Fallback vers free en cas d'erreur
    return 'free';
  }
}

/**
 * Retourne la configuration de rate limit selon le plan utilisateur
 */
export async function getRateLimitConfig(userId: string): Promise<DynamicRateLimitConfig> {
  const planType = await getUserPlanType(userId);
  
  const limits: Record<SubscriptionPlanType, DynamicRateLimitConfig> = {
    free: { windowMs: 60000, maxRequests: 20 },
    basic: { windowMs: 60000, maxRequests: 100 },
    premium: { windowMs: 60000, maxRequests: 100 },
    enterprise: { windowMs: 60000, maxRequests: 500 },
    custom: { windowMs: 60000, maxRequests: 100 } // Par défaut comme basic
  };
  
  return limits[planType] || limits.free;
}

/**
 * Rate limiter dynamique qui adapte les limites selon le plan utilisateur
 */
export class DynamicRateLimiter {
  private baseLimiter: RateLimiter;
  private userLimiters: Map<string, { limiter: RateLimiter; cachedAt: number }>;
  private readonly cacheTTL = 5 * 60 * 1000; // 5 minutes

  constructor(baseConfig: DynamicRateLimitConfig) {
    this.baseLimiter = new RateLimiter({
      windowMs: baseConfig.windowMs,
      maxRequests: baseConfig.maxRequests,
      keyPrefix: 'dynamic'
    });
    this.userLimiters = new Map();
  }

  /**
   * Vérifie le rate limit avec config dynamique selon le plan utilisateur
   */
  async check(userId: string): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
    limit: number;
  }> {
    // Récupérer la config selon le plan
    const config = await getRateLimitConfig(userId);
    
    // Vérifier le cache pour cet utilisateur
    const cached = this.userLimiters.get(userId);
    const now = Date.now();
    
    let limiter: RateLimiter;
    
    if (cached && (now - cached.cachedAt) < this.cacheTTL) {
      limiter = cached.limiter;
    } else {
      // Créer un nouveau limiter avec la config du plan
      limiter = new RateLimiter({
        windowMs: config.windowMs,
        maxRequests: config.maxRequests,
        keyPrefix: `dynamic:${userId.substring(0, 8)}`
      });
      
      // Mettre en cache
      this.userLimiters.set(userId, {
        limiter,
        cachedAt: now
      });
    }
    
    return limiter.check(userId);
  }
}

// ✅ Instance pour chat avec rate limiting différencié
export const dynamicChatRateLimiter = new DynamicRateLimiter({
  windowMs: 60000,
  maxRequests: 20 // Valeur par défaut (free), sera adapté selon plan
});

