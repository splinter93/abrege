/**
 * Constantes centralisées pour le système LLM & Tool Calls
 * SINGLE SOURCE OF TRUTH pour tous les timeouts, limites, etc.
 */

/**
 * 🔧 Limites de Tool Calls
 */
export const TOOL_CALL_LIMITS = {
  /** Nombre maximum de tool calls par session */
  MAX_TOOL_CALLS_PER_SESSION: 20,
  
  /** Nombre maximum de tool calls en parallèle simultanés */
  MAX_PARALLEL_TOOL_CALLS: 5,
  
  /** Timeout par défaut pour un tool call (ms) */
  DEFAULT_TOOL_TIMEOUT_MS: 120000, // 120s (2 minutes) - permet enchaînements longs comme Cursor
  
  /** Timeouts spécifiques par catégorie */
  TIMEOUT_BY_CATEGORY: {
    READ: 5000,      // 5s pour lecture
    SEARCH: 10000,   // 10s pour recherche
    WRITE: 10000,    // 10s pour écriture
    DATABASE: 15000, // 15s pour base de données
    AGENT: 120000,   // 120s (2 min) pour agents - enchaînements longs comme Cursor
    MCP: 10000,      // 10s pour MCP
    UNKNOWN: 120000  // 120s (2 min) par sécurité - permet exploration autonome
  }
} as const;

/**
 * 🔁 Configuration des Retries
 */
export const RETRY_CONFIG = {
  /** Nombre maximum de retries par type d'erreur */
  MAX_RETRIES_BY_ERROR_TYPE: {
    SERVER_ERROR: 3,      // 500, 502, 503 → Max 3 retries
    VALIDATION_ERROR: 5,  // 400, validation → Max 5 retries (LLM peut corriger)
    RATE_LIMIT: 1,        // 429 → Max 1 retry après délai
    AUTH_ERROR: 0,        // 401, 403 → Pas de retry
    TIMEOUT: 2,           // Timeout → Max 2 retries
    UNKNOWN: 2            // Autres → Max 2 retries
  },
  
  /** Configuration du backoff exponentiel */
  BACKOFF: {
    INITIAL_DELAY_MS: 1000,    // 1s
    MAX_DELAY_MS: 10000,       // 10s
    MULTIPLIER: 2,             // Exponentiel x2
    JITTER: 0.1                // ±10% aléatoire
  }
} as const;

/**
 * 🔒 Configuration des Locks & Cache
 */
export const CACHE_CONFIG = {
  /** Durée de vie du cache d'exécution (ms) */
  EXECUTION_CACHE_TTL_MS: 5 * 60 * 1000, // 5 minutes
  
  /** Délai avant libération d'un lock (ms) */
  LOCK_RELEASE_DELAY_MS: 1000, // 1 seconde
  
  /** Taille maximale du cache de résultats */
  MAX_CACHE_ENTRIES: 1000,
  
  /** TTL du cache de résultats (ms) */
  RESULT_CACHE_TTL_MS: 5 * 60 * 1000, // 5 minutes
  
  /** Intervalle de cleanup périodique (ms) */
  CLEANUP_INTERVAL_MS: 10 * 60 * 1000 // 10 minutes
} as const;

/**
 * 🧠 Configuration du Thinking Interleaved
 */
export const THINKING_CONFIG = {
  /** Activer le streaming du thinking */
  STREAM_THINKING: true,
  
  /** Activer le streaming des progress updates */
  STREAM_PROGRESS: true,
  
  /** Nombre maximum de thinking blocks à conserver */
  MAX_THINKING_BLOCKS: 100,
  
  /** Nombre maximum de progress updates à conserver */
  MAX_PROGRESS_UPDATES: 100
} as const;

/**
 * 🔀 Configuration de la Parallélisation
 */
export const PARALLELIZATION_CONFIG = {
  /** Activer la parallélisation */
  ENABLED: true,
  
  /** Nombre maximum de tools en parallèle simultanés */
  MAX_CONCURRENT: 5,
  
  /** Délai entre les batches parallèles (ms) */
  BATCH_DELAY_MS: 0
} as const;

/**
 * 🚨 Configuration des Alertes
 */
