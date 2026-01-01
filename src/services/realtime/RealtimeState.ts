/**
 * RealtimeState - Gestion de l'état de connexion Realtime
 * 
 * Responsabilités:
 * - État de connexion (isConnected, isConnecting, status)
 * - Callbacks management (onStateChange, onEvent)
 * - Mise à jour état avec notifications
 */

import { logger, LogCategory } from '@/utils/logger';

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
  payload: unknown;
  timestamp: number;
  source: 'llm' | 'user' | 'system';
}

/**
 * Gestionnaire d'état pour RealtimeEditorService
 */
export class RealtimeState {
  private state: RealtimeEditorState = {
    isConnected: false,
    isConnecting: false,
    connectionStatus: 'disconnected',
    lastError: null,
    reconnectAttempts: 0,
    lastActivity: 0
  };

  private onStateChangeCallbacks: Set<(state: RealtimeEditorState) => void> = new Set();
  private onEventCallbacks: Set<(event: RealtimeEditorEvent) => void> = new Set();

  /**
   * Met à jour l'état et notifie les callbacks
   */
  public updateState(updates: Partial<RealtimeEditorState>): void {
    this.state = { ...this.state, ...updates };
    
    this.onStateChangeCallbacks.forEach(callback => {
      try {
        callback(this.state);
      } catch (error) {
        logger.error(LogCategory.EDITOR, '[RealtimeState] Erreur dans callback état:', error);
      }
    });
  }

  /**
   * Obtient l'état actuel
   */
  public getState(): RealtimeEditorState {
    return { ...this.state };
  }

  /**
   * S'abonne aux changements d'état
   */
  public onStateChange(callback: (state: RealtimeEditorState) => void): () => void {
    this.onStateChangeCallbacks.add(callback);
    return () => this.onStateChangeCallbacks.delete(callback);
  }

  /**
   * Notifie les callbacks d'événements
   */
  public notifyEvent(event: RealtimeEditorEvent): void {
    this.onEventCallbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        logger.error(LogCategory.EDITOR, '[RealtimeState] Erreur dans callback événement:', error);
      }
    });
  }

  /**
   * S'abonne aux événements
   */
  public onEvent(callback: (event: RealtimeEditorEvent) => void): () => void {
    this.onEventCallbacks.add(callback);
    return () => this.onEventCallbacks.delete(callback);
  }

  /**
   * Nettoie les callbacks
   */
  public clearCallbacks(): void {
    this.onStateChangeCallbacks.clear();
    this.onEventCallbacks.clear();
  }
}

