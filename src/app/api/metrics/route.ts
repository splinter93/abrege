/**
 * Endpoint API pour exposer toutes les métriques
 * GET /api/metrics - Retourne métriques complètes en JSON
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger, LogCategory } from '@/utils/logger';
import { metricsCollector } from '@/services/monitoring/MetricsCollector';
import { alertManager } from '@/services/monitoring/AlertManager';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/metrics - Obtenir toutes les métriques
 */
export async function GET(request: NextRequest) {
  try {
    // Récupérer toutes les métriques
    const latencyStats = metricsCollector.getLatencyStats();
    const latencyByEndpoint: Record<string, { p50: number; p95: number; p99: number; average: number; count: number }> = {};
    
    // Latence par endpoint (endpoints connus)
    const endpoints = ['chat/llm/stream', 'chat/llm', 'v2/note'];
    endpoints.forEach(endpoint => {
      const stats = metricsCollector.getLatencyStats(endpoint);
      if (stats.count > 0) {
        latencyByEndpoint[endpoint] = {
          p50: stats.p50,
          p95: stats.p95,
          p99: stats.p99,
          average: stats.average,
          count: stats.count
        };
      }
    });

    const throughput1m = metricsCollector.getThroughputStats('1m');
    const throughput5m = metricsCollector.getThroughputStats('5m');
    const throughput15m = metricsCollector.getThroughputStats('15m');

    const errorStats = metricsCollector.getErrorRateStats();
    const errorByType: Record<string, { count: number; rate: number }> = {};
    Object.entries(errorStats.byType).forEach(([type, stats]) => {
      errorByType[type] = {
        count: stats.count,
        rate: stats.rate
      };
    });

    const rateLimitStats = metricsCollector.getRateLimitStats();
    const rateLimitByEndpoint: Record<string, { hits: number; total: number; rate: number }> = {};
    ['api', 'chat', 'upload'].forEach(endpoint => {
      const stats = metricsCollector.getRateLimitStats(endpoint);
      if (stats.total > 0) {
        rateLimitByEndpoint[endpoint] = {
          hits: stats.hits,
          total: stats.total,
          rate: stats.rate
        };
      }
    });

    const llmCacheStats = metricsCollector.getCacheHitRate('llm');
    const noteCacheStats = metricsCollector.getCacheHitRate('note_embed');

    const dbStats = metricsCollector.getDbLatencyStats();
    const dbByTable: Record<string, { p50: number; p95: number; p99: number; average: number; count: number }> = {};
    // Tables connues
    const tables = ['articles', 'classeurs', 'folders', 'sessions', 'messages'];
    tables.forEach(table => {
      const stats = metricsCollector.getDbLatencyStats(table);
      if (stats.count > 0) {
        dbByTable[table] = {
          p50: stats.p50,
          p95: stats.p95,
          p99: stats.p99,
          average: stats.average,
          count: stats.count
        };
      }
    });

    const recentAlerts = alertManager.getRecentAlerts(20);
    const activeAlerts = alertManager.getActiveAlerts();

    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      latency: {
        global: {
          p50: latencyStats.p50,
          p95: latencyStats.p95,
          p99: latencyStats.p99,
          average: latencyStats.average,
          count: latencyStats.count
        },
        byEndpoint: latencyByEndpoint
      },
      throughput: {
        '1m': {
          messages: throughput1m.messages,
          requests: throughput1m.requests
        },
        '5m': {
          messages: throughput5m.messages,
          requests: throughput5m.requests
        },
        '15m': {
          messages: throughput15m.messages,
          requests: throughput15m.requests
        }
      },
      errors: {
        global: {
          rate: errorStats.rate,
          total: errorStats.total
        },
        byType: errorByType
      },
      rateLimits: {
        global: {
          hits: rateLimitStats.hits,
          total: rateLimitStats.total,
          rate: rateLimitStats.rate
        },
        byEndpoint: rateLimitByEndpoint
      },
      cache: {
        llm: {
          hitRate: llmCacheStats.hitRate,
          hits: llmCacheStats.hits,
          misses: llmCacheStats.misses
        },
        note_embed: {
          hitRate: noteCacheStats.hitRate,
          hits: noteCacheStats.hits,
          misses: noteCacheStats.misses
        }
      },
      database: {
        global: {
          p50: dbStats.p50,
          p95: dbStats.p95,
          p99: dbStats.p99,
          average: dbStats.average,
          count: dbStats.count
        },
        byTable: dbByTable
      },
      alerts: {
        recent: recentAlerts.map(a => ({
          type: a.type,
          severity: a.severity,
          message: a.message,
          value: a.value,
          threshold: a.threshold,
          timestamp: a.timestamp,
          sent: a.sent
        })),
        active: activeAlerts.map(a => ({
          type: a.type,
          severity: a.severity,
          message: a.message,
          value: a.value,
          threshold: a.threshold,
          timestamp: a.timestamp,
          sent: a.sent
        }))
      }
    };

    logger.info(LogCategory.API, '[Metrics API] Metrics retrieved successfully', {
      latencyCount: latencyStats.count,
      errorCount: errorStats.total,
      alertCount: recentAlerts.length
    });

    return NextResponse.json(response);
  } catch (error) {
    logger.error(LogCategory.API, '[Metrics API] Error retrieving metrics', undefined, error as Error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Erreur lors de la récupération des métriques',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}

