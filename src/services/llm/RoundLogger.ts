import { simpleLogger as logger } from '@/utils/logger';
import { v4 as uuidv4 } from 'uuid';

// 🎯 Niveaux de log pour les rounds
export enum RoundLogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

// 🎯 Types d'événements de round
export enum RoundEventType {
  ROUND_START = 'ROUND_START',
  MODEL_CALL_1 = 'MODEL_CALL_1',
  TOOL_CALLS_DETECTED = 'TOOL_CALLS_DETECTED',
  TOOL_EXECUTION_START = 'TOOL_EXECUTION_START',
  TOOL_EXECUTION_COMPLETE = 'TOOL_EXECUTION_COMPLETE',
  PERSISTENCE_START = 'PERSISTENCE_START',
  PERSISTENCE_COMPLETE = 'PERSISTENCE_COMPLETE',
  THREAD_RELOAD = 'THREAD_RELOAD',
  MODEL_CALL_2 = 'MODEL_CALL_2',
  ROUND_COMPLETE = 'ROUND_COMPLETE',
  ROUND_ERROR = 'ROUND_ERROR'
}

// 🎯 Événement de round
export interface RoundEvent {
  id: string;
  roundId: string;
  eventType: RoundEventType;
  timestamp: string;
  level: RoundLogLevel;
  message: string;
  data?: Record<string, unknown>;
  duration?: number;
  error?: string;
}

// 🎯 Métriques de round
export interface RoundMetrics {
  roundId: string;
  startTime: string;
  endTime?: string;
  totalDuration: number;
  events: RoundEvent[];
  toolCallsCount: number;
  toolExecutionDuration: number;
  persistenceDuration: number;
  modelCallDuration: number;
  errorCount: number;
  warningCount: number;
  success: boolean;
}

// 🎯 Configuration du logger
export interface RoundLoggerConfig {
  enableLogging: boolean;
  enableMetrics: boolean;
  enableSanitization: boolean;
  maxEventsPerRound: number;
  logLevel: RoundLogLevel;
  retentionDays: number;
}

/**
 * 🎯 Service de journalisation et traçabilité des rounds
 * 
 * Fonctionnalités:
 * - Traçabilité complète avec round_id et batch_id
 * - Sanitisation PII automatique
 * - Métriques de performance
 * - Rétention configurable
 * - Export des logs
 */
export class RoundLogger {
  private static instance: RoundLogger;
  private config: RoundLoggerConfig;
  private activeRounds: Map<string, RoundMetrics> = new Map();
  private eventHistory: RoundEvent[] = [];
  private sanitizationRules: Map<string, (value: unknown) => unknown> = new Map();

  private constructor(config?: Partial<RoundLoggerConfig>) {
    this.config = {
      enableLogging: true,
      enableMetrics: true,
      enableSanitization: true,
      maxEventsPerRound: 100,
      logLevel: RoundLogLevel.INFO,
      retentionDays: 30,
      ...config
    };

    this.initializeSanitizationRules();
  }

  static getInstance(config?: Partial<RoundLoggerConfig>): RoundLogger {
    if (!RoundLogger.instance) {
      RoundLogger.instance = new RoundLogger(config);
    }
    return RoundLogger.instance;
  }

  /**
   * 🎯 Démarrer un nouveau round
   */
  startRound(roundId: string, options?: { sessionId?: string; userMessage?: string }): void {
    if (!this.config.enableLogging) return;

    const metrics: RoundMetrics = {
      roundId,
      startTime: new Date().toISOString(),
      totalDuration: 0,
      events: [],
      toolCallsCount: 0,
      toolExecutionDuration: 0,
      persistenceDuration: 0,
      modelCallDuration: 0,
      errorCount: 0,
      warningCount: 0,
      success: false
    };

    this.activeRounds.set(roundId, metrics);

    this.logEvent(roundId, RoundEventType.ROUND_START, RoundLogLevel.INFO, 'Début du round', {
      sessionId: options?.sessionId,
      userMessage: this.sanitizeMessage(options?.userMessage)
    });

    logger.info(`[RoundLogger] 🚀 Round ${roundId} démarré`);
  }

