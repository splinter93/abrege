import { ChatSessionService } from './chatSessionService';
import type { ChatSession } from '@/store/useChatStore';
import type { ChatMessage } from '@/types/chat';
import { useChatStore } from '@/store/useChatStore';
import { logger } from '@/utils/logger';
import { batchMessageService } from './batchMessageService';

/**
 * Service de synchronisation simplifié entre la DB et le store Zustand
 * Principe: DB = source de vérité, Store = cache léger
 */
export class SessionSyncService {
  private static instance: SessionSyncService;
  private chatSessionService: ChatSessionService;
  private sessionQueues: Map<string, Promise<unknown>>;

  constructor() {
    this.chatSessionService = ChatSessionService.getInstance();
    this.sessionQueues = new Map();
  }

  static getInstance(): SessionSyncService {
    if (!SessionSyncService.instance) {
      SessionSyncService.instance = new SessionSyncService();
    }
    return SessionSyncService.instance;
  }

  /**
   * Exécuter des opérations de manière exclusive par session pour éviter les courses
   */
  private async runExclusive<T>(sessionId: string, fn: () => Promise<T>): Promise<T> {
    const previous = this.sessionQueues.get(sessionId) || Promise.resolve();
    let resolveNext: (value: unknown) => void;
    const next = new Promise((resolve) => (resolveNext = resolve));
    this.sessionQueues.set(sessionId, previous.then(() => next));
    try {
      const result = await fn();
      return result;
    } finally {
      // Libérer la file d'attente pour cette session
      resolveNext!(null);
      // Nettoyage si la promesse correspond toujours
      if (this.sessionQueues.get(sessionId) === next) {
        this.sessionQueues.delete(sessionId);
      }
    }
  }

  /**
   * 🔄 Synchroniser les sessions depuis la DB vers le store
   */
  async syncSessionsFromDB(): Promise<{
    success: boolean;
    sessions?: ChatSession[];
    error?: string;
  }> {
    try {
      const response = await this.chatSessionService.getSessions();
      
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Erreur récupération sessions');
      }

      // Conversion simple
      const convertedSessions = response.data.map(session => ({
        id: session.id,
        name: session.name,
        thread: session.thread || [],
        history_limit: session.history_limit || 30,
        agent_id: session.agent_id || null,
        created_at: session.created_at,
        updated_at: session.updated_at
      }));
      
      return {
        success: true,
        sessions: convertedSessions
      };

    } catch (error) {
      logger.error('API', '[SessionSync] ❌ Erreur synchronisation:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * ➕ Créer une session en DB puis synchroniser
   */
  async createSessionAndSync(name: string = 'Nouvelle conversation', agentId?: string | null): Promise<{
    success: boolean;
    session?: ChatSession;
    error?: string;
  }> {
    try {
      const response = await this.chatSessionService.createSession({ 
        name,
        agent_id: agentId 
      });
      
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Erreur création session');
      }

      const session: ChatSession = {
        id: response.data.id,
        name: response.data.name,
        thread: response.data.thread || [],
        history_limit: response.data.history_limit || 30,
        agent_id: response.data.agent_id || null,
        created_at: response.data.created_at,
        updated_at: response.data.updated_at
      };

      return {
        success: true,
        session
      };

    } catch (error) {
      logger.error('API', '[SessionSync] ❌ Erreur création session:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * 💬 Ajouter un message en DB puis synchroniser
   * ✅ CONSERVE toutes les données (tool_calls, tool_results, reasoning)
   */
  async addMessageAndSync(sessionId: string, message: Omit<ChatMessage, 'id'>): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      return await this.runExclusive(sessionId, async () => {
        // Ajouter timestamp si manquant pour garantir l'ordre
        const extMessage = message as Omit<ChatMessage, 'id'> & { 
          timestamp?: string; 
          tool_call_id?: string; 
        };
        const messageWithTimestamp = {
          ...message,
          timestamp: extMessage.timestamp || new Date().toISOString()
        } as Omit<ChatMessage, 'id'>;

        // 🔧 NOUVEAU : Ne plus persister les messages tool individuellement
        // Ils sont maintenant inclus dans les tool_results du message assistant
        if (messageWithTimestamp.role === 'tool' && extMessage.tool_call_id) {
          logger.debug('EDITOR', '[SessionSync] ⏭️ Message tool ignoré (inclus dans tool_results)', {
            tool_call_id: extMessage.tool_call_id
          });
          return { success: true }; // Ne rien faire, déjà géré via tool_results
        }

        // Par défaut, route simple
        logger.debug('EDITOR', '[SessionSync] 🔧 Persist via route simple');
        const response = await this.chatSessionService.addMessage(sessionId, messageWithTimestamp);
        if (!response.success) {
          throw new Error(response.error || 'Erreur ajout message');
        }
        return { success: true };
      });
    } catch (error) {
      logger.error('API', '[SessionSync] ❌ Erreur ajout message:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * 🗑️ Supprimer une session en DB puis synchroniser
   */
  async deleteSessionAndSync(sessionId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const response = await this.chatSessionService.deleteSession(sessionId);
      
      if (!response.success) {
        throw new Error(response.error || 'Erreur suppression session');
      }

      return { success: true };

    } catch (error) {
      logger.error('API', '[SessionSync] ❌ Erreur suppression session:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * ⚙️ Mettre à jour une session en DB puis synchroniser
   */
  async updateSessionAndSync(sessionId: string, data: { name?: string; history_limit?: number }): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      return await this.runExclusive(sessionId, async () => {
        const response = await this.chatSessionService.updateSession(sessionId, data);
        if (!response.success) {
          throw new Error(response.error || 'Erreur mise à jour session');
        }
        return { success: true };
      });
    } catch (error) {
      logger.error('API', '[SessionSync] ❌ Erreur mise à jour session:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Ajouter des messages en batch avec idempotence et déduplication côté serveur
   */
  async addBatchMessagesAndSync(sessionId: string, messages: Omit<ChatMessage, 'id'>[], options?: { operationId?: string; relanceIndex?: number }): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      return await this.runExclusive(sessionId, async () => {
        const result = await batchMessageService.addBatchMessages({
          sessionId,
          messages,
          operationId: options?.operationId,
          relanceIndex: typeof options?.relanceIndex === 'number' ? options!.relanceIndex : 0
        });
        if (!result.success) {
          throw new Error(result.error || 'Erreur ajout batch');
        }
        return { success: true };
      });
    } catch (error) {
      logger.error('API', '[SessionSync] ❌ Erreur ajout batch:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }
}

// Export de l'instance singleton
export const sessionSyncService = SessionSyncService.getInstance(); 