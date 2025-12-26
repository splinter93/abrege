/**
 * 🌊 Stream Broadcast Service
 * 
 * Gestion centralisée des connexions SSE et broadcast des chunks
 * vers les clients écoutant une note spécifique.
 * 
 * Architecture:
 * - In-memory Map<noteId, Set<listeners>>
 * - Singleton pattern
 * - Thread-safe avec runExclusive
 * - Auto-cleanup des connexions stalées
 */

import { logApi } from '@/utils/logger';

/**
 * Event diffusé via SSE aux clients
 */
export interface StreamEvent {
  type: 'chunk' | 'end' | 'error' | 'start' | 'content_updated';
  data?: string;
  position?: 'end' | 'start' | 'cursor';
  metadata?: {
    tool_call_id?: string;
    agent_id?: string;
    timestamp?: number;
    source?: string; // e.g., 'content:apply', 'stream:write'
  };
}

/**
 * Listener SSE (fonction qui envoie des données via SSE)
 */
type SSEListener = (event: StreamEvent) => void;

/**
 * Metadata d'un listener (pour cleanup et debugging)
 */
interface ListenerMetadata {
  listener: SSEListener;
  connectedAt: number;
  lastActivity: number;
  userId?: string;
}

/**
 * Service singleton de gestion des streams SSE
 */
class StreamBroadcastService {
  private listeners: Map<string, Set<ListenerMetadata>> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private queues: Map<string, Promise<unknown>> = new Map();

  constructor() {
    // Cleanup automatique des connexions stalées toutes les 60s
    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleConnections();
    }, 60000);
  }

  /**
   * Pattern runExclusive pour opérations thread-safe
   */
  private async runExclusive<T>(
    id: string,
    fn: () => Promise<T> | T
  ): Promise<T> {
    const prev = this.queues.get(id) || Promise.resolve();
    let resolveNext: (value: unknown) => void;
    const next = new Promise((resolve) => (resolveNext = resolve));
    this.queues.set(id, prev.then(() => next));

    try {
      const result = await fn();
      return result;
    } finally {
      resolveNext!(null);
      if (this.queues.get(id) === next) {
        this.queues.delete(id);
      }
    }
  }

  /**
   * Enregistrer un listener pour une note
   */
  async registerListener(
    noteId: string,
    listener: SSEListener,
    userId?: string
  ): Promise<void> {
    return this.runExclusive(`register-${noteId}`, () => {
      if (!this.listeners.has(noteId)) {
        this.listeners.set(noteId, new Set());
      }

      const metadata: ListenerMetadata = {
        listener,
        connectedAt: Date.now(),
        lastActivity: Date.now(),
        userId
      };

      this.listeners.get(noteId)!.add(metadata);

      logApi.info(`[StreamBroadcast] Listener registered`, {
        noteId,
        userId,
        totalListeners: this.listeners.get(noteId)!.size
      });
    });
  }

  /**
   * Désinscrire un listener
   */
  async unregisterListener(
    noteId: string,
    listener: SSEListener
  ): Promise<void> {
    return this.runExclusive(`unregister-${noteId}`, () => {
      const noteListeners = this.listeners.get(noteId);
      if (!noteListeners) return;

      // Trouver et supprimer le listener
      for (const metadata of noteListeners) {
        if (metadata.listener === listener) {
          noteListeners.delete(metadata);
          break;
        }
      }

      // Cleanup si plus de listeners
      if (noteListeners.size === 0) {
        this.listeners.delete(noteId);
      }

      logApi.info(`[StreamBroadcast] Listener unregistered`, {
        noteId,
        remainingListeners: noteListeners.size
      });
    });
  }

  /**
   * Broadcaster un event à tous les listeners d'une note
   */
  async broadcast(noteId: string, event: StreamEvent): Promise<number> {
    return this.runExclusive(`broadcast-${noteId}`, () => {
      const noteListeners = this.listeners.get(noteId);
      if (!noteListeners || noteListeners.size === 0) {
        logApi.warn(`[StreamBroadcast] ⚠️ No listeners for note ${noteId} - event will not be delivered`, {
          noteId,
          eventType: event.type
        });
        return 0;
      }

      let successCount = 0;
      const failedListeners: ListenerMetadata[] = [];

      // Broadcaster à tous les listeners
      for (const metadata of noteListeners) {
        try {
          metadata.listener(event);
          metadata.lastActivity = Date.now();
          successCount++;
        } catch (error) {
          logApi.error(`[StreamBroadcast] Failed to send to listener`, {
            noteId,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          failedListeners.push(metadata);
        }
      }

      // Cleanup des listeners qui ont échoué
      failedListeners.forEach((metadata) => {
        noteListeners.delete(metadata);
      });

      if (successCount === 0) {
        logApi.warn(`[StreamBroadcast] ⚠️ Event broadcasted but NO listeners reached`, {
          noteId,
          eventType: event.type,
          listenersReached: successCount,
          listenersFailed: failedListeners.length,
          totalListeners: noteListeners.size
        });
      } else {
        logApi.info(`[StreamBroadcast] ✅ Event broadcasted`, {
          noteId,
          eventType: event.type,
          listenersReached: successCount,
          listenersFailed: failedListeners.length
        });
      }

      return successCount;
    });
  }

  /**
   * Nettoyer les connexions stalées (> 5min sans activité)
   */
  private cleanupStaleConnections(): void {
    const now = Date.now();
    const staleThreshold = 5 * 60 * 1000; // 5 minutes
    let cleanedCount = 0;

    for (const [noteId, noteListeners] of this.listeners.entries()) {
      const staleListeners: ListenerMetadata[] = [];

      for (const metadata of noteListeners) {
        if (now - metadata.lastActivity > staleThreshold) {
          staleListeners.push(metadata);
        }
      }

      // Supprimer les listeners stalés
      staleListeners.forEach((metadata) => {
        noteListeners.delete(metadata);
        cleanedCount++;
      });

      // Cleanup de la note si plus de listeners
      if (noteListeners.size === 0) {
        this.listeners.delete(noteId);
      }
    }

    if (cleanedCount > 0) {
      logApi.info(`[StreamBroadcast] Cleaned up stale connections`, {
        cleanedCount,
        activeNotes: this.listeners.size
      });
    }
  }

  /**
   * Obtenir le nombre de listeners pour une note
   */
  getListenerCount(noteId: string): number {
    return this.listeners.get(noteId)?.size || 0;
  }

  /**
   * Obtenir les stats globales
   */
  getStats(): {
    totalNotes: number;
    totalListeners: number;
    noteStats: Array<{ noteId: string; listeners: number }>;
  } {
    const noteStats: Array<{ noteId: string; listeners: number }> = [];
    let totalListeners = 0;

    for (const [noteId, listeners] of this.listeners.entries()) {
      noteStats.push({ noteId, listeners: listeners.size });
      totalListeners += listeners.size;
    }

    return {
      totalNotes: this.listeners.size,
      totalListeners,
      noteStats
    };
  }

  /**
   * Cleanup pour shutdown gracieux
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.listeners.clear();
    this.queues.clear();
  }
}

// Export singleton instance
export const streamBroadcastService = new StreamBroadcastService();







