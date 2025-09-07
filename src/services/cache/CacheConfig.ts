/**
 * Configuration du cache adaptée à l'environnement
 * Désactive Redis en développement pour éviter les erreurs de connexion
 */

export interface CacheEnvironmentConfig {
  redis: {
    enabled: boolean;
    host: string;
    port: number;
    password?: string;
    db: number;
  };
  memory: {
    enabled: boolean;
    maxSize: number;
    defaultTtl: number;
  };
  ttl: {
    agents: number;
    tools: number;
    userId: number;
    classeurs: number;
    notes: number;
  };
}

/**
 * Configuration adaptée à l'environnement
 */
export function getCacheConfig(): CacheEnvironmentConfig {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isProduction = process.env.NODE_ENV === 'production';
  
  // En développement, désactiver Redis par défaut
  const redisEnabled = isProduction || (process.env.REDIS_HOST && process.env.REDIS_HOST !== 'localhost');
  
  return {
    redis: {
      enabled: redisEnabled,
      host: process.env.REDIS_HOST || '',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
    },
    memory: {
      enabled: true, // Toujours activé comme fallback
      maxSize: parseInt(process.env.CACHE_MEMORY_MAX_SIZE || '1000'),
      defaultTtl: parseInt(process.env.CACHE_DEFAULT_TTL || '300000'), // 5 minutes
    },
    ttl: {
      agents: parseInt(process.env.CACHE_TTL_AGENTS || '3600000'), // 1 heure
      tools: parseInt(process.env.CACHE_TTL_TOOLS || '1800000'), // 30 minutes
      userId: parseInt(process.env.CACHE_TTL_USER_ID || '300000'), // 5 minutes
      classeurs: parseInt(process.env.CACHE_TTL_CLASSEURS || '900000'), // 15 minutes
      notes: parseInt(process.env.CACHE_TTL_NOTES || '600000'), // 10 minutes
    },
  };
}

/**
 * Logger de configuration du cache
 */
export function logCacheConfig(config: CacheEnvironmentConfig): void {
  console.log('[CacheConfig] 🔧 Configuration du cache:');
  console.log(`[CacheConfig]   Redis: ${config.redis.enabled ? '✅ Activé' : '❌ Désactivé'}`);
  if (config.redis.enabled) {
    console.log(`[CacheConfig]   Redis Host: ${config.redis.host}:${config.redis.port}`);
  }
  console.log(`[CacheConfig]   Memory: ${config.memory.enabled ? '✅ Activé' : '❌ Désactivé'}`);
  console.log(`[CacheConfig]   Memory Max Size: ${config.memory.maxSize}`);
  console.log(`[CacheConfig]   Environment: ${process.env.NODE_ENV || 'development'}`);
}