export const ALERT_THRESHOLDS = {
  /** Seuil de duplication critique (nombre de tentatives) */
  DUPLICATE_CRITICAL: 3,
  
  /** Seuil de duplication warning (nombre de tentatives) */
  DUPLICATE_WARNING: 1,
  
  /** Seuil d'erreurs consécutives pour alerte */
  CONSECUTIVE_ERRORS_ALERT: 3,
  
  /** Seuil de durée d'exécution anormale (ms) */
  SLOW_EXECUTION_MS: 5000
} as const;

/**
 * 📊 Configuration du Logging
 */
export const LOGGING_CONFIG = {
  /** Niveau de log par environnement */
  LEVEL: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  
  /** Activer les logs de déduplication détaillés */
  VERBOSE_DEDUPLICATION: process.env.NODE_ENV === 'development',
  
  /** Activer les logs de performance */
  VERBOSE_PERFORMANCE: process.env.NODE_ENV === 'development',
  
  /** Longueur max des logs de contenu */
  MAX_CONTENT_LENGTH: 200
} as const;

/**
 * 🔍 Configuration de la Déduplication
 */
export const DEDUPLICATION_CONFIG = {
  /** Champs dynamiques à ignorer lors de la normalisation */
  DYNAMIC_FIELDS: [
    'timestamp',
    'id',
    '_id',
    'created_at',
    'updated_at',
    'requestId',
    'sessionId',
    'traceId',
    'operationId',
    'created',
    'modified',
    'time',
    'date'
  ] as const,
  
  /** Algorithme de hash */
  HASH_ALGORITHM: 'sha256' as const,
  
  /** Activer la déduplication par contenu */
  ENABLED: true
} as const;

/**
 * 🎯 Catégories de Tools (pour auto-détection)
 */
export const TOOL_CATEGORIES = {
  /** Préfixes pour tools READ (parallélisables) */
  READ_PREFIXES: ['get', 'list', 'fetch', 'retrieve', 'find'] as const,
  
  /** Préfixes pour tools SEARCH (parallélisables) */
  SEARCH_PREFIXES: ['search', 'query', 'lookup'] as const,
  
  /** Préfixes pour tools WRITE (séquentiels) */
  WRITE_PREFIXES: ['create', 'update', 'delete', 'insert', 'modify', 'remove', 'set', 'put', 'patch'] as const,
  
  /** Préfixes pour tools DATABASE (séquentiels, critiques) */
  DATABASE_PREFIXES: ['execute', 'sql', 'query', 'transaction'] as const
} as const;

/**
 * 🛡️ Fallbacks par Tool
 */
export const TOOL_FALLBACKS = {
  'mcp_Notion_notion-fetch': 'searchContent',
  'executeAgent': 'searchContent'
} as const;

/**
 * ⚡ Helpers
 */
export const calculateBackoff = (
  retryCount: number,
  config = RETRY_CONFIG.BACKOFF
): number => {
  const baseDelay = config.INITIAL_DELAY_MS * Math.pow(config.MULTIPLIER, retryCount);
  const maxDelay = config.MAX_DELAY_MS;
  const jitter = 1 + (Math.random() - 0.5) * 2 * config.JITTER; // ±10%
  
  return Math.min(baseDelay * jitter, maxDelay);
};

/**
 * 🔍 Détecter le type d'erreur
 */
export const detectErrorType = (errorMessage: string): keyof typeof RETRY_CONFIG.MAX_RETRIES_BY_ERROR_TYPE => {
  const msg = errorMessage.toLowerCase();
  
  if (msg.includes('500') || msg.includes('502') || msg.includes('503') || msg.includes('internal server error')) {
    return 'SERVER_ERROR';
  }
  if (msg.includes('400') || msg.includes('validation') || msg.includes('invalid')) {
    return 'VALIDATION_ERROR';
  }
  if (msg.includes('429') || msg.includes('rate limit') || msg.includes('too many requests')) {
    return 'RATE_LIMIT';
  }
  if (msg.includes('401') || msg.includes('403') || msg.includes('unauthorized') || msg.includes('forbidden')) {
    return 'AUTH_ERROR';
  }
  if (msg.includes('timeout')) {
    return 'TIMEOUT';
  }
  
  return 'UNKNOWN';
};

