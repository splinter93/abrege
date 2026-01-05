/**
 * Service centralisé de collecte de métriques
 * Collecte latence, erreurs, DB queries, cache hits, rate limits
 * Conforme GUIDE-EXCELLENCE-CODE.md : zero any, interfaces explicites, singleton
 */

import { logger, LogCategory } from '@/utils/logger';

interface LatencyMetric {
  endpoint: string;
  latency: number;
  success: boolean;
  timestamp: number;
}

interface ErrorMetric {
  endpoint: string;
  errorType: string;
  errorMessage: string;
  timestamp: number;
}

interface DbQueryMetric {
  table: string;
  latency: number;
  timestamp: number;
}

interface CacheHitMetric {
  cacheType: 'llm' | 'note_embed';
  hit: boolean;
  timestamp: number;
}

interface RateLimitMetric {
  endpoint: string;
  identifier: string;
  hit: boolean;
  timestamp: number;
}

interface ThroughputMetric {
  endpoint: string;
  timestamp: number;
}

interface LatencyStats {
  p50: number;
  p95: number;
  p99: number;
  average: number;
  count: number;
}

interface ThroughputStats {
  messages: number;
  requests: number;
}

interface ErrorRateStats {
  rate: number;
  total: number;
  byType: Record<string, { count: number; rate: number }>;
}

interface DbLatencyStats {
  p50: number;
  p95: number;
  p99: number;
  average: number;
  count: number;
}

interface CacheHitRateStats {
  hitRate: number;
  hits: number;
  misses: number;
}

interface RateLimitStats {
  hits: number;
  total: number;
  rate: number;
}

export class MetricsCollector {
  private static instance: MetricsCollector;
  private latencyMetrics: LatencyMetric[] = [];
  private errorMetrics: ErrorMetric[] = [];
  private dbQueryMetrics: DbQueryMetric[] = [];
  private cacheHitMetrics: CacheHitMetric[] = [];
  private rateLimitMetrics: RateLimitMetric[] = [];
  private throughputMetrics: ThroughputMetric[] = [];
  
