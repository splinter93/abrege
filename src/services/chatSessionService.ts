import type {
  CreateChatSessionData,
  UpdateChatSessionData,
  ChatMessage,
  ChatSessionResponse,
  ChatSessionsListResponse
} from '@/types/chat';
import { supabase } from '@/supabaseClient';
import { logger } from '@/utils/logger';
import {
  getCachedSessions,
  getInFlightSessionsPromise,
  setInFlightSessionsPromise,
  setSessionsCache,
  shouldUseSessionsCache
} from './chatSessionCache';

/**
 * Service pour gérer les sessions de chat
 */
export class ChatSessionService {
  private static instance: ChatSessionService;
  private baseUrl: string;

  constructor() {
    this.baseUrl = '/api/ui/chat-sessions';
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
      // 1) Vérifier si on peut utiliser le cache récent
      const cached = shouldUseSessionsCache() ? getCachedSessions() : null;
      if (cached && !filters) {
        logger.debug('[ChatSessionService] ♻️ Sessions depuis le cache (TTL 5s)');
        return cached;
      }

      // 2) Dédupliquer les appels concurrents : si une requête est déjà en cours, on la réutilise
      const inFlight = getInFlightSessionsPromise();
      if (inFlight && !filters) {
        logger.debug('[ChatSessionService] ⏳ Requête sessions déjà en cours, réutilisation de la promesse');
        return inFlight;
      }

      logger.debug('[ChatSessionService] 🔄 Récupération sessions (appel réseau)...');

      // Récupérer le token d'authentification
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      if (!token) {
        logger.debug('[ChatSessionService] ❌ Pas de token, authentification requise');
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

      const fetchPromise = (async () => {
        const response = await fetch(`${this.baseUrl}?${params.toString()}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        let data;
        try {
          data = await response.json();
        } catch {
          // Si la réponse n'est pas du JSON, c'est probablement une erreur HTML
          const textResponse = await response.text();
          logger.error('[ChatSessionService] ❌ Réponse non-JSON reçue', { preview: textResponse.substring(0, 200) });
          throw new Error(`Erreur serveur (${response.status}): Réponse non-JSON reçue`);
        }

        if (!response.ok) {
          throw new Error(data.error || `Erreur lors de la récupération des sessions (${response.status})`);
        }

        // Mettre en cache uniquement les appels "simples" (sans filtres)
        if (!filters) {
          setSessionsCache(data);
        }

        return data;
      })();

      // Si pas de filtres, on stocke la promesse en cours pour dédupliquer
      if (!filters) {
        setInFlightSessionsPromise(fetchPromise);
      }

      const result = await fetchPromise;

      if (!filters) {
        // Nettoyer la promesse en cours après résolution
        setInFlightSessionsPromise(null);
      }

      return result;
    } catch (error) {
      logger.error('Erreur ChatSessionService.getSessions', { error: { error: error instanceof Error ? error.message : 'Erreur inconnue' } });
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
      logger.error('Erreur ChatSessionService.getSession:', { error: error });
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
      } catch {
        // Si la réponse n'est pas du JSON, c'est probablement une erreur HTML
        const textResponse = await response.text();
        logger.error('[ChatSessionService] ❌ Réponse non-JSON reçue', { preview: textResponse.substring(0, 200) });
        throw new Error(`Erreur serveur (${response.status}): Réponse non-JSON reçue`);
      }

      if (!response.ok) {
        throw new Error(responseData.error || `Erreur lors de la création de la session (${response.status})`);
      }

      return responseData;
    } catch (error) {
      logger.error('Erreur ChatSessionService.createSession:', { error: error });
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
      logger.error('Erreur ChatSessionService.updateSession:', { error: error });
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
      logger.debug('[ChatSessionService] 🗑️ deleteSession appelé pour:', { sessionId });
      
      // Récupérer le token d'authentification
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      if (!token) {
        logger.error('[ChatSessionService] ❌ Pas de token d\'authentification');
        throw new Error('Authentification requise');
      }

      logger.debug('[ChatSessionService] 🔧 Appel API DELETE:', { url: `${this.baseUrl}/${sessionId}` });

      const response = await fetch(`${this.baseUrl}/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      logger.debug(`[ChatSessionService] 📋 Status réponse: ${response.status}`);

      // 204 No Content => succès sans corps
      if (response.status === 204) {
        logger.debug('[ChatSessionService] ✅ Suppression réussie (204)');
        return { success: true };
      }

      // Essayer de lire le corps JSON s'il existe
      let data: unknown = null;
      try {
        data = await response.json();
        logger.debug('[ChatSessionService] 📋 Données réponse:', { data });
      } catch {
        logger.debug('[ChatSessionService] ℹ️ Aucune réponse JSON (peut être vide)');
      }

      if (!response.ok) {
        const message = data?.error || `Erreur lors de la suppression de la session (${response.status})`;
        logger.error('[ChatSessionService] ❌ Erreur API:', { status: response.status, message });
        throw new Error(message);
      }

      logger.debug('[ChatSessionService] ✅ Suppression réussie');
      return { success: true };
    } catch (error) {
      logger.error('[ChatSessionService] ❌ Erreur deleteSession:', { error: error instanceof Error ? error.message : error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  
  // ✅ MÉTHODES SUPPRIMÉES (LEGACY): addMessage, addMessageWithToken
  // Utilisaient les routes /api/ui/chat-sessions/:id/messages (thread JSONB)
  // Remplacé par: sessionSyncService.addMessageAndSync() → HistoryManager

  /**
   * Assainit un message avant persistance en DB
   * - Retire le chain-of-thought (reasoning)
   * - Convertit le canal 'analysis' en 'final' (non persisté tel quel)
   * - Ajoute un timestamp si manquant
   * - ✅ Sérialise le content multi-modal (images = URLs S3 déjà uploadées)
   * 
   * ⚠️ Les images sont uploadées dans ChatInput AVANT l'envoi,
   * donc ici on reçoit déjà des URLs S3 (pas de base64)
   */
  private async sanitizeMessageForPersistence(
    message: Omit<ChatMessage, 'id'>,
    _sessionId: string
  ): Promise<Omit<ChatMessage, 'id'>> {
    const sanitized: Omit<ChatMessage, 'id'> & { [key: string]: unknown } = { ...message };

    // Horodatage garanti
    sanitized.timestamp = sanitized.timestamp || new Date().toISOString();

    // ✅ Gérer le content multi-modal (objet avec text + images)
    // Les images contiennent déjà des URLs S3 (uploadées dans ChatInput)
    if (sanitized.content && typeof sanitized.content === 'object' && !Array.isArray(sanitized.content)) {
      const multiModalContent = sanitized.content as { 
        text?: string; 
        images?: Array<{ url?: string; fileName?: string; mimeType?: string; size?: number }> 
      };
      
      // Sérialiser en JSON pour la DB
      if ('text' in multiModalContent || 'images' in multiModalContent) {
        sanitized.content = JSON.stringify(multiModalContent);
        
        const imageCount = multiModalContent.images?.length || 0;
        logger.debug(`[ChatSessionService] 💾 Content multi-modal sérialisé: texte + ${imageCount} URL(s) S3`);
      }
    }

    // Ne jamais persister de messages en canal 'analysis'
    if (sanitized.role === 'assistant' || sanitized.role === 'user') {
      if (sanitized.channel === 'analysis' || !sanitized.channel) {
        sanitized.channel = 'final';
      }
    } else if (sanitized.role === 'tool') {
      // Les messages tool n'ont pas besoin de canal
      if (sanitized.channel) delete sanitized.channel;
    }

    // Nettoyer les propriétés undefined
    Object.keys(sanitized).forEach((key) => {
      if (sanitized[key] === undefined) delete sanitized[key];
    });

    return sanitized;
  }

  /**
   * Désérialise le content d'un message après lecture depuis la DB
   * Si le content est un string JSON avec { text, images }, le parse en objet
   */
  private deserializeMessageContent(message: ChatMessage): ChatMessage {
    // Si le content est un string qui ressemble à du JSON
    if (typeof message.content === 'string' && message.content.startsWith('{')) {
      try {
        const parsed = JSON.parse(message.content);
        // Si c'est un objet { text, images }, l'utiliser
        if (parsed && typeof parsed === 'object' && ('text' in parsed || 'images' in parsed)) {
          return {
            ...message,
            content: parsed
          };
        }
      } catch {
        // Pas du JSON valide, garder le string tel quel
      }
    }
    return message;
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

      // ✅ Désérialiser le content multi-modal pour chaque message
      if (data.success && data.data?.messages) {
        data.data.messages = data.data.messages.map((msg: ChatMessage) => 
          this.deserializeMessageContent(msg)
        );
        logger.debug('[ChatSessionService] 📥 Messages désérialisés:', {
          count: data.data.messages.length,
          hasMultiModal: data.data.messages.some((m: ChatMessage) => 
            typeof m.content === 'object' && !Array.isArray(m.content)
          )
        });
      }

      return data;
    } catch (error) {
      logger.error('Erreur ChatSessionService.getMessages:', { error: error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }
}

// Export de l'instance singleton
export const chatSessionService = ChatSessionService.getInstance(); 