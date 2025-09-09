/**
 * 🔄 UnifiedRealtimeService - Service Realtime Unifié et Robuste
 * 
 * Service unifié qui remplace RealtimeEditorService et DatabaseRealtimeService
 * avec une architecture robuste, une gestion d'erreurs avancée et une reconnexion intelligente.
 */

import { RealtimeChannel, RealtimeClient } from '@supabase/supabase-js';
import { supabase } from '@/supabaseClient';
import { logger, LogCategory } from '@/utils/logger';
import { handleRealtimeEvent } from '@/realtime/dispatcher';

// Constantes de configuration
const REALTIME_CONFIG = {
  CIRCUIT_BREAKER_THRESHOLD: 5,
  CIRCUIT_BREAKER_TIMEOUT: 60000, // 1 minute
  MAX_RECONNECT_ATTEMPTS: 20,
  HEARTBEAT_INTERVAL: 60000, // 1 minute
  AUTH_CHECK_INTERVAL: 300000, // 5 minutes
  UPTIME_UPDATE_INTERVAL: 1000, // 1 seconde
  DEFAULT_RECONNECT_DELAY: 1000,
  MAX_RECONNECT_DELAY: 30000,
  CONNECTION_TIMEOUT: 10000 // 10 secondes
} as const;

// Types pour la configuration et l'état
export interface UnifiedRealtimeConfig {
  userId: string;
  noteId?: string; // Optionnel pour les connexions générales
  debug?: boolean;
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
  heartbeatInterval?: number;
  connectionTimeout?: number;
}

export interface UnifiedRealtimeState {
  isConnected: boolean;
  isConnecting: boolean;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error' | 'reconnecting';
  lastError: string | null;
  reconnectAttempts: number;
  lastActivity: number;
  channels: Set<string>;
  uptime: number;
  connectionStartTime: number | null;
}

export interface UnifiedRealtimeEvent<T = unknown> {
  type: string;
  payload: T;
  timestamp: number;
  source: 'database' | 'editor' | 'system';
  channel: string;
}

// Interface pour les métriques de performance
interface RealtimeMetrics {
  connectionAttempts: number;
  successfulConnections: number;
  failedConnections: number;
  averageConnectionTime: number;
  totalReconnectAttempts: number;
  lastConnectionTime: number | null;
  eventsProcessed: number;
  errorsCount: number;
}

// Circuit breaker pour éviter les reconnexions en boucle
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private readonly threshold = REALTIME_CONFIG.CIRCUIT_BREAKER_THRESHOLD;
  private readonly timeout = REALTIME_CONFIG.CIRCUIT_BREAKER_TIMEOUT;

  canAttempt(): boolean {
    const now = Date.now();
    
    if (this.state === 'CLOSED') return true;
    
    if (this.state === 'OPEN') {
      if (now - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
        return true;
      }
      return false;
    }
    
    // HALF_OPEN - permet une tentative
    return true;
  }

  recordSuccess(): void {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  recordFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
    }
  }
}

// Backoff avec jitter pour éviter les reconnexions simultanées
class ExponentialBackoff {
  private baseDelay: number;
  private maxDelay: number;
  private jitter: boolean;

  constructor(
    baseDelay = REALTIME_CONFIG.DEFAULT_RECONNECT_DELAY, 
    maxDelay = REALTIME_CONFIG.MAX_RECONNECT_DELAY, 
    jitter = true
  ) {
    this.baseDelay = baseDelay;
    this.maxDelay = maxDelay;
    this.jitter = jitter;
  }

  getDelay(attempt: number): number {
    const exponentialDelay = this.baseDelay * Math.pow(2, attempt - 1);
    const delay = Math.min(exponentialDelay, this.maxDelay);
    
    if (this.jitter) {
      // Ajouter du jitter aléatoire (±25%)
      const jitterRange = delay * 0.25;
      const jitter = (Math.random() - 0.5) * 2 * jitterRange;
      return Math.max(100, delay + jitter);
    }
    
    return delay;
  }
}

