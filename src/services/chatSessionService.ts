import type { 
  ChatSession, 
  CreateChatSessionData, 
  UpdateChatSessionData, 
  ChatMessage,
  ChatSessionResponse,
  ChatSessionsListResponse 
} from '@/types/chat';
import { supabase } from '@/supabaseClient';
import { logger } from '@/utils/logger';
import { chatImageUploadService, type ChatImageToUpload, type UploadedChatImage } from './chatImageUploadService';

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
      logger.debug('[ChatSessionService] 🔄 Récupération sessions...');
      
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
        logger.error('[ChatSessionService] ❌ Réponse non-JSON reçue', { preview: textResponse.substring(0, 200) });
        throw new Error(`Erreur serveur (${response.status}): Réponse non-JSON reçue`);
      }

      if (!response.ok) {
        throw new Error(data.error || `Erreur lors de la récupération des sessions (${response.status})`);
      }

      return data;
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
      } catch (error) {
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

      // Assainir le message avant persistance (pas de CoT, pas de canal analysis)
      // ⚠️ ASYNC car upload les images vers Supabase Storage
      const sanitized = await this.sanitizeMessageForPersistence(message, sessionId);
      const operationId = `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Utiliser une URL relative côté client pour éviter les problèmes de CORS
      const url = `${this.baseUrl}/${sessionId}/messages`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          // Idempotence (le backend peut ignorer pour cette route, sans effet négatif)
          'Idempotency-Key': operationId,
          'X-Operation-ID': operationId,
        },
        body: JSON.stringify(sanitized),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de l\'ajout du message');
      }

      return data;
    } catch (error) {
      logger.error('Erreur ChatSessionService.addMessage:', { error: error });
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
      // Construire une URL absolue sécurisée côté serveur
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
        || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '')
        || (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://www.scrivia.app');
      const url = `${siteUrl}${this.baseUrl}/${sessionId}/messages`;

      // 🔧 NOUVEAU: Log détaillé pour debug
      logger.debug('[ChatSessionService] 📋 Message à sauvegarder (avant assainissement):', { message: JSON.stringify(message, null, 2), url });
      // ⚠️ ASYNC car upload les images vers Supabase Storage
      const sanitized = await this.sanitizeMessageForPersistence(message, sessionId);
      const operationId = `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': operationId,
          'X-Operation-ID': operationId,
        },
        body: JSON.stringify(sanitized),
      });

      const data = await response.json();

      if (!response.ok) {
        logger.error('[ChatSessionService] ❌ Erreur API:', {
          status: response.status,
          statusText: response.statusText,
          data: data
        });
        throw new Error(data.error || `Erreur HTTP ${response.status}: ${response.statusText}`);
      }

      logger.debug('[ChatSessionService] ✅ Message sauvegardé avec succès');
      return data;
    } catch (error) {
      logger.error('Erreur ChatSessionService.addMessageWithToken:', { 
        error: error instanceof Error ? error.message : String(error),
        sessionId,
        messageRole: message.role,
        messageContent: message.content?.substring(0, 100) + '...'
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Assainit un message avant persistance en DB
   * - Retire le chain-of-thought (reasoning)
   * - Convertit le canal 'analysis' en 'final' (non persisté tel quel)
   * - Ajoute un timestamp si manquant
   * - ✅ Upload les images vers Supabase et remplace par des URLs
   * 
   * ⚠️ Cette fonction est ASYNC car elle upload les images !
   */
  private async sanitizeMessageForPersistence(
    message: Omit<ChatMessage, 'id'>,
    sessionId: string
  ): Promise<Omit<ChatMessage, 'id'>> {
    const sanitized: Omit<ChatMessage, 'id'> & { [key: string]: unknown } = { ...message };

    // Horodatage garanti
    sanitized.timestamp = sanitized.timestamp || new Date().toISOString();

    // ✅ CRITIQUE: Gérer le content multi-modal (objet avec text + images base64)
    // Upload les images vers Supabase et remplacer par des URLs
    if (sanitized.content && typeof sanitized.content === 'object' && !Array.isArray(sanitized.content)) {
      const multiModalContent = sanitized.content as { 
        text?: string; 
        images?: Array<{ base64?: string; url?: string; fileName?: string; mimeType?: string; size?: number }> 
      };
      
      // Si c'est un objet { text, images }
      if ('images' in multiModalContent && multiModalContent.images && multiModalContent.images.length > 0) {
        logger.debug('[ChatSessionService] 🖼️ Upload de ${multiModalContent.images.length} image(s) vers Supabase...');
        
        // Séparer les images base64 (à uploader) des URLs (déjà uploadées)
        const imagesToUpload: ChatImageToUpload[] = [];
        const existingUrls: UploadedChatImage[] = [];
        
        for (const img of multiModalContent.images) {
          if (img.base64 && !img.url) {
            // Image base64 à uploader
            imagesToUpload.push({
              base64: img.base64,
              fileName: img.fileName || 'image.jpg',
              mimeType: img.mimeType || 'image/jpeg',
              size: img.size || 0
            });
          } else if (img.url) {
            // URL déjà uploadée
            existingUrls.push({
              url: img.url,
              fileName: img.fileName || 'image.jpg',
              mimeType: img.mimeType || 'image/jpeg',
              size: img.size || 0,
              uploadedAt: Date.now()
            });
          }
        }
        
        // Upload les images base64
        let uploadedImages: UploadedChatImage[] = [];
        if (imagesToUpload.length > 0) {
          const uploadResult = await chatImageUploadService.uploadImages(imagesToUpload, sessionId);
          
          if (uploadResult.success && uploadResult.images) {
            uploadedImages = uploadResult.images;
            logger.debug('[ChatSessionService] ✅ ${uploadedImages.length} image(s) uploadée(s)');
          } else {
            logger.error('[ChatSessionService] ❌ Erreur upload images:', uploadResult.error);
          }
        }
        
        // Combiner URLs existantes + nouvelles
        const allImages = [...existingUrls, ...uploadedImages];
        
        // Sauvegarder en JSON avec URLs seulement
        sanitized.content = JSON.stringify({
          text: multiModalContent.text || 'Regarde cette image',
          images: allImages.map(img => ({
            url: img.url,
            fileName: img.fileName,
            mimeType: img.mimeType,
            size: img.size
          }))
        });
        
        logger.debug('[ChatSessionService] 💾 Content sauvegardé: texte + ${allImages.length} URL(s)');
      } else if ('text' in multiModalContent) {
        // Juste du texte, pas d'images
        sanitized.content = multiModalContent.text || '';
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