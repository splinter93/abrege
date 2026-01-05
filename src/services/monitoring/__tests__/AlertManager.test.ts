/**
 * Tests unitaires pour AlertManager
 * 
 * Conformité GUIDE-EXCELLENCE-CODE.md : Tests >80% coverage
 * 
 * Couverture:
 * - Vérification seuils (warning/critical)
 * - Anti-spam (5 minutes)
 * - Envoi Slack/Email (mocks)
 * - Format messages
 * - getRecentAlerts / getActiveAlerts
 * - Singleton pattern
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AlertManager } from '../AlertManager';
import { metricsCollector } from '../MetricsCollector';

// Mock MetricsCollector
vi.mock('../MetricsCollector', () => {
  const mockCollector = {
    getErrorRateStats: vi.fn(),
    getLatencyStats: vi.fn(),
    getRateLimitStats: vi.fn(),
    getDbLatencyStats: vi.fn(),
    getCacheHitRate: vi.fn(),
  };
  return {
    metricsCollector: mockCollector,
    MetricsCollector: {
      getInstance: () => mockCollector,
    },
  };
});

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
  LogCategory: {
    MONITORING: 'MONITORING',
  },
}));

// Mock fetch pour Slack webhook
global.fetch = vi.fn();

describe('AlertManager', () => {
  let manager: AlertManager;
  const mockMetricsCollector = metricsCollector as {
    getErrorRateStats: ReturnType<typeof vi.fn>;
    getLatencyStats: ReturnType<typeof vi.fn>;
    getRateLimitStats: ReturnType<typeof vi.fn>;
    getDbLatencyStats: ReturnType<typeof vi.fn>;
    getCacheHitRate: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    // Reset AlertManager instance
    (AlertManager as unknown as { instance?: AlertManager }).instance = undefined;
    manager = AlertManager.getInstance();
    manager.stopChecking(); // Arrêter l'intervalle automatique
    manager.reset();
    
    // Reset fetch mock
    (global.fetch as ReturnType<typeof vi.fn>).mockClear();
    
    // Reset env vars
    delete process.env.SLACK_WEBHOOK_URL;
    delete process.env.ALERT_EMAIL_TO;
  });

  afterEach(() => {
    vi.useRealTimers();
    manager.reset();
  });

  describe('checkThresholds - Error Rate', () => {
    it('should send critical alert when error rate >= 10%', async () => {
      manager.reset(); // Reset pour éviter anti-spam
      mockMetricsCollector.getErrorRateStats.mockReturnValue({
        rate: 0.15, // 15% > 10% critical
        total: 15,
        byType: {}
      });

      await manager.checkThresholds();

      const alerts = manager.getRecentAlerts(10);
      const errorAlerts = alerts.filter(a => a.type === 'error_rate_high');
      expect(errorAlerts.length).toBeGreaterThan(0);
      expect(errorAlerts[0]?.severity).toBe('critical');
    });

    it('should send warning alert when error rate >= 5% but < 10%', async () => {
      manager.reset(); // Reset pour éviter anti-spam
      mockMetricsCollector.getErrorRateStats.mockReturnValue({
        rate: 0.07, // 7% > 5% warning, < 10% critical
        total: 7,
        byType: {}
      });

      await manager.checkThresholds();

      const alerts = manager.getRecentAlerts(10);
      const errorAlerts = alerts.filter(a => a.type === 'error_rate_high');
      expect(errorAlerts.length).toBeGreaterThan(0);
      expect(errorAlerts[0]?.severity).toBe('warning');
    });

    it('should not send alert when error rate < 5%', async () => {
      manager.reset(); // Reset pour éviter anti-spam
      mockMetricsCollector.getErrorRateStats.mockReturnValue({
        rate: 0.03, // 3% < 5% warning
        total: 3,
        byType: {}
      });

      await manager.checkThresholds();

      const alerts = manager.getRecentAlerts(10);
      const errorAlerts = alerts.filter(a => a.type === 'error_rate_high');
      expect(errorAlerts.length).toBe(0);
    });
  });

  describe('checkThresholds - Latency P95', () => {
    it('should send critical alert when latency P95 >= 20s', async () => {
      // Reset complet avant le test
      (AlertManager as unknown as { instance?: AlertManager }).instance = undefined;
      manager = AlertManager.getInstance();
      manager.stopChecking();
      manager.reset();
      
      // Configurer tous les mocks nécessaires
      mockMetricsCollector.getErrorRateStats.mockReturnValue({
        rate: 0.01, // Pas d'alerte error rate
        total: 1,
        byType: {}
      });
      mockMetricsCollector.getLatencyStats.mockReturnValue({
        p50: 5000,
        p95: 25000, // 25s > 20s critical
        p99: 30000,
        average: 10000,
        count: 100
      });
      mockMetricsCollector.getRateLimitStats.mockReturnValue({
        hits: 0,
        total: 100,
        rate: 0
      });
      mockMetricsCollector.getDbLatencyStats.mockReturnValue({
        p50: 100,
        p95: 500,
        p99: 800,
        average: 200,
        count: 100
      });
      mockMetricsCollector.getCacheHitRate.mockReturnValue({
        hitRate: 0.9,
        hits: 90,
        misses: 10
      });

      await manager.checkThresholds();

      const alerts = manager.getRecentAlerts(10);
      const latencyAlerts = alerts.filter(a => a.type === 'latency_p95_high');
      expect(latencyAlerts.length).toBeGreaterThan(0);
      expect(latencyAlerts[0]?.severity).toBe('critical');
    });

    it('should send warning alert when latency P95 >= 10s but < 20s', async () => {
      // Reset complet avant le test
      (AlertManager as unknown as { instance?: AlertManager }).instance = undefined;
      manager = AlertManager.getInstance();
      manager.stopChecking();
      manager.reset();
      
      // Configurer tous les mocks nécessaires
      mockMetricsCollector.getErrorRateStats.mockReturnValue({
        rate: 0.01,
        total: 1,
        byType: {}
      });
      mockMetricsCollector.getLatencyStats.mockReturnValue({
        p50: 5000,
        p95: 15000, // 15s > 10s warning, < 20s critical
        p99: 20000,
        average: 8000,
        count: 100
      });
      mockMetricsCollector.getRateLimitStats.mockReturnValue({
        hits: 0,
        total: 100,
        rate: 0
      });
      mockMetricsCollector.getDbLatencyStats.mockReturnValue({
        p50: 100,
        p95: 500,
        p99: 800,
        average: 200,
        count: 100
      });
      mockMetricsCollector.getCacheHitRate.mockReturnValue({
        hitRate: 0.9,
        hits: 90,
        misses: 10
      });

      await manager.checkThresholds();

      const alerts = manager.getRecentAlerts(10);
      const latencyAlerts = alerts.filter(a => a.type === 'latency_p95_high');
      expect(latencyAlerts.length).toBeGreaterThan(0);
      expect(latencyAlerts[0]?.severity).toBe('warning');
    });
  });

  describe('checkThresholds - Rate Limit', () => {
    it('should send critical alert when rate limit hits >= 20%', async () => {
      // Reset complet avant le test
      (AlertManager as unknown as { instance?: AlertManager }).instance = undefined;
      manager = AlertManager.getInstance();
      manager.stopChecking();
      manager.reset();
      
      // Configurer tous les mocks nécessaires
      mockMetricsCollector.getErrorRateStats.mockReturnValue({
        rate: 0.01,
        total: 1,
        byType: {}
      });
      mockMetricsCollector.getLatencyStats.mockReturnValue({
        p50: 100,
        p95: 5000,
        p99: 8000,
        average: 2000,
        count: 100
      });
      mockMetricsCollector.getRateLimitStats.mockReturnValue({
        hits: 25,
        total: 100,
        rate: 0.25 // 25% > 20% critical
      });
      mockMetricsCollector.getDbLatencyStats.mockReturnValue({
        p50: 100,
        p95: 500,
        p99: 800,
        average: 200,
        count: 100
      });
      mockMetricsCollector.getCacheHitRate.mockReturnValue({
        hitRate: 0.9,
        hits: 90,
        misses: 10
      });

      await manager.checkThresholds();

      const alerts = manager.getRecentAlerts(10);
      const rateLimitAlerts = alerts.filter(a => a.type === 'rate_limit_high');
      expect(rateLimitAlerts.length).toBeGreaterThan(0);
      expect(rateLimitAlerts[0]?.severity).toBe('critical');
    });

    it('should send warning alert when rate limit hits >= 10% but < 20%', async () => {
      // Reset complet avant le test
      (AlertManager as unknown as { instance?: AlertManager }).instance = undefined;
      manager = AlertManager.getInstance();
      manager.stopChecking();
      manager.reset();
      
      // Configurer tous les mocks nécessaires
      mockMetricsCollector.getErrorRateStats.mockReturnValue({
        rate: 0.01,
        total: 1,
        byType: {}
      });
      mockMetricsCollector.getLatencyStats.mockReturnValue({
        p50: 100,
        p95: 5000,
        p99: 8000,
        average: 2000,
        count: 100
      });
      mockMetricsCollector.getRateLimitStats.mockReturnValue({
        hits: 15,
        total: 100,
        rate: 0.15 // 15% > 10% warning, < 20% critical
      });
      mockMetricsCollector.getDbLatencyStats.mockReturnValue({
        p50: 100,
        p95: 500,
        p99: 800,
        average: 200,
        count: 100
      });
      mockMetricsCollector.getCacheHitRate.mockReturnValue({
        hitRate: 0.9,
        hits: 90,
        misses: 10
      });

      await manager.checkThresholds();

      const alerts = manager.getRecentAlerts(10);
      const rateLimitAlerts = alerts.filter(a => a.type === 'rate_limit_high');
      expect(rateLimitAlerts.length).toBeGreaterThan(0);
      expect(rateLimitAlerts[0]?.severity).toBe('warning');
    });
  });

  describe('checkThresholds - DB Query Latency', () => {
    it('should send critical alert when DB P95 >= 3s', async () => {
      // Reset complet avant le test
      (AlertManager as unknown as { instance?: AlertManager }).instance = undefined;
      manager = AlertManager.getInstance();
      manager.stopChecking();
      manager.reset();
      
      // Configurer tous les mocks nécessaires
      mockMetricsCollector.getErrorRateStats.mockReturnValue({
        rate: 0.01,
        total: 1,
        byType: {}
      });
      mockMetricsCollector.getLatencyStats.mockReturnValue({
        p50: 100,
        p95: 5000,
        p99: 8000,
        average: 2000,
        count: 100
      });
      mockMetricsCollector.getRateLimitStats.mockReturnValue({
        hits: 0,
        total: 100,
        rate: 0
      });
      mockMetricsCollector.getDbLatencyStats.mockReturnValue({
        p50: 500,
        p95: 3500, // 3.5s > 3s critical
        p99: 4000,
        average: 1000,
        count: 100
      });
      mockMetricsCollector.getCacheHitRate.mockReturnValue({
        hitRate: 0.9,
        hits: 90,
        misses: 10
      });

      await manager.checkThresholds();

      const alerts = manager.getRecentAlerts(10);
      const dbAlerts = alerts.filter(a => a.type === 'db_query_slow');
      expect(dbAlerts.length).toBeGreaterThan(0);
      expect(dbAlerts[0]?.severity).toBe('critical');
    });

    it('should send warning alert when DB P95 >= 1s but < 3s', async () => {
      // Reset complet avant le test
      (AlertManager as unknown as { instance?: AlertManager }).instance = undefined;
      manager = AlertManager.getInstance();
      manager.stopChecking();
      manager.reset();
      
      // Configurer tous les mocks nécessaires
      mockMetricsCollector.getErrorRateStats.mockReturnValue({
        rate: 0.01,
        total: 1,
        byType: {}
      });
      mockMetricsCollector.getLatencyStats.mockReturnValue({
        p50: 100,
        p95: 5000,
        p99: 8000,
        average: 2000,
        count: 100
      });
      mockMetricsCollector.getRateLimitStats.mockReturnValue({
        hits: 0,
        total: 100,
        rate: 0
      });
      mockMetricsCollector.getDbLatencyStats.mockReturnValue({
        p50: 500,
        p95: 1500, // 1.5s > 1s warning, < 3s critical
        p99: 2000,
        average: 800,
        count: 100
      });
      mockMetricsCollector.getCacheHitRate.mockReturnValue({
        hitRate: 0.9,
        hits: 90,
        misses: 10
      });

      await manager.checkThresholds();

      const alerts = manager.getRecentAlerts(10);
      const dbAlerts = alerts.filter(a => a.type === 'db_query_slow');
      expect(dbAlerts.length).toBeGreaterThan(0);
      expect(dbAlerts[0]?.severity).toBe('warning');
    });
  });

  describe('checkThresholds - Cache Hit Rate', () => {
    it('should send critical alert when cache hit rate <= 30%', async () => {
      // Reset complet avant le test
      (AlertManager as unknown as { instance?: AlertManager }).instance = undefined;
      manager = AlertManager.getInstance();
      manager.stopChecking();
      manager.reset();
      
      // Configurer tous les mocks nécessaires
      mockMetricsCollector.getErrorRateStats.mockReturnValue({
        rate: 0.01,
        total: 1,
        byType: {}
      });
      mockMetricsCollector.getLatencyStats.mockReturnValue({
        p50: 100,
        p95: 5000,
        p99: 8000,
        average: 2000,
        count: 100
      });
      mockMetricsCollector.getRateLimitStats.mockReturnValue({
        hits: 0,
        total: 100,
        rate: 0
      });
      mockMetricsCollector.getDbLatencyStats.mockReturnValue({
        p50: 100,
        p95: 500,
        p99: 800,
        average: 200,
        count: 100
      });
      // Premier appel pour LLM (critical)
      mockMetricsCollector.getCacheHitRate.mockReturnValueOnce({
        hitRate: 0.25, // 25% < 30% critical
        hits: 25,
        misses: 75
      });
      // Deuxième appel pour note_embed (pas d'alerte car > 30%)
      mockMetricsCollector.getCacheHitRate.mockReturnValueOnce({
        hitRate: 0.80, // 80% > 30% critical, pas d'alerte
        hits: 80,
        misses: 20
      });

      await manager.checkThresholds();

      const alerts = manager.getRecentAlerts(10);
      const cacheAlerts = alerts.filter(a => a.type === 'cache_hit_rate_low');
      expect(cacheAlerts.length).toBeGreaterThan(0);
      expect(cacheAlerts[0]?.severity).toBe('critical');
    });

    it('should send warning alert when cache hit rate <= 50% but > 30%', async () => {
      // Reset complet avant le test
      (AlertManager as unknown as { instance?: AlertManager }).instance = undefined;
      manager = AlertManager.getInstance();
      manager.stopChecking();
      manager.reset();
      
      // Configurer tous les mocks nécessaires
      mockMetricsCollector.getErrorRateStats.mockReturnValue({
        rate: 0.01,
        total: 1,
        byType: {}
      });
      mockMetricsCollector.getLatencyStats.mockReturnValue({
        p50: 100,
        p95: 5000,
        p99: 8000,
        average: 2000,
        count: 100
      });
      mockMetricsCollector.getRateLimitStats.mockReturnValue({
        hits: 0,
        total: 100,
        rate: 0
      });
      mockMetricsCollector.getDbLatencyStats.mockReturnValue({
        p50: 100,
        p95: 500,
        p99: 800,
        average: 200,
        count: 100
      });
      // Premier appel pour LLM (warning)
      mockMetricsCollector.getCacheHitRate.mockReturnValueOnce({
        hitRate: 0.40, // 40% < 50% warning, > 30% critical
        hits: 40,
        misses: 60
      });
      // Deuxième appel pour note_embed (pas d'alerte car > 50%)
      mockMetricsCollector.getCacheHitRate.mockReturnValueOnce({
        hitRate: 0.80, // 80% > 50% warning, pas d'alerte
        hits: 80,
        misses: 20
      });

      await manager.checkThresholds();

      const alerts = manager.getRecentAlerts(10);
      const cacheAlerts = alerts.filter(a => a.type === 'cache_hit_rate_low');
      expect(cacheAlerts.length).toBeGreaterThan(0);
      expect(cacheAlerts[0]?.severity).toBe('warning');
    });

    it('should check both LLM and note_embed cache types', async () => {
      // Reset complet avant le test
      (AlertManager as unknown as { instance?: AlertManager }).instance = undefined;
      manager = AlertManager.getInstance();
      manager.stopChecking();
      manager.reset();
      
      // Configurer tous les mocks nécessaires
      mockMetricsCollector.getErrorRateStats.mockReturnValue({
        rate: 0.01,
        total: 1,
        byType: {}
      });
      mockMetricsCollector.getLatencyStats.mockReturnValue({
        p50: 100,
        p95: 5000,
        p99: 8000,
        average: 2000,
        count: 100
      });
      mockMetricsCollector.getRateLimitStats.mockReturnValue({
        hits: 0,
        total: 100,
        rate: 0
      });
      mockMetricsCollector.getDbLatencyStats.mockReturnValue({
        p50: 100,
        p95: 500,
        p99: 800,
        average: 200,
        count: 100
      });
      // Premier appel pour LLM (critical)
      mockMetricsCollector.getCacheHitRate.mockReturnValueOnce({
        hitRate: 0.25, // 25% < 30% critical
        hits: 25,
        misses: 75
      });
      // Deuxième appel pour note_embed (warning car 40% < 50% warning)
      mockMetricsCollector.getCacheHitRate.mockReturnValueOnce({
        hitRate: 0.40, // 40% > 30% critical, mais < 50% warning
        hits: 40,
        misses: 60
      });

      await manager.checkThresholds();

      const alerts = manager.getRecentAlerts(10);
      const cacheAlerts = alerts.filter(a => a.type === 'cache_hit_rate_low');
      // Au moins une alerte (LLM critical ou note_embed warning)
      expect(cacheAlerts.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('sendAlert - Anti-Spam', () => {
    it('should send alert on first trigger', async () => {
      await manager.sendAlert({
        type: 'error_rate_high',
        severity: 'critical',
        value: 0.15,
        threshold: 0.10
      });

      const alerts = manager.getRecentAlerts(10);
      expect(alerts.length).toBe(1);
      expect(alerts[0]?.sent).toBe(true);
    });

    it('should suppress alert if sent within 5 minutes', async () => {
      const now = Date.now();
      vi.setSystemTime(now);

      await manager.sendAlert({
        type: 'error_rate_high',
        severity: 'critical',
        value: 0.15,
        threshold: 0.10
      });

      // Avancer de 2 minutes (toujours dans la fenêtre anti-spam)
      vi.setSystemTime(now + 2 * 60 * 1000);

      await manager.sendAlert({
        type: 'error_rate_high',
        severity: 'critical',
        value: 0.20,
        threshold: 0.10
      });

      const alerts = manager.getRecentAlerts(10);
      const errorAlerts = alerts.filter(a => a.type === 'error_rate_high');
      expect(errorAlerts.length).toBe(1); // Seulement la première
    });

    it('should allow alert after 5 minutes', async () => {
      const now = Date.now();
      vi.setSystemTime(now);

      await manager.sendAlert({
        type: 'error_rate_high',
        severity: 'critical',
        value: 0.15,
        threshold: 0.10
      });

      // Avancer de 6 minutes (hors fenêtre anti-spam)
      vi.setSystemTime(now + 6 * 60 * 1000);

      await manager.sendAlert({
        type: 'error_rate_high',
        severity: 'critical',
        value: 0.20,
        threshold: 0.10
      });

      const alerts = manager.getRecentAlerts(10);
      const errorAlerts = alerts.filter(a => a.type === 'error_rate_high');
      expect(errorAlerts.length).toBe(2); // Les deux alertes
    });
  });

  describe('sendAlert - Slack Integration', () => {
    it('should send Slack alert when webhook configured', async () => {
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        status: 200
      });

      await manager.sendAlert({
        type: 'error_rate_high',
        severity: 'critical',
        value: 0.15,
        threshold: 0.10
      });

      expect(global.fetch).toHaveBeenCalled();
      const callArgs = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(callArgs[0]).toBe('https://hooks.slack.com/test');
      expect(callArgs[1]?.method).toBe('POST');
      expect(callArgs[1]?.headers['Content-Type']).toBe('application/json');
      const body = JSON.parse(callArgs[1]?.body as string);
      // Vérifier que le message contient "CRITICAL" dans les blocks
      expect(body.blocks[0]?.text?.text).toContain('CRITICAL');
    });

    it('should not send Slack alert when webhook not configured', async () => {
      delete process.env.SLACK_WEBHOOK_URL;

      await manager.sendAlert({
        type: 'error_rate_high',
        severity: 'critical',
        value: 0.15,
        threshold: 0.10
      });

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should handle Slack webhook errors gracefully', async () => {
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Network error')
      );

      await expect(manager.sendAlert({
        type: 'error_rate_high',
        severity: 'critical',
        value: 0.15,
        threshold: 0.10
      })).resolves.not.toThrow();
    });
  });

  describe('sendAlert - Email Integration', () => {
    it('should log email alert when email configured', async () => {
      process.env.ALERT_EMAIL_TO = 'alerts@example.com';
      const { logger } = await import('@/utils/logger');

      await manager.sendAlert({
        type: 'error_rate_high',
        severity: 'critical',
        value: 0.15,
        threshold: 0.10
      });

      expect(logger.info).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('Email alert'),
        expect.objectContaining({
          to: 'alerts@example.com'
        })
      );
    });

    it('should not log email when not configured', async () => {
      delete process.env.ALERT_EMAIL_TO;
      const { logger } = await import('@/utils/logger');
      vi.clearAllMocks();

      await manager.sendAlert({
        type: 'error_rate_high',
        severity: 'critical',
        value: 0.15,
        threshold: 0.10
      });

      expect(logger.info).not.toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('Email alert'),
        expect.anything()
      );
    });
  });

  describe('formatAlertMessage', () => {
    it('should format error rate alert correctly', async () => {
      await manager.sendAlert({
        type: 'error_rate_high',
        severity: 'critical',
        value: 0.15,
        threshold: 0.10
      });

      const alerts = manager.getRecentAlerts(1);
      expect(alerts[0]?.message).toContain('Error rate');
      expect(alerts[0]?.message).toContain('15.00%');
      expect(alerts[0]?.message).toContain('10.00%');
    });

    it('should format latency alert correctly', async () => {
      await manager.sendAlert({
        type: 'latency_p95_high',
        severity: 'warning',
        value: 15000,
        threshold: 10000
      });

      const alerts = manager.getRecentAlerts(1);
      expect(alerts[0]?.message).toContain('Latency P95');
      expect(alerts[0]?.message).toContain('15000ms');
      expect(alerts[0]?.message).toContain('10000ms');
    });

    it('should format cache hit rate alert correctly', async () => {
      await manager.sendAlert({
        type: 'cache_hit_rate_low',
        severity: 'critical',
        value: 0.25,
        threshold: 0.30,
        cacheType: 'llm'
      });

      const alerts = manager.getRecentAlerts(1);
      expect(alerts[0]?.message).toContain('Cache hit rate');
      expect(alerts[0]?.message).toContain('llm');
      expect(alerts[0]?.message).toContain('25.00%');
    });
  });

  describe('getRecentAlerts', () => {
    it('should return recent alerts sorted by timestamp', async () => {
      const now = Date.now();
      vi.setSystemTime(now);

      await manager.sendAlert({
        type: 'error_rate_high',
        severity: 'critical',
        value: 0.15,
        threshold: 0.10
      });

      vi.setSystemTime(now + 1000);

      await manager.sendAlert({
        type: 'latency_p95_high',
        severity: 'warning',
        value: 15000,
        threshold: 10000
      });

      const alerts = manager.getRecentAlerts(10);
      expect(alerts.length).toBe(2);
      expect(alerts[0]?.type).toBe('latency_p95_high'); // Plus récent
      expect(alerts[1]?.type).toBe('error_rate_high');
    });

    it('should limit number of alerts returned', async () => {
      const now = Date.now();
      vi.setSystemTime(now);

      // Envoyer des alertes de types différents pour éviter l'anti-spam
      const alertTypes: Array<{ type: 'error_rate_high' | 'latency_p95_high' | 'rate_limit_high' | 'db_query_slow' | 'cache_hit_rate_low' }> = [
        'error_rate_high',
        'latency_p95_high',
        'rate_limit_high',
        'db_query_slow',
        'cache_hit_rate_low'
      ];

      for (let i = 0; i < 5; i++) {
        await manager.sendAlert({
          type: alertTypes[i]!,
          severity: 'critical',
          value: 0.15 + i,
          threshold: 0.10
        });
      }

      const alerts = manager.getRecentAlerts(3);
      expect(alerts.length).toBe(3);
    });
  });

  describe('getActiveAlerts', () => {
    it('should return alerts from last 5 minutes', async () => {
      const now = Date.now();
      vi.setSystemTime(now);

      await manager.sendAlert({
        type: 'error_rate_high',
        severity: 'critical',
        value: 0.15,
        threshold: 0.10
      });

      const activeAlerts = manager.getActiveAlerts();
      expect(activeAlerts.length).toBe(1);
    });

    it('should exclude alerts older than 5 minutes', async () => {
      const now = Date.now();
      vi.setSystemTime(now);

      await manager.sendAlert({
        type: 'error_rate_high',
        severity: 'critical',
        value: 0.15,
        threshold: 0.10
      });

      // Avancer de 6 minutes
      vi.setSystemTime(now + 6 * 60 * 1000);

      const activeAlerts = manager.getActiveAlerts();
      expect(activeAlerts.length).toBe(0);
    });
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = AlertManager.getInstance();
      const instance2 = AlertManager.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('reset', () => {
    it('should clear all alerts and last alert times', async () => {
      await manager.sendAlert({
        type: 'error_rate_high',
        severity: 'critical',
        value: 0.15,
        threshold: 0.10
      });

      expect(manager.getRecentAlerts().length).toBe(1);

      manager.reset();

      expect(manager.getRecentAlerts().length).toBe(0);
      expect(manager.getActiveAlerts().length).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle checkThresholds errors gracefully', async () => {
      mockMetricsCollector.getErrorRateStats.mockImplementation(() => {
        throw new Error('Metrics error');
      });

      await expect(manager.checkThresholds()).resolves.not.toThrow();
    });

    it('should handle sendAlert errors gracefully', async () => {
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Network error')
      );

      await expect(manager.sendAlert({
        type: 'error_rate_high',
        severity: 'critical',
        value: 0.15,
        threshold: 0.10
      })).resolves.not.toThrow();
    });
  });
});