/**
 * Service Realtime Unifié et Robuste
 */
export class UnifiedRealtimeService {
  private static instance: UnifiedRealtimeService | null = null;
  
  // Configuration et état
  private config: UnifiedRealtimeConfig | null = null;
  private state: UnifiedRealtimeState = {
    isConnected: false,
    isConnecting: false,
    connectionStatus: 'disconnected',
    lastError: null,
    reconnectAttempts: 0,
    lastActivity: 0,
    channels: new Set(),
    uptime: 0,
    connectionStartTime: null
  };

  // Connexions et timers
  private channels: Map<string, RealtimeChannel> = new Map();
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private uptimeTimer: NodeJS.Timeout | null = null;
  private visibilityHandler: (() => void) | null = null;

  // Gestionnaires avancés
  private circuitBreaker = new CircuitBreaker();
  private backoff = new ExponentialBackoff();
  private authCheckTimer: NodeJS.Timeout | null = null;

  // Métriques de performance
  private metrics: RealtimeMetrics = {
    connectionAttempts: 0,
    successfulConnections: 0,
    failedConnections: 0,
    averageConnectionTime: 0,
    totalReconnectAttempts: 0,
    lastConnectionTime: null,
    eventsProcessed: 0,
    errorsCount: 0
  };

  // Callbacks
  private onStateChangeCallbacks: Set<(state: UnifiedRealtimeState) => void> = new Set();
  private onEventCallbacks: Set<(event: UnifiedRealtimeEvent<unknown>) => void> = new Set();

  private constructor() {
    this.setupVisibilityHandler();
    this.startUptimeTracking();
  }

  /**
   * Singleton pattern
   */
  public static getInstance(): UnifiedRealtimeService {
    if (!UnifiedRealtimeService.instance) {
      UnifiedRealtimeService.instance = new UnifiedRealtimeService();
    }
    return UnifiedRealtimeService.instance;
  }

  /**
   * Vérifie si le service est correctement initialisé
   */
  public isInitialized(): boolean {
    return this.config !== null && this.config.userId !== undefined && this.config.userId !== '';
  }

  /**
   * Vérifie si le service est disponible pour les opérations
   */
  public isAvailable(): boolean {
    return this.isInitialized() && this.state.connectionStatus !== 'error';
  }

  /**
   * Obtient des informations de débogage sur l'état du service
   */
  public getDebugInfo(): {
    isInitialized: boolean;
    isAvailable: boolean;
    config: UnifiedRealtimeConfig | null;
    state: UnifiedRealtimeState;
    metrics: RealtimeMetrics;
    channelsCount: number;
    callbacksCount: {
      stateChange: number;
      events: number;
    };
  } {
    return {
      isInitialized: this.isInitialized(),
      isAvailable: this.isAvailable(),
      config: this.config ? { ...this.config } : null,
      state: { ...this.state },
      metrics: { ...this.metrics },
      channelsCount: this.channels.size,
      callbacksCount: {
        stateChange: this.onStateChangeCallbacks.size,
        events: this.onEventCallbacks.size
      }
    };
  }

  /**
   * Initialise le service avec une configuration
   */
  public async initialize(config: UnifiedRealtimeConfig): Promise<void> {
    try {
      // Validation des paramètres
      if (!config || typeof config !== 'object') {
        throw new Error('Configuration invalide');
      }
      
      if (!config.userId || typeof config.userId !== 'string' || config.userId.trim() === '' || config.userId === 'anonymous') {
        throw new Error('userId est requis et doit être une chaîne non vide (pas "anonymous")');
      }

      // Si déjà initialisé avec le même utilisateur, ne pas réinitialiser
      if (this.config && this.config.userId === config.userId) {
        logger.info(LogCategory.EDITOR, '[UnifiedRealtime] Service déjà initialisé pour cet utilisateur');
        return;
      }

      // Si changement d'utilisateur, nettoyer d'abord
      if (this.config && this.config.userId !== config.userId) {
        logger.info(LogCategory.EDITOR, '[UnifiedRealtime] Changement d\'utilisateur, nettoyage de l\'ancien service');
        try {
          await this.disconnect();
        } catch (disconnectError) {
          logger.warn(LogCategory.EDITOR, '[UnifiedRealtime] Erreur lors du nettoyage de l\'ancien service:', disconnectError);
          // Continuer malgré l'erreur de déconnexion
        }
      }

      this.config = {
        debug: false,
        autoReconnect: true,
        maxReconnectAttempts: REALTIME_CONFIG.MAX_RECONNECT_ATTEMPTS,
        reconnectDelay: REALTIME_CONFIG.DEFAULT_RECONNECT_DELAY,
        heartbeatInterval: REALTIME_CONFIG.HEARTBEAT_INTERVAL,
        connectionTimeout: REALTIME_CONFIG.CONNECTION_TIMEOUT,
        ...config
      };

      logger.info(LogCategory.EDITOR, '[UnifiedRealtime] Initialisation du service', {
        userId: config.userId,
        noteId: config.noteId,
        debug: this.config.debug
      });

      await this.connect();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(LogCategory.EDITOR, '[UnifiedRealtime] ❌ Erreur d\'initialisation du service:', {
        error: errorMessage,
        userId: config?.userId,
        noteId: config?.noteId
      });
      
      // Mettre à jour l'état d'erreur
      this.updateState({
        isConnected: false,
        isConnecting: false,
        connectionStatus: 'error',
        lastError: errorMessage,
        reconnectAttempts: 0
      });
      
      throw error; // Re-throw pour que le hook puisse gérer l'erreur
    }
  }