  private readonly MAX_METRICS = 10000;
  private readonly WINDOW_MS = 24 * 60 * 60 * 1000; // 24h
  private cleanupInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.startCleanupInterval();
  }

  public static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector();
    }
    return MetricsCollector.instance;
  }

  /**
   * Enregistrer une latence
   */
  recordLatency(endpoint: string, latency: number, success: boolean): void {
    try {
      this.latencyMetrics.push({
        endpoint,
        latency,
        success,
        timestamp: Date.now()
      });
      this.enforceLimit('latency');
    } catch (error) {
      logger.error(LogCategory.MONITORING, '[MetricsCollector] Error recording latency', { endpoint, latency }, error as Error);
    }
  }

  /**
   * Enregistrer une erreur
   */
  recordError(endpoint: string, errorType: string, error: Error): void {
    try {
      this.errorMetrics.push({
        endpoint,
        errorType,
        errorMessage: error.message,
        timestamp: Date.now()
      });
      this.enforceLimit('error');
    } catch (err) {
      logger.error(LogCategory.MONITORING, '[MetricsCollector] Error recording error', { endpoint, errorType }, err as Error);
    }
  }

  /**
   * Enregistrer une query DB
   */
  recordDbQuery(table: string, latency: number): void {
    try {
      this.dbQueryMetrics.push({
        table,
        latency,
        timestamp: Date.now()
      });
      this.enforceLimit('db');
    } catch (error) {
      logger.error(LogCategory.MONITORING, '[MetricsCollector] Error recording DB query', { table, latency }, error as Error);
    }
  }

  /**
   * Enregistrer un cache hit/miss
   */
  recordCacheHit(cacheType: 'llm' | 'note_embed', hit: boolean): void {
    try {
      this.cacheHitMetrics.push({
        cacheType,
        hit,
        timestamp: Date.now()
      });
      this.enforceLimit('cache');
    } catch (error) {
      logger.error(LogCategory.MONITORING, '[MetricsCollector] Error recording cache hit', { cacheType, hit }, error as Error);
    }
  }

  /**
   * Enregistrer un rate limit hit
   */
  recordRateLimit(endpoint: string, identifier: string, hit: boolean): void {
    try {
      this.rateLimitMetrics.push({
        endpoint,
        identifier,
        hit,
        timestamp: Date.now()
      });
      this.enforceLimit('rateLimit');
    } catch (error) {
      logger.error(LogCategory.MONITORING, '[MetricsCollector] Error recording rate limit', { endpoint, identifier, hit }, error as Error);
    }
  }

  /**
   * Enregistrer un throughput (message ou request)
   */
  recordThroughput(endpoint: string): void {
    try {
      this.throughputMetrics.push({
        endpoint,
        timestamp: Date.now()
      });
      this.enforceLimit('throughput');
    } catch (error) {
      logger.error(LogCategory.MONITORING, '[MetricsCollector] Error recording throughput', { endpoint }, error as Error);
    }
  }

  /**
   * Obtenir statistiques de latence
   */
  getLatencyStats(endpoint?: string): LatencyStats {
    const now = Date.now();
    const windowStart = now - this.WINDOW_MS;
    
    let filtered = this.latencyMetrics.filter(m => m.timestamp >= windowStart);
    if (endpoint) {
      filtered = filtered.filter(m => m.endpoint === endpoint);
    }

    if (filtered.length === 0) {
      return { p50: 0, p95: 0, p99: 0, average: 0, count: 0 };
    }

    const latencies = filtered.map(m => m.latency).sort((a, b) => a - b);
    const average = latencies.reduce((sum, l) => sum + l, 0) / latencies.length;

    return {
      p50: this.calculatePercentile(latencies, 0.50),
      p95: this.calculatePercentile(latencies, 0.95),
      p99: this.calculatePercentile(latencies, 0.99),
      average,
      count: filtered.length
    };
  }

  /**
   * Obtenir statistiques de throughput
   */
  getThroughputStats(window: '1m' | '5m' | '15m' = '1m'): ThroughputStats {
    const windowMs = window === '1m' ? 60000 : window === '5m' ? 300000 : 900000;
    const now = Date.now();
    const windowStart = now - windowMs;
    
    const filtered = this.throughputMetrics.filter(m => m.timestamp >= windowStart);
    const chatEndpoints = filtered.filter(m => m.endpoint.includes('chat')).length;
    const apiEndpoints = filtered.filter(m => !m.endpoint.includes('chat')).length;

    return {
      messages: chatEndpoints,
      requests: apiEndpoints
    };
  }

  /**
   * Obtenir statistiques d'erreur
   */
  getErrorRateStats(errorType?: string): ErrorRateStats {
    const now = Date.now();
    const windowStart = now - this.WINDOW_MS;
    
    let filtered = this.errorMetrics.filter(m => m.timestamp >= windowStart);
    if (errorType) {
      filtered = filtered.filter(m => m.errorType === errorType);
    }

    const total = filtered.length;
    const byType: Record<string, { count: number; rate: number }> = {};
    
    // Compter par type
    const typeCounts: Record<string, number> = {};
    filtered.forEach(m => {
      typeCounts[m.errorType] = (typeCounts[m.errorType] || 0) + 1;
    });

    // Calculer rates
    Object.entries(typeCounts).forEach(([type, count]) => {
      byType[type] = {
        count,
        rate: total > 0 ? count / total : 0
      };
    });

    // Rate global = total errors / total requests (approximation)
    const totalRequests = this.latencyMetrics.filter(m => m.timestamp >= windowStart).length;
    const rate = totalRequests > 0 ? total / totalRequests : 0;

    return {
      rate,
      total,
      byType
    };
  }

  /**
   * Obtenir statistiques DB latency
   */
  getDbLatencyStats(table?: string): DbLatencyStats {
    const now = Date.now();
    const windowStart = now - this.WINDOW_MS;
    
    let filtered = this.dbQueryMetrics.filter(m => m.timestamp >= windowStart);
    if (table) {
      filtered = filtered.filter(m => m.table === table);
    }

    if (filtered.length === 0) {
      return { p50: 0, p95: 0, p99: 0, average: 0, count: 0 };
    }

    const latencies = filtered.map(m => m.latency).sort((a, b) => a - b);
    const average = latencies.reduce((sum, l) => sum + l, 0) / latencies.length;

    return {
      p50: this.calculatePercentile(latencies, 0.50),
      p95: this.calculatePercentile(latencies, 0.95),
      p99: this.calculatePercentile(latencies, 0.99),
      average,
      count: filtered.length
    };
  }

  /**
   * Obtenir cache hit rate
   */
  getCacheHitRate(cacheType?: 'llm' | 'note_embed'): CacheHitRateStats {
    const now = Date.now();
    const windowStart = now - this.WINDOW_MS;
    
    let filtered = this.cacheHitMetrics.filter(m => m.timestamp >= windowStart);
    if (cacheType) {
      filtered = filtered.filter(m => m.cacheType === cacheType);
    }

    if (filtered.length === 0) {
      return { hitRate: 0, hits: 0, misses: 0 };
    }

    const hits = filtered.filter(m => m.hit).length;
    const misses = filtered.length - hits;
    const hitRate = filtered.length > 0 ? hits / filtered.length : 0;

    return { hitRate, hits, misses };
  }

  /**
   * Obtenir statistiques rate limit
   */
  getRateLimitStats(endpoint?: string): RateLimitStats {
    const now = Date.now();
    const windowStart = now - this.WINDOW_MS;
    
    let filtered = this.rateLimitMetrics.filter(m => m.timestamp >= windowStart);
    if (endpoint) {
      filtered = filtered.filter(m => m.endpoint === endpoint);
    }

    if (filtered.length === 0) {
      return { hits: 0, total: 0, rate: 0 };
    }

    const hits = filtered.filter(m => m.hit).length;
    const total = filtered.length;
    const rate = total > 0 ? hits / total : 0;

    return { hits, total, rate };
  }

  /**
   * Calculer percentile
   */
  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * percentile) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Enforcer limite de métriques
   */
  private enforceLimit(type: 'latency' | 'error' | 'db' | 'cache' | 'rateLimit' | 'throughput'): void {
    let metrics: Array<{ timestamp: number }>;
    switch (type) {
      case 'latency':
        metrics = this.latencyMetrics;
        break;
      case 'error':
        metrics = this.errorMetrics;
        break;
      case 'db':
        metrics = this.dbQueryMetrics;
        break;
      case 'cache':
        metrics = this.cacheHitMetrics;
        break;
      case 'rateLimit':
        metrics = this.rateLimitMetrics;
        break;
      case 'throughput':
        metrics = this.throughputMetrics;
        break;
    }

    if (metrics.length > this.MAX_METRICS) {
      // Garder les plus récentes
      metrics.sort((a, b) => b.timestamp - a.timestamp);
      metrics.splice(this.MAX_METRICS);
    }
  }

  /**
   * Démarrer nettoyage automatique
   */
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000); // 5 minutes
  }

  /**
   * Nettoyer métriques expirées
   */
  private cleanup(): void {
    try {
      const now = Date.now();
      const windowStart = now - this.WINDOW_MS;

      this.latencyMetrics = this.latencyMetrics.filter(m => m.timestamp >= windowStart);
      this.errorMetrics = this.errorMetrics.filter(m => m.timestamp >= windowStart);
      this.dbQueryMetrics = this.dbQueryMetrics.filter(m => m.timestamp >= windowStart);
      this.cacheHitMetrics = this.cacheHitMetrics.filter(m => m.timestamp >= windowStart);
      this.rateLimitMetrics = this.rateLimitMetrics.filter(m => m.timestamp >= windowStart);
      this.throughputMetrics = this.throughputMetrics.filter(m => m.timestamp >= windowStart);

      logger.debug(LogCategory.MONITORING, '[MetricsCollector] Cleanup completed', {
        latency: this.latencyMetrics.length,
        errors: this.errorMetrics.length,
        db: this.dbQueryMetrics.length,
        cache: this.cacheHitMetrics.length,
        rateLimit: this.rateLimitMetrics.length,
        throughput: this.throughputMetrics.length
      });
    } catch (error) {
      logger.error(LogCategory.MONITORING, '[MetricsCollector] Error during cleanup', undefined, error as Error);
    }
  }

  /**
   * Réinitialiser toutes les métriques (pour tests)
   */
  reset(): void {
    this.latencyMetrics = [];
    this.errorMetrics = [];
    this.dbQueryMetrics = [];
    this.cacheHitMetrics = [];
    this.rateLimitMetrics = [];
    this.throughputMetrics = [];
  }
}

export const metricsCollector = MetricsCollector.getInstance();

