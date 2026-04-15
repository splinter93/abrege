import { ChatSessionService } from './chatSessionService';
import type { ChatMessage, ChatSession } from '@/types/chat';
import { simpleLogger as logger } from '@/utils/logger';
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
  /** Mappe une ligne API / DB vers ChatSession (champs optionnels tolérés). */
  private mapSessionRow(session: Partial<ChatSession> & Pick<ChatSession, 'id'>): ChatSession {
    return {
      id: session.id,
      user_id: session.user_id ?? '',
      name: session.name ?? '',
      agent_id: session.agent_id ?? null,
      is_active: session.is_active ?? true,
      is_empty: session.is_empty ?? true,
      metadata: session.metadata ?? {},
      created_at: session.created_at ?? new Date().toISOString(),
      updated_at: session.updated_at ?? new Date().toISOString(),
      last_message_at: session.last_message_at ?? null,
    };
  }

  async syncSessionsFromDB(): Promise<{
    success: boolean;
    sessions?: ChatSession[];
    hasMore?: boolean;
    error?: string;
  }> {
    try {
      const response = await this.chatSessionService.getSessions();

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Erreur récupération sessions');
      }

      const convertedSessions: ChatSession[] = response.data.map((s) => this.mapSessionRow(s));

      return {
        success: true,
        sessions: convertedSessions,
        hasMore: response.hasMore ?? false,
      };
    } catch (error) {
      logger.error('[SessionSync] ❌ Erreur synchronisation:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  /**
   * Page suivante de sessions (plus anciennes), curseur = last_message_at de la dernière session chargée.
   */
  async loadOlderSessionsFromDB(beforeDate: string): Promise<{
    success: boolean;
    sessions?: ChatSession[];
    hasMore?: boolean;
    error?: string;
  }> {
    try {
      const response = await this.chatSessionService.getSessions({
        before_date: beforeDate,
        limit: 100,
      });

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Erreur récupération sessions');
      }

      const convertedSessions: ChatSession[] = response.data.map((s) => this.mapSessionRow(s));

      return {
        success: true,
        sessions: convertedSessions,
        hasMore: response.hasMore ?? false,
      };
    } catch (error) {
      logger.error('[SessionSync] ❌ Erreur loadOlderSessions:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
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
        user_id: response.data.user_id ?? '',
        name: response.data.name ?? '',
        agent_id: response.data.agent_id || null,
        is_active: response.data.is_active ?? true,
        is_empty: response.data.is_empty ?? true, // 🔥 Mapper is_empty
        metadata: response.data.metadata ?? {},
        created_at: response.data.created_at ?? new Date().toISOString(),
        updated_at: response.data.updated_at ?? new Date().toISOString(),
        last_message_at: response.data.last_message_at ?? null,
      };

      return {
        success: true,
        session
      };

    } catch (error) {
      logger.error('[SessionSync] ❌ Erreur création session:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * 💬 Ajouter un message en DB puis synchroniser
   * ✅ NOUVEAU: Appelle route API /messages/add (atomique via HistoryManager)
   * ✅ Déduplication via operation_id (idempotence)
   */
  async addMessageAndSync(sessionId: string, message: Omit<ChatMessage, 'id'>): Promise<{
    success: boolean;
    message?: ChatMessage;
    error?: string;
  }> {
    try {
      logger.dev('[SessionSync] 🚀 Début addMessageAndSync:', {
        sessionId,
        messageRole: message.role,
        hasOperationId: !!message.operation_id
      });
      
      return await this.runExclusive(sessionId, async () => {
        logger.dev('[SessionSync] 🔒 Dans runExclusive, appel route /messages/add...');
        
        // ✅ Récupérer token auth
        const { supabase } = await import('@/supabaseClient');
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        
        if (!token) {
          throw new Error('Authentification requise');
        }
        
        // ✅ Appel route API (serveur) qui utilise HistoryManager avec SERVICE_ROLE
        // Note: la déduplication par operation_id est gérée atomiquement par add_message_atomic.
        // Si le message existe déjà (ex: serveur a sauvegardé l'assistant avant le client),
        // add_message_atomic retourne la ligne existante PUIS HistoryManager fait le UPDATE
        // des champs JSONB (stream_timeline, tool_results). Sans cet appel, stream_timeline
        // n'est jamais persisté en DB.
        const response = await fetch(`/api/chat/sessions/${sessionId}/messages/add`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(message)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const result = await response.json();
        
        if (!result.success || !result.data?.message) {
          throw new Error('Message sauvegardé vide');
        }
        
        const savedMessage = result.data.message;
        
        logger.dev('[SessionSync] ✅ Message sauvegardé via route API:', {
          sessionId,
          role: savedMessage.role,
          sequenceNumber: savedMessage.sequence_number,
          contentPreview: savedMessage.content?.substring(0, 50)
        });
        
        return { 
          success: true,
          message: savedMessage
        };
      });
    } catch (error) {
      const errorDetails = {
        errorType: error?.constructor?.name || 'Unknown',
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        sessionId,
        messageRole: message.role,
        messageContent: message.content?.substring(0, 100)
      };
      
      logger.error('[SessionSync] ❌ Erreur ajout message:', errorDetails);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
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
      logger.error('[SessionSync] ❌ Erreur suppression session:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * ⚙️ Mettre à jour une session en DB puis synchroniser
   */
  async updateSessionAndSync(sessionId: string, data: { name?: string }): Promise<{
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
      logger.error('[SessionSync] ❌ Erreur mise à jour session:', error);
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
      logger.error('[SessionSync] ❌ Erreur ajout batch:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }
}

// Export de l'instance singleton
export const sessionSyncService = SessionSyncService.getInstance(); 