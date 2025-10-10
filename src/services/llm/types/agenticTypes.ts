/**
 * Types pour l'orchestrateur agentique V2
 * Implémente la stratégie de Claude : thinking, communication, retry, parallélisation
 */

import type { ToolCall, ToolResult } from '../services/SimpleToolExecutor';

/**
 * 🧠 Bloc de réflexion (thinking) généré entre les tool calls
 */
export interface ThinkingBlock {
  type: 'thinking';
  content: string;
  timestamp: string;
}

/**
 * 💬 Mise à jour de progression en temps réel
 */
export interface ProgressUpdate {
  type: 'progress';
  action: string;
  tool?: string;
  status: 'started' | 'completed' | 'failed';
  timestamp: string;
  metadata?: Record<string, unknown>;
}

/**
 * 🔀 Stratégie d'exécution des tool calls
 */
export interface ToolCallStrategy {
  /** Outils pouvant être exécutés en parallèle (indépendants) */
  parallel: ToolCall[];
  
  /** Outils devant être exécutés séquentiellement (dépendants) */
  sequential: ToolCall[];
}

/**
 * 🔁 Configuration de la stratégie de retry
 */
export interface RetryStrategy {
  /** Nombre maximum de tentatives par outil */
  maxRetries: number;
  
  /** Stratégie de backoff (délai entre les retries) */
  backoff: 'linear' | 'exponential';
  
  /** Délai initial en ms */
  initialDelay?: number;
  
  /** Délai maximum en ms */
  maxDelay?: number;
  
  /** Map des outils de fallback (si un outil échoue, utiliser ce fallback) */
  fallbackTools?: Record<string, string>;
}

/**
 * ⚙️ Configuration de l'orchestrateur agentique
 */
export interface AgenticConfig {
  /** Stratégie de retry */
  retryStrategy?: RetryStrategy;
  
  /** Activer le streaming des thinking blocks */
  streamThinking?: boolean;
  
  /** Activer le streaming des progress updates */
  streamProgress?: boolean;
  
  /** Activer la parallélisation automatique */
  enableParallelization?: boolean;
  
  /** Timeout par outil en ms */
  toolTimeout?: number;
  
  /** Cache les résultats des outils */
  enableCache?: boolean;
}

/**
 * 📊 Réponse agentique complète avec métadonnées enrichies
 */
export interface AgenticResponse {
  /** Succès global de l'opération */
  success: boolean;
  
  /** Contenu de la réponse finale */
  content: string;
  
  /** Tous les tool calls effectués */
  toolCalls: ToolCall[];
  
  /** Tous les résultats des tools */
  toolResults: ToolResult[];
  
  /** Blocs de réflexion générés */
  thinking: ThinkingBlock[];
  
  /** Mises à jour de progression */
  progress: ProgressUpdate[];
  
  /** Raisonnement du LLM (si disponible) */
  reasoning?: string;
  
  /** Message d'erreur (si échec) */
  error?: string;
  
  /** Métadonnées d'exécution */
  metadata?: {
    /** Nombre total d'itérations */
    iterations: number;
    
    /** Durée totale en ms */
    duration: number;
    
    /** Nombre de retries effectués */
    retries: number;
    
    /** Nombre de tool calls en parallèle */
    parallelCalls: number;
    
    /** Nombre de tool calls séquentiels */
    sequentialCalls: number;
  };
}

/**
 * 🎯 Catégories d'outils pour la parallélisation intelligente
 */
export enum ToolCategory {
  /** Lecture seule (parallélisable) */
  READ = 'read',
  
  /** Écriture (séquentiel) */
  WRITE = 'write',
  
  /** Recherche (parallélisable) */
  SEARCH = 'search',
  
  /** Exécution d'agent (dépend du contexte) */
  AGENT = 'agent',
  
  /** Opération de base de données (séquentiel pour les écritures) */
  DATABASE = 'database',
  
  /** Opération externe (peut être parallèle) */
  EXTERNAL = 'external',
  
  /** Inconnu (traiter comme séquentiel par sécurité) */
  UNKNOWN = 'unknown'
}

/**
 * 📋 Métadonnées d'un outil pour la catégorisation
 */
export interface ToolMetadata {
  /** Nom de l'outil */
  name: string;
  
  /** Catégorie de l'outil */
  category: ToolCategory;
  
  /** L'outil peut-il être parallélisé ? */
  parallelizable: boolean;
  
  /** L'outil peut-il être mis en cache ? */
  cacheable: boolean;
  
  /** Timeout spécifique pour cet outil (ms) */
  timeout?: number;
  
  /** Priorité d'exécution (1 = haute, 5 = basse) */
  priority?: number;
  
  /** Outils de fallback en cas d'échec */
  fallbacks?: string[];
  
  /** Dépendances (outils devant être exécutés avant) */
  dependencies?: string[];
}

/**
 * 💾 Entrée de cache pour les résultats d'outils
 */
export interface CacheEntry {
  /** Clé unique (hash des arguments) */
  key: string;
  
  /** Nom de l'outil */
  toolName: string;
  
  /** Résultat mis en cache */
  result: ToolResult;
  
  /** Timestamp de création */
  createdAt: string;
  
  /** TTL en secondes */
  ttl: number;
  
  /** Nombre de hits */
  hits: number;
}

/**
 * 📈 Métriques de performance de l'orchestrateur
 */
export interface OrchestratorMetrics {
  /** Nombre total de sessions */
  totalSessions: number;
  
  /** Nombre total de tool calls */
  totalToolCalls: number;
  
  /** Nombre total de tool calls réussis */
  successfulToolCalls: number;
  
  /** Nombre total de retries */
  totalRetries: number;
  
  /** Nombre total de fallbacks utilisés */
  totalFallbacks: number;
  
  /** Temps moyen d'exécution par tool (ms) */
  avgToolExecutionTime: number;
  
  /** Temps moyen par session (ms) */
  avgSessionDuration: number;
  
  /** Taux de succès global */
  successRate: number;
  
  /** Cache hit rate */
  cacheHitRate: number;
  
  /** Nombre moyen de tool calls en parallèle */
  avgParallelCalls: number;
}

