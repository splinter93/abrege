import { ChatSessionService } from './chatSessionService';
import type { ChatSession } from '@/store/useChatStore';
import type { ChatMessage } from '@/types/chat';
import { useChatStore } from '@/store/useChatStore';
import { logger } from '@/utils/logger';

/**
 * Service de synchronisation simplifié entre la DB et le store Zustand
 * Principe: DB = source de vérité, Store = cache léger
 */
export class SessionSyncService {
  private static instance: SessionSyncService;
  private chatSessionService: ChatSessionService;

  constructor() {
    this.chatSessionService = ChatSessionService.getInstance();
  }

  static getInstance(): SessionSyncService {
    if (!SessionSyncService.instance) {
      SessionSyncService.instance = new SessionSyncService();
    }
    return SessionSyncService.instance;
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
        history_limit: session.history_limit || 10,
        created_at: session.created_at,
        updated_at: session.updated_at
      }));
      
      return {
        success: true,
        sessions: convertedSessions
      };

    } catch (error) {
      logger.error('[SessionSync] ❌ Erreur synchronisation:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * ➕ Créer une session en DB puis synchroniser
   */
  async createSessionAndSync(name: string = 'Nouvelle conversation'): Promise<{
    success: boolean;
    session?: ChatSession;
    error?: string;
  }> {
    try {
      const response = await this.chatSessionService.createSession({ name });
      
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Erreur création session');
      }

      const session: ChatSession = {
        id: response.data.id,
        name: response.data.name,
        thread: response.data.thread || [],
        history_limit: response.data.history_limit || 10,
        created_at: response.data.created_at,
        updated_at: response.data.updated_at
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
   */
  async addMessageAndSync(sessionId: string, message: Omit<ChatMessage, 'id'>): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const response = await this.chatSessionService.addMessage(sessionId, message);
      
      if (!response.success) {
        throw new Error(response.error || 'Erreur ajout message');
      }

      return { success: true };

    } catch (error) {
      logger.error('[SessionSync] ❌ Erreur ajout message:', error);
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
  async updateSessionAndSync(sessionId: string, data: { name?: string; history_limit?: number }): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const response = await this.chatSessionService.updateSession(sessionId, data);
      
      if (!response.success) {
        throw new Error(response.error || 'Erreur mise à jour session');
      }

      return { success: true };

    } catch (error) {
      logger.error('[SessionSync] ❌ Erreur mise à jour session:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }
}

// Export de l'instance singleton
export const sessionSyncService = SessionSyncService.getInstance(); 