import type { 
  ChatSession, 
  CreateChatSessionData, 
  UpdateChatSessionData, 
  ChatMessage,
  ChatSessionResponse,
  ChatSessionsListResponse 
} from '@/types/chat';
import { supabase } from '@/supabaseClient';
import { simpleLogger as logger } from '@/utils/logger';

/**
 * Service pour gérer les sessions de chat
 */
export class ChatSessionService {
  private static instance: ChatSessionService;
  private baseUrl: string;

  constructor() {
    this.baseUrl = '/api/v1/chat-sessions';
  }

  static getInstance(): ChatSessionService {
    if (!ChatSessionService.instance) {
      ChatSessionService.instance = new ChatSessionService();
    }
    return ChatSessionService.instance;
  }

  /**
   * Récupérer toutes les sessions de l'utilisateur
   */
  async getSessions(filters?: {
    is_active?: boolean;
    limit?: number;
    offset?: number;
    search?: string;
  }): Promise<ChatSessionsListResponse> {
    try {
      logger.dev('[ChatSessionService] 🔄 Récupération sessions...');
      
      // Récupérer le token d'authentification
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      if (!token) {
        logger.dev('[ChatSessionService] ❌ Pas de token, authentification requise');
        throw new Error('Authentification requise');
      }

      const params = new URLSearchParams();
      if (filters?.is_active !== undefined) {
        params.append('is_active', filters.is_active.toString());
      }
      if (filters?.limit) {
        params.append('limit', filters.limit.toString());
      }
      if (filters?.offset) {
        params.append('offset', filters.offset.toString());
      }
      if (filters?.search) {
        params.append('search', filters.search);
      }

      const response = await fetch(`${this.baseUrl}?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      let data;
      try {
        data = await response.json();
      } catch (error) {
        // Si la réponse n'est pas du JSON, c'est probablement une erreur HTML
        const textResponse = await response.text();
        logger.error('[ChatSessionService] ❌ Réponse non-JSON reçue:', textResponse.substring(0, 200));
        throw new Error(`Erreur serveur (${response.status}): Réponse non-JSON reçue`);
      }

      if (!response.ok) {
        throw new Error(data.error || `Erreur lors de la récupération des sessions (${response.status})`);
      }

      return data;
    } catch (error) {
      logger.error('Erreur ChatSessionService.getSessions:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Récupérer une session spécifique
   */
  async getSession(sessionId: string): Promise<ChatSessionResponse> {
    try {
      // Récupérer le token d'authentification
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      if (!token) {
        throw new Error('Authentification requise');
      }

      const response = await fetch(`${this.baseUrl}/${sessionId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la récupération de la session');
      }

      return data;
    } catch (error) {
      logger.error('Erreur ChatSessionService.getSession:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Créer une nouvelle session
   */
  async createSession(data: CreateChatSessionData): Promise<ChatSessionResponse> {
    try {
      // Récupérer le token d'authentification
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      if (!token) {
        throw new Error('Authentification requise');
      }

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      let responseData;
      try {
        responseData = await response.json();
      } catch (error) {
        // Si la réponse n'est pas du JSON, c'est probablement une erreur HTML
        const textResponse = await response.text();
        logger.error('[ChatSessionService] ❌ Réponse non-JSON reçue:', textResponse.substring(0, 200));
        throw new Error(`Erreur serveur (${response.status}): Réponse non-JSON reçue`);
      }

      if (!response.ok) {
        throw new Error(responseData.error || `Erreur lors de la création de la session (${response.status})`);
      }

      return responseData;
    } catch (error) {
      logger.error('Erreur ChatSessionService.createSession:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Mettre à jour une session
   */
  async updateSession(sessionId: string, data: UpdateChatSessionData): Promise<ChatSessionResponse> {
    try {
      // Récupérer le token d'authentification
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      if (!token) {
        throw new Error('Authentification requise');
      }

      const response = await fetch(`${this.baseUrl}/${sessionId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || 'Erreur lors de la mise à jour de la session');
      }

      return responseData;
    } catch (error) {
      logger.error('Erreur ChatSessionService.updateSession:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Supprimer une session
   */
  async deleteSession(sessionId: string): Promise<{ success: boolean; error?: string }> {
    try {
      logger.dev('[ChatSessionService] 🗑️ deleteSession appelé pour:', sessionId);
      
      // Récupérer le token d'authentification
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      if (!token) {
        logger.error('[ChatSessionService] ❌ Pas de token d\'authentification');
        throw new Error('Authentification requise');
      }

      logger.dev('[ChatSessionService] 🔧 Appel API DELETE:', `${this.baseUrl}/${sessionId}`);

      const response = await fetch(`${this.baseUrl}/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      logger.dev(`[ChatSessionService] 📋 Status réponse: ${response.status}`);

      const data = await response.json();
      logger.dev('[ChatSessionService] 📋 Données réponse:', data);

      if (!response.ok) {
        logger.error('[ChatSessionService] ❌ Erreur API:', response.status);
        throw new Error(data.error || 'Erreur lors de la suppression de la session');
      }

      logger.dev('[ChatSessionService] ✅ Suppression réussie');
      return { success: true };
    } catch (error) {
      logger.error('[ChatSessionService] ❌ Erreur deleteSession:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Ajouter un message à une session
   */
  async addMessage(sessionId: string, message: Omit<ChatMessage, 'id'>): Promise<{
    success: boolean;
    data?: { session: ChatSession; message: ChatMessage };
    error?: string;
  }> {
    try {
      // Récupérer le token d'authentification
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      if (!token) {
        throw new Error('Authentification requise');
      }

      const response = await fetch(`${this.baseUrl}/${sessionId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de l\'ajout du message');
      }

      return data;
    } catch (error) {
      logger.error('Erreur ChatSessionService.addMessage:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Ajouter un message à une session avec token fourni (pour usage côté serveur)
   */
  async addMessageWithToken(sessionId: string, message: Omit<ChatMessage, 'id'>, userToken: string): Promise<{
    success: boolean;
    data?: { session: ChatSession; message: ChatMessage };
    error?: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/${sessionId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de l\'ajout du message');
      }

      return data;
    } catch (error) {
      logger.error('Erreur ChatSessionService.addMessageWithToken:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Récupérer les messages d'une session
   */
  async getMessages(sessionId: string): Promise<{
    success: boolean;
    data?: { messages: ChatMessage[] };
    error?: string;
  }> {
    try {
      // Récupérer le token d'authentification
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      if (!token) {
        throw new Error('Authentification requise');
      }

      const response = await fetch(`${this.baseUrl}/${sessionId}/messages`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la récupération des messages');
      }

      return data;
    } catch (error) {
      logger.error('Erreur ChatSessionService.getMessages:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }
}

// Export de l'instance singleton
export const chatSessionService = ChatSessionService.getInstance(); 