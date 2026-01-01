/**
 * RealtimeConnection - Gestion de la connexion WebSocket Realtime
 * 
 * Responsabilités:
 * - Établissement de la connexion WebSocket
 * - Reconnexion automatique avec backoff exponentiel
 * - Heartbeat pour maintenir la connexion
 * - Gestion de la visibilité de la page
 */

import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/supabaseClient';
import { logger, LogCategory } from '@/utils/logger';
import type { RealtimeEditorConfig } from '../RealtimeEditorService';
import type { RealtimeState } from './RealtimeState';

/**
 * Utilitaire pour sérialiser des objets en évitant les références circulaires
 */
function safeStringify(obj: unknown, maxDepth: number = 10): string {
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

/**
 * Gestionnaire de connexion pour RealtimeEditorService
 */
export class RealtimeConnection {
  private config: RealtimeEditorConfig | null = null;
  private state: RealtimeState | null = null;
  private channel: RealtimeChannel | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private visibilityHandler: (() => void) | null = null;

  constructor(config: RealtimeEditorConfig, state: RealtimeState) {
    this.config = config;
    this.state = state;
    this.setupVisibilityHandler();
  }

  /**
   * Établit la connexion WebSocket
   */
  public async connect(): Promise<RealtimeChannel> {
    if (!this.config || !this.state) {
      throw new Error('Service non initialisé');
    }

    if (this.state.getState().isConnecting || this.state.getState().isConnected) {
      logger.warn(LogCategory.EDITOR, '[RealtimeConnection] Connexion déjà en cours ou établie');
      if (this.channel) {
        return this.channel;
      }
      throw new Error('Connexion en cours mais canal non disponible');
    }

    // Vérifier que Supabase est disponible
    if (!supabase || !supabase.channel) {
      throw new Error('Supabase client non disponible');
    }

    // Debug: Vérifier la configuration Supabase
    if (this.config?.debug) {
      logger.info(LogCategory.EDITOR, '[RealtimeConnection] Configuration Supabase:', {
        hasSupabase: !!supabase,
        hasChannel: !!supabase.channel,
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'NOT SET',
        supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET'
      });
    }

    this.state.updateState({
      isConnecting: true,
      connectionStatus: 'connecting',
      lastError: null
    });

    try {
      // Vérifier l'authentification
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      if (authError) {
        logger.warn(LogCategory.EDITOR, '[RealtimeConnection] Erreur d\'authentification:', authError.message);
        // Continuer avec l'accès anonyme pour le debug
      }
      
      if (!session) {
        logger.warn(LogCategory.EDITOR, '[RealtimeConnection] Aucune session authentifiée - utilisation de l\'accès anonyme');
        // Continuer avec l'accès anonyme pour le debug
      }

      if (this.config?.debug) {
        if (session) {
          logger.info(LogCategory.EDITOR, '[RealtimeConnection] Session authentifiée:', {
            userId: session.user.id,
            email: session.user.email,
            expiresAt: session.expires_at
          });
        } else {
          logger.info(LogCategory.EDITOR, '[RealtimeConnection] Mode anonyme - pas de session');
        }
      }

      // Nettoyer l'ancienne connexion si elle existe
      try {
        await this.disconnect();
      } catch (disconnectError) {
        logger.warn(LogCategory.EDITOR, '[RealtimeConnection] Erreur lors de la déconnexion:', disconnectError);
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

      // S'abonner au canal
      const response = await this.channel.subscribe((status) => {
        this.handleSubscriptionStatus(status);
      });

      if (this.config?.debug) {
        logger.info(LogCategory.EDITOR, '[RealtimeConnection] Réponse de souscription:', {
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
          this.state.updateState({
            isConnected: true,
            isConnecting: false,
            connectionStatus: 'connected',
            reconnectAttempts: 0,
            lastActivity: Date.now()
          });
          this.startHeartbeat();
          logger.info(LogCategory.EDITOR, '[RealtimeConnection] ✅ Connexion établie immédiatement', { 
            channelName, 
            responseState: response?.state
          });
        } else {
          // En cours de connexion - le callback handleSubscriptionStatus gérera la suite
          logger.info(LogCategory.EDITOR, '[RealtimeConnection] 🔄 Connexion en cours...', { 
            channelName, 
            responseState: response?.state
          });
        }
      } else {
        throw new Error(`Échec de la souscription: ${safeStringify(response)}`);
      }

      return this.channel;

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

      logger.error(LogCategory.EDITOR, '[RealtimeConnection] ❌ Erreur de connexion:', logData);
      
      this.state.updateState({
        isConnected: false,
        isConnecting: false,
        connectionStatus: 'error',
        lastError: errorMessage
      });

      this.scheduleReconnect();
      throw error;
    }
  }

  /**
   * Gère le statut de souscription
   */
  private handleSubscriptionStatus(status: string): void {
    if (!this.state) return;

    logger.info(LogCategory.EDITOR, '[RealtimeConnection] Statut de souscription:', status);

    switch (status) {
      case 'SUBSCRIBED':
      case 'joined':
        this.state.updateState({
          isConnected: true,
          isConnecting: false,
          connectionStatus: 'connected',
          reconnectAttempts: 0,
          lastActivity: Date.now()
        });
        this.startHeartbeat();
        break;

      case 'CHANNEL_ERROR':
      case 'TIMED_OUT':
      case 'CLOSED':
      case 'left':
      case 'error':
        this.state.updateState({
          isConnected: false,
          isConnecting: false,
          connectionStatus: 'error',
          lastError: `Connexion fermée: ${status}`
        });
        this.scheduleReconnect();
        break;

      case 'joining':
        this.state.updateState({
          isConnecting: true,
          connectionStatus: 'connecting'
        });
        break;

      default:
        logger.warn(LogCategory.EDITOR, '[RealtimeConnection] Statut inconnu:', status);
    }
  }

  /**
   * Programme une reconnexion automatique
   */
  private scheduleReconnect(): void {
    if (!this.config?.autoReconnect || !this.state) return;
    if (this.reconnectTimer) return;

    const currentState = this.state.getState();
    const attempts = currentState.reconnectAttempts + 1;
    if (attempts > (this.config.maxReconnectAttempts || 10)) {
      logger.error(LogCategory.EDITOR, '[RealtimeConnection] ❌ Nombre maximum de tentatives de reconnexion atteint');
      return;
    }

    const delay = (this.config.reconnectDelay || 2000) * Math.pow(1.5, attempts - 1);
    
    logger.info(LogCategory.EDITOR, '[RealtimeConnection] 🔄 Reconnexion programmée', {
      attempt: attempts,
      delay: `${delay}ms`
    });

    this.state.updateState({ reconnectAttempts: attempts });

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      try {
        await this.connect();
      } catch (error) {
        logger.error(LogCategory.EDITOR, '[RealtimeConnection] Erreur lors de la reconnexion:', error);
      }
    }, delay);
  }

  /**
   * Démarre le heartbeat pour maintenir la connexion
   */
  public startHeartbeat(): void {
    this.stopHeartbeat();
    
    if (!this.channel || !this.state) return;

    this.heartbeatTimer = setInterval(() => {
      if (this.channel && this.state?.getState().isConnected) {
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
  public stopHeartbeat(): void {
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
      if (!this.config || !this.state) return;

      if (document.visibilityState === 'visible' && !this.state.getState().isConnected) {
        logger.info(LogCategory.EDITOR, '[RealtimeConnection] 🔄 Page visible - reconnexion automatique');
        this.connect().catch(error => {
          logger.error(LogCategory.EDITOR, '[RealtimeConnection] Erreur reconnexion page visible:', error);
        });
      } else if (document.visibilityState === 'hidden' && this.state.getState().isConnected) {
        logger.info(LogCategory.EDITOR, '[RealtimeConnection] 👁️ Page cachée - connexion maintenue');
        // On maintient la connexion même quand la page est cachée
        // pour recevoir les mises à jour LLM
      }
    };

    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  /**
   * Déconnecte la connexion
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
        logger.warn(LogCategory.EDITOR, '[RealtimeConnection] Erreur lors de la déconnexion du canal:', error);
      }
      this.channel = null;
    }

    if (this.state) {
      this.state.updateState({
        isConnected: false,
        isConnecting: false,
        connectionStatus: 'disconnected',
        reconnectAttempts: 0
      });
    }

    logger.info(LogCategory.EDITOR, '[RealtimeConnection] 🔌 Déconnecté');
  }

  /**
   * Obtient le canal actuel
   */
  public getChannel(): RealtimeChannel | null {
    return this.channel;
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
  }
}

