/**
 * RealtimeEvents - Gestion des événements Realtime
 * 
 * Responsabilités:
 * - Configuration des écouteurs d'événements du canal
 * - Dispatch des événements vers le store
 * - Gestion des événements broadcast et presence
 */

import type { RealtimeChannel } from '@supabase/supabase-js';
import { logger, LogCategory } from '@/utils/logger';
import { handleRealtimeEvent } from '@/realtime/dispatcher';
import type { RealtimeEditorEvent } from './RealtimeState';
import type { RealtimeState } from './RealtimeState';

export interface RealtimeEventsConfig {
  debug?: boolean;
  noteId: string;
  userId: string;
}

/**
 * Gestionnaire d'événements pour RealtimeEditorService
 */
export class RealtimeEvents {
  private config: RealtimeEventsConfig | null = null;
  private state: RealtimeState | null = null;

  constructor(config: RealtimeEventsConfig, state: RealtimeState) {
    this.config = config;
    this.state = state;
  }

  /**
   * Configure les écouteurs d'événements du canal
   */
  public setupChannelListeners(channel: RealtimeChannel): void {
    if (!this.config || !this.state) return;

    // Événements de broadcast (changements LLM)
    channel.on('broadcast', { event: 'editor_update' }, (payload) => {
      this.handleEditorEvent({
        type: 'editor.update',
        payload: payload.payload,
        timestamp: Date.now(),
        source: 'llm'
      });
    });

    channel.on('broadcast', { event: 'editor_insert' }, (payload) => {
      this.handleEditorEvent({
        type: 'editor.insert',
        payload: payload.payload,
        timestamp: Date.now(),
        source: 'llm'
      });
    });

    channel.on('broadcast', { event: 'editor_delete' }, (payload) => {
      this.handleEditorEvent({
        type: 'editor.delete',
        payload: payload.payload,
        timestamp: Date.now(),
        source: 'llm'
      });
    });

    // Événements de présence (utilisateurs connectés)
    channel.on('presence', { event: 'sync' }, () => {
      this.state?.updateState({ lastActivity: Date.now() });
    });

    channel.on('presence', { event: 'join' }, ({ key, newPresences }) => {
      if (this.config?.debug) {
        logger.info(LogCategory.EDITOR, '[RealtimeEvents] Utilisateur rejoint:', { key, newPresences });
      }
    });

    channel.on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
      if (this.config?.debug) {
        logger.info(LogCategory.EDITOR, '[RealtimeEvents] Utilisateur quitte:', { key, leftPresences });
      }
    });
  }

  /**
   * Gère les événements de l'éditeur
   */
  private handleEditorEvent(event: RealtimeEditorEvent): void {
    if (!this.config || !this.state) return;

    this.state.updateState({ lastActivity: Date.now() });

    // Logger en mode debug
    if (this.config.debug) {
      logger.info(LogCategory.EDITOR, '[RealtimeEvents] Événement reçu:', {
        type: event.type,
        source: event.source,
        payload: event.payload
      });
    }

    // Dispatcher vers le store Zustand (payload normalisée)
    const normalizedPayload = (event.payload && typeof event.payload === 'object')
      ? event.payload as Record<string, unknown>
      : {};
    handleRealtimeEvent(
      { 
        type: event.type, 
        payload: normalizedPayload as Record<string, unknown>, 
        timestamp: event.timestamp 
      }, 
      this.config.debug
    );

    // Notifier les callbacks via le state manager
    this.state.notifyEvent(event);
  }
}

