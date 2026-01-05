/**
 * Gestionnaire d'alertes automatiques
 * Vérifie seuils toutes les 30s et envoie alertes Slack/Email
 * Conforme GUIDE-EXCELLENCE-CODE.md : zero any, interfaces explicites, singleton
 */

import { logger, LogCategory } from '@/utils/logger';
import { metricsCollector } from './MetricsCollector';

export type AlertType = 
  | 'error_rate_high'
  | 'latency_p95_high'
  | 'rate_limit_high'
  | 'db_query_slow'
  | 'cache_hit_rate_low';

export type AlertSeverity = 'warning' | 'critical';

export interface Alert {
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  value: number;
  threshold: number;
  timestamp: number;
  sent: boolean;
}

interface AlertData {
  type: AlertType;
  severity: AlertSeverity;
  value: number;
  threshold: number;
  endpoint?: string;
  table?: string;
  cacheType?: 'llm' | 'note_embed';
}

interface Thresholds {
  warning: number;
  critical: number;
}

export class AlertManager {
  private static instance: AlertManager;
  private alerts: Alert[] = [];
  private lastAlertTime: Map<AlertType, number> = new Map();
  private checkInterval: NodeJS.Timeout | null = null;
  private readonly MAX_ALERTS = 100;
  private readonly ANTI_SPAM_MS = 5 * 60 * 1000; // 5 minutes
  private readonly CHECK_INTERVAL_MS = 30 * 1000; // 30 secondes

  private readonly THRESHOLDS: Record<AlertType, Thresholds> = {
    error_rate_high: { warning: 0.05, critical: 0.10 }, // 5% warning, 10% critical
    latency_p95_high: { warning: 10000, critical: 20000 }, // 10s warning, 20s critical (ms)
    rate_limit_high: { warning: 0.10, critical: 0.20 }, // 10% warning, 20% critical
    db_query_slow: { warning: 1000, critical: 3000 }, // 1s warning, 3s critical (ms)
    cache_hit_rate_low: { warning: 0.50, critical: 0.30 } // 50% warning, 30% critical
  };

  private constructor() {
    this.startCheckInterval();
  }

  public static getInstance(): AlertManager {
    if (!AlertManager.instance) {
      AlertManager.instance = new AlertManager();
    }
    return AlertManager.instance;
  }

  /**
   * Démarrer vérification périodique des seuils
   */
  private startCheckInterval(): void {
    this.checkInterval = setInterval(() => {
      this.checkThresholds().catch(error => {
        logger.error(LogCategory.MONITORING, '[AlertManager] Error checking thresholds', undefined, error);
      });
    }, this.CHECK_INTERVAL_MS);
  }

  /**
   * Vérifier tous les seuils
   */
  async checkThresholds(): Promise<void> {
    try {
      // 1. Error rate
      const errorStats = metricsCollector.getErrorRateStats();
      if (errorStats.rate >= this.THRESHOLDS.error_rate_high.critical) {
        await this.sendAlert({
          type: 'error_rate_high',
          severity: 'critical',
          value: errorStats.rate,
          threshold: this.THRESHOLDS.error_rate_high.critical
        });
      } else if (errorStats.rate >= this.THRESHOLDS.error_rate_high.warning) {
        await this.sendAlert({
          type: 'error_rate_high',
          severity: 'warning',
          value: errorStats.rate,
          threshold: this.THRESHOLDS.error_rate_high.warning
        });
      }

      // 2. Latency P95
      const latencyStats = metricsCollector.getLatencyStats();
      if (latencyStats.p95 >= this.THRESHOLDS.latency_p95_high.critical) {
        await this.sendAlert({
          type: 'latency_p95_high',
          severity: 'critical',
          value: latencyStats.p95,
          threshold: this.THRESHOLDS.latency_p95_high.critical
        });
      } else if (latencyStats.p95 >= this.THRESHOLDS.latency_p95_high.warning) {
        await this.sendAlert({
          type: 'latency_p95_high',
          severity: 'warning',
          value: latencyStats.p95,
          threshold: this.THRESHOLDS.latency_p95_high.warning
        });
      }

      // 3. Rate limit hits
      const rateLimitStats = metricsCollector.getRateLimitStats();
      if (rateLimitStats.rate >= this.THRESHOLDS.rate_limit_high.critical) {
        await this.sendAlert({
          type: 'rate_limit_high',
          severity: 'critical',
          value: rateLimitStats.rate,
          threshold: this.THRESHOLDS.rate_limit_high.critical
        });
      } else if (rateLimitStats.rate >= this.THRESHOLDS.rate_limit_high.warning) {
        await this.sendAlert({
          type: 'rate_limit_high',
          severity: 'warning',
          value: rateLimitStats.rate,
          threshold: this.THRESHOLDS.rate_limit_high.warning
        });
      }

      // 4. DB query latency
      const dbStats = metricsCollector.getDbLatencyStats();
      if (dbStats.p95 >= this.THRESHOLDS.db_query_slow.critical) {
        await this.sendAlert({
          type: 'db_query_slow',
          severity: 'critical',
          value: dbStats.p95,
          threshold: this.THRESHOLDS.db_query_slow.critical
        });
      } else if (dbStats.p95 >= this.THRESHOLDS.db_query_slow.warning) {
        await this.sendAlert({
          type: 'db_query_slow',
          severity: 'warning',
          value: dbStats.p95,
          threshold: this.THRESHOLDS.db_query_slow.warning
        });
      }

      // 5. Cache hit rate
      const llmCacheStats = metricsCollector.getCacheHitRate('llm');
      if (llmCacheStats.hitRate <= this.THRESHOLDS.cache_hit_rate_low.critical) {
        await this.sendAlert({
          type: 'cache_hit_rate_low',
          severity: 'critical',
          value: llmCacheStats.hitRate,
          threshold: this.THRESHOLDS.cache_hit_rate_low.critical,
          cacheType: 'llm'
        });
      } else if (llmCacheStats.hitRate <= this.THRESHOLDS.cache_hit_rate_low.warning) {
        await this.sendAlert({
          type: 'cache_hit_rate_low',
          severity: 'warning',
          value: llmCacheStats.hitRate,
          threshold: this.THRESHOLDS.cache_hit_rate_low.warning,
          cacheType: 'llm'
        });
      }

      const noteCacheStats = metricsCollector.getCacheHitRate('note_embed');
      if (noteCacheStats.hitRate <= this.THRESHOLDS.cache_hit_rate_low.critical) {
        await this.sendAlert({
          type: 'cache_hit_rate_low',
          severity: 'critical',
          value: noteCacheStats.hitRate,
          threshold: this.THRESHOLDS.cache_hit_rate_low.critical,
          cacheType: 'note_embed'
        });
      } else if (noteCacheStats.hitRate <= this.THRESHOLDS.cache_hit_rate_low.warning) {
        await this.sendAlert({
          type: 'cache_hit_rate_low',
          severity: 'warning',
          value: noteCacheStats.hitRate,
          threshold: this.THRESHOLDS.cache_hit_rate_low.warning,
          cacheType: 'note_embed'
        });
      }
    } catch (error) {
      logger.error(LogCategory.MONITORING, '[AlertManager] Error in checkThresholds', undefined, error as Error);
    }
  }

  /**
   * Envoyer une alerte
   */
  async sendAlert(data: AlertData): Promise<void> {
    try {
      // Anti-spam : vérifier si alerte récente
      const lastTime = this.lastAlertTime.get(data.type);
      const now = Date.now();
      if (lastTime && now - lastTime < this.ANTI_SPAM_MS) {
        logger.debug(LogCategory.MONITORING, `[AlertManager] Alert ${data.type} suppressed (anti-spam)`, {
          type: data.type,
          lastTime,
          now
        });
        return;
      }

      // Créer message
      const message = this.formatAlertMessage(data);
      
      // Créer alerte
      const alert: Alert = {
        type: data.type,
        severity: data.severity,
        message,
        value: data.value,
        threshold: data.threshold,
        timestamp: now,
        sent: false
      };

      // Envoyer
      await Promise.all([
        this.sendSlackAlert(alert),
        this.sendEmailAlert(alert)
      ]);

      alert.sent = true;
      this.lastAlertTime.set(data.type, now);

      // Stocker alerte
      this.alerts.push(alert);
      if (this.alerts.length > this.MAX_ALERTS) {
        this.alerts.shift();
      }

      logger.warn(LogCategory.MONITORING, `[AlertManager] Alert sent: ${data.type}`, {
        type: data.type,
        severity: data.severity,
        value: data.value,
        threshold: data.threshold
      });
    } catch (error) {
      logger.error(LogCategory.MONITORING, '[AlertManager] Error sending alert', { type: data.type }, error as Error);
    }
  }

  /**
   * Formater message d'alerte
   */
  private formatAlertMessage(data: AlertData): string {
    const severityEmoji = data.severity === 'critical' ? '🚨' : '⚠️';
    const valueFormatted = data.type.includes('rate') || data.type.includes('hit_rate')
      ? `${(data.value * 100).toFixed(2)}%`
      : data.type.includes('latency') || data.type.includes('slow')
      ? `${data.value}ms`
      : String(data.value);
    
    const thresholdFormatted = data.type.includes('rate') || data.type.includes('hit_rate')
      ? `${(data.threshold * 100).toFixed(2)}%`
      : data.type.includes('latency') || data.type.includes('slow')
      ? `${data.threshold}ms`
      : String(data.threshold);

    switch (data.type) {
      case 'error_rate_high':
        return `${severityEmoji} Error rate is ${valueFormatted} (threshold: ${thresholdFormatted})`;
      case 'latency_p95_high':
        return `${severityEmoji} Latency P95 is ${valueFormatted} (threshold: ${thresholdFormatted})`;
      case 'rate_limit_high':
        return `${severityEmoji} Rate limit hits are ${valueFormatted} (threshold: ${thresholdFormatted})`;
      case 'db_query_slow':
        return `${severityEmoji} DB query P95 is ${valueFormatted} (threshold: ${thresholdFormatted})`;
      case 'cache_hit_rate_low':
        return `${severityEmoji} Cache hit rate (${data.cacheType}) is ${valueFormatted} (threshold: ${thresholdFormatted})`;
      default:
        return `${severityEmoji} Alert: ${data.type} - ${valueFormatted} (threshold: ${thresholdFormatted})`;
    }
  }

  /**
   * Envoyer alerte Slack
   */
  private async sendSlackAlert(alert: Alert): Promise<void> {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) {
      logger.debug(LogCategory.MONITORING, '[AlertManager] Slack webhook not configured');
      return;
    }

    try {
      const payload = {
        text: alert.message,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*${alert.severity.toUpperCase()} Alert*\n${alert.message}`
            }
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `Type: ${alert.type} | Value: ${alert.value} | Threshold: ${alert.threshold} | Time: ${new Date(alert.timestamp).toISOString()}`
              }
            ]
          }
        ]
      };

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Slack webhook failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      logger.error(LogCategory.MONITORING, '[AlertManager] Error sending Slack alert', { type: alert.type }, error as Error);
    }
  }

  /**
   * Envoyer alerte Email
   */
  private async sendEmailAlert(alert: Alert): Promise<void> {
    const emailTo = process.env.ALERT_EMAIL_TO;
    if (!emailTo) {
      logger.debug(LogCategory.MONITORING, '[AlertManager] Email alert not configured');
      return;
    }

    // Pour l'instant, on log juste (peut être implémenté avec nodemailer plus tard)
    logger.info(LogCategory.MONITORING, '[AlertManager] Email alert (not implemented)', {
      to: emailTo,
      subject: `[${alert.severity.toUpperCase()}] ${alert.type}`,
      message: alert.message
    });
  }

  /**
   * Obtenir alertes récentes
   */
  getRecentAlerts(limit: number = 20): Alert[] {
    return this.alerts
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Obtenir alertes actives (non résolues)
   */
  getActiveAlerts(): Alert[] {
    const now = Date.now();
    const activeWindow = 5 * 60 * 1000; // 5 minutes
    return this.alerts
      .filter(a => now - a.timestamp < activeWindow)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Arrêter la vérification périodique (pour tests)
   */
  stopChecking(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Réinitialiser (pour tests)
   */
  reset(): void {
    this.alerts = [];
    this.lastAlertTime.clear();
    this.stopChecking();
  }
}

export const alertManager = AlertManager.getInstance();

