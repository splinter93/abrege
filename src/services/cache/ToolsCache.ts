/**
 * Cache spécialisé pour les tools OpenAPI
 * Optimisé pour les performances de génération de tools
 */

import { distributedCache } from './DistributedCache';
import { ToolDefinition } from '../llm/types/apiV2Types';
import { simpleLogger as logger } from '@/utils/logger';

export interface ToolsCacheEntry {
  tools: ToolDefinition[];
  timestamp: number;
  agentId?: string;
  capabilities?: string[];
}

export class ToolsCache {
  private static instance: ToolsCache;
  private readonly TOOLS_TTL = 30 * 60 * 1000; // 30 minutes
  private readonly CACHE_PREFIX = 'tools:';

  private constructor() {}

  public static getInstance(): ToolsCache {
    if (!ToolsCache.instance) {
      ToolsCache.instance = new ToolsCache();
    }
    return ToolsCache.instance;
  }

  /**
   * Obtenir les tools pour un agent spécifique
   */
  async getToolsForAgent(agentId: string, capabilities?: string[]): Promise<ToolDefinition[] | null> {
    try {
      const cacheKey = this.buildCacheKey(agentId, capabilities);
      const cached = await distributedCache.get<ToolsCacheEntry>(cacheKey);
      
      if (cached && this.isValidEntry(cached)) {
        logger.dev(`[ToolsCache] 📦 Tools cache HIT for agent: ${agentId}`);
        return cached.tools;
      }

      logger.dev(`[ToolsCache] ❌ Tools cache MISS for agent: ${agentId}`);
      return null;
    } catch (error) {
      logger.error(`[ToolsCache] ❌ Error getting tools for agent ${agentId}:`, error);
      return null;
    }
  }

  /**
   * Mettre en cache les tools pour un agent
   */
  async setToolsForAgent(agentId: string, tools: ToolDefinition[], capabilities?: string[]): Promise<boolean> {
    try {
      const cacheKey = this.buildCacheKey(agentId, capabilities);
      const entry: ToolsCacheEntry = {
        tools,
        timestamp: Date.now(),
        agentId,
        capabilities,
      };

      const success = await distributedCache.set(cacheKey, entry, this.TOOLS_TTL);
      
      if (success) {
        logger.dev(`[ToolsCache] 💾 Tools cached for agent: ${agentId} (${tools.length} tools)`);
      }
      
      return success;
    } catch (error) {
      logger.error(`[ToolsCache] ❌ Error caching tools for agent ${agentId}:`, error);
      return false;
    }
  }

  /**
   * Obtenir tous les tools disponibles
   */
  async getAllTools(): Promise<ToolDefinition[] | null> {
    try {
      const cacheKey = this.buildCacheKey('all');
      const cached = await distributedCache.get<ToolsCacheEntry>(cacheKey);
      
      if (cached && this.isValidEntry(cached)) {
        logger.dev(`[ToolsCache] 📦 All tools cache HIT`);
        return cached.tools;
      }

      logger.dev(`[ToolsCache] ❌ All tools cache MISS`);
      return null;
    } catch (error) {
      logger.error(`[ToolsCache] ❌ Error getting all tools:`, error);
      return null;
    }
  }

  /**
   * Mettre en cache tous les tools
   */
  async setAllTools(tools: ToolDefinition[]): Promise<boolean> {
    try {
      const cacheKey = this.buildCacheKey('all');
      const entry: ToolsCacheEntry = {
        tools,
        timestamp: Date.now(),
      };

      const success = await distributedCache.set(cacheKey, entry, this.TOOLS_TTL);
      
      if (success) {
        logger.dev(`[ToolsCache] 💾 All tools cached (${tools.length} tools)`);
      }
      
      return success;
    } catch (error) {
      logger.error(`[ToolsCache] ❌ Error caching all tools:`, error);
      return false;
    }
  }

  /**
   * Invalider le cache pour un agent spécifique
   */
  async invalidateAgentTools(agentId: string): Promise<boolean> {
    try {
      // Invalider le cache spécifique à l'agent
      const specificKey = this.buildCacheKey(agentId);
      await distributedCache.delete(specificKey);

      // Invalider le cache avec capacités
      const capabilitiesKey = this.buildCacheKey(agentId, ['*']);
      await distributedCache.delete(capabilitiesKey);

      logger.dev(`[ToolsCache] 🗑️ Tools cache invalidated for agent: ${agentId}`);
      return true;
    } catch (error) {
      logger.error(`[ToolsCache] ❌ Error invalidating tools for agent ${agentId}:`, error);
      return false;
    }
  }

  /**
   * Invalider tout le cache des tools
   */
  async invalidateAllTools(): Promise<boolean> {
    try {
      const allToolsKey = this.buildCacheKey('all');
      await distributedCache.delete(allToolsKey);

      logger.info(`[ToolsCache] 🗑️ All tools cache invalidated`);
      return true;
    } catch (error) {
      logger.error(`[ToolsCache] ❌ Error invalidating all tools:`, error);
      return false;
    }
  }

  /**
   * Construire la clé de cache
   */
  private buildCacheKey(agentId: string, capabilities?: string[]): string {
    let key = `${this.CACHE_PREFIX}${agentId}`;
    
    if (capabilities && capabilities.length > 0) {
      const sortedCapabilities = [...capabilities].sort();
      key += `:${sortedCapabilities.join(',')}`;
    }
    
    return key;
  }

  /**
   * Vérifier si une entrée est valide
   */
  private isValidEntry(entry: ToolsCacheEntry): boolean {
    return Date.now() - entry.timestamp < this.TOOLS_TTL;
  }

  /**
   * Obtenir les statistiques du cache des tools
   */
  async getStats(): Promise<{
    totalEntries: number;
    hitRate: number;
    memoryUsage: number;
  }> {
    try {
      // TODO: Implémenter les statistiques détaillées
      return {
        totalEntries: 0,
        hitRate: 0,
        memoryUsage: 0,
      };
    } catch (error) {
      logger.error(`[ToolsCache] ❌ Error getting stats:`, error);
      return {
        totalEntries: 0,
        hitRate: 0,
        memoryUsage: 0,
      };
    }
  }
}

/**
 * Instance singleton du cache des tools
 */
export const toolsCache = ToolsCache.getInstance();
