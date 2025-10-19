/**
 * Dashboard de performance en temps réel
 * Interface pour visualiser les métriques des tool calls
 */

import { toolCallMetrics, ToolCallStats, PerformanceAlert } from './ToolCallMetrics';
import { distributedCache } from '../cache/DistributedCache';
import { simpleLogger as logger } from '@/utils/logger';

export interface DashboardData {
  timestamp: number;
  global: {
    totalTools: number;
    totalCalls: number;
    successRate: number;
    averageTime: number;
    cacheHitRate: number;
  };
  tools: Array<{
    name: string;
    stats: ToolCallStats;
    status: 'healthy' | 'warning' | 'critical';
  }>;
  alerts: PerformanceAlert[];
  cache: {
    redis: { connected: boolean; keys?: number };
    memory: { size: number; maxSize: number };
    hitRate: number;
  };
  performance: {
    slowestTools: Array<{ name: string; avgTime: number }>;
    errorProneTools: Array<{ name: string; errorRate: number }>;
    topUsedTools: Array<{ name: string; calls: number }>;
  };
}

export class PerformanceDashboard {
  private static instance: PerformanceDashboard;
  private readonly HEALTH_THRESHOLDS = {
    successRate: 0.95,      // 95% de succès
    averageTime: 5000,      // 5 secondes max
    errorRate: 0.05,        // 5% d'erreurs max
    cacheHitRate: 0.8,      // 80% de cache hit
  };

  private constructor() {}

  public static getInstance(): PerformanceDashboard {
    if (!PerformanceDashboard.instance) {
      PerformanceDashboard.instance = new PerformanceDashboard();
    }
    return PerformanceDashboard.instance;
  }

  /**
   * Obtenir les données complètes du dashboard
   */
  async getDashboardData(): Promise<DashboardData> {
    try {
      const globalStats = toolCallMetrics.getGlobalStats();
      const cacheStats = distributedCache.getStats();
      const recentAlerts = toolCallMetrics.getRecentAlerts(20);

      // Obtenir les stats pour tous les tools
      const toolsData = await this.getToolsData();
      
      // Calculer les métriques de performance
      const performanceData = this.calculatePerformanceMetrics(globalStats);

      // Calculer le taux de cache hit global
      const cacheHitRate = await this.calculateGlobalCacheHitRate();

      return {
        timestamp: Date.now(),
        global: {
          totalTools: globalStats.totalTools,
          totalCalls: globalStats.totalCalls,
          successRate: globalStats.globalSuccessRate,
          averageTime: globalStats.globalAverageTime,
          cacheHitRate,
        },
        tools: toolsData,
        alerts: recentAlerts,
        cache: {
          ...cacheStats,
          hitRate: cacheHitRate,
        },
        performance: performanceData,
      };
    } catch (error) {
      logger.error('[PerformanceDashboard] ❌ Error getting dashboard data:', error);
      return this.getEmptyDashboardData();
    }
  }

  /**
   * Obtenir les données des tools avec leur statut
   */
  private async getToolsData(): Promise<Array<{ name: string; stats: ToolCallStats; status: 'healthy' | 'warning' | 'critical' }>> {
    try {
      const toolsData: Array<{ name: string; stats: ToolCallStats; status: 'healthy' | 'warning' | 'critical' }> = [];
      
      // Obtenir la liste de tous les tools (simulé - à adapter selon votre implémentation)
      const toolNames = [
        'createNote', 'getNote', 'updateNote', 'deleteResource', 'insertNoteContent',
        'moveNote', 'getNoteTOC', 'listClasseurs', 'createClasseur', 'getClasseurTree',
        'createFolder', 'getFolderTree', 'searchContent', 'searchFiles', 'getUserProfile',
        'getStats'
      ];

      for (const toolName of toolNames) {
        const stats = toolCallMetrics.getToolStats(toolName);
        if (stats) {
          const status = this.determineToolStatus(stats);
          toolsData.push({ name: toolName, stats, status });
        }
      }

      return toolsData.sort((a, b) => b.stats.totalCalls - a.stats.totalCalls);
    } catch (error) {
      logger.error('[PerformanceDashboard] ❌ Error getting tools data:', error);
      return [];
    }
  }

  /**
   * Déterminer le statut d'un tool
   */
  private determineToolStatus(stats: ToolCallStats): 'healthy' | 'warning' | 'critical' {
    const { successRate, averageExecutionTime, errorRate, cacheHitRate } = stats;

    // Critères critiques
    if (successRate < 0.8 || averageExecutionTime > 15000 || errorRate > 0.2) {
      return 'critical';
    }

    // Critères d'avertissement
    if (successRate < this.HEALTH_THRESHOLDS.successRate || 
        averageExecutionTime > this.HEALTH_THRESHOLDS.averageTime ||
        errorRate > this.HEALTH_THRESHOLDS.errorRate ||
        cacheHitRate < this.HEALTH_THRESHOLDS.cacheHitRate) {
      return 'warning';
    }

    return 'healthy';
  }

  /**
   * Calculer les métriques de performance
   */
  private calculatePerformanceMetrics(globalStats: { totalCalls: number; successRate: number; avgExecutionTime: number; errorRate: number }): {
    slowestTools: Array<{ name: string; avgTime: number }>;
    errorProneTools: Array<{ name: string; errorRate: number }>;
    topUsedTools: Array<{ name: string; calls: number }>;
  } {
    return {
      slowestTools: globalStats.topSlowTools || [],
      errorProneTools: globalStats.topErrorTools || [],
      topUsedTools: [], // TODO: Implémenter le calcul des tools les plus utilisés
    };
  }

  /**
   * Calculer le taux de cache hit global
   */
  private async calculateGlobalCacheHitRate(): Promise<number> {
    try {
      // TODO: Implémenter le calcul du taux de cache hit global
      // Pour l'instant, retourner une valeur simulée
      return 0.85; // 85% de cache hit
    } catch (error) {
      logger.error('[PerformanceDashboard] ❌ Error calculating cache hit rate:', error);
      return 0;
    }
  }

  /**
   * Obtenir un résumé de santé du système
   */
  getSystemHealth(): {
    status: 'healthy' | 'warning' | 'critical';
    score: number;
    issues: string[];
    recommendations: string[];
  } {
    try {
      const globalStats = toolCallMetrics.getGlobalStats();
      const recentAlerts = toolCallMetrics.getRecentAlerts(10);
      
      let score = 100;
      const issues: string[] = [];
      const recommendations: string[] = [];

      // Vérifier le taux de succès global
      if (globalStats.globalSuccessRate < this.HEALTH_THRESHOLDS.successRate) {
        score -= 20;
        issues.push(`Taux de succès global faible: ${(globalStats.globalSuccessRate * 100).toFixed(1)}%`);
        recommendations.push('Vérifier les erreurs récurrentes et optimiser les tools problématiques');
      }

      // Vérifier le temps d'exécution moyen
      if (globalStats.globalAverageTime > this.HEALTH_THRESHOLDS.averageTime) {
        score -= 15;
        issues.push(`Temps d'exécution moyen élevé: ${globalStats.globalAverageTime.toFixed(0)}ms`);
        recommendations.push('Optimiser les requêtes de base de données et améliorer le cache');
      }

      // Vérifier les alertes critiques
      const criticalAlerts = recentAlerts.filter(alert => alert.severity === 'critical');
      if (criticalAlerts.length > 0) {
        score -= 25;
        issues.push(`${criticalAlerts.length} alertes critiques actives`);
        recommendations.push('Résoudre immédiatement les problèmes critiques identifiés');
      }

      // Vérifier les alertes d'avertissement
      const warningAlerts = recentAlerts.filter(alert => alert.severity === 'warning');
      if (warningAlerts.length > 5) {
        score -= 10;
        issues.push(`${warningAlerts.length} alertes d'avertissement`);
        recommendations.push('Surveiller et résoudre les problèmes d\'avertissement');
      }

      // Déterminer le statut global
      let status: 'healthy' | 'warning' | 'critical';
      if (score >= 90) {
        status = 'healthy';
      } else if (score >= 70) {
        status = 'warning';
      } else {
        status = 'critical';
      }

      return {
        status,
        score: Math.max(0, score),
        issues,
        recommendations,
      };
    } catch (error) {
      logger.error('[PerformanceDashboard] ❌ Error getting system health:', error);
      return {
        status: 'critical',
        score: 0,
        issues: ['Erreur lors de l\'évaluation de la santé du système'],
        recommendations: ['Vérifier les logs et redémarrer les services de monitoring'],
      };
    }
  }

  /**
   * Obtenir les données vides du dashboard
   */
  private getEmptyDashboardData(): DashboardData {
    return {
      timestamp: Date.now(),
      global: {
        totalTools: 0,
        totalCalls: 0,
        successRate: 0,
        averageTime: 0,
        cacheHitRate: 0,
      },
      tools: [],
      alerts: [],
      cache: {
        redis: { connected: false },
        memory: { size: 0, maxSize: 0 },
        hitRate: 0,
      },
      performance: {
        slowestTools: [],
        errorProneTools: [],
        topUsedTools: [],
      },
    };
  }

  /**
   * Exporter les données pour analyse externe
   */
  async exportData(format: 'json' | 'csv' = 'json'): Promise<string> {
    try {
      const data = await this.getDashboardData();
      
      if (format === 'json') {
        return JSON.stringify(data, null, 2);
      } else if (format === 'csv') {
        return this.convertToCSV(data);
      }
      
      return '';
    } catch (error) {
      logger.error('[PerformanceDashboard] ❌ Error exporting data:', error);
      return '';
    }
  }

  /**
   * Convertir les données en CSV
   */
  private convertToCSV(data: DashboardData): string {
    const csvLines: string[] = [];
    
    // En-tête
    csvLines.push('Tool Name,Total Calls,Success Rate,Average Time,Error Rate,Cache Hit Rate,Status');
    
    // Données des tools
    for (const tool of data.tools) {
      const { stats } = tool;
      csvLines.push([
        tool.name,
        stats.totalCalls,
        (stats.successRate * 100).toFixed(2),
        stats.averageExecutionTime.toFixed(0),
        (stats.errorRate * 100).toFixed(2),
        (stats.cacheHitRate * 100).toFixed(2),
        tool.status,
      ].join(','));
    }
    
    return csvLines.join('\n');
  }
}

/**
 * Instance singleton du dashboard
 */
export const performanceDashboard = PerformanceDashboard.getInstance();