  /**
   * Établit la connexion Realtime
   */
  private async connect(): Promise<void> {
    if (!this.config) {
      throw new Error('Service non initialisé');
    }

    if (this.state.isConnecting || this.state.isConnected) {
      logger.warn(LogCategory.EDITOR, '[UnifiedRealtime] Connexion déjà en cours ou établie');
      return;
    }

    // Vérifier le circuit breaker
    if (!this.circuitBreaker.canAttempt()) {
      logger.warn(LogCategory.EDITOR, '[UnifiedRealtime] Circuit breaker ouvert - reconnexion bloquée');
      return;
    }

    const connectionStartTime = Date.now();
    this.metrics.connectionAttempts++;
    this.metrics.lastConnectionTime = connectionStartTime;

    this.updateState({
      isConnecting: true,
      connectionStatus: 'connecting',
      lastError: null
    });

    try {
      // Vérifier l'authentification de manière robuste
      try {
        await this.ensureAuthenticated();
      } catch (authError) {
        const authErrorMessage = authError instanceof Error ? authError.message : String(authError);
        logger.error(LogCategory.EDITOR, '[UnifiedRealtime] ❌ Erreur d\'authentification:', authErrorMessage);
        throw new Error(`Authentification échouée: ${authErrorMessage}`);
      }

      // Nettoyer les anciennes connexions
      try {
        await this.cleanupChannels();
      } catch (cleanupError) {
        logger.warn(LogCategory.EDITOR, '[UnifiedRealtime] ⚠️ Erreur lors du nettoyage des canaux:', cleanupError);
        // Continuer malgré l'erreur de nettoyage
      }

      // Créer les canaux nécessaires
      try {
        await this.createChannels();
      } catch (channelError) {
        const channelErrorMessage = channelError instanceof Error ? channelError.message : String(channelError);
        logger.error(LogCategory.EDITOR, '[UnifiedRealtime] ❌ Erreur lors de la création des canaux:', channelErrorMessage);
        throw new Error(`Création des canaux échouée: ${channelErrorMessage}`);
      }

      // Démarrer le monitoring
      try {
        this.startHeartbeat();
        this.startAuthMonitoring();
      } catch (monitoringError) {
        logger.warn(LogCategory.EDITOR, '[UnifiedRealtime] ⚠️ Erreur lors du démarrage du monitoring:', monitoringError);
        // Continuer malgré l'erreur de monitoring
      }

      this.circuitBreaker.recordSuccess();
      
      // Calculer le temps de connexion
      const connectionTime = Date.now() - connectionStartTime;
      this.metrics.successfulConnections++;
      this.metrics.averageConnectionTime = 
        (this.metrics.averageConnectionTime * (this.metrics.successfulConnections - 1) + connectionTime) / 
        this.metrics.successfulConnections;
      
      this.updateState({
        isConnected: true,
        isConnecting: false,
        connectionStatus: 'connected',
        reconnectAttempts: 0,
        lastActivity: Date.now(),
        connectionStartTime: Date.now()
      });

      logger.info(LogCategory.EDITOR, '[UnifiedRealtime] ✅ Connexion établie avec succès', {
        connectionTime: `${connectionTime}ms`,
        totalAttempts: this.metrics.connectionAttempts
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      this.metrics.failedConnections++;
      this.metrics.errorsCount++;
      
      logger.error(LogCategory.EDITOR, '[UnifiedRealtime] ❌ Erreur de connexion:', {
        error: errorMessage,
        userId: this.config?.userId,
        attempt: this.state.reconnectAttempts + 1,
        totalFailures: this.metrics.failedConnections
      });
      
      this.circuitBreaker.recordFailure();
      
      this.updateState({
        isConnected: false,
        isConnecting: false,
        connectionStatus: 'error',
        lastError: errorMessage
      });

      this.scheduleReconnect();
    }
  }

  /**
   * Vérifie et assure l'authentification
   */
  private async ensureAuthenticated(): Promise<void> {
    if (!this.config) return;

    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError) {
      throw new Error(`Erreur d'authentification: ${authError.message}`);
    }
    
    if (!session) {
      throw new Error('Aucune session authentifiée - Realtime nécessite une authentification');
    }

    if (this.config.debug) {
      logger.info(LogCategory.EDITOR, '[UnifiedRealtime] Session authentifiée:', {
        userId: session.user.id,
        email: session.user.email,
        expiresAt: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'unknown'
      });
    }
  }

  /**
   * Crée les canaux Realtime nécessaires
   */
  private async createChannels(): Promise<void> {
    if (!this.config) return;

    // Canal pour les changements de base de données (articles)
    const dbChannelName = `database:${this.config.userId}`;
    const dbChannel = supabase
      .channel(dbChannelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'articles',
          filter: `user_id=eq.${this.config.userId}`
        },
        (payload) => {
          this.handleDatabaseEvent(payload, dbChannelName);
        }
      );

    // Canal pour l'éditeur (si noteId fourni)
    if (this.config.noteId) {
      const editorChannelName = `editor:${this.config.noteId}:${this.config.userId}`;
      const editorChannel = supabase
        .channel(editorChannelName, {
          config: {
            broadcast: { self: false },
            presence: { key: this.config.userId }
          }
        })
        .on('broadcast', { event: 'editor_update' }, (payload) => {
          this.handleEditorEvent({ event: 'editor_update', payload }, editorChannelName);
        })
        .on('broadcast', { event: 'editor_insert' }, (payload) => {
          this.handleEditorEvent({ event: 'editor_insert', payload }, editorChannelName);
        })
        .on('broadcast', { event: 'editor_delete' }, (payload) => {
          this.handleEditorEvent({ event: 'editor_delete', payload }, editorChannelName);
        })
        .on('presence', { event: 'sync' }, () => {
          this.updateState({ lastActivity: Date.now() });
        });

      this.channels.set(editorChannelName, editorChannel);
    }

    this.channels.set(dbChannelName, dbChannel);

    // S'abonner à tous les canaux
    for (const [channelName, channel] of this.channels) {
      try {
        const response = await channel.subscribe((status) => {
          this.handleChannelStatus(channelName, status);
        });

        if (this.config.debug) {
          logger.info(LogCategory.EDITOR, '[UnifiedRealtime] Canal créé:', {
            channelName,
            status: response
          });
        }
      } catch (error) {
        logger.error(LogCategory.EDITOR, '[UnifiedRealtime] Erreur création canal:', {
          channelName,
          error: error instanceof Error ? error.message : String(error)
        });
        throw error;
      }
    }
  }

  /**
   * Gère les événements de base de données
   */
  private handleDatabaseEvent(payload: Record<string, unknown>, channelName: string): void {
    if (!this.config) return;

    this.updateState({ lastActivity: Date.now() });
    this.metrics.eventsProcessed++;

    if (this.config.debug) {
      logger.info(LogCategory.EDITOR, '[UnifiedRealtime] Événement base de données:', {
        channel: channelName,
        eventType: payload.eventType,
        table: payload.table
      });
    }

    // Convertir en événement unifié
    const event: UnifiedRealtimeEvent<Record<string, unknown>> = {
      type: `database.${String(payload.eventType || 'unknown').toLowerCase()}`,
      payload: payload,
      timestamp: Date.now(),
      source: 'database',
      channel: channelName
    };

    // Dispatcher vers le store
    handleRealtimeEvent(event, this.config.debug);

    // Notifier les callbacks
    this.notifyEventCallbacks(event);
  }

  /**
   * Gère les événements d'éditeur
   */
  private handleEditorEvent(payload: { event: string; payload: unknown }, channelName: string): void {
    if (!this.config) return;

    this.updateState({ lastActivity: Date.now() });
    this.metrics.eventsProcessed++;

    if (this.config.debug) {
      logger.info(LogCategory.EDITOR, '[UnifiedRealtime] Événement éditeur:', {
        channel: channelName,
        event: payload.event,
        payload: payload.payload
      });
    }

    // Convertir en événement unifié
    const event: UnifiedRealtimeEvent<unknown> = {
      type: `editor.${payload.event}`,
      payload: payload.payload,
      timestamp: Date.now(),
      source: 'editor',
      channel: channelName
    };

    // Dispatcher vers le store
    handleRealtimeEvent(event, this.config.debug);

    // Notifier les callbacks
    this.notifyEventCallbacks(event);
  }

  /**
   * Gère le statut des canaux
   */
  private handleChannelStatus(channelName: string, status: string): void {
    if (this.config?.debug) {
      logger.info(LogCategory.EDITOR, '[UnifiedRealtime] Statut canal:', { channelName, status });
    }

    switch (status) {
      case 'SUBSCRIBED':
      case 'joined':
        this.state.channels.add(channelName);
        this.updateState({ channels: new Set(this.state.channels) });
        break;

      case 'CHANNEL_ERROR':
      case 'TIMED_OUT':
      case 'CLOSED':
      case 'left':
      case 'error':
        this.state.channels.delete(channelName);
        this.updateState({ 
          channels: new Set(this.state.channels),
          connectionStatus: 'error',
          lastError: `Canal fermé: ${channelName} (${status})`
        });
        
        if (this.state.channels.size === 0) {
          this.scheduleReconnect();
        }
        break;

      case 'joining':
        // En cours de connexion
        break;

      default:
        logger.warn(LogCategory.EDITOR, '[UnifiedRealtime] Statut inconnu:', { channelName, status });
    }
  }

