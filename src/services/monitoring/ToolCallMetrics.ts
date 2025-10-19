/**
 * Système de métriques avancé pour les tool calls
 * Monitoring en temps réel avec alertes automatiques
 */

import { simpleLogger as logger } from '@/utils/logger';

export interface ToolCallMetric {
  toolName: string;
  executionTime: number;
  success: boolean;
  timestamp: number;
  userId: string;
  errorCode?: string;
  cacheHit?: boolean;
}

export interface PerformanceAlert {
  type: 'slow_tool' | 'high_error_rate' | 'cache_miss_rate' | 'timeout_rate';
  toolName: string;
  value: number;
  threshold: number;
  timestamp: number;
  severity: 'warning' | 'critical';
}

export interface ToolCallStats {
  toolName: string;
  totalCalls: number;
  successRate: number;
  averageExecutionTime: number;
  p95ExecutionTime: number;
  p99ExecutionTime: number;
  errorRate: number;
  cacheHitRate: number;
  last24Hours: {
    calls: number;
    errors: number;
    avgTime: number;
  };
}

export class ToolCallMetrics {
  private static instance: ToolCallMetrics;
  private metrics: Map<string, ToolCallMetric[]> = new Map();
  private alerts: PerformanceAlert[] = [];
  private readonly MAX_METRICS_PER_TOOL = 1000;
  private readonly ALERT_THRESHOLDS = {
    slow_tool: 10000,        // 10 secondes
    high_error_rate: 0.1,    // 10% d'erreurs
    cache_miss_rate: 0.3,    // 30% de cache miss
    timeout_rate: 0.05,      // 5% de timeouts
  };

  private constructor() {
    this.startCleanupInterval();
    this.startAlertingInterval();
  }

  public static getInstance(): ToolCallMetrics {
    if (!ToolCallMetrics.instance) {
      ToolCallMetrics.instance = new ToolCallMetrics();
    }
    return ToolCallMetrics.instance;
  }

  /**
   * Enregistrer une métrique de tool call
   */
  recordToolCall(metric: ToolCallMetric): void {
    try {
      const toolName = metric.toolName;
      
      if (!this.metrics.has(toolName)) {
        this.metrics.set(toolName, []);
      }

      const toolMetrics = this.metrics.get(toolName)!;
      toolMetrics.push(metric);

      // Limiter le nombre de métriques par tool
      if (toolMetrics.length > this.MAX_METRICS_PER_TOOL) {
        toolMetrics.splice(0, toolMetrics.length - this.MAX_METRICS_PER_TOOL);
      }

      // Vérifier les alertes en temps réel
      this.checkRealTimeAlerts(metric);

      logger.dev(`[ToolCallMetrics] 📊 Metric recorded: ${toolName} (${metric.executionTime}ms, ${metric.success ? 'SUCCESS' : 'ERROR'})`);
    } catch (error) {
      logger.error(`[ToolCallMetrics] ❌ Error recording metric:`, error);
    }
  }

  /**
   * Obtenir les statistiques pour un tool spécifique
   */
  getToolStats(toolName: string, timeWindow: number = 24 * 60 * 60 * 1000): ToolCallStats | null {
    try {
      const toolMetrics = this.metrics.get(toolName);
      if (!toolMetrics || toolMetrics.length === 0) {
        return null;
      }

      const now = Date.now();
      const recentMetrics = toolMetrics.filter(m => now - m.timestamp < timeWindow);
      
      if (recentMetrics.length === 0) {
        return null;
      }

      const totalCalls = recentMetrics.length;
      const successfulCalls = recentMetrics.filter(m => m.success).length;
      const errorCalls = totalCalls - successfulCalls;
      const successRate = successfulCalls / totalCalls;
      const errorRate = errorCalls / totalCalls;

      const executionTimes = recentMetrics.map(m => m.executionTime).sort((a, b) => a - b);
      const averageExecutionTime = executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length;
      const p95ExecutionTime = this.calculatePercentile(executionTimes, 0.95);
      const p99ExecutionTime = this.calculatePercentile(executionTimes, 0.99);

      const cacheHits = recentMetrics.filter(m => m.cacheHit === true).length;
      const cacheHitRate = cacheHits / totalCalls;

      // Statistiques des dernières 24 heures
      const last24Hours = this.calculateLast24HoursStats(recentMetrics);

      return {
        toolName,
        totalCalls,
        successRate,
        averageExecutionTime,
        p95ExecutionTime,
        p99ExecutionTime,
        errorRate,
        cacheHitRate,
        last24Hours,
      };
    } catch (error) {
      logger.error(`[ToolCallMetrics] ❌ Error getting stats for ${toolName}:`, error);
      return null;
    }
  }

  /**
   * Obtenir les statistiques globales
   */
  getGlobalStats(timeWindow: number = 24 * 60 * 60 * 1000): {
    totalTools: number;
    totalCalls: number;
    globalSuccessRate: number;
    globalAverageTime: number;
    topSlowTools: Array<{ toolName: string; avgTime: number }>;
    topErrorTools: Array<{ toolName: string; errorRate: number }>;
  } {
    try {
      const now = Date.now();
      let totalCalls = 0;
      let totalSuccessfulCalls = 0;
      let totalExecutionTime = 0;
      const toolStats: Array<{ toolName: string; avgTime: number; errorRate: number }> = [];

      for (const [toolName, metrics] of this.metrics.entries()) {
        const recentMetrics = metrics.filter(m => now - m.timestamp < timeWindow);
        if (recentMetrics.length === 0) continue;

        const successfulCalls = recentMetrics.filter(m => m.success).length;
        const avgTime = recentMetrics.reduce((sum, m) => sum + m.executionTime, 0) / recentMetrics.length;
        const errorRate = (recentMetrics.length - successfulCalls) / recentMetrics.length;

        totalCalls += recentMetrics.length;
        totalSuccessfulCalls += successfulCalls;
        totalExecutionTime += recentMetrics.reduce((sum, m) => sum + m.executionTime, 0);

        toolStats.push({
          toolName,
          avgTime,
          errorRate,
        });
      }

      const globalSuccessRate = totalCalls > 0 ? totalSuccessfulCalls / totalCalls : 0;
      const globalAverageTime = totalCalls > 0 ? totalExecutionTime / totalCalls : 0;

      // Top 5 des tools les plus lents
      const topSlowTools = toolStats
        .sort((a, b) => b.avgTime - a.avgTime)
        .slice(0, 5)
        .map(tool => ({ toolName: tool.toolName, avgTime: tool.avgTime }));

      // Top 5 des tools avec le plus d'erreurs
      const topErrorTools = toolStats
        .sort((a, b) => b.errorRate - a.errorRate)
        .slice(0, 5)
        .map(tool => ({ toolName: tool.toolName, errorRate: tool.errorRate }));

      return {
        totalTools: this.metrics.size,
        totalCalls,
        globalSuccessRate,
        globalAverageTime,
        topSlowTools,
        topErrorTools,
      };
    } catch (error) {
      logger.error(`[ToolCallMetrics] ❌ Error getting global stats:`, error);
      return {
        totalTools: 0,
        totalCalls: 0,
        globalSuccessRate: 0,
        globalAverageTime: 0,
        topSlowTools: [],
        topErrorTools: [],
      };
    }
  }

  /**
   * Obtenir les alertes récentes
   */
  getRecentAlerts(limit: number = 50): PerformanceAlert[] {
    return this.alerts
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Vérifier les alertes en temps réel
   */
  private checkRealTimeAlerts(metric: ToolCallMetric): void {
    try {
      // Alerte pour tool lent
      if (metric.executionTime > this.ALERT_THRESHOLDS.slow_tool) {
        this.addAlert({
          type: 'slow_tool',
          toolName: metric.toolName,
          value: metric.executionTime,
          threshold: this.ALERT_THRESHOLDS.slow_tool,
          timestamp: Date.now(),
          severity: metric.executionTime > this.ALERT_THRESHOLDS.slow_tool * 2 ? 'critical' : 'warning',
        });
      }

      // Alerte pour erreur
      if (!metric.success) {
        this.addAlert({
          type: 'high_error_rate',
          toolName: metric.toolName,
          value: 1,
          threshold: this.ALERT_THRESHOLDS.high_error_rate,
          timestamp: Date.now(),
          severity: 'warning',
        });
      }

      // Alerte pour cache miss
      if (metric.cacheHit === false) {
        this.addAlert({
          type: 'cache_miss_rate',
          toolName: metric.toolName,
          value: 1,
          threshold: this.ALERT_THRESHOLDS.cache_miss_rate,
          timestamp: Date.now(),
          severity: 'warning',
        });
      }
    } catch (error) {
      logger.error(`[ToolCallMetrics] ❌ Error checking real-time alerts:`, error);
    }
  }

  /**
   * Ajouter une alerte
   */
  private addAlert(alert: PerformanceAlert): void {
    this.alerts.push(alert);
    
    // Limiter le nombre d'alertes
    if (this.alerts.length > 1000) {
      this.alerts.splice(0, this.alerts.length - 1000);
    }

    // Logger l'alerte
    const severityIcon = alert.severity === 'critical' ? '🚨' : '⚠️';
    logger.warn(`[ToolCallMetrics] ${severityIcon} ALERT: ${alert.type} for ${alert.toolName} - ${alert.value} (threshold: ${alert.threshold})`);
  }

  /**
   * Calculer un percentile
   */
  private calculatePercentile(sortedArray: number[], percentile: number): number {
    const index = Math.ceil(sortedArray.length * percentile) - 1;
    return sortedArray[Math.max(0, index)];
  }

  /**
   * Calculer les statistiques des dernières 24 heures
   */
  private calculateLast24HoursStats(metrics: ToolCallMetric[]): {
    calls: number;
    errors: number;
    avgTime: number;
  } {
    const now = Date.now();
    const last24Hours = metrics.filter(m => now - m.timestamp < 24 * 60 * 60 * 1000);
    
    const calls = last24Hours.length;
    const errors = last24Hours.filter(m => !m.success).length;
    const avgTime = calls > 0 ? last24Hours.reduce((sum, m) => sum + m.executionTime, 0) / calls : 0;

    return { calls, errors, avgTime };
  }

  /**
   * Nettoyage périodique des métriques anciennes
   */
  private startCleanupInterval(): void {
    setInterval(() => {
      this.cleanupOldMetrics();
    }, 60 * 60 * 1000); // Toutes les heures
  }

  /**
   * Nettoyer les métriques anciennes
   */
  private cleanupOldMetrics(): void {
    try {
      const now = Date.now();
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 jours
      let cleanedCount = 0;

      for (const [toolName, metrics] of this.metrics.entries()) {
        const originalLength = metrics.length;
        const filteredMetrics = metrics.filter(m => now - m.timestamp < maxAge);
        
        if (filteredMetrics.length !== originalLength) {
          this.metrics.set(toolName, filteredMetrics);
          cleanedCount += originalLength - filteredMetrics.length;
        }
      }

      if (cleanedCount > 0) {
        logger.dev(`[ToolCallMetrics] 🗑️ Cleaned ${cleanedCount} old metrics`);
      }
    } catch (error) {
      logger.error(`[ToolCallMetrics] ❌ Error cleaning old metrics:`, error);
    }
  }

  /**
   * Vérification périodique des alertes
   */
  private startAlertingInterval(): void {
    setInterval(() => {
      this.checkPeriodicAlerts();
    }, 5 * 60 * 1000); // Toutes les 5 minutes
  }

  /**
   * Vérifier les alertes périodiques
   */
  private checkPeriodicAlerts(): void {
    try {
      const now = Date.now();
      const timeWindow = 15 * 60 * 1000; // 15 minutes

      for (const [toolName, metrics] of this.metrics.entries()) {
        const recentMetrics = metrics.filter(m => now - m.timestamp < timeWindow);
        if (recentMetrics.length < 10) continue; // Pas assez de données

        const errorRate = recentMetrics.filter(m => !m.success).length / recentMetrics.length;
        const cacheMissRate = recentMetrics.filter(m => m.cacheHit === false).length / recentMetrics.length;

        // Alerte pour taux d'erreur élevé
        if (errorRate > this.ALERT_THRESHOLDS.high_error_rate) {
          this.addAlert({
            type: 'high_error_rate',
            toolName,
            value: errorRate,
            threshold: this.ALERT_THRESHOLDS.high_error_rate,
            timestamp: now,
            severity: errorRate > 0.2 ? 'critical' : 'warning',
          });
        }

        // Alerte pour taux de cache miss élevé
        if (cacheMissRate > this.ALERT_THRESHOLDS.cache_miss_rate) {
          this.addAlert({
            type: 'cache_miss_rate',
            toolName,
            value: cacheMissRate,
            threshold: this.ALERT_THRESHOLDS.cache_miss_rate,
            timestamp: now,
            severity: cacheMissRate > 0.5 ? 'critical' : 'warning',
          });
        }
      }
    } catch (error) {
      logger.error(`[ToolCallMetrics] ❌ Error checking periodic alerts:`, error);
    }
  }

  /**
   * Exporter les métriques pour analyse
   */
  exportMetrics(timeWindow: number = 24 * 60 * 60 * 1000): {
    timestamp: number;
    globalStats: {
      totalCalls: number;
      successRate: number;
      avgExecutionTime: number;
      errorRate: number;
    };
    toolStats: Record<string, ToolCallStats>;
    alerts: PerformanceAlert[];
  } {
    try {
      const globalStats = this.getGlobalStats(timeWindow);
      const toolStats: Record<string, ToolCallStats> = {};

      for (const toolName of this.metrics.keys()) {
        const stats = this.getToolStats(toolName, timeWindow);
        if (stats) {
          toolStats[toolName] = stats;
        }
      }

      return {
        timestamp: Date.now(),
        globalStats,
        toolStats,
        alerts: this.getRecentAlerts(100),
      };
    } catch (error) {
      logger.error(`[ToolCallMetrics] ❌ Error exporting metrics:`, error);
      return {
        timestamp: Date.now(),
        globalStats: {},
        toolStats: {},
        alerts: [],
      };
    }
  }

  /**
   * Réinitialiser les métriques
   */
  reset(): void {
    this.metrics.clear();
    this.alerts = [];
    logger.info('[ToolCallMetrics] 🔄 Metrics reset');
  }
}

/**
 * Instance singleton des métriques
 */
export const toolCallMetrics = ToolCallMetrics.getInstance();
