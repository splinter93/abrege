/**
 * Service de cache pour les réponses LLM
 * Cache les requêtes LLM identiques pour réduire la latence et les coûts
 * 
 * Conforme GUIDE-EXCELLENCE-CODE.md :
 * - Cache avec TTL (5 minutes)
 * - Fallback mémoire si Redis indisponible
 * - Hash message + model pour clé unique
 */

import { DistributedCache, DEFAULT_CACHE_CONFIG } from './DistributedCache';
import { logger, LogCategory } from '@/utils/logger';
import { createHash } from 'crypto';

export interface LLMRequest {
  messages: Array<{ role: string; content: string | unknown }>;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LLMResponse {
  content: string;
  model: string;
  finishReason?: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
  };
}

/**
 * Génère une clé de cache unique pour une requête LLM
 */
function generateCacheKey(request: LLMRequest): string {
  // Créer un hash stable de la requête
  const requestString = JSON.stringify({
    messages: request.messages.map(m => ({
      role: m.role,
      content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
    })),
    model: request.model,
    temperature: request.temperature ?? 0.7,
    maxTokens: request.maxTokens
  });
  
  const hash = createHash('sha256').update(requestString).digest('hex');
  return `llm:${hash}`;
}

/**
 * Service de cache pour les réponses LLM
 */
export class LLMCacheService {
  private cache: DistributedCache;
  private readonly ttl = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.cache = DistributedCache.getInstance(DEFAULT_CACHE_CONFIG);
  }

  /**
   * Récupère une réponse LLM depuis le cache
   */
  async get(request: LLMRequest): Promise<LLMResponse | null> {
    try {
      const key = generateCacheKey(request);
      const cached = await this.cache.get<LLMResponse>(key);
      
      if (cached) {
        logger.debug(LogCategory.API, '[LLMCache] Cache hit', {
          model: request.model,
          key: key.substring(0, 16) + '...'
        });
        return cached;
      }
      
      return null;
    } catch (error) {
      logger.error(LogCategory.API, '[LLMCache] Erreur récupération cache', {
        error: error instanceof Error ? error.message : 'Unknown error'
      }, error instanceof Error ? error : undefined);
      return null;
    }
  }

  /**
   * Met en cache une réponse LLM
   */
  async set(request: LLMRequest, response: LLMResponse): Promise<void> {
    try {
      const key = generateCacheKey(request);
      await this.cache.set(key, response, this.ttl);
      
      logger.debug(LogCategory.API, '[LLMCache] Cache set', {
        model: request.model,
        key: key.substring(0, 16) + '...',
        ttl: this.ttl
      });
    } catch (error) {
      logger.error(LogCategory.API, '[LLMCache] Erreur mise en cache', {
        error: error instanceof Error ? error.message : 'Unknown error'
      }, error instanceof Error ? error : undefined);
      // Ne pas bloquer si le cache échoue
    }
  }

  /**
   * Invalide le cache pour une requête spécifique
   */
  async invalidate(request: LLMRequest): Promise<void> {
    try {
      const key = generateCacheKey(request);
      await this.cache.delete(key);
      
      logger.debug(LogCategory.API, '[LLMCache] Cache invalidé', {
        model: request.model,
        key: key.substring(0, 16) + '...'
      });
    } catch (error) {
      logger.error(LogCategory.API, '[LLMCache] Erreur invalidation cache', {
        error: error instanceof Error ? error.message : 'Unknown error'
      }, error instanceof Error ? error : undefined);
    }
  }

  /**
   * Obtient les statistiques du cache LLM
   */
  async getStats(): Promise<{
    hitRate: number;
    totalRequests: number;
    cacheHits: number;
  }> {
    // TODO: Implémenter tracking statistiques si nécessaire
    return {
      hitRate: 0,
      totalRequests: 0,
      cacheHits: 0
    };
  }
}

/**
 * Instance singleton du service de cache LLM
 */
export const llmCacheService = new LLMCacheService();

