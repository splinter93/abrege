/**
 * 🔄 RealtimeEditorService - Service de connexion Supabase Realtime pour l'éditeur
 * 
 * Service robuste et stable pour gérer les connexions WebSocket Supabase Realtime
 * spécifiquement pour l'éditeur. Gère la reconnexion automatique, la visibilité
 * de la page, et la stabilité de la connexion.
 */

import { RealtimeChannel, RealtimeClient } from '@supabase/supabase-js';
import { supabase } from '@/supabaseClient';
import { logger, LogCategory } from '@/utils/logger';
import { handleRealtimeEvent } from '@/realtime/dispatcher';

/**
 * Utilitaire pour sérialiser des objets en évitant les références circulaires
 */
function safeStringify(obj: any, maxDepth: number = 10): string {
  const seen = new WeakSet();
  
  return JSON.stringify(obj, (key, value) => {
    // Éviter les références circulaires communes dans les objets Supabase
    if (key === 'socket' || key === 'channels' || key === 'client' || key === 'parent' || key === 'child' || key === 'supabase') {
      return '[Circular Reference]';
    }
    
    // Limiter la profondeur pour éviter les structures trop complexes
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular Reference]';
      }
      seen.add(value);
    }
    
    return value;
  }, 2);
}

// Types pour la configuration et l'état
export interface RealtimeEditorConfig {
  noteId: string;
  userId: string;
  debug?: boolean;
  autoReconnect?: boolean;
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
}

export interface RealtimeEditorState {
  isConnected: boolean;
  isConnecting: boolean;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  lastError: string | null;
  reconnectAttempts: number;
  lastActivity: number;
}

export interface RealtimeEditorEvent {
  type: string;
  payload: any;
  timestamp: number;
  source: 'llm' | 'user' | 'system';
}

/**
 * Service principal pour la gestion Realtime de l'éditeur
 */
export class RealtimeEditorService {
  private static instance: RealtimeEditorService | null = null;
  
  // Configuration
  private config: RealtimeEditorConfig | null = null;
  private state: RealtimeEditorState = {
    isConnected: false,
    isConnecting: false,
    connectionStatus: 'disconnected',
    lastError: null,
    reconnectAttempts: 0,
    lastActivity: 0
  };

  // Connexions et timers
  private channel: RealtimeChannel | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private visibilityHandler: (() => void) | null = null;

  // Callbacks
  private onStateChangeCallbacks: Set<(state: RealtimeEditorState) => void> = new Set();
  private onEventCallbacks: Set<(event: RealtimeEditorEvent) => void> = new Set();

  private constructor() {
    this.setupVisibilityHandler();
  }

  /**
   * Singleton pattern
   */
  public static getInstance(): RealtimeEditorService {
    if (!RealtimeEditorService.instance) {
      RealtimeEditorService.instance = new RealtimeEditorService();
    }
    return RealtimeEditorService.instance;
  }

  /**
   * Initialise le service avec une configuration
   */
  public async initialize(config: RealtimeEditorConfig): Promise<void> {
    if (this.config && this.config.noteId === config.noteId) {
      logger.info(LogCategory.EDITOR, '[RealtimeEditor] Service déjà initialisé pour cette note');
      return;
    }

    this.config = {
      debug: false,
      autoReconnect: true,
      reconnectDelay: 2000,
      maxReconnectAttempts: 10,
      ...config
    };

    logger.info(LogCategory.EDITOR, '[RealtimeEditor] Initialisation du service', {
      noteId: config.noteId,
      userId: config.userId,
      debug: this.config.debug
    });

    await this.connect();
  }

  /**
   * Établit la connexion WebSocket
   */
  private async connect(): Promise<void> {
    if (!this.config) {
      throw new Error('Service non initialisé');
    }

    if (this.state.isConnecting || this.state.isConnected) {
      logger.warn(LogCategory.EDITOR, '[RealtimeEditor] Connexion déjà en cours ou établie');
      return;
    }

    // Vérifier que Supabase est disponible
    if (!supabase || !supabase.channel) {
      throw new Error('Supabase client non disponible');
    }

    // Debug: Vérifier la configuration Supabase
    if (this.config?.debug) {
      logger.info(LogCategory.EDITOR, '[RealtimeEditor] Configuration Supabase:', {
        hasSupabase: !!supabase,
        hasChannel: !!supabase.channel,
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'NOT SET',
        supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET'
      });
    }

    this.updateState({
      isConnecting: true,
      connectionStatus: 'connecting',
      lastError: null
    });

    try {
      // Vérifier l'authentification
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      if (authError) {
        logger.warn(LogCategory.EDITOR, '[RealtimeEditor] Erreur d\'authentification:', authError.message);
        // Continuer avec l'accès anonyme pour le debug
      }
      
      if (!session) {
        logger.warn(LogCategory.EDITOR, '[RealtimeEditor] Aucune session authentifiée - utilisation de l\'accès anonyme');
        // Continuer avec l'accès anonyme pour le debug
      }

      if (this.config?.debug) {
        if (session) {
          logger.info(LogCategory.EDITOR, '[RealtimeEditor] Session authentifiée:', {
            userId: session.user.id,
            email: session.user.email,
            expiresAt: session.expires_at
          });
        } else {
          logger.info(LogCategory.EDITOR, '[RealtimeEditor] Mode anonyme - pas de session');
        }
      }

      // Nettoyer l'ancienne connexion si elle existe
      try {
        await this.disconnect();
      } catch (disconnectError) {
        logger.warn(LogCategory.EDITOR, '[RealtimeEditor] Erreur lors de la déconnexion:', disconnectError);
        // Continue même si la déconnexion échoue
      }

      // Créer le canal Realtime
      const channelName = `editor:${this.config.noteId}:${this.config.userId}`;
      this.channel = supabase.channel(channelName, {
        config: {
          broadcast: { self: false },
          presence: { key: this.config.userId }
        }
      });

      // Configurer les écouteurs d'événements
      this.setupChannelListeners();

      // S'abonner au canal
      const response = await this.channel.subscribe((status) => {
        this.handleSubscriptionStatus(status);
      });

      if (this.config?.debug) {
        logger.info(LogCategory.EDITOR, '[RealtimeEditor] Réponse de souscription:', {
          response: safeStringify(response),
          responseType: typeof response,
          responseKeys: response ? Object.keys(response) : []
        });
      }

      // La réponse de subscribe() est un objet, pas une chaîne
      // Le statut initial peut être 'joining' - la connexion se fait de manière asynchrone
      if (response && (response.state === 'joined' || response.state === 'joining')) {
        // Si déjà connecté, mettre à jour l'état immédiatement
        if (response.state === 'joined') {
          this.updateState({
            isConnected: true,
            isConnecting: false,
            connectionStatus: 'connected',
            reconnectAttempts: 0,
            lastActivity: Date.now()
          });
          this.startHeartbeat();
          logger.info(LogCategory.EDITOR, '[RealtimeEditor] ✅ Connexion établie immédiatement', { 
            channelName, 
            responseState: response?.state
          });
        } else {
          // En cours de connexion - le callback handleSubscriptionStatus gérera la suite
          logger.info(LogCategory.EDITOR, '[RealtimeEditor] 🔄 Connexion en cours...', { 
            channelName, 
            responseState: response?.state
          });
        }
      } else {
        throw new Error(`Échec de la souscription: ${safeStringify(response)}`);
      }

    } catch (error) {
      // Gestion d'erreur améliorée pour les objets avec structures circulaires
      let errorMessage: string;
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        errorMessage = safeStringify(error);
      } else {
        errorMessage = String(error);
      }

      // Sérialiser l'objet de données pour éviter les références circulaires
      const logData = {
        error: errorMessage,
        noteId: this.config?.noteId,
        userId: this.config?.userId,
        errorType: typeof error,
        errorStack: error instanceof Error ? error.stack : undefined,
        errorName: error instanceof Error ? error.name : undefined
      };

      logger.error(LogCategory.EDITOR, '[RealtimeEditor] ❌ Erreur de connexion:', logData);
      
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
   * Configure les écouteurs d'événements du canal
   */
  private setupChannelListeners(): void {
    if (!this.channel) return;

    // Événements de broadcast (changements LLM)
    this.channel.on('broadcast', { event: 'editor_update' }, (payload) => {
      this.handleEditorEvent({
        type: 'editor.update',
        payload: payload.payload,
        timestamp: Date.now(),
        source: 'llm'
      });
    });

    this.channel.on('broadcast', { event: 'editor_insert' }, (payload) => {
      this.handleEditorEvent({
        type: 'editor.insert',
        payload: payload.payload,
        timestamp: Date.now(),
        source: 'llm'
      });
    });

    this.channel.on('broadcast', { event: 'editor_delete' }, (payload) => {
      this.handleEditorEvent({
        type: 'editor.delete',
        payload: payload.payload,
        timestamp: Date.now(),
        source: 'llm'
      });
    });

    // Événements de présence (utilisateurs connectés)
    this.channel.on('presence', { event: 'sync' }, () => {
      this.updateState({ lastActivity: Date.now() });
    });

    this.channel.on('presence', { event: 'join' }, ({ key, newPresences }) => {
      if (this.config?.debug) {
        logger.info(LogCategory.EDITOR, '[RealtimeEditor] Utilisateur rejoint:', { key, newPresences });
      }
    });

    this.channel.on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
      if (this.config?.debug) {
        logger.info(LogCategory.EDITOR, '[RealtimeEditor] Utilisateur quitte:', { key, leftPresences });
      }
    });
  }

  /**
   * Gère les événements de l'éditeur
   */
  private handleEditorEvent(event: RealtimeEditorEvent): void {
    if (!this.config) return;

    this.updateState({ lastActivity: Date.now() });

    // Logger en mode debug
    if (this.config.debug) {
      logger.info(LogCategory.EDITOR, '[RealtimeEditor] Événement reçu:', {
        type: event.type,
        source: event.source,
        payload: event.payload
      });
    }

    // Dispatcher vers le store Zustand
    handleRealtimeEvent(event, this.config.debug);

    // Notifier les callbacks
    this.onEventCallbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        logger.error(LogCategory.EDITOR, '[RealtimeEditor] Erreur dans callback événement:', error);
      }
    });
  }

  /**
   * Gère le statut de souscription
   */
  private handleSubscriptionStatus(status: string): void {
    logger.info(LogCategory.EDITOR, '[RealtimeEditor] Statut de souscription:', status);

    switch (status) {
      case 'SUBSCRIBED':
      case 'joined':
        this.updateState({
          isConnected: true,
          isConnecting: false,
          connectionStatus: 'connected',
          reconnectAttempts: 0,
          lastActivity: Date.now()
        });
        break;

      case 'CHANNEL_ERROR':
      case 'TIMED_OUT':
      case 'CLOSED':
      case 'left':
      case 'error':
        this.updateState({
          isConnected: false,
          isConnecting: false,
          connectionStatus: 'error',
          lastError: `Connexion fermée: ${status}`
        });
        this.scheduleReconnect();
        break;

      case 'joining':
        this.updateState({
          isConnecting: true,
          connectionStatus: 'connecting'
        });
        break;

      default:
        logger.warn(LogCategory.EDITOR, '[RealtimeEditor] Statut inconnu:', status);
    }
  }

  /**
   * Programme une reconnexion automatique
   */
  private scheduleReconnect(): void {
    if (!this.config?.autoReconnect) return;
    if (this.reconnectTimer) return;

    const attempts = this.state.reconnectAttempts + 1;
    if (attempts > (this.config.maxReconnectAttempts || 10)) {
      logger.error(LogCategory.EDITOR, '[RealtimeEditor] ❌ Nombre maximum de tentatives de reconnexion atteint');
      return;
    }

    const delay = (this.config.reconnectDelay || 2000) * Math.pow(1.5, attempts - 1);
    
    logger.info(LogCategory.EDITOR, '[RealtimeEditor] 🔄 Reconnexion programmée', {
      attempt: attempts,
      delay: `${delay}ms`
    });

    this.updateState({ reconnectAttempts: attempts });

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
    
    this.heartbeatTimer = setInterval(() => {
      if (this.channel && this.state.isConnected) {
        // Envoyer un ping pour maintenir la connexion
        this.channel.send({
          type: 'broadcast',
          event: 'heartbeat',
          payload: { timestamp: Date.now() }
        });
      }
    }, 30000); // Ping toutes les 30 secondes
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
   * Configure le gestionnaire de visibilité de la page
   */
  private setupVisibilityHandler(): void {
    // Vérifier que nous sommes côté client
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    this.visibilityHandler = () => {
      if (document.visibilityState === 'visible' && this.config && !this.state.isConnected) {
        logger.info(LogCategory.EDITOR, '[RealtimeEditor] 🔄 Page visible - reconnexion automatique');
        this.connect();
      } else if (document.visibilityState === 'hidden' && this.state.isConnected) {
        logger.info(LogCategory.EDITOR, '[RealtimeEditor] 👁️ Page cachée - connexion maintenue');
        // On maintient la connexion même quand la page est cachée
        // pour recevoir les mises à jour LLM
      }
    };

    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  /**
   * Met à jour l'état et notifie les callbacks
   */
  private updateState(updates: Partial<RealtimeEditorState>): void {
    this.state = { ...this.state, ...updates };
    
    this.onStateChangeCallbacks.forEach(callback => {
      try {
        callback(this.state);
      } catch (error) {
        logger.error(LogCategory.EDITOR, '[RealtimeEditor] Erreur dans callback état:', error);
      }
    });
  }

  /**
   * Déconnecte le service
   */
  public async disconnect(): Promise<void> {
    this.stopHeartbeat();
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.channel) {
      try {
        await this.channel.unsubscribe();
      } catch (error) {
        logger.warn(LogCategory.EDITOR, '[RealtimeEditor] Erreur lors de la déconnexion du canal:', error);
      }
      this.channel = null;
    }

    this.updateState({
      isConnected: false,
      isConnecting: false,
      connectionStatus: 'disconnected',
      reconnectAttempts: 0
    });

    logger.info(LogCategory.EDITOR, '[RealtimeEditor] 🔌 Déconnecté');
  }

  /**
   * Force une reconnexion
   */
  public async reconnect(): Promise<void> {
    logger.info(LogCategory.EDITOR, '[RealtimeEditor] 🔄 Reconnexion forcée');
    await this.disconnect();
    await this.connect();
  }

  /**
   * Envoie un événement de broadcast
   */
  public async broadcast(event: string, payload: any): Promise<void> {
    if (!this.channel || !this.state.isConnected) {
      logger.warn(LogCategory.EDITOR, '[RealtimeEditor] Impossible d\'envoyer - non connecté');
      return;
    }

    try {
      await this.channel.send({
        type: 'broadcast',
        event,
        payload
      });
    } catch (error) {
      logger.error(LogCategory.EDITOR, '[RealtimeEditor] Erreur envoi broadcast:', error);
    }
  }

  /**
   * S'abonne aux changements d'état
   */
  public onStateChange(callback: (state: RealtimeEditorState) => void): () => void {
    this.onStateChangeCallbacks.add(callback);
    return () => this.onStateChangeCallbacks.delete(callback);
  }

  /**
   * S'abonne aux événements
   */
  public onEvent(callback: (event: RealtimeEditorEvent) => void): () => void {
    this.onEventCallbacks.add(callback);
    return () => this.onEventCallbacks.delete(callback);
  }

  /**
   * Obtient l'état actuel
   */
  public getState(): RealtimeEditorState {
    return { ...this.state };
  }

  /**
   * Obtient la configuration actuelle
   */
  public getConfig(): RealtimeEditorConfig | null {
    return this.config ? { ...this.config } : null;
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

    this.onStateChangeCallbacks.clear();
    this.onEventCallbacks.clear();
    
    RealtimeEditorService.instance = null;
    
    logger.info(LogCategory.EDITOR, '[RealtimeEditor] 🗑️ Service détruit');
  }
}

// Export de l'instance singleton
export const realtimeEditorService = RealtimeEditorService.getInstance();
