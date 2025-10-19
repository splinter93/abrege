import { simpleLogger as logger } from '@/utils/logger';
import type { ChatMessage } from './types/strictTypes';

/**
 * Service de reconstruction des threads depuis la base de données
 * Garantit la cohérence et l'ordre des messages
 */
export class ThreadBuilder {
  private static instance: ThreadBuilder;

  private constructor() {}

  static getInstance(): ThreadBuilder {
    if (!ThreadBuilder.instance) {
      ThreadBuilder.instance = new ThreadBuilder();
    }
    return ThreadBuilder.instance;
  }

  /**
   * Reconstruit un thread complet depuis la base de données
   * @param sessionId ID de la session
   * @returns Thread reconstruit avec tous les messages
   */
  async rebuildFromDB(sessionId: string): Promise<ChatMessage[]> {
    try {
      logger.info(`[ThreadBuilder] 🔄 Reconstruction du thread pour la session ${sessionId}`);
      
      // Récupérer la session depuis l'API
      const sessionResponse = await fetch(`/api/ui/chat-sessions/${sessionId}`);
      if (!sessionResponse.ok) {
        throw new Error(`Impossible de récupérer la session: ${sessionResponse.status}`);
      }

      const session = await sessionResponse.json();
      if (!session.success || !session.data) {
        throw new Error('Session invalide ou non trouvée');
      }

      const thread = session.data.thread || [];
      logger.info(`[ThreadBuilder] ✅ Thread reconstruit: ${thread.length} messages`);

      // 🔒 ISOLATION : Valider que le thread appartient bien à la session
      const validatedThread = this.validateAndNormalizeThread(thread);
      
      logger.info(`[ThreadBuilder] 🔒 Thread validé pour la session ${sessionId}: ${validatedThread.length} messages`);
      return validatedThread;
    } catch (error) {
      logger.error(`[ThreadBuilder] ❌ Erreur reconstruction thread:`, error);
      throw error;
    }
  }

  /**
   * Valide et normalise un thread
   * @param thread Thread brut depuis la DB
   * @returns Thread validé et normalisé
   */
  private validateAndNormalizeThread(thread: unknown[]): ChatMessage[] {
    if (!Array.isArray(thread)) {
      logger.warn(`[ThreadBuilder] ⚠️ Thread invalide, retour thread vide`);
      return [];
    }

    const validatedThread = thread
      .filter(message => this.isValidMessage(message))
      .map(message => this.normalizeMessage(message))
      .sort((a, b) => {
        // Trier par timestamp si disponible
        if (a.timestamp && b.timestamp) {
          return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
        }
        return 0;
      });

    logger.info(`[ThreadBuilder] 🔍 Thread validé: ${validatedThread.length}/${thread.length} messages`);
    return validatedThread;
  }

  /**
   * Vérifie si un message est valide
   * @param message Message à valider
   * @returns true si le message est valide
   */
  private isValidMessage(message: unknown): message is ChatMessage {
    if (!message || typeof message !== 'object') {
      return false;
    }

    const msg = message as Record<string, unknown>;

    // Vérifier les propriétés obligatoires selon le rôle
    if (msg.role === 'user') {
      return !!msg.content && typeof msg.content === 'string';
    }

    if (msg.role === 'assistant') {
      return true; // Assistant peut avoir content vide si tool_calls
    }

    if (msg.role === 'tool') {
      return !!msg.tool_call_id && 
             !!msg.name && 
             !!msg.content &&
             typeof msg.tool_call_id === 'string' &&
             typeof msg.name === 'string' &&
             typeof msg.content === 'string';
    }

    if (msg.role === 'system') {
      return !!msg.content && typeof msg.content === 'string';
    }

    // Par défaut, un message doit avoir un rôle et un timestamp
    return !!msg.role && !!msg.timestamp;
  }

  /**
   * Normalise un message
   * @param message Message à normaliser
   * @returns Message normalisé
   */
  private normalizeMessage(message: unknown): ChatMessage {
    const msg = message as Record<string, unknown>;
    const normalized: ChatMessage = { ...(msg as ChatMessage) };

    // S'assurer que le contenu est une string
    if (normalized.content && typeof normalized.content !== 'string') {
      normalized.content = JSON.stringify(normalized.content);
    }

    // Définir un canal par défaut si manquant
    if (!normalized.channel) {
      normalized.channel = 'final';
    }

    // Normaliser les tool_calls si présents
    if (normalized.tool_calls && Array.isArray(normalized.tool_calls)) {
      normalized.tool_calls = normalized.tool_calls.map((toolCall: unknown) => {
        const tc = toolCall as Record<string, unknown>;
        const func = tc.function as Record<string, unknown> | undefined;
        
        return {
          id: (tc.id as string) || `tool-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          type: 'function' as const,
          function: {
            name: (func?.name as string) || 'unknown',
            arguments: (func?.arguments as string) || '{}'
          }
        };
      });
    }

    // Ajouter un timestamp si manquant
    if (!normalized.timestamp) {
      normalized.timestamp = new Date().toISOString();
    }

    // Ajouter un ID si manquant
    if (!normalized.id) {
      normalized.id = `msg-${new Date(normalized.timestamp).getTime()}-${Math.random().toString(36).slice(2, 8)}`;
    }

    return normalized;
  }

  /**
   * Reconstruit un thread depuis un état spécifique
   * @param sessionId ID de la session
   * @param untilMessageId ID du message jusqu'auquel reconstruire
   * @returns Thread reconstruit jusqu'au message spécifié
   */
  async rebuildFromDBUntil(sessionId: string, untilMessageId: string): Promise<ChatMessage[]> {
    try {
      const fullThread = await this.rebuildFromDB(sessionId);
      
      // Trouver l'index du message cible
      const targetIndex = fullThread.findIndex(msg => msg.id === untilMessageId);
      if (targetIndex === -1) {
        logger.warn(`[ThreadBuilder] ⚠️ Message ${untilMessageId} non trouvé, retour thread complet`);
        return fullThread;
      }

      // Retourner le thread jusqu'au message cible (inclus)
      const partialThread = fullThread.slice(0, targetIndex + 1);
      logger.info(`[ThreadBuilder] ✅ Thread reconstruit jusqu'à ${untilMessageId}: ${partialThread.length} messages`);
      
      return partialThread;
    } catch (error) {
      logger.error(`[ThreadBuilder] ❌ Erreur reconstruction partielle:`, error);
      throw error;
    }
  }

  /**
   * Vérifie la cohérence d'un thread
   * @param thread Thread à vérifier
   * @returns Résultat de la vérification
   */
  validateThreadCoherence(thread: ChatMessage[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!Array.isArray(thread)) {
      errors.push('Thread doit être un tableau');
      return { isValid: false, errors };
    }

    // Vérifier l'ordre des messages
    for (let i = 0; i < thread.length; i++) {
      const message = thread[i];
      
      if (!this.isValidMessage(message)) {
        errors.push(`Message ${i} invalide: ${JSON.stringify(message)}`);
        continue;
      }

      // Vérifier la cohérence des tool calls
      if (message.role === 'assistant' && message.tool_calls) {
        const toolCallIds = message.tool_calls.map(tc => tc.id);
        
        // Vérifier que les messages tool correspondants existent
        for (const toolCallId of toolCallIds) {
          const toolMessage = thread.find(m => 
            m.role === 'tool' && m.tool_call_id === toolCallId
          );
          
          if (!toolMessage) {
            errors.push(`Message tool manquant pour tool_call_id: ${toolCallId}`);
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
} 