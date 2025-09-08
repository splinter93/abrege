/**
 * 🔄 DatabaseRealtimeService - Service pour écouter les événements de base de données Supabase
 * 
 * Ce service s'abonne aux événements de la table 'articles' et les convertit
 * en événements RealtimeEditor pour synchroniser l'éditeur en temps réel.
 */

import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/supabaseClient';
import { logger, LogCategory } from '@/utils/logger';
import { handleRealtimeEvent } from '@/realtime/dispatcher';

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

export interface DatabaseEvent {
  schema: string;
  table: string;
  commit_timestamp: string;
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: Record<string, unknown> | null;
  old: Record<string, unknown> | null;
  errors: unknown;
  latency: number;
}

export interface ArticleRecord {
  id: string;
  user_id: string;
  markdown_content?: string;
  html_content?: string;
  source_title?: string;
  updated_at: string;
  [key: string]: unknown;
}

export interface RealtimeEvent {
  type: string;
  payload: Record<string, unknown>;
  timestamp: number;
}

export interface DatabaseRealtimeConfig {
  userId: string;
  debug?: boolean;
  autoReconnect?: boolean;
}

export interface DatabaseRealtimeState {
  isConnected: boolean;
  isConnecting: boolean;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  lastError: string | null;
  reconnectAttempts: number;
}

/**
 * Service pour écouter les événements de base de données et les convertir en événements RealtimeEditor
 */
export class DatabaseRealtimeService {
  private static instance: DatabaseRealtimeService | null = null;
  
  private config: DatabaseRealtimeConfig | null = null;
  private state: DatabaseRealtimeState = {
    isConnected: false,
    isConnecting: false,
    connectionStatus: 'disconnected',
    lastError: null,
    reconnectAttempts: 0
  };

  private channel: RealtimeChannel | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;

  // Callbacks
  private onStateChangeCallbacks: Set<(state: DatabaseRealtimeState) => void> = new Set();

  private constructor() {}

  /**
   * Singleton pattern
   */
  public static getInstance(): DatabaseRealtimeService {
    if (!DatabaseRealtimeService.instance) {
      DatabaseRealtimeService.instance = new DatabaseRealtimeService();
    }
    return DatabaseRealtimeService.instance;
  }

  /**
   * Initialise le service avec une configuration
   */
  public async initialize(config: DatabaseRealtimeConfig): Promise<void> {
    // Validation des paramètres
    if (!config || typeof config !== 'object') {
      throw new Error('Configuration invalide');
    }
    
    if (!config.userId || typeof config.userId !== 'string' || config.userId.trim() === '' || config.userId === 'anonymous') {
      throw new Error('userId est requis et doit être une chaîne non vide (pas "anonymous")');
    }

    if (this.config && this.config.userId === config.userId) {
      logger.info(LogCategory.EDITOR, '[DatabaseRealtime] Service déjà initialisé pour cet utilisateur');
      return;
    }

    // Si on a déjà un service initialisé avec un autre utilisateur, le déconnecter d'abord
    if (this.config && this.config.userId !== config.userId) {
      logger.info(LogCategory.EDITOR, '[DatabaseRealtime] Changement d\'utilisateur, déconnexion de l\'ancien service');
      await this.disconnect();
    }

    this.config = {
      debug: false,
      autoReconnect: true,
      ...config
    };

    logger.info(LogCategory.EDITOR, '[DatabaseRealtime] Initialisation du service', {
      userId: config.userId,
      debug: this.config.debug
    });

    await this.connect();
  }

  /**
   * Établit la connexion aux événements de base de données
   */
  private async connect(): Promise<void> {
    if (!this.config) {
      throw new Error('Service non initialisé');
    }

    if (this.state.isConnecting || this.state.isConnected) {
      logger.warn(LogCategory.EDITOR, '[DatabaseRealtime] Connexion déjà en cours ou établie');
      return;
    }

    this.updateState({
      isConnecting: true,
      connectionStatus: 'connecting',
      lastError: null
    });

    try {
      // Vérifier l'authentification avant de s'abonner
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      if (authError) {
        logger.warn(LogCategory.EDITOR, '[DatabaseRealtime] Erreur d\'authentification:', authError.message);
        throw new Error(`Erreur d'authentification: ${authError.message}`);
      }
      
      if (!session) {
        logger.warn(LogCategory.EDITOR, '[DatabaseRealtime] Aucune session authentifiée - impossible de s\'abonner aux événements de base de données');
        throw new Error('Aucune session authentifiée - Realtime nécessite une authentification');
      }

      if (this.config?.debug) {
        logger.info(LogCategory.EDITOR, '[DatabaseRealtime] Session authentifiée:', {
          userId: session.user.id,
          email: session.user.email,
          expiresAt: session.expires_at
        });
      }

      // Nettoyer l'ancienne connexion si elle existe
      await this.disconnect();

      // Créer le canal pour écouter les changements de la table articles
      this.channel = supabase
        .channel('database-changes')
        .on(
          'postgres_changes',
          {
            event: '*', // INSERT, UPDATE, DELETE
            schema: 'public',
            table: 'articles',
            filter: `user_id=eq.${this.config.userId}` // Seulement les articles de cet utilisateur
          },
          (payload) => {
            this.handleDatabaseEvent(payload);
          }
        );

      // S'abonner au canal
      const response = await this.channel.subscribe((status) => {
        this.handleSubscriptionStatus(status);
      });

      if (this.config?.debug) {
        logger.info(LogCategory.EDITOR, '[DatabaseRealtime] Réponse de souscription:', {
          status,
          response: safeStringify(response)
        });
      }

      // La réponse de subscribe() peut être 'SUBSCRIBED' ou un objet avec state 'joining'
      if (response === 'SUBSCRIBED' || (response && typeof response === 'object' && response.state === 'joining')) {
        if (response === 'SUBSCRIBED') {
          // Connexion immédiate
          this.updateState({
            isConnected: true,
            isConnecting: false,
            connectionStatus: 'connected',
            reconnectAttempts: 0
          });
          logger.info(LogCategory.EDITOR, '[DatabaseRealtime] ✅ Connexion aux événements de base de données établie immédiatement');
        } else {
          // En cours de connexion - le callback handleSubscriptionStatus gérera la suite
          logger.info(LogCategory.EDITOR, '[DatabaseRealtime] 🔄 Connexion aux événements de base de données en cours...');
        }
      } else {
        throw new Error(`Échec de la souscription: ${safeStringify(response)}`);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      logger.error(LogCategory.EDITOR, '[DatabaseRealtime] ❌ Erreur de connexion:', {
        error: errorMessage,
        userId: this.config?.userId,
        errorType: typeof error
      });
      
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
   * Gère les événements de base de données
   */
  private handleDatabaseEvent(payload: unknown): void {
    if (!this.config) return;

    // Validation du payload
    if (!payload || typeof payload !== 'object') {
      logger.warn(LogCategory.EDITOR, '[DatabaseRealtime] Payload invalide reçu:', payload);
      return;
    }

    const event = payload as DatabaseEvent;

    // Validation des champs requis
    if (!event.eventType || !event.table) {
      logger.warn(LogCategory.EDITOR, '[DatabaseRealtime] Événement malformé:', event);
      return;
    }

    // Vérifier que c'est bien un événement de la table articles
    if (event.table !== 'articles') {
      if (this.config.debug) {
        logger.debug(LogCategory.EDITOR, '[DatabaseRealtime] Événement ignoré (table différente):', event.table);
      }
      return;
    }

    if (this.config.debug) {
      logger.info(LogCategory.EDITOR, '[DatabaseRealtime] Événement de base de données reçu:', {
        eventType: event.eventType,
        table: event.table,
        recordId: (event.new as ArticleRecord)?.id || (event.old as ArticleRecord)?.id
      });
    }

    // Convertir l'événement de base de données en événement RealtimeEditor
    const realtimeEvent = this.convertDatabaseEventToRealtimeEvent(event);
    
    if (realtimeEvent) {
      try {
        // Envoyer l'événement au dispatcher RealtimeEditor
        handleRealtimeEvent(realtimeEvent, this.config.debug);
        
        if (this.config.debug) {
          logger.info(LogCategory.EDITOR, '[DatabaseRealtime] Événement converti et envoyé:', {
            type: realtimeEvent.type,
            noteId: realtimeEvent.payload.id
          });
        }
      } catch (error) {
        logger.error(LogCategory.EDITOR, '[DatabaseRealtime] Erreur lors de l\'envoi de l\'événement:', error);
      }
    }
  }

  /**
   * Convertit un événement de base de données en événement RealtimeEditor
   */
  private convertDatabaseEventToRealtimeEvent(event: DatabaseEvent): RealtimeEvent | null {
    const { eventType, new: newRecord, old: oldRecord } = event;

    // Validation des types d'événements
    if (!['INSERT', 'UPDATE', 'DELETE'].includes(eventType)) {
      if (this.config?.debug) {
        logger.warn(LogCategory.EDITOR, '[DatabaseRealtime] Type d\'événement non géré:', eventType);
      }
      return null;
    }

    switch (eventType) {
      case 'INSERT':
        if (!newRecord || typeof newRecord !== 'object') {
          logger.warn(LogCategory.EDITOR, '[DatabaseRealtime] Record INSERT invalide:', newRecord);
          return null;
        }
        return {
          type: 'note.created',
          payload: newRecord,
          timestamp: Date.now()
        };

      case 'UPDATE':
        if (!newRecord || typeof newRecord !== 'object') {
          logger.warn(LogCategory.EDITOR, '[DatabaseRealtime] Record UPDATE invalide:', newRecord);
          return null;
        }

        // Vérifier si c'est une mise à jour de contenu significative
        if (oldRecord && typeof oldRecord === 'object') {
          const newArticle = newRecord as ArticleRecord;
          const oldArticle = oldRecord as ArticleRecord;
          
          const contentChanged = newArticle.markdown_content !== oldArticle.markdown_content ||
                                newArticle.html_content !== oldArticle.html_content;
          
          const titleChanged = newArticle.source_title !== oldArticle.source_title;
          
          // Ne traiter que les changements de contenu ou de titre
          if (contentChanged || titleChanged) {
            if (this.config?.debug) {
              logger.info(LogCategory.EDITOR, '[DatabaseRealtime] Changement de contenu détecté:', {
                contentChanged,
                titleChanged,
                noteId: newArticle.id
              });
            }
            return {
              type: 'note.updated',
              payload: newRecord,
              timestamp: Date.now()
            };
          } else {
            // Changement non significatif, ignorer
            if (this.config?.debug) {
              logger.debug(LogCategory.EDITOR, '[DatabaseRealtime] Mise à jour non significative ignorée:', newArticle.id);
            }
            return null;
          }
        }
        
        // Pas d'ancien record, traiter comme une mise à jour complète
        return {
          type: 'note.updated',
          payload: newRecord,
          timestamp: Date.now()
        };

      case 'DELETE':
        if (!oldRecord || typeof oldRecord !== 'object') {
          logger.warn(LogCategory.EDITOR, '[DatabaseRealtime] Record DELETE invalide:', oldRecord);
          return null;
        }
        
        const deletedArticle = oldRecord as ArticleRecord;
        return {
          type: 'note.deleted',
          payload: { id: deletedArticle.id },
          timestamp: Date.now()
        };

      default:
        return null;
    }
  }

  /**
   * Gère le statut de souscription
   */
  private handleSubscriptionStatus(status: string): void {
    if (this.config?.debug) {
      logger.info(LogCategory.EDITOR, '[DatabaseRealtime] Statut de souscription:', status);
    }

    switch (status) {
      case 'SUBSCRIBED':
        this.updateState({
          isConnected: true,
          isConnecting: false,
          connectionStatus: 'connected',
          reconnectAttempts: 0
        });
        break;

      case 'CHANNEL_ERROR':
      case 'TIMED_OUT':
      case 'CLOSED':
        this.updateState({
          isConnected: false,
          isConnecting: false,
          connectionStatus: 'error',
          lastError: `Connexion fermée: ${status}`
        });
        this.scheduleReconnect();
        break;

      default:
        if (this.config?.debug) {
          logger.warn(LogCategory.EDITOR, '[DatabaseRealtime] Statut inconnu:', status);
        }
    }
  }

  /**
   * Programme une reconnexion automatique
   */
  private scheduleReconnect(): void {
    if (!this.config?.autoReconnect) return;
    if (this.reconnectTimer) return;

    const attempts = this.state.reconnectAttempts + 1;
    if (attempts > 10) {
      logger.error(LogCategory.EDITOR, '[DatabaseRealtime] ❌ Nombre maximum de tentatives de reconnexion atteint');
      return;
    }

    const delay = 2000 * Math.pow(1.5, attempts - 1);
    
    logger.info(LogCategory.EDITOR, '[DatabaseRealtime] 🔄 Reconnexion programmée', {
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
   * Met à jour l'état et notifie les callbacks
   */
  private updateState(updates: Partial<DatabaseRealtimeState>): void {
    this.state = { ...this.state, ...updates };
    
    // Notifier les callbacks de manière sécurisée
    const callbacksToNotify = Array.from(this.onStateChangeCallbacks);
    callbacksToNotify.forEach(callback => {
      try {
        if (typeof callback === 'function') {
          callback(this.state);
        }
      } catch (error) {
        logger.error(LogCategory.EDITOR, '[DatabaseRealtime] Erreur dans callback état:', error);
        // Retirer le callback défaillant pour éviter les erreurs répétées
        this.onStateChangeCallbacks.delete(callback);
      }
    });
  }

  /**
   * Déconnecte le service
   */
  public async disconnect(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.channel) {
      try {
        await this.channel.unsubscribe();
      } catch (error) {
        logger.warn(LogCategory.EDITOR, '[DatabaseRealtime] Erreur lors de la déconnexion du canal:', error);
      }
      this.channel = null;
    }

    this.updateState({
      isConnected: false,
      isConnecting: false,
      connectionStatus: 'disconnected',
      reconnectAttempts: 0
    });

    logger.info(LogCategory.EDITOR, '[DatabaseRealtime] 🔌 Déconnecté');
  }

  /**
   * S'abonne aux changements d'état
   */
  public onStateChange(callback: (state: DatabaseRealtimeState) => void): () => void {
    if (typeof callback !== 'function') {
      throw new Error('Callback doit être une fonction');
    }
    
    this.onStateChangeCallbacks.add(callback);
    return () => this.onStateChangeCallbacks.delete(callback);
  }

  /**
   * Obtient l'état actuel
   */
  public getState(): DatabaseRealtimeState {
    return { ...this.state };
  }

  /**
   * Obtient la configuration actuelle
   */
  public getConfig(): DatabaseRealtimeConfig | null {
    return this.config ? { ...this.config } : null;
  }

  /**
   * Nettoie les ressources
   */
  public destroy(): void {
    this.disconnect();
    this.onStateChangeCallbacks.clear();
    DatabaseRealtimeService.instance = null;
    
    logger.info(LogCategory.EDITOR, '[DatabaseRealtime] 🗑️ Service détruit');
  }
}

// Export de l'instance singleton
export const databaseRealtimeService = DatabaseRealtimeService.getInstance();
