import type { 
  ChatSession, 
  CreateChatSessionData, 
  UpdateChatSessionData, 
  ChatMessage,
  ChatSessionResponse,
  ChatSessionsListResponse 
} from '@/types/chat';

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

      const response = await fetch(`${this.baseUrl}?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la récupération des sessions');
      }

      return data;
    } catch (error) {
      console.error('Erreur ChatSessionService.getSessions:', error);
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
      const response = await fetch(`${this.baseUrl}/${sessionId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la récupération de la session');
      }

      return data;
    } catch (error) {
      console.error('Erreur ChatSessionService.getSession:', error);
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
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || 'Erreur lors de la création de la session');
      }

      return responseData;
    } catch (error) {
      console.error('Erreur ChatSessionService.createSession:', error);
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
      const response = await fetch(`${this.baseUrl}/${sessionId}`, {
        method: 'PUT',
        headers: {
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
      console.error('Erreur ChatSessionService.updateSession:', error);
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
      const response = await fetch(`${this.baseUrl}/${sessionId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la suppression de la session');
      }

      return { success: true };
    } catch (error) {
      console.error('Erreur ChatSessionService.deleteSession:', error);
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
      const response = await fetch(`${this.baseUrl}/${sessionId}/messages`, {
        method: 'POST',
        headers: {
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
      console.error('Erreur ChatSessionService.addMessage:', error);
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
      const response = await fetch(`${this.baseUrl}/${sessionId}/messages`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la récupération des messages');
      }

      return data;
    } catch (error) {
      console.error('Erreur ChatSessionService.getMessages:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }
}

// Export de l'instance singleton
export const chatSessionService = ChatSessionService.getInstance(); 