/**
 * RealtimeEditorService - Service principal pour la gestion Realtime de l'éditeur
 * 
 * Service orchestrateur qui utilise RealtimeConnection, RealtimeEvents et RealtimeState
 * pour gérer les connexions WebSocket Supabase Realtime spécifiquement pour l'éditeur.
 */

import { logger, LogCategory } from '@/utils/logger';
import { RealtimeConnection } from './RealtimeConnection';
import { RealtimeEvents } from './RealtimeEvents';
import { RealtimeState, type RealtimeEditorState, type RealtimeEditorEvent } from './RealtimeState';

export interface RealtimeEditorConfig {
  noteId: string;
  userId: string;
  debug?: boolean;
  autoReconnect?: boolean;
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
}

/**
 * Service principal pour la gestion Realtime de l'éditeur
 */
export class RealtimeEditorService {
  private static instance: RealtimeEditorService | null = null;
  
  private config: RealtimeEditorConfig | null = null;
  private state: RealtimeState;
  private connection: RealtimeConnection | null = null;
  private events: RealtimeEvents | null = null;

  private constructor() {
    // État initialisé avec valeurs par défaut
    this.state = new RealtimeState();
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

    // Créer les instances de connection et events
    this.connection = new RealtimeConnection(this.config, this.state);
    this.events = new RealtimeEvents(
      {
        debug: this.config.debug,
        noteId: this.config.noteId,
        userId: this.config.userId
      },
      this.state
    );

    // Établir la connexion
    const channel = await this.connection.connect();
    
    // Configurer les écouteurs d'événements
    if (this.events && channel) {
      this.events.setupChannelListeners(channel);
    }
  }

  /**
   * Déconnecte le service
   */
  public async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.disconnect();
    }
    logger.info(LogCategory.EDITOR, '[RealtimeEditor] 🔌 Déconnecté');
  }

  /**
   * Force une reconnexion
   */
  public async reconnect(): Promise<void> {
    logger.info(LogCategory.EDITOR, '[RealtimeEditor] 🔄 Reconnexion forcée');
    await this.disconnect();
    
    if (this.config) {
      await this.initialize(this.config);
    }
  }

  /**
   * Envoie un événement de broadcast
   */
  public async broadcast(event: string, payload: unknown): Promise<void> {
    const channel = this.connection?.getChannel();
    const state = this.state.getState();

    if (!channel || !state.isConnected) {
      logger.warn(LogCategory.EDITOR, '[RealtimeEditor] Impossible d\'envoyer - non connecté');
      return;
    }

    try {
      await channel.send({
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
    return this.state.onStateChange(callback);
  }

  /**
   * S'abonne aux événements
   */
  public onEvent(callback: (event: RealtimeEditorEvent) => void): () => void {
    return this.state.onEvent(callback);
  }

  /**
   * Obtient l'état actuel
   */
  public getState(): RealtimeEditorState {
    return this.state.getState();
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
    if (this.connection) {
      this.connection.destroy();
      this.connection = null;
    }
    
    this.events = null;
    this.state.clearCallbacks();
    this.config = null;
    
    RealtimeEditorService.instance = null;
    
    logger.info(LogCategory.EDITOR, '[RealtimeEditor] 🗑️ Service détruit');
  }
}

// Export de l'instance singleton
export const realtimeEditorService = RealtimeEditorService.getInstance();

// Ré-exporter les types pour compatibilité
export type { RealtimeEditorState, RealtimeEditorEvent };

