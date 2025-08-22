import { ChatMessage } from '@/types/chat';
import { simpleLogger as logger } from '@/utils/logger';

export interface BatchMessageRequest {
  messages: Omit<ChatMessage, 'id'>[];
  sessionId: string;
  batchId?: string;
}

export interface BatchMessageResponse {
  success: boolean;
  data?: {
    session: any;
    messages: ChatMessage[];
    duplicatesFiltered: number;
    batchId: string;
  };
  error?: string;
  details?: any[];
}

/**
 * Service pour gérer l'ajout de messages en batch
 * Permet la persistance atomique des tool calls
 */
export class BatchMessageService {
  private static instance: BatchMessageService;

  static getInstance(): BatchMessageService {
    if (!BatchMessageService.instance) {
      BatchMessageService.instance = new BatchMessageService();
    }
    return BatchMessageService.instance;
  }

  /**
   * 🔧 Ajouter un batch de messages de manière atomique
   * Inclut la persistance complète des tool calls
   */
  async addBatchMessages(request: BatchMessageRequest): Promise<BatchMessageResponse> {
    try {
      logger.dev('[BatchMessageService] 🔧 Ajout batch de messages:', {
        sessionId: request.sessionId,
        messageCount: request.messages.length,
        batchId: request.batchId
      });

      // Validation des paramètres
      if (!request.sessionId || typeof request.sessionId !== 'string') {
        throw new Error('Session ID invalide ou manquant');
      }

      // Validation du format UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(request.sessionId)) {
        logger.warn('[BatchMessageService] ⚠️ Format de Session ID suspect:', request.sessionId);
        // Ne pas bloquer, mais logger pour debug
      }

      if (!request.messages || !Array.isArray(request.messages) || request.messages.length === 0) {
        throw new Error('Messages invalides ou manquants');
      }

      // Validation de la structure des messages
      for (let i = 0; i < request.messages.length; i++) {
        const msg = request.messages[i];
        if (!msg.role || !['user', 'assistant', 'system', 'tool'].includes(msg.role)) {
          throw new Error(`Message ${i}: rôle invalide: ${msg.role}`);
        }
        
        if (msg.role === 'tool') {
          if (!msg.tool_call_id) {
            logger.warn('[BatchMessageService] ⚠️ Message tool ${i} sans tool_call_id:', msg);
          }
          if (!msg.name) {
            logger.warn('[BatchMessageService] ⚠️ Message tool ${i} sans name:', msg);
          }
        }
      }

      // Récupérer le token d'authentification
      let session;
      try {
        const { data: { session: sessionData }, error: sessionError } = await import('@/supabaseClient').then(m => m.supabase.auth.getSession());
        
        if (sessionError) {
          logger.error('[BatchMessageService] ❌ Erreur lors de la récupération de la session:', sessionError);
          throw new Error(`Erreur lors de la récupération de la session: ${sessionError.message}`);
        }
        
        session = sessionData;
      } catch (importError) {
        logger.error('[BatchMessageService] ❌ Erreur lors de l\'import du client Supabase:', importError);
        throw new Error('Erreur lors de l\'initialisation du client d\'authentification');
      }

      if (!session?.access_token) {
        logger.warn('[BatchMessageService] ⚠️ Aucune session active ou token manquant');
        throw new Error('Authentification requise - Veuillez vous connecter');
      }

      // Validation du token
      if (typeof session.access_token !== 'string' || session.access_token.length < 100) {
        logger.warn('[BatchMessageService] ⚠️ Format de token suspect:', {
          tokenLength: session.access_token?.length,
          tokenType: typeof session.access_token,
          tokenPreview: session.access_token?.substring(0, 20) + '...'
        });
      }

      logger.dev('[BatchMessageService] 🔧 Token d\'authentification validé:', {
        tokenLength: session.access_token.length,
        tokenType: typeof session.access_token,
        sessionId: session.user?.id
      });

      // Appeler l'API batch
      const apiUrl = `/api/v1/chat-sessions/${request.sessionId}/messages/batch`;
      
      // Validation de l'URL
      if (!apiUrl.startsWith('/api/')) {
        logger.error('[BatchMessageService] ❌ URL API invalide:', apiUrl);
        throw new Error('URL API invalide');
      }

      // Vérification rapide de la disponibilité de l'API
      try {
        const healthCheck = await fetch('/api/v1/llm/health', { method: 'GET' });
        logger.dev('[BatchMessageService] 🔧 Health check API:', {
          status: healthCheck.status,
          ok: healthCheck.ok
        });
      } catch (healthError) {
        logger.warn('[BatchMessageService] ⚠️ Health check échoué:', healthError);
        // Ne pas bloquer, mais logger pour debug
      }
      
      const requestBody = {
        messages: request.messages,
        sessionId: request.sessionId,
        batchId: request.batchId || `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };
      
      const startTime = Date.now();
      logger.dev('[BatchMessageService] 🔧 Appel API batch:', {
        url: apiUrl,
        method: 'POST',
        sessionId: request.sessionId,
        messageCount: request.messages.length,
        batchId: requestBody.batchId,
        requestBody: JSON.stringify(requestBody, null, 2),
        startTime: new Date(startTime).toISOString()
      });

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        // Ajouter un timeout pour éviter les blocages
        signal: AbortSignal.timeout(30000) // 30 secondes
      });

      const endTime = Date.now();
      const duration = endTime - startTime;
      
      logger.dev('[BatchMessageService] 🔧 Réponse API reçue:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        duration: `${duration}ms`,
        headers: Object.fromEntries(response.headers.entries())
      });

      // Vérifier les en-têtes de réponse critiques
      const contentType = response.headers.get('content-type');
      const corsHeader = response.headers.get('access-control-allow-origin');
      
      logger.dev('[BatchMessageService] 🔧 En-têtes de réponse critiques:', {
        contentType,
        corsHeader,
        hasContentType: !!contentType,
        isJsonResponse: contentType?.includes('application/json'),
        isHtmlResponse: contentType?.includes('text/html')
      });

      if (!response.ok) {
        let errorData: Record<string, any> = {};
        let errorText = '';
        
        try {
          errorData = await response.json();
          logger.dev('[BatchMessageService] 🔧 Données d\'erreur parsées:', errorData);
        } catch {
          try {
            errorText = await response.text();
            logger.dev('[BatchMessageService] 🔧 Texte d\'erreur brut:', errorText);
            
            // Vérifier si c'est une page HTML d'erreur
            if (errorText.includes('<html') || errorText.includes('<!DOCTYPE')) {
              logger.error('[BatchMessageService] ❌ L\'API a retourné une page HTML au lieu de JSON');
              errorText = 'L\'API a retourné une page HTML - possible erreur de routage ou de serveur';
            }
          } catch {
            logger.warn('[BatchMessageService] ⚠️ Impossible de lire le contenu de la réponse d\'erreur');
          }
        }
        
        const errorMessage = errorData.error || errorData.message || errorText || `Erreur HTTP ${response.status}: ${response.statusText}`;
        const errorDetails = {
          status: response.status,
          statusText: response.statusText,
          url: apiUrl,
          errorData,
          errorText,
          requestBody: {
            messages: request.messages,
            sessionId: request.sessionId,
            batchId: request.batchId
          }
        };
        
        logger.error('[BatchMessageService] ❌ Erreur API batch:', errorDetails);
        throw new Error(`Erreur API batch: ${errorMessage} (HTTP ${response.status})`);
      }

      let result;
      try {
        result = await response.json();
        logger.dev('[BatchMessageService] 🔧 Réponse JSON parsée:', result);
      } catch (parseError) {
        logger.error('[BatchMessageService] ❌ Erreur lors du parsing de la réponse JSON:', parseError);
        throw new Error(`Erreur lors du parsing de la réponse: ${parseError instanceof Error ? parseError.message : 'Erreur inconnue'}`);
      }
      
      if (result.success) {
        logger.dev('[BatchMessageService] ✅ Batch ajouté avec succès:', {
          sessionId: request.sessionId,
          messagesAjoutés: result.data?.messages?.length || 0,
          doublonsFiltrés: result.data?.duplicatesFiltered || 0
        });
        
        return {
          success: true,
          data: result.data
        };
      } else {
        const errorMessage = result.error || result.message || 'Erreur lors de l\'ajout du batch';
        logger.error('[BatchMessageService] ❌ Erreur de réponse API:', {
          success: result.success,
          error: errorMessage,
          result
        });
        throw new Error(errorMessage);
      }

    } catch (error) {
      logger.error('[BatchMessageService] ❌ Erreur ajout batch:', error);
      
      // Améliorer les messages d'erreur pour l'utilisateur
      let userErrorMessage = 'Erreur inconnue';
      if (error instanceof Error) {
        if (error.name === 'AbortError' || error.message.includes('timeout')) {
          userErrorMessage = 'Délai d\'attente dépassé - Veuillez réessayer';
        } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          userErrorMessage = 'Erreur de connexion - Vérifiez votre connexion internet';
        } else if (error.message.includes('Authentification requise')) {
          userErrorMessage = 'Veuillez vous connecter pour continuer';
        } else if (error.message.includes('Erreur lors de la récupération de la session')) {
          userErrorMessage = 'Problème d\'authentification - Veuillez rafraîchir la page';
        } else if (error.message.includes('Erreur API batch')) {
          userErrorMessage = `Erreur du serveur: ${error.message}`;
        } else {
          userErrorMessage = error.message;
        }
      }
      
      return {
        success: false,
        error: userErrorMessage,
        details: error instanceof Error ? [error.stack] : []
      };
    }
  }

  /**
   * 🔧 Ajouter un message assistant avec tool calls et leurs résultats
   * Flux atomique pour garantir la cohérence
   */
  async addToolCallSequence(
    sessionId: string,
    assistantMessage: Omit<ChatMessage, 'id'>,
    toolResults: Array<{
      tool_call_id: string;
      name: string;
      content: string;
      success: boolean;
    }>,
    finalAssistantMessage?: Omit<ChatMessage, 'id'>
  ): Promise<BatchMessageResponse> {
    try {
      logger.dev('[BatchMessageService] 🔧 Ajout séquence tool call:', {
        sessionId,
        hasToolCalls: !!assistantMessage.tool_calls,
        toolResultsCount: toolResults.length,
        hasFinalMessage: !!finalAssistantMessage
      });

      const messages: Omit<ChatMessage, 'id'>[] = [];

      // 1. Message assistant avec tool calls
      if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
        messages.push(assistantMessage);
      }

      // 2. Messages tool avec résultats
      for (const toolResult of toolResults) {
        messages.push({
          role: 'tool',
          tool_call_id: toolResult.tool_call_id,
          name: toolResult.name,
          content: toolResult.content,
          timestamp: new Date().toISOString()
        });
      }

      // 3. Message assistant final (si relance)
      if (finalAssistantMessage) {
        messages.push(finalAssistantMessage);
      }

      if (messages.length === 0) {
        logger.warn('[BatchMessageService] ⚠️ Aucun message à ajouter');
        return {
          success: true,
          data: {
            session: null,
            messages: [],
            duplicatesFiltered: 0,
            batchId: `empty-${Date.now()}`
          }
        };
      }

      // Ajouter le batch complet
      return await this.addBatchMessages({
        messages,
        sessionId,
        batchId: `tool-sequence-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      });

    } catch (error) {
      logger.error('[BatchMessageService] ❌ Erreur séquence tool call:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * 🔧 Valider un message tool avant ajout
   */
  validateToolMessage(message: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (message.role === 'tool') {
      if (!message.tool_call_id) {
        errors.push('tool_call_id manquant pour les messages tool');
      }
      if (!message.name && !message.tool_name) {
        errors.push('name manquant pour les messages tool');
      }
      if (!message.content) {
        errors.push('content manquant pour les messages tool');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 🔧 Valider un batch de messages
   */
  validateBatch(messages: Omit<ChatMessage, 'id'>[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!Array.isArray(messages) || messages.length === 0) {
      errors.push('Le batch doit contenir au moins un message');
      return { isValid: false, errors };
    }

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      
      // Validation de base
      if (!msg.role) {
        errors.push(`Message ${i}: rôle manquant`);
      }
      
      // Validation spécifique aux messages tool
      if (msg.role === 'tool') {
        const toolValidation = this.validateToolMessage(msg);
        if (!toolValidation.isValid) {
          errors.push(`Message ${i}: ${toolValidation.errors.join(', ')}`);
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Export de l'instance singleton
export const batchMessageService = BatchMessageService.getInstance(); 