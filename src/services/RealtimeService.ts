/**
 * 🔄 RealtimeService - Service Realtime Simple et Robuste
 * 
 * Service de production pour la gestion des événements realtime Supabase.
 * Architecture simple, performante et maintenable.
 */

import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/supabaseClient';
import { logger, LogCategory } from '@/utils/logger';
import { handleRealtimeEvent } from '@/realtime/dispatcher';

// Types stricts pour la configuration
export interface RealtimeConfig {
  readonly userId: string;
  readonly noteId?: string;
  readonly debug?: boolean;
}

export interface RealtimeState {
  readonly isConnected: boolean;
  readonly isConnecting: boolean;
  readonly error: string | null;
  readonly channels: readonly string[];
}

export interface RealtimeEvent<T = unknown> {
  readonly type: string;
  readonly payload: T;
  readonly timestamp: number;
  readonly source: 'database' | 'editor';
  readonly channel: string;
}

// Callbacks typés
export type StateChangeCallback = (state: RealtimeState) => void;
export type EventCallback = (event: RealtimeEvent) => void;

/**
 * Service Realtime de production
 */
export class RealtimeService {
  private static instance: RealtimeService | null = null;
  
  // État privé
  private config: RealtimeConfig | null = null;
  private state: RealtimeState = {
    isConnected: false,
    isConnecting: false,
    error: null,
    channels: []
  };
  
  // Connexions
  private channels: Map<string, RealtimeChannel> = new Map();
  
  // Callbacks
  private stateCallbacks: Set<StateChangeCallback> = new Set();
  private eventCallbacks: Set<EventCallback> = new Set();
  
  // Timers
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;
  private readonly reconnectDelay = 2000;
  private readonly heartbeatInterval = 60000; // 1 minute (plus économique)
  
  // Gestionnaire de visibilité
  private visibilityHandler: (() => void) | null = null;

  private constructor() {
    // Singleton pattern
    this.setupVisibilityHandler();
  }

  public static getInstance(): RealtimeService {
    if (!RealtimeService.instance) {
      RealtimeService.instance = new RealtimeService();
    }
    return RealtimeService.instance;
  }

  /**
   * Initialise le service avec une configuration
   */
  public async initialize(config: RealtimeConfig): Promise<void> {
    if (this.config?.userId === config.userId && this.config?.noteId === config.noteId) {
      logger.info(LogCategory.EDITOR, '[RealtimeService] Service déjà initialisé pour cette configuration');
      return;
    }

    // Nettoyer l'ancienne configuration
    if (this.config) {
      await this.disconnect();
    }

    this.config = { ...config };
    this.reconnectAttempts = 0;

    logger.info(LogCategory.EDITOR, '[RealtimeService] Initialisation', {
      userId: config.userId,
      noteId: config.noteId,
      debug: config.debug
    });

    await this.connect();
  }

  /**
   * Établit la connexion realtime
   */
  private async connect(): Promise<void> {
    if (!this.config) {
      throw new Error('Service non initialisé');
    }

    if (this.state.isConnecting || this.state.isConnected) {
      return;
    }

    this.updateState({
      isConnecting: true,
      error: null
    });

    try {
      // Vérifier l'authentification
      await this.ensureAuthenticated();

      // Créer les canaux
      await this.createChannels();

      this.updateState({
        isConnected: true,
        isConnecting: false,
        error: null
      });

      this.reconnectAttempts = 0;
      
      // Démarrer le heartbeat
      this.startHeartbeat();

      logger.info(LogCategory.EDITOR, '[RealtimeService] ✅ Connexion établie');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur de connexion inconnue';
      
      this.updateState({
        isConnected: false,
        isConnecting: false,
        error: errorMessage
      });

      logger.error(LogCategory.EDITOR, '[RealtimeService] ❌ Erreur de connexion:', errorMessage);
      
      this.scheduleReconnect();
    }
  }

  /**
   * Vérifie l'authentification Supabase
   */
  private async ensureAuthenticated(): Promise<void> {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      throw new Error(`Erreur d'authentification: ${error.message}`);
    }
    
    if (!session) {
      throw new Error('Aucune session authentifiée');
    }

    if (this.config?.debug) {
      logger.info(LogCategory.EDITOR, '[RealtimeService] Session authentifiée:', {
        userId: session.user.id,
        email: session.user.email
      });
    }
  }

  /**
   * Crée les canaux realtime nécessaires
   */
  private async createChannels(): Promise<void> {
    if (!this.config) return;

    // Canal pour les changements de base de données (articles)
    const articlesChannelName = `articles:${this.config.userId}`;
    const articlesChannel = supabase
      .channel(articlesChannelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'articles',
          filter: `user_id=eq.${this.config.userId}`
        },
        (payload) => this.handleDatabaseEvent(payload, articlesChannelName)
      );

    this.channels.set(articlesChannelName, articlesChannel);

    // Canal pour les changements de dossiers
    const foldersChannelName = `folders:${this.config.userId}`;
    const foldersChannel = supabase
      .channel(foldersChannelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'folders',
          filter: `user_id=eq.${this.config.userId}`
        },
        (payload) => this.handleDatabaseEvent(payload, foldersChannelName)
      );

    this.channels.set(foldersChannelName, foldersChannel);

    // Canal pour les changements de classeurs
    const classeursChannelName = `classeurs:${this.config.userId}`;
    const classeursChannel = supabase
      .channel(classeursChannelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'classeurs',
          filter: `user_id=eq.${this.config.userId}`
        },
        (payload) => this.handleDatabaseEvent(payload, classeursChannelName)
      );

    this.channels.set(classeursChannelName, classeursChannel);

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
        .on('broadcast', { event: 'editor_update' }, (payload) => 
          this.handleEditorEvent({ event: 'editor_update', payload }, editorChannelName)
        )
        .on('broadcast', { event: 'editor_insert' }, (payload) => 
          this.handleEditorEvent({ event: 'editor_insert', payload }, editorChannelName)
        )
        .on('broadcast', { event: 'editor_delete' }, (payload) => 
          this.handleEditorEvent({ event: 'editor_delete', payload }, editorChannelName)
        );

      this.channels.set(editorChannelName, editorChannel);
    }

    // S'abonner à tous les canaux
    for (const [channelName, channel] of this.channels) {
      try {
        await channel.subscribe((status) => this.handleChannelStatus(channelName, status));
        
        if (this.config.debug) {
          logger.info(LogCategory.EDITOR, '[RealtimeService] Canal créé:', { channelName, status });
        }
      } catch (error) {
        logger.error(LogCategory.EDITOR, '[RealtimeService] Erreur création canal:', {
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

    const eventType = String(payload.eventType || 'unknown').toLowerCase();
    const tableName = channelName.split(':')[0]; // articles, folders, classeurs
    
    // Mapper les événements PostgreSQL vers les événements du dispatcher
    let mappedEventType: string;
    let mappedPayload: Record<string, unknown>;

    switch (tableName) {
      case 'articles':
        mappedEventType = `note.${eventType}`;
        mappedPayload = payload.new || payload.old || {};
        break;
      case 'folders':
        mappedEventType = `folder.${eventType}`;
        mappedPayload = payload.new || payload.old || {};
        break;
      case 'classeurs':
        mappedEventType = `classeur.${eventType}`;
        mappedPayload = payload.new || payload.old || {};
        break;
      default:
        mappedEventType = `database.${eventType}`;
        mappedPayload = payload;
    }

    const event: RealtimeEvent<Record<string, unknown>> = {
      type: mappedEventType,
      payload: mappedPayload,
      timestamp: Date.now(),
      source: 'database',
      channel: channelName
    };

    if (this.config.debug) {
      logger.info(LogCategory.EDITOR, '[RealtimeService] Event database:', {
        tableName,
        eventType,
        mappedEventType,
        payload: mappedPayload
      });
    }

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

    const event: RealtimeEvent<unknown> = {
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
      logger.info(LogCategory.EDITOR, '[RealtimeService] Statut canal:', { channelName, status });
    }

    const currentChannels = Array.from(this.channels.keys());

    switch (status) {
      case 'SUBSCRIBED':
      case 'joined':
        this.updateState({ channels: currentChannels });
        break;

      case 'CHANNEL_ERROR':
      case 'TIMED_OUT':
      case 'CLOSED':
        this.channels.delete(channelName);
        this.updateState({ 
          channels: Array.from(this.channels.keys()),
          error: `Canal fermé: ${channelName}`
        });
        
        if (this.channels.size === 0) {
          this.scheduleReconnect();
        }
        break;

      default:
        logger.warn(LogCategory.EDITOR, '[RealtimeService] Statut inconnu:', { channelName, status });
    }
  }

  /**
   * Programme une reconnexion
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer || this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * this.reconnectAttempts;

    logger.info(LogCategory.EDITOR, '[RealtimeService] Reconnexion programmée', {
      attempt: this.reconnectAttempts,
      delay: `${delay}ms`
    });

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      await this.connect();
    }, delay);
  }

  /**
   * Envoie un événement de broadcast
   */
  public async broadcast(event: string, payload: unknown): Promise<void> {
    if (!this.state.isConnected || this.channels.size === 0) {
      logger.warn(LogCategory.EDITOR, '[RealtimeService] Impossible d\'envoyer - non connecté');
      return;
    }

    // Trouver un canal d'éditeur pour l'envoi
    const editorChannel = Array.from(this.channels.values()).find(channel => 
      channel.topic.includes('editor:')
    );

    if (!editorChannel) {
      logger.warn(LogCategory.EDITOR, '[RealtimeService] Aucun canal d\'éditeur disponible');
      return;
    }

    try {
      await editorChannel.send({
        type: 'broadcast',
        event,
        payload
      });
    } catch (error) {
      logger.error(LogCategory.EDITOR, '[RealtimeService] Erreur envoi broadcast:', error);
    }
  }

  /**
   * S'abonne aux changements d'état
   */
  public onStateChange(callback: StateChangeCallback): () => void {
    this.stateCallbacks.add(callback);
    return () => this.stateCallbacks.delete(callback);
  }

  /**
   * S'abonne aux événements
   */
  public onEvent(callback: EventCallback): () => void {
    this.eventCallbacks.add(callback);
    return () => this.eventCallbacks.delete(callback);
  }

  /**
   * Obtient l'état actuel
   */
  public getState(): RealtimeState {
    return { ...this.state };
  }

  /**
   * Vérifie si le service est initialisé
   */
  public isInitialized(): boolean {
    return this.config !== null;
  }

  /**
   * Force une reconnexion
   */
  public async reconnect(): Promise<void> {
    try {
      logger.info(LogCategory.EDITOR, '[RealtimeService] 🔄 Reconnexion forcée');
      
      // Vérifier que le service est initialisé
      if (!this.config) {
        throw new Error('Service non initialisé - utilisez initialize() d\'abord');
      }
      
      await this.disconnect();
      await this.connect();
    } catch (error) {
      logger.error(LogCategory.EDITOR, '[RealtimeService] Erreur lors de la reconnexion forcée:', error);
      this.updateState({
        connectionStatus: 'error',
        lastError: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Déconnecte le service
   */
  public async disconnect(): Promise<void> {
    // Arrêter le heartbeat
    this.stopHeartbeat();
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    for (const [channelName, channel] of this.channels) {
      try {
        await channel.unsubscribe();
      } catch (error) {
        logger.warn(LogCategory.EDITOR, '[RealtimeService] Erreur déconnexion canal:', {
          channelName,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    this.channels.clear();
    this.reconnectAttempts = 0;

    this.updateState({
      isConnected: false,
      isConnecting: false,
      error: null,
      channels: []
    });

    logger.info(LogCategory.EDITOR, '[RealtimeService] 🔌 Déconnecté');
  }

  /**
   * Met à jour l'état et notifie les callbacks
   */
  private updateState(updates: Partial<RealtimeState>): void {
    this.state = { ...this.state, ...updates };
    
    // Notifier les callbacks de manière sécurisée
    this.stateCallbacks.forEach(callback => {
      try {
        callback(this.state);
      } catch (error) {
        logger.error(LogCategory.EDITOR, '[RealtimeService] Erreur callback état:', error);
        this.stateCallbacks.delete(callback);
      }
    });
  }

  /**
   * Notifie les callbacks d'événements
   */
  private notifyEventCallbacks(event: RealtimeEvent): void {
    this.eventCallbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        logger.error(LogCategory.EDITOR, '[RealtimeService] Erreur callback événement:', error);
        this.eventCallbacks.delete(callback);
      }
    });
  }

  /**
   * Démarre le heartbeat pour maintenir la connexion
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    
    this.heartbeatTimer = setInterval(() => {
      if (this.state.isConnected && this.channels.size > 0) {
        // Heartbeat silencieux en production
        if (this.config?.debug) {
          console.log('[RealtimeService] 💓 Heartbeat...');
        }
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
    }, this.heartbeatInterval);
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
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Vérifier si on est connecté
        if (!this.state.isConnected && !this.state.isConnecting && this.config) {
          if (this.config?.debug) {
            console.log('[RealtimeService] 🔄 Reconnexion automatique...');
          }
          this.connect();
        }
      }
    };

    // Gestionnaire de visibilité
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Gestionnaire de focus de la fenêtre (backup)
    const handleWindowFocus = () => {
      if (!this.state.isConnected && !this.state.isConnecting && this.config) {
        if (this.config?.debug) {
          console.log('[RealtimeService] 🔄 Reconnexion automatique (focus)...');
        }
        this.connect();
      }
    };
    
    window.addEventListener('focus', handleWindowFocus);
    
    // Stocker les références pour le cleanup
    this.visibilityHandler = () => {
      handleVisibilityChange();
      handleWindowFocus();
    };
  }

  /**
   * Nettoie les ressources
   */
  public destroy(): void {
    this.disconnect();
    
    // Nettoyer le gestionnaire de visibilité
    if (this.visibilityHandler && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }
    
    this.stateCallbacks.clear();
    this.eventCallbacks.clear();
    RealtimeService.instance = null;
    logger.info(LogCategory.EDITOR, '[RealtimeService] 🗑️ Service détruit');
  }
}

// Export de l'instance singleton
export const realtimeService = RealtimeService.getInstance();
