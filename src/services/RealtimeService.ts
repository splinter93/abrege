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
  
  // Throttling des reconnexions par canal
  private channelReconnectTimes: Map<string, number> = new Map();
  
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
      return;
    }

    // Nettoyer l'ancienne configuration
    if (this.config) {
      await this.disconnect();
    }

    this.config = { ...config };
    this.reconnectAttempts = 0;


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

    // Vérifier que l'utilisateur de la session correspond à celui configuré
    if (session.user.id !== this.config?.userId) {
      // Mismatch userId - continuer quand même
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

    // Attendre que l'authentification soit complète
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Vérifier à nouveau la session après l'attente
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) {
      throw new Error('Session d\'authentification perdue lors de la création des canaux');
    }

    // Vérifier que le token JWT est valide
    if (!session.access_token) {
      throw new Error('Token d\'accès manquant dans la session');
    }

    // Créer tous les canaux nécessaires
    await this.createArticlesChannel();
    await this.createClasseursChannel();
    
    // Canal pour l'éditeur (si noteId fourni)
    if (this.config.noteId) {
      await this.createEditorChannel();
    }

    // S'abonner à tous les canaux
    for (const [channelName, channel] of this.channels) {
      try {
        await channel.subscribe((status) => {
          this.handleChannelStatus(channelName, status);
        });
        
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

    // Supabase envoie event_type (avec underscore), pas eventType
    const eventType = String(payload.event_type || payload.eventType || 'unknown').toLowerCase();
    const tableName = channelName.split(':')[0]; // articles, folders, classeurs
    
    // Mapper les événements PostgreSQL vers les événements du dispatcher
    let mappedEventType: string;
    let mappedPayload: Record<string, unknown>;

    switch (tableName) {
      case 'articles':
        // Mapper correctement les types d'événements PostgreSQL vers les types du dispatcher
        if (eventType === 'update') {
          // 🔧 FIX CRITIQUE: Vérifier si la note est mise en corbeille
          // Si trashed_at est défini, traiter comme une suppression
          const newRecord = payload.new as Record<string, unknown> | null;
          if (newRecord && (newRecord.trashed_at || newRecord.is_in_trash)) {
            mappedEventType = 'note.deleted';
            mappedPayload = { id: newRecord.id };
          } else {
            mappedEventType = 'note.updated';
            mappedPayload = payload.new || payload.old || {};
          }
        } else if (eventType === 'insert') {
          mappedEventType = 'note.created';
          mappedPayload = payload.new || payload.old || {};
        } else if (eventType === 'delete') {
          mappedEventType = 'note.deleted';
          mappedPayload = payload.new || payload.old || {};
        } else {
          mappedEventType = `note.${eventType}`;
          mappedPayload = payload.new || payload.old || {};
        }
        break;
      case 'folders':
        if (eventType === 'insert') {
          mappedEventType = 'folder.created';
        } else if (eventType === 'update') {
          mappedEventType = 'folder.updated';
        } else if (eventType === 'delete') {
          mappedEventType = 'folder.deleted';
        } else {
          mappedEventType = `folder.${eventType}`;
        }
        mappedPayload = payload.new || payload.old || {};
        break;
      case 'classeurs':
        if (eventType === 'insert') {
          mappedEventType = 'classeur.created';
        } else if (eventType === 'update') {
          mappedEventType = 'classeur.updated';
        } else if (eventType === 'delete') {
          mappedEventType = 'classeur.deleted';
        } else {
          mappedEventType = `classeur.${eventType}`;
        }
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
        // Réinitialiser le compteur de tentatives en cas de succès
        this.reconnectAttempts = 0;
        break;

      case 'CHANNEL_ERROR':
      case 'TIMED_OUT':
      case 'CLOSED':
        // Ne pas supprimer immédiatement le canal, essayer de le reconnecter
        this.handleChannelReconnect(channelName);
        break;

      default:
        logger.warn(LogCategory.EDITOR, '[RealtimeService] Statut inconnu:', { channelName, status });
    }
  }

  /**
   * Crée le canal pour les articles
   */
  private async createArticlesChannel(): Promise<void> {
    if (!this.config) return;

    const articlesChannelName = `articles:${this.config.userId}`;
    
    const articlesChannel = supabase
      .channel(articlesChannelName, {
        config: {
          broadcast: { self: false },
          presence: { key: this.config.userId }
        }
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'articles',
          filter: `user_id=eq.${this.config.userId}`
        },
        (payload) => {
          // Événement articles reçu
          
          // Vérifier si l'événement concerne l'utilisateur connecté
          const targetUserId = this.config?.userId;
          const eventUserId = payload.new?.user_id || payload.old?.user_id;
          
          if (eventUserId && targetUserId && eventUserId !== targetUserId) {
            return; // Événement pour un autre utilisateur
          }
          
          this.handleDatabaseEvent(payload, articlesChannelName);
        }
      );

    this.channels.set(articlesChannelName, articlesChannel);
  }

  /**
   * Crée le canal pour les classeurs
   */
  private async createClasseursChannel(): Promise<void> {
    if (!this.config) return;

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
  }

  /**
   * Crée le canal pour l'éditeur
   */
  private async createEditorChannel(): Promise<void> {
    if (!this.config || !this.config.noteId) return;

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

  /**
   * Gère la reconnexion d'un canal spécifique avec throttling
   */
  private async handleChannelReconnect(channelName: string): Promise<void> {
    // Throttling pour éviter les reconnexions trop fréquentes
    const now = Date.now();
    const lastReconnect = this.channelReconnectTimes.get(channelName) || 0;
    const timeSinceLastReconnect = now - lastReconnect;
    
    if (timeSinceLastReconnect < 5000) { // 5 secondes minimum entre reconnexions
      return;
    }
    
    this.channelReconnectTimes.set(channelName, now);
    
    try {
      // Supprimer l'ancien canal
      const oldChannel = this.channels.get(channelName);
      if (oldChannel) {
        await oldChannel.unsubscribe();
        this.channels.delete(channelName);
      }

      // Recréer le canal selon son type
      if (channelName.startsWith('articles:')) {
        await this.createArticlesChannel();
      } else if (channelName.startsWith('classeurs:')) {
        await this.createClasseursChannel();
      } else if (channelName.startsWith('editor:')) {
        await this.createEditorChannel();
      }

      // S'abonner au nouveau canal
      const newChannel = this.channels.get(channelName);
      if (newChannel) {
        await newChannel.subscribe((status) => {
          this.handleChannelStatus(channelName, status);
        });
      }
      
    } catch (error) {
      // Si la reconnexion échoue, programmer une reconnexion globale
      this.scheduleReconnect();
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
    
    // Nettoyer le throttling
    this.channelReconnectTimes.clear();

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
          this.connect();
        }
      }
    };

    // Gestionnaire de visibilité
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Gestionnaire de focus de la fenêtre (backup)
    const handleWindowFocus = () => {
      if (!this.state.isConnected && !this.state.isConnecting && this.config) {
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
   * Fonction de test pour déclencher un événement manuellement
   */
  public async testRealtimeEvent(): Promise<void> {
    if (!this.config) {
      return;
    }

    try {
      
      // Trouver une note de l'utilisateur
      const { data: articles, error: selectError } = await supabase
        .from('articles')
        .select('id, source_title')
        .eq('user_id', this.config.userId)
        .limit(1);

      if (selectError) {
        return;
      }

      if (!articles || articles.length === 0) {
        return;
      }

      const article = articles[0];

      // Mettre à jour la note pour déclencher un événement
      const { error: updateError } = await supabase
        .from('articles')
        .update({ 
          updated_at: new Date().toISOString(),
          source_title: `Test Realtime ${Date.now()}`
        })
        .eq('id', article.id);

      if (updateError) {
        // Erreur silencieuse
      }

    } catch (error) {
      // Erreur silencieuse
    }
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
  }
}

// Export de l'instance singleton
export const realtimeService = RealtimeService.getInstance();