  /**
   * 🎯 Enregistrer un événement de round
   */
  logEvent(
    roundId: string,
    eventType: RoundEventType,
    level: RoundLogLevel,
    message: string,
    data?: Record<string, unknown>
  ): void {
    if (!this.config.enableLogging) return;

    const event: RoundEvent = {
      id: uuidv4(),
      roundId,
      eventType,
      timestamp: new Date().toISOString(),
      level,
      message,
      data: this.sanitizeData(data) as Record<string, unknown> | undefined
    };

    // Ajouter à l'historique global
    this.eventHistory.push(event);

    // Ajouter aux métriques du round
    const roundMetrics = this.activeRounds.get(roundId);
    if (roundMetrics && roundMetrics.events.length < this.config.maxEventsPerRound) {
      roundMetrics.events.push(event);
    }

    // Log selon le niveau configuré
    this.logToConsole(event);

    // Mettre à jour les métriques
    this.updateRoundMetrics(roundId, event);
  }

  /**
   * 🔧 Enregistrer l'exécution d'un tool
   */
  logToolExecution(
    roundId: string,
    toolName: string,
    toolCallId: string,
    startTime: number,
    endTime: number,
    success: boolean,
    result?: unknown,
    error?: string
  ): void {
    const duration = endTime - startTime;

    this.logEvent(roundId, RoundEventType.TOOL_EXECUTION_COMPLETE, RoundLogLevel.INFO, 
      `Tool ${toolName} exécuté`, {
        toolName,
        toolCallId,
        duration,
        success,
        result: this.sanitizeToolResult(result),
        error: error ? this.sanitizeError(error) : undefined
      });

    // Mettre à jour les métriques
    const roundMetrics = this.activeRounds.get(roundId);
    if (roundMetrics) {
      roundMetrics.toolCallsCount++;
      roundMetrics.toolExecutionDuration += duration;
    }
  }

  /**
   * 💾 Enregistrer la persistance des tools
   */
  logToolPersistence(
    roundId: string,
    toolCount: number,
    startTime: number,
    endTime: number,
    success: boolean,
    batchId?: string,
    error?: string
  ): void {
    const duration = endTime - startTime;

    this.logEvent(roundId, RoundEventType.PERSISTENCE_COMPLETE, RoundLogLevel.INFO,
      `Persistance de ${toolCount} tools`, {
        toolCount,
        duration,
        success,
        batchId,
        error: error ? this.sanitizeError(error) : undefined
      });

    // Mettre à jour les métriques
    const roundMetrics = this.activeRounds.get(roundId);
    if (roundMetrics) {
      roundMetrics.persistenceDuration += duration;
    }
  }

  /**
   * 📞 Enregistrer un appel au modèle
   */
  logModelCall(
    roundId: string,
    callNumber: 1 | 2,
    startTime: number,
    endTime: number,
    success: boolean,
    payload?: unknown,
    response?: unknown,
    error?: string
  ): void {
    const duration = endTime - startTime;
    const eventType = callNumber === 1 ? RoundEventType.MODEL_CALL_1 : RoundEventType.MODEL_CALL_2;

    this.logEvent(roundId, eventType, RoundLogLevel.INFO,
      `Appel modèle ${callNumber}`, {
        callNumber,
        duration,
        success,
        payload: this.sanitizePayload(payload),
        response: this.sanitizeResponse(response),
        error: error ? this.sanitizeError(error) : undefined
      });

    // Mettre à jour les métriques
    const roundMetrics = this.activeRounds.get(roundId);
    if (roundMetrics) {
      roundMetrics.modelCallDuration += duration;
    }
  }

  /**
   * 🔄 Enregistrer le rechargement du thread
   */
  logThreadReload(
    roundId: string,
    startTime: number,
    endTime: number,
    success: boolean,
    messageCount: number,
    error?: string
  ): void {
    const duration = endTime - startTime;

    this.logEvent(roundId, RoundEventType.THREAD_RELOAD, RoundLogLevel.INFO,
      `Rechargement du thread`, {
        duration,
        success,
        messageCount,
        error: error ? this.sanitizeError(error) : undefined
      });
  }

  /**
   * ✅ Finaliser un round
   */
  completeRound(roundId: string, success: boolean, error?: string): RoundMetrics | null {
    if (!this.config.enableLogging) return null;

    const roundMetrics = this.activeRounds.get(roundId);
    if (!roundMetrics) return null;

    const endTime = new Date().toISOString();
    const startTime = new Date(roundMetrics.startTime);
    const totalDuration = new Date(endTime).getTime() - startTime.getTime();

    // Mettre à jour les métriques finales
    roundMetrics.endTime = endTime;
    roundMetrics.totalDuration = totalDuration;
    roundMetrics.success = success;

    // Enregistrer l'événement de fin
    this.logEvent(roundId, 
      success ? RoundEventType.ROUND_COMPLETE : RoundEventType.ROUND_ERROR,
      success ? RoundLogLevel.INFO : RoundLogLevel.ERROR,
      success ? 'Round terminé avec succès' : 'Round terminé avec erreur',
      { error: error ? this.sanitizeError(error) : undefined }
    );

    // Log de résumé
    this.logRoundSummary(roundMetrics);

    // Retirer du round actif
    this.activeRounds.delete(roundId);

    return roundMetrics;
  }

  /**
   * 📊 Obtenir les métriques d'un round
   */
  getRoundMetrics(roundId: string): RoundMetrics | null {
    return this.activeRounds.get(roundId) || null;
  }

  /**
   * 📊 Obtenir les statistiques globales
   */
  getGlobalStats(): {
    activeRounds: number;
    totalEvents: number;
    totalRounds: number;
    averageRoundDuration: number;
    errorRate: number;
  } {
    const activeRounds = this.activeRounds.size;
    const totalEvents = this.eventHistory.length;
    
    // Calculer les statistiques des rounds terminés
    const completedRounds = this.eventHistory
      .filter(e => e.eventType === RoundEventType.ROUND_COMPLETE || e.eventType === RoundEventType.ROUND_ERROR)
      .map(e => e.roundId);
    
    const uniqueCompletedRounds = new Set(completedRounds).size;
    
    // Calculer la durée moyenne des rounds
    const roundDurations = Array.from(this.activeRounds.values())
      .map(r => r.totalDuration)
      .filter(d => d > 0);
    
    const averageRoundDuration = roundDurations.length > 0 
      ? roundDurations.reduce((a, b) => a + b, 0) / roundDurations.length 
      : 0;

    // Calculer le taux d'erreur
    const errorEvents = this.eventHistory.filter(e => e.level === RoundLogLevel.ERROR).length;
    const errorRate = totalEvents > 0 ? errorEvents / totalEvents : 0;

    return {
      activeRounds,
      totalEvents,
      totalRounds: uniqueCompletedRounds,
      averageRoundDuration,
      errorRate
    };
  }

  /**
   * 📤 Exporter les logs d'un round
   */
  exportRoundLogs(roundId: string, format: 'json' | 'text' = 'json'): string | null {
    const roundMetrics = this.activeRounds.get(roundId);
    if (!roundMetrics) return null;

    if (format === 'json') {
      return JSON.stringify(roundMetrics, null, 2);
    } else {
      return this.formatRoundLogsAsText(roundMetrics);
    }
  }

