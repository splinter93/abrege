import { ChatSessionService } from './chatSessionService';
import type { ChatSession } from '@/store/useChatStore';
import type { ChatMessage } from '@/types/chat';
import { useChatStore } from '@/store/useChatStore';
import { logger } from '@/utils/logger';

// Types locaux pour la conversion
interface LocalChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string | null;
  timestamp: string | Date;
  isStreaming?: boolean;
  // Support pour les tool calls (format DeepSeek)
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }>;
  tool_call_id?: string; // Pour les messages tool
}

interface LocalChatSession {
  id: string;
  name: string;
  thread: LocalChatMessage[];
  history_limit: number;
  created_at: string;
  updated_at: string;
}

/**
 * Service de synchronisation entre la DB et le store Zustand
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
   * DB → Store (source de vérité → cache)
   */
  async syncSessionsFromDB(): Promise<{
    success: boolean;
    sessions?: ChatSession[];
    error?: string;
  }> {
    try {
      logger.debug('[SessionSync] 🔄 Synchronisation sessions depuis DB...');
      
      // 1. Récupérer depuis la DB (source de vérité)
      const response = await this.chatSessionService.getSessions();
      
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Erreur récupération sessions');
      }

      // 2. Convertir les sessions pour le store
      const convertedSessions = response.data.map(convertApiSessionToStore);
      
      logger.debug('[SessionSync] ✅ Sessions converties:', convertedSessions.length);
      logger.debug('[SessionSync] ✅ Synchronisation réussie:', response.data.length, 'sessions');
      logger.debug('[SessionSync] 📊 Sessions à retourner:', convertedSessions.length);
      
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
   * DB → Store (création → cache)
   */
  async createSessionAndSync(name: string = 'Nouvelle conversation'): Promise<{
    success: boolean;
    session?: ChatSession;
    error?: string;
  }> {
    try {
      logger.debug('[SessionSync] ➕ Création session en DB...');
      
      // 1. Créer en DB (source de vérité)
      const response = await this.chatSessionService.createSession({
        name,
        history_limit: 10
      });
      
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Erreur création session');
      }

      // 2. Synchroniser depuis la DB (pour avoir la version à jour)
      await this.syncSessionsFromDB();
      
      logger.debug('[SessionSync] ✅ Session créée et synchronisée:', response.data.name);
      
      return {
        success: true,
        session: convertApiSessionToStore(response.data)
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
   * DB → Store (ajout → cache)
   */
  async addMessageAndSync(sessionId: string, message: Omit<ChatMessage, 'id'>): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      logger.debug('[SessionSync] 💬 Ajout message en DB...');
      
      // Vérifier si c'est une session temporaire
      if (sessionId.startsWith('temp-')) {
        logger.debug('[SessionSync] ⚠️ Session temporaire, mise à jour locale uniquement');
        
        // Mettre à jour le store localement sans appeler l'API
        const store = useChatStore.getState();
        const currentSession = store.currentSession;
        
        if (currentSession && currentSession.id === sessionId) {
          const updatedThread = [...currentSession.thread, {
            ...message,
            id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          }];
          
          const updatedSession = {
            ...currentSession,
            thread: updatedThread
          };
          
          store.setCurrentSession(updatedSession);
          logger.debug('[SessionSync] ✅ Message ajouté localement à la session temporaire');
        }
        
        return {
          success: true
        };
      }
      
      // 1. Ajouter en DB (source de vérité) avec conversion des types
      const apiMessage = convertStoreMessageToApi(message);
      const response = await this.chatSessionService.addMessage(sessionId, apiMessage);
      
      if (!response.success) {
        throw new Error(response.error || 'Erreur ajout message');
      }

      // 🔧 ANTI-DOUBLON: Ne pas synchroniser automatiquement après chaque ajout
      // await this.syncSessionsFromDB();
      
      logger.debug('[SessionSync] ✅ Message ajouté (sans sync automatique)');
      
      return {
        success: true
      };

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
   * DB → Store (suppression → cache)
   */
  async deleteSessionAndSync(sessionId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      logger.debug('[SessionSync] 🗑️ Suppression session en DB...');
      
      // Vérifier si c'est une session temporaire
      if (sessionId.startsWith('temp-')) {
        logger.debug('[SessionSync] ⚠️ Session temporaire, suppression locale uniquement');
        
        // Supprimer du store localement sans appeler l'API
        const store = useChatStore.getState();
        const sessions = store.sessions.filter(s => s.id !== sessionId);
        store.setSessions(sessions);
        
        // Si c'était la session courante, la désélectionner
        if (store.currentSession?.id === sessionId) {
          store.setCurrentSession(null);
        }
        
        logger.debug('[SessionSync] ✅ Session temporaire supprimée localement');
        
        return {
          success: true
        };
      }
      
      // 1. Supprimer en DB (source de vérité)
      logger.debug('[SessionSync] 🔧 Appel chatSessionService.deleteSession...');
      const response = await this.chatSessionService.deleteSession(sessionId);
      
      logger.debug('[SessionSync] 📋 Réponse deleteSession:', response);
      
      if (!response.success) {
        logger.error('[SessionSync] ❌ Échec suppression session:', response.error);
        throw new Error(response.error || 'Erreur suppression session');
      }

      // 2. Synchroniser depuis la DB (pour avoir la version à jour)
      await this.syncSessionsFromDB();
      
      logger.debug('[SessionSync] ✅ Session supprimée et synchronisée');
      
      return {
        success: true
      };

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
   * DB → Store (mise à jour → cache)
   */
  async updateSessionAndSync(sessionId: string, data: {
    name?: string;
    history_limit?: number;
  }): Promise<{
    success: boolean;
    session?: ChatSession;
    error?: string;
  }> {
    try {
      logger.debug('[SessionSync] ⚙️ Mise à jour session en DB...');
      
      // 1. Mettre à jour en DB (source de vérité)
      const response = await this.chatSessionService.updateSession(sessionId, data);
      
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Erreur mise à jour session');
      }

      // 2. Synchroniser depuis la DB (pour avoir la version à jour)
      await this.syncSessionsFromDB();
      
      logger.debug('[SessionSync] ✅ Session mise à jour et synchronisée');
      
      return {
        success: true,
        session: convertApiSessionToStore(response.data)
      };

    } catch (error) {
      logger.error('[SessionSync] ❌ Erreur mise à jour session:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }
}

/**
 * 🔄 Fonction de conversion API → Store
 * Gère les différences de types (Date vs string pour timestamp)
 */
function convertApiSessionToStore(apiSession: ApiChatSession): ChatSession {
  return {
    id: apiSession.id,
    name: apiSession.name,
    thread: apiSession.thread.map(apiMessage => ({
      id: apiMessage.id,
      role: apiMessage.role,
      content: apiMessage.content,
      timestamp: apiMessage.timestamp as string,
      isStreaming: apiMessage.isStreaming,
      tool_calls: apiMessage.tool_calls,
      tool_call_id: apiMessage.tool_call_id
    })),
    history_limit: apiSession.history_limit,
    created_at: apiSession.created_at,
    updated_at: apiSession.updated_at
  };
}

/**
 * 🔄 Fonction de conversion Store → API
 * Gère les différences de types (string vs Date pour timestamp)
 */
function convertStoreMessageToApi(storeMessage: Omit<ChatMessage, 'id'>): Omit<ApiChatMessage, 'id'> {
  return {
    role: storeMessage.role,
    content: storeMessage.content,
    timestamp: storeMessage.timestamp,
    isStreaming: storeMessage.isStreaming,
    tool_calls: storeMessage.tool_calls,
    tool_call_id: storeMessage.tool_call_id
  };
}

// 🔄 Export de l'instance singleton
export const sessionSyncService = SessionSyncService.getInstance(); 