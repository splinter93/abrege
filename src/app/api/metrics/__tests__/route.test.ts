/**
 * Tests unitaires pour /api/metrics route
 * 
 * Conformité GUIDE-EXCELLENCE-CODE.md : Tests >80% coverage
 * 
 * Couverture:
 * - GET handler retourne JSON valide
 * - Structure réponse complète
 * - Gestion erreurs
 * - Toutes métriques présentes
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../route';

// Mock MetricsCollector
vi.mock('@/services/monitoring/MetricsCollector', () => {
  const mockCollector = {
    getLatencyStats: vi.fn(),
    getThroughputStats: vi.fn(),
    getErrorRateStats: vi.fn(),
    getRateLimitStats: vi.fn(),
    getCacheHitRate: vi.fn(),
    getDbLatencyStats: vi.fn(),
  };
  return {
    metricsCollector: mockCollector,
  };
});

// Mock AlertManager
vi.mock('@/services/monitoring/AlertManager', () => {
  const mockManager = {
    getRecentAlerts: vi.fn(),
    getActiveAlerts: vi.fn(),
  };
  return {
    alertManager: mockManager,
  };
});

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
  LogCategory: {
    API: 'API',
  },
}));

describe('/api/metrics', () => {
  let mockRequest: NextRequest;
  let mockMetricsCollector: {
    getLatencyStats: ReturnType<typeof vi.fn>;
    getThroughputStats: ReturnType<typeof vi.fn>;
    getErrorRateStats: ReturnType<typeof vi.fn>;
    getRateLimitStats: ReturnType<typeof vi.fn>;
    getCacheHitRate: ReturnType<typeof vi.fn>;
    getDbLatencyStats: ReturnType<typeof vi.fn>;
  };
  let mockAlertManager: {
    getRecentAlerts: ReturnType<typeof vi.fn>;
    getActiveAlerts: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Importer les mocks
    const metricsModule = await import('@/services/monitoring/MetricsCollector');
    const alertModule = await import('@/services/monitoring/AlertManager');
    mockMetricsCollector = metricsModule.metricsCollector as typeof mockMetricsCollector;
    mockAlertManager = alertModule.alertManager as typeof mockAlertManager;
    
    mockRequest = new NextRequest('http://localhost:3000/api/metrics');

    // Setup default mocks
    mockMetricsCollector.getLatencyStats.mockReturnValue({
      p50: 100,
      p95: 200,
      p99: 300,
      average: 150,
      count: 10
    });

    mockMetricsCollector.getThroughputStats.mockReturnValue({
      messages: 5,
      requests: 10
    });

    mockMetricsCollector.getErrorRateStats.mockReturnValue({
      rate: 0.05,
      total: 5,
      byType: {
        validation_error: { count: 2, rate: 0.4 },
        server_error: { count: 3, rate: 0.6 }
      }
    });

    mockMetricsCollector.getRateLimitStats.mockReturnValue({
      hits: 2,
      total: 100,
      rate: 0.02
    });

    mockMetricsCollector.getCacheHitRate.mockReturnValue({
      hitRate: 0.8,
      hits: 80,
      misses: 20
    });

    mockMetricsCollector.getDbLatencyStats.mockReturnValue({
      p50: 50,
      p95: 100,
      p99: 150,
      average: 75,
      count: 50
    });

    mockAlertManager.getRecentAlerts.mockReturnValue([
      {
        type: 'error_rate_high',
        severity: 'warning',
        message: 'Error rate is 5.00%',
        value: 0.05,
        threshold: 0.05,
        timestamp: Date.now(),
        sent: true
      }
    ]);

    mockAlertManager.getActiveAlerts.mockReturnValue([]);
  });

  describe('GET handler', () => {
    it('should return 200 with valid JSON response', async () => {
      const response = await GET(mockRequest);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.timestamp).toBeDefined();
    });

    it('should include all metric categories', async () => {
      const response = await GET(mockRequest);
      const data = await response.json();
      
      expect(data.latency).toBeDefined();
      expect(data.throughput).toBeDefined();
      expect(data.errors).toBeDefined();
      expect(data.rateLimits).toBeDefined();
      expect(data.cache).toBeDefined();
      expect(data.database).toBeDefined();
      expect(data.alerts).toBeDefined();
    });

    it('should include latency metrics with correct structure', async () => {
      const response = await GET(mockRequest);
      const data = await response.json();
      
      expect(data.latency.global).toBeDefined();
      expect(data.latency.global.p50).toBe(100);
      expect(data.latency.global.p95).toBe(200);
      expect(data.latency.global.p99).toBe(300);
      expect(data.latency.global.average).toBe(150);
      expect(data.latency.global.count).toBe(10);
      expect(data.latency.byEndpoint).toBeDefined();
      expect(typeof data.latency.byEndpoint).toBe('object');
    });

    it('should include latency by endpoint when metrics exist', async () => {
      mockMetricsCollector.getLatencyStats.mockImplementation((endpoint?: string) => {
        if (endpoint === 'chat/llm/stream') {
          return { p50: 150, p95: 250, p99: 350, average: 200, count: 5 };
        }
        if (!endpoint) {
          return { p50: 100, p95: 200, p99: 300, average: 150, count: 10 };
        }
        return { p50: 0, p95: 0, p99: 0, average: 0, count: 0 };
      });

      const response = await GET(mockRequest);
      const data = await response.json();
      
      expect(data.latency.byEndpoint['chat/llm/stream']).toBeDefined();
      expect(data.latency.byEndpoint['chat/llm/stream'].p50).toBe(150);
    });

    it('should exclude endpoints with no metrics', async () => {
      mockMetricsCollector.getLatencyStats.mockImplementation((endpoint?: string) => {
        if (!endpoint) {
          return { p50: 100, p95: 200, p99: 300, average: 150, count: 10 };
        }
        return { p50: 0, p95: 0, p99: 0, average: 0, count: 0 };
      });

      const response = await GET(mockRequest);
      const data = await response.json();
      
      expect(Object.keys(data.latency.byEndpoint).length).toBe(0);
    });

    it('should include throughput metrics for all time windows', async () => {
      const response = await GET(mockRequest);
      const data = await response.json();
      
      expect(data.throughput['1m']).toBeDefined();
      expect(data.throughput['5m']).toBeDefined();
      expect(data.throughput['15m']).toBeDefined();
      expect(data.throughput['1m'].messages).toBe(5);
      expect(data.throughput['1m'].requests).toBe(10);
    });

    it('should include error metrics with correct structure', async () => {
      const response = await GET(mockRequest);
      const data = await response.json();
      
      expect(data.errors.global).toBeDefined();
      expect(data.errors.global.rate).toBe(0.05);
      expect(data.errors.global.total).toBe(5);
      expect(data.errors.byType).toBeDefined();
      expect(data.errors.byType['validation_error']).toBeDefined();
      expect(data.errors.byType['validation_error'].count).toBe(2);
      expect(data.errors.byType['validation_error'].rate).toBe(0.4);
    });

    it('should include rate limit metrics with correct structure', async () => {
      const response = await GET(mockRequest);
      const data = await response.json();
      
      expect(data.rateLimits.global).toBeDefined();
      expect(data.rateLimits.global.hits).toBe(2);
      expect(data.rateLimits.global.total).toBe(100);
      expect(data.rateLimits.global.rate).toBe(0.02);
      expect(data.rateLimits.byEndpoint).toBeDefined();
    });

    it('should include rate limit by endpoint when metrics exist', async () => {
      mockMetricsCollector.getRateLimitStats.mockImplementation((endpoint?: string) => {
        if (endpoint === 'api') {
          return { hits: 5, total: 50, rate: 0.1 };
        }
        if (!endpoint) {
          return { hits: 2, total: 100, rate: 0.02 };
        }
        return { hits: 0, total: 0, rate: 0 };
      });

      const response = await GET(mockRequest);
      const data = await response.json();
      
      expect(data.rateLimits.byEndpoint['api']).toBeDefined();
      expect(data.rateLimits.byEndpoint['api'].hits).toBe(5);
    });

    it('should include cache metrics for both types', async () => {
      const response = await GET(mockRequest);
      const data = await response.json();
      
      expect(data.cache.llm).toBeDefined();
      expect(data.cache.llm.hitRate).toBe(0.8);
      expect(data.cache.llm.hits).toBe(80);
      expect(data.cache.llm.misses).toBe(20);
      
      expect(data.cache.note_embed).toBeDefined();
      expect(data.cache.note_embed.hitRate).toBe(0.8);
    });

    it('should include database metrics with correct structure', async () => {
      const response = await GET(mockRequest);
      const data = await response.json();
      
      expect(data.database.global).toBeDefined();
      expect(data.database.global.p50).toBe(50);
      expect(data.database.global.p95).toBe(100);
      expect(data.database.global.p99).toBe(150);
      expect(data.database.global.average).toBe(75);
      expect(data.database.global.count).toBe(50);
      expect(data.database.byTable).toBeDefined();
    });

    it('should include database by table when metrics exist', async () => {
      mockMetricsCollector.getDbLatencyStats.mockImplementation((table?: string) => {
        if (table === 'articles') {
          return { p50: 60, p95: 120, p99: 180, average: 90, count: 30 };
        }
        if (!table) {
          return { p50: 50, p95: 100, p99: 150, average: 75, count: 50 };
        }
        return { p50: 0, p95: 0, p99: 0, average: 0, count: 0 };
      });

      const response = await GET(mockRequest);
      const data = await response.json();
      
      expect(data.database.byTable['articles']).toBeDefined();
      expect(data.database.byTable['articles'].p50).toBe(60);
    });

    it('should include alerts with correct structure', async () => {
      const response = await GET(mockRequest);
      const data = await response.json();
      
      expect(data.alerts.recent).toBeDefined();
      expect(Array.isArray(data.alerts.recent)).toBe(true);
      expect(data.alerts.active).toBeDefined();
      expect(Array.isArray(data.alerts.active)).toBe(true);
      
      if (data.alerts.recent.length > 0) {
        const alert = data.alerts.recent[0];
        expect(alert.type).toBeDefined();
        expect(alert.severity).toBeDefined();
        expect(alert.message).toBeDefined();
        expect(alert.value).toBeDefined();
        expect(alert.threshold).toBeDefined();
        expect(alert.timestamp).toBeDefined();
        expect(alert.sent).toBeDefined();
      }
    });

    it('should map alerts correctly', async () => {
      const mockAlerts = [
        {
          type: 'error_rate_high' as const,
          severity: 'critical' as const,
          message: 'Test alert',
          value: 0.15,
          threshold: 0.10,
          timestamp: 1234567890,
          sent: true
        }
      ];

      mockAlertManager.getRecentAlerts.mockReturnValue(mockAlerts);
      mockAlertManager.getActiveAlerts.mockReturnValue(mockAlerts);

      const response = await GET(mockRequest);
      const data = await response.json();
      
      expect(data.alerts.recent.length).toBe(1);
      expect(data.alerts.recent[0].type).toBe('error_rate_high');
      expect(data.alerts.recent[0].severity).toBe('critical');
      expect(data.alerts.recent[0].value).toBe(0.15);
    });
  });

  describe('Error Handling', () => {
    it('should return 500 on error', async () => {
      mockMetricsCollector.getLatencyStats.mockImplementation(() => {
        throw new Error('Metrics error');
      });

      const response = await GET(mockRequest);
      
      expect(response.status).toBe(500);
      
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
      expect(data.details).toBeDefined();
    });

    it('should include error details in response', async () => {
      const errorMessage = 'Test error message';
      mockMetricsCollector.getLatencyStats.mockImplementation(() => {
        throw new Error(errorMessage);
      });

      const response = await GET(mockRequest);
      const data = await response.json();
      
      expect(data.details).toBe(errorMessage);
    });

    it('should handle non-Error exceptions', async () => {
      mockMetricsCollector.getLatencyStats.mockImplementation(() => {
        throw 'String error';
      });

      const response = await GET(mockRequest);
      
      expect(response.status).toBe(500);
      
      const data = await response.json();
      expect(data.details).toBe('Erreur inconnue');
    });
  });

  describe('Logging', () => {
    it('should log success when metrics retrieved', async () => {
      const { logger } = await import('@/utils/logger');
      
      await GET(mockRequest);
      
      expect(logger.info).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('Metrics retrieved successfully'),
        expect.objectContaining({
          latencyCount: 10,
          errorCount: 5,
          alertCount: 1
        })
      );
    });

    it('should log error when metrics retrieval fails', async () => {
      const { logger } = await import('@/utils/logger');
      const error = new Error('Test error');
      
      mockMetricsCollector.getLatencyStats.mockImplementation(() => {
        throw error;
      });

      await GET(mockRequest);
      
      expect(logger.error).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('Error retrieving metrics'),
        undefined,
        error
      );
    });
  });

  describe('Response Format', () => {
    it('should return valid ISO timestamp', async () => {
      const response = await GET(mockRequest);
      const data = await response.json();
      
      expect(data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should return JSON content type', async () => {
      const response = await GET(mockRequest);
      
      const contentType = response.headers.get('content-type');
      expect(contentType).toContain('application/json');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty metrics gracefully', async () => {
      mockMetricsCollector.getLatencyStats.mockReturnValue({
        p50: 0,
        p95: 0,
        p99: 0,
        average: 0,
        count: 0
      });

      mockMetricsCollector.getErrorRateStats.mockReturnValue({
        rate: 0,
        total: 0,
        byType: {}
      });

      mockMetricsCollector.getRateLimitStats.mockReturnValue({
        hits: 0,
        total: 0,
        rate: 0
      });

      mockMetricsCollector.getCacheHitRate.mockReturnValue({
        hitRate: 0,
        hits: 0,
        misses: 0
      });

      mockMetricsCollector.getDbLatencyStats.mockReturnValue({
        p50: 0,
        p95: 0,
        p99: 0,
        average: 0,
        count: 0
      });

      mockAlertManager.getRecentAlerts.mockReturnValue([]);
      mockAlertManager.getActiveAlerts.mockReturnValue([]);

      const response = await GET(mockRequest);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.latency.global.count).toBe(0);
      expect(data.errors.global.total).toBe(0);
      expect(data.alerts.recent.length).toBe(0);
    });

    it('should handle missing alert manager gracefully', async () => {
      mockAlertManager.getRecentAlerts.mockImplementation(() => {
        throw new Error('Alert manager error');
      });

      const response = await GET(mockRequest);
      
      expect(response.status).toBe(500);
    });
  });
});