  /**
   * Programme une reconnexion intelligente
   */
  private scheduleReconnect(): void {
    if (!this.config?.autoReconnect) return;
    if (this.reconnectTimer) return;

    const attempts = this.state.reconnectAttempts + 1;
    this.metrics.totalReconnectAttempts++;
    
    if (attempts > (this.config.maxReconnectAttempts || REALTIME_CONFIG.MAX_RECONNECT_ATTEMPTS)) {
      logger.error(LogCategory.EDITOR, '[UnifiedRealtime] ❌ Nombre maximum de tentatives de reconnexion atteint', {
        attempts,
        maxAttempts: this.config.maxReconnectAttempts || REALTIME_CONFIG.MAX_RECONNECT_ATTEMPTS,
        totalReconnectAttempts: this.metrics.totalReconnectAttempts
      });
      this.updateState({ connectionStatus: 'error' });
      return;
    }

    const delay = this.backoff.getDelay(attempts);
    
    logger.info(LogCategory.EDITOR, '[UnifiedRealtime] 🔄 Reconnexion programmée', {
      attempt: attempts,
      delay: `${Math.round(delay)}ms`,
      maxAttempts: this.config.maxReconnectAttempts,
      totalReconnectAttempts: this.metrics.totalReconnectAttempts
    });

    this.updateState({ 
      reconnectAttempts: attempts,
      connectionStatus: 'reconnecting'
    });

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      await this.connect();
    }, delay);
  }

  /**
   * Démarre le heartbeat pour maintenir la connexion
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    
    const interval = this.config?.heartbeatInterval || REALTIME_CONFIG.HEARTBEAT_INTERVAL;
    
    this.heartbeatTimer = setInterval(() => {
      if (this.state.isConnected && this.channels.size > 0) {
        // Envoyer un ping sur le premier canal disponible
        const firstChannel = this.channels.values().next().value;
        if (firstChannel) {
          firstChannel.send({
            type: 'broadcast',
            event: 'heartbeat',
            payload: { timestamp: Date.now() }
          });
        }
      }
    }, interval);
  }

  /**
   * Arrête le heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Démarre le monitoring de l'authentification
   */
  private startAuthMonitoring(): void {
    this.stopAuthMonitoring();
    
    // Vérifier l'auth périodiquement
    this.authCheckTimer = setInterval(async () => {
      try {
        await this.ensureAuthenticated();
      } catch (error) {
        logger.warn(LogCategory.EDITOR, '[UnifiedRealtime] Session expirée, reconnexion...');
        await this.reconnect();
      }
    }, REALTIME_CONFIG.AUTH_CHECK_INTERVAL);
  }

  /**
   * Arrête le monitoring de l'authentification
   */
  private stopAuthMonitoring(): void {
    if (this.authCheckTimer) {
      clearInterval(this.authCheckTimer);
      this.authCheckTimer = null;
    }
  }

  /**
   * Démarre le tracking de l'uptime
   */
  private startUptimeTracking(): void {
    this.uptimeTimer = setInterval(() => {
      if (this.state.connectionStartTime) {
        this.updateState({
          uptime: Date.now() - this.state.connectionStartTime
        });
      }
    }, REALTIME_CONFIG.UPTIME_UPDATE_INTERVAL);
  }

  /**
   * Configure le gestionnaire de visibilité de la page
   */
  private setupVisibilityHandler(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    this.visibilityHandler = () => {
      if (document.visibilityState === 'visible') {
        // Page visible - vérifier la connexion
        if (!this.state.isConnected && !this.state.isConnecting) {
          logger.info(LogCategory.EDITOR, '[UnifiedRealtime] 👁️ Page visible - vérification connexion');
          this.connect();
        }
      }
    };

    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  /**
   * Nettoie les canaux existants
   */
  private async cleanupChannels(): Promise<void> {
    for (const [channelName, channel] of this.channels) {
      try {
        await channel.unsubscribe();
      } catch (error) {
        logger.warn(LogCategory.EDITOR, '[UnifiedRealtime] Erreur nettoyage canal:', {
          channelName,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    this.channels.clear();
    this.state.channels.clear();
  }

  /**
   * Met à jour l'état et notifie les callbacks
   */
  private updateState(updates: Partial<UnifiedRealtimeState>): void {
    this.state = { ...this.state, ...updates };
    
    // Notifier les callbacks de manière sécurisée
    const callbacksToNotify = Array.from(this.onStateChangeCallbacks);
    callbacksToNotify.forEach(callback => {
      try {
        if (typeof callback === 'function') {
          callback(this.state);
        }
      } catch (error) {
        logger.error(LogCategory.EDITOR, '[UnifiedRealtime] Erreur dans callback état:', error);
        this.onStateChangeCallbacks.delete(callback);
      }
    });
  }

  /**
   * Notifie les callbacks d'événements
   */
  private notifyEventCallbacks(event: UnifiedRealtimeEvent<unknown>): void {
    const callbacksToNotify = Array.from(this.onEventCallbacks);
    callbacksToNotify.forEach(callback => {
      try {
        if (typeof callback === 'function') {
          callback(event);
        }
      } catch (error) {
        this.metrics.errorsCount++;
        logger.error(LogCategory.EDITOR, '[UnifiedRealtime] Erreur dans callback événement:', {
          error: error instanceof Error ? error.message : String(error),
          eventType: event.type,
          totalErrors: this.metrics.errorsCount
        });
        this.onEventCallbacks.delete(callback);
      }
    });
  }

  /**
   * Déconnecte le service
   */
  public async disconnect(): Promise<void> {
    try {
      this.stopHeartbeat();
      this.stopAuthMonitoring();
      
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }

      await this.cleanupChannels();

      this.updateState({
        isConnected: false,
        isConnecting: false,
        connectionStatus: 'disconnected',
        reconnectAttempts: 0,
        channels: new Set(),
        connectionStartTime: null
      });

      logger.info(LogCategory.EDITOR, '[UnifiedRealtime] 🔌 Déconnecté');
    } catch (error) {
      logger.error(LogCategory.EDITOR, '[UnifiedRealtime] Erreur lors de la déconnexion:', error);
      // Forcer la mise à jour de l'état même en cas d'erreur
      this.updateState({
        isConnected: false,
        isConnecting: false,
        connectionStatus: 'disconnected',
        reconnectAttempts: 0,
        channels: new Set(),
        connectionStartTime: null,
        lastError: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Force une reconnexion
   */
  public async reconnect(): Promise<void> {
    try {
      logger.info(LogCategory.EDITOR, '[UnifiedRealtime] 🔄 Reconnexion forcée');
      await this.disconnect();
      await this.connect();
    } catch (error) {
      logger.error(LogCategory.EDITOR, '[UnifiedRealtime] Erreur lors de la reconnexion forcée:', error);
      this.updateState({
        connectionStatus: 'error',
        lastError: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Envoie un événement de broadcast
   */
  public async broadcast(event: string, payload: unknown): Promise<void> {
    if (!this.state.isConnected || this.channels.size === 0) {
      logger.warn(LogCategory.EDITOR, '[UnifiedRealtime] Impossible d\'envoyer - non connecté');
      return;
    }

    // Trouver un canal d'éditeur pour l'envoi
    const editorChannel = Array.from(this.channels.values()).find(channel => 
      channel.topic.includes('editor:')
    );

    if (!editorChannel) {
      logger.warn(LogCategory.EDITOR, '[UnifiedRealtime] Aucun canal d\'éditeur disponible pour l\'envoi');
      return;
    }

    try {
      await editorChannel.send({
        type: 'broadcast',
        event,
        payload
      });
    } catch (error) {
      logger.error(LogCategory.EDITOR, '[UnifiedRealtime] Erreur envoi broadcast:', error);
    }
  }

  /**
   * S'abonne aux changements d'état
   */
  public onStateChange(callback: (state: UnifiedRealtimeState) => void): () => void {
    try {
      if (typeof callback !== 'function') {
        throw new Error('Callback doit être une fonction');
      }
      
      this.onStateChangeCallbacks.add(callback);
      return () => {
        try {
          this.onStateChangeCallbacks.delete(callback);
        } catch (error) {
          logger.error(LogCategory.EDITOR, '[UnifiedRealtime] Erreur lors de la suppression du callback d\'état:', error);
        }
      };
    } catch (error) {
      logger.error(LogCategory.EDITOR, '[UnifiedRealtime] Erreur lors de l\'ajout du callback d\'état:', error);
      return () => {}; // Retourner une fonction vide en cas d'erreur
    }
  }

  /**
   * S'abonne aux événements
   */
  public onEvent(callback: (event: UnifiedRealtimeEvent<unknown>) => void): () => void {
    try {
      if (typeof callback !== 'function') {
        throw new Error('Callback doit être une fonction');
      }
      
      this.onEventCallbacks.add(callback);
      return () => {
        try {
          this.onEventCallbacks.delete(callback);
        } catch (error) {
          logger.error(LogCategory.EDITOR, '[UnifiedRealtime] Erreur lors de la suppression du callback d\'événement:', error);
        }
      };
    } catch (error) {
      logger.error(LogCategory.EDITOR, '[UnifiedRealtime] Erreur lors de l\'ajout du callback d\'événement:', error);
      return () => {}; // Retourner une fonction vide en cas d'erreur
    }
  }

  /**
   * Obtient l'état actuel
   */
  public getState(): UnifiedRealtimeState {
    try {
      return { ...this.state };
    } catch (error) {
      logger.error(LogCategory.EDITOR, '[UnifiedRealtime] Erreur lors de l\'obtention de l\'état:', error);
      return {
        isConnected: false,
        isConnecting: false,
        connectionStatus: 'disconnected',
        lastError: 'Erreur lors de l\'obtention de l\'état',
        reconnectAttempts: 0,
        lastActivity: 0,
        channels: new Set(),
        uptime: 0,
        connectionStartTime: null
      };
    }
  }

  /**
   * Obtient la configuration actuelle
   */
  public getConfig(): UnifiedRealtimeConfig | null {
    return this.config ? { ...this.config } : null;
  }

  /**
   * Obtient les statistiques de connexion
   */
  public getStats() {
    try {
      return {
        isConnected: this.state.isConnected,
        channelsCount: this.state.channels.size,
        reconnectAttempts: this.state.reconnectAttempts,
        uptime: this.state.uptime,
        lastActivity: this.state.lastActivity,
        connectionStartTime: this.state.connectionStartTime,
        metrics: { ...this.metrics }
      };
    } catch (error) {
      logger.error(LogCategory.EDITOR, '[UnifiedRealtime] Erreur lors de l\'obtention des statistiques:', error);
      return {
        isConnected: false,
        channelsCount: 0,
        reconnectAttempts: 0,
        uptime: 0,
        lastActivity: 0,
        connectionStartTime: null,
        metrics: {
          connectionAttempts: 0,
          successfulConnections: 0,
          failedConnections: 0,
          averageConnectionTime: 0,
          totalReconnectAttempts: 0,
          lastConnectionTime: null,
          eventsProcessed: 0,
          errorsCount: 0
        }
      };
    }
  }

  /**
   * Obtient les métriques détaillées
   */
  public getMetrics(): RealtimeMetrics {
    return { ...this.metrics };
  }

  /**
   * Réinitialise les métriques
   */
  public resetMetrics(): void {
    this.metrics = {
      connectionAttempts: 0,
      successfulConnections: 0,
      failedConnections: 0,
      averageConnectionTime: 0,
      totalReconnectAttempts: 0,
      lastConnectionTime: null,
      eventsProcessed: 0,
      errorsCount: 0
    };
    logger.info(LogCategory.EDITOR, '[UnifiedRealtime] 📊 Métriques réinitialisées');
  }

  /**
   * Nettoie les ressources
   */
  public destroy(): void {
    this.disconnect();
    
    if (this.visibilityHandler && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }

    if (this.uptimeTimer) {
      clearInterval(this.uptimeTimer);
      this.uptimeTimer = null;
    }

    this.onStateChangeCallbacks.clear();
    this.onEventCallbacks.clear();
    
    UnifiedRealtimeService.instance = null;
    
    logger.info(LogCategory.EDITOR, '[UnifiedRealtime] 🗑️ Service détruit');
  }
}

// Export de l'instance singleton
export const unifiedRealtimeService = UnifiedRealtimeService.getInstance();