  /**
   * 🧹 Nettoyer les anciens événements
   */
  cleanupOldEvents(): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);

    this.eventHistory = this.eventHistory.filter(event => 
      new Date(event.timestamp) > cutoffDate
    );

    logger.info(`[RoundLogger] 🧹 Nettoyage des événements antérieurs à ${cutoffDate.toISOString()}`);
  }

  /**
   * 🔧 Initialiser les règles de sanitisation
   */
  private initializeSanitizationRules(): void {
    // Règles pour les messages utilisateur
    this.sanitizationRules.set('userMessage', (value: unknown) => {
      if (typeof value !== 'string') return value;
      return value.length > 100 ? `${value.substring(0, 100)}...` : value;
    });

    // Règles pour les payloads API
    this.sanitizationRules.set('payload', (value: unknown) => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
      
      const sanitized = { ...(value as Record<string, unknown>) };
      
      // Supprimer les clés sensibles
      ['api_key', 'authorization', 'token', 'password'].forEach(key => {
        if (sanitized[key]) delete sanitized[key];
      });
      
      // Limiter la taille des messages
      if (sanitized.messages && Array.isArray(sanitized.messages)) {
        sanitized.messages = sanitized.messages.map((msg: unknown) => {
          if (typeof msg !== 'object' || !msg) return msg;
          const message = msg as Record<string, unknown>;
          const content = message.content;
          return {
            ...message,
            content: typeof content === 'string'
              ? `${content.substring(0, 200)}${content.length > 200 ? '...' : ''}` 
              : content
          };
        });
      }
      
      return sanitized;
    });

    // Règles pour les réponses API
    this.sanitizationRules.set('response', (value: unknown) => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
      
      const sanitized = { ...(value as Record<string, unknown>) };
      
      // Limiter la taille du contenu
      if (typeof sanitized.content === 'string') {
        sanitized.content = `${sanitized.content.substring(0, 200)}${sanitized.content.length > 200 ? '...' : ''}`;
      }
      
      // Limiter la taille des tool calls
      if (sanitized.tool_calls && Array.isArray(sanitized.tool_calls)) {
        sanitized.tool_calls = sanitized.tool_calls.map((tc: unknown) => {
          if (typeof tc !== 'object' || !tc) return tc;
          const toolCall = tc as Record<string, unknown>;
          const funcObj = toolCall.function as Record<string, unknown> | undefined;
          
          return {
            ...toolCall,
            function: funcObj ? {
              ...funcObj,
              arguments: typeof funcObj.arguments === 'string'
                ? `${funcObj.arguments.substring(0, 100)}${funcObj.arguments.length > 100 ? '...' : ''}` 
                : funcObj.arguments
            } : funcObj
          };
        });
      }
      
      return sanitized;
    });
  }

  /**
   * 🧹 Sanitiser les données selon les règles
   */
  private sanitizeData(data: unknown): unknown {
    if (!this.config.enableSanitization || !data) return data;

    try {
      // Appliquer les règles de sanitisation selon le type de données
      if (typeof data === 'string') {
        return data.length > 500 ? `${data.substring(0, 500)}...` : data;
      }
      
      if (typeof data === 'object' && !Array.isArray(data)) {
        const sanitized: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
          sanitized[key] = this.sanitizeData(value);
        }
        return sanitized;
      }
      
      return data;
    } catch {
      return '[Erreur de sanitisation]';
    }
  }

  /**
   * 🧹 Sanitiser un message utilisateur
   */
  private sanitizeMessage(message?: string): string | undefined {
    if (!message) return message;
    const sanitized = this.sanitizationRules.get('userMessage')?.(message);
    return typeof sanitized === 'string' ? sanitized : message;
  }

  /**
   * 🧹 Sanitiser un payload API
   */
  private sanitizePayload(payload?: unknown): unknown {
    if (!payload) return payload;
    return this.sanitizationRules.get('payload')?.(payload) || payload;
  }

  /**
   * 🧹 Sanitiser une réponse API
   */
  private sanitizeResponse(response?: unknown): unknown {
    if (!response) return response;
    return this.sanitizationRules.get('response')?.(response) || response;
  }

  /**
   * 🧹 Sanitiser un résultat de tool
   */
  private sanitizeToolResult(result?: unknown): unknown {
    if (!result) return result;
    
    try {
      if (typeof result !== 'object' || Array.isArray(result)) return result;
      
      const sanitized = { ...(result as Record<string, unknown>) };
      
      // Supprimer les données sensibles
      ['token', 'api_key', 'password', 'secret'].forEach(key => {
        if (sanitized[key]) delete sanitized[key];
      });
      
      // Limiter la taille des données
      if (sanitized.data && typeof sanitized.data === 'string') {
        sanitized.data = sanitized.data.length > 200 ? `${sanitized.data.substring(0, 200)}...` : sanitized.data;
      }
      
      return sanitized;
    } catch {
      return '[Erreur de sanitisation]';
    }
  }

  /**
   * 🧹 Sanitiser une erreur
   */
  private sanitizeError(error?: string): string | undefined {
    if (!error) return error;
    
    // Supprimer les informations sensibles des erreurs
    const sensitivePatterns = [
      /api_key[=:]\s*[^\s,}]+/gi,
      /token[=:]\s*[^\s,}]+/gi,
      /password[=:]\s*[^\s,}]+/gi,
      /secret[=:]\s*[^\s,}]+/gi
    ];
    
    let sanitized = error;
    sensitivePatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '$1: [REDACTED]');
    });
    
    return sanitized;
  }

  /**
   * 📝 Log vers la console selon le niveau configuré
   */
  private logToConsole(event: RoundEvent): void {
    if (this.getLogLevelPriority(event.level) < this.getLogLevelPriority(this.config.logLevel)) {
      return;
    }

    const prefix = `[RoundLogger:${event.roundId}]`;
    const message = `${event.eventType}: ${event.message}`;

    switch (event.level) {
      case RoundLogLevel.DEBUG:
        logger.dev(`${prefix} ${message}`);
        break;
      case RoundLogLevel.INFO:
        logger.info(`${prefix} ${message}`);
        break;
      case RoundLogLevel.WARN:
        logger.warn(`${prefix} ${message}`);
        break;
      case RoundLogLevel.ERROR:
        logger.error(`${prefix} ${message}`);
        break;
    }
  }

  /**
   * 🔢 Obtenir la priorité numérique d'un niveau de log
   */
  private getLogLevelPriority(level: RoundLogLevel): number {
    const priorities = {
      [RoundLogLevel.DEBUG]: 0,
      [RoundLogLevel.INFO]: 1,
      [RoundLogLevel.WARN]: 2,
      [RoundLogLevel.ERROR]: 3
    };
    return priorities[level] || 0;
  }

  /**
   * 📊 Mettre à jour les métriques d'un round
   */
  private updateRoundMetrics(roundId: string, event: RoundEvent): void {
    const roundMetrics = this.activeRounds.get(roundId);
    if (!roundMetrics) return;

    // Compter les erreurs et warnings
    if (event.level === RoundLogLevel.ERROR) {
      roundMetrics.errorCount++;
    } else if (event.level === RoundLogLevel.WARN) {
      roundMetrics.warningCount++;
    }
  }

  /**
   * 📝 Log du résumé d'un round
   */
  private logRoundSummary(metrics: RoundMetrics): void {
    const successIcon = metrics.success ? '✅' : '❌';
    const duration = metrics.totalDuration;
    
    logger.info(`[RoundLogger] ${successIcon} Round ${metrics.roundId} terminé en ${duration}ms`);
    logger.info(`[RoundLogger] 📊 Résumé: ${metrics.toolCallsCount} tools, ${metrics.events.length} événements`);
    
    if (metrics.errorCount > 0) {
      logger.warn(`[RoundLogger] ⚠️ ${metrics.errorCount} erreurs détectées`);
    }
  }

  /**
   * 📝 Formater les logs d'un round en texte
   */
  private formatRoundLogsAsText(metrics: RoundMetrics): string {
    const lines: string[] = [];
    
    lines.push(`=== ROUND ${metrics.roundId} ===`);
    lines.push(`Début: ${metrics.startTime}`);
    lines.push(`Fin: ${metrics.endTime || 'En cours'}`);
    lines.push(`Durée: ${metrics.totalDuration}ms`);
    lines.push(`Succès: ${metrics.success ? 'Oui' : 'Non'}`);
    lines.push('');
    
    lines.push('=== MÉTRIQUES ===');
    lines.push(`Tool calls: ${metrics.toolCallsCount}`);
    lines.push(`Durée exécution tools: ${metrics.toolExecutionDuration}ms`);
    lines.push(`Durée persistance: ${metrics.persistenceDuration}ms`);
    lines.push(`Durée appels modèle: ${metrics.modelCallDuration}ms`);
    lines.push(`Erreurs: ${metrics.errorCount}`);
    lines.push(`Warnings: ${metrics.warningCount}`);
    lines.push('');
    
    lines.push('=== ÉVÉNEMENTS ===');
    metrics.events.forEach((event, index) => {
      const timestamp = new Date(event.timestamp).toLocaleTimeString();
      lines.push(`${index + 1}. [${timestamp}] ${event.eventType}: ${event.message}`);
      if (event.data) {
        lines.push(`   Données: ${JSON.stringify(event.data, null, 2)}`);
      }
    });
    
    return lines.join('\n');
  }
} 