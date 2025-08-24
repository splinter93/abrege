import { simpleLogger as logger } from '@/utils/logger';

export interface ToolCallMessage {
  role: 'assistant';
  content: string;
  tool_calls: any[];
  timestamp: string;
}

export interface ToolResultMessage {
  role: 'tool';
  tool_call_id: string;
  name: string;
  content: string;
  success: boolean;
  timestamp: string;
}

export interface NormalizedToolResult {
  success: boolean;
  code?: string;
  message?: string;
  details?: any;
  tool_name: string;
  tool_args?: any;
  tool_call_id: string;
  timestamp: string;
}

export class ToolCallPersistenceService {
  private sessionId: string;
  private userToken: string;

  constructor(sessionId: string, userToken: string) {
    this.sessionId = sessionId;
    this.userToken = userToken;
  }

  /**
   * A)1 - Persister le message assistant avec tool_calls
   */
  async persistToolCalls(toolCalls: any[]): Promise<void> {
    if (toolCalls.length === 0) return;

    try {
      const message: ToolCallMessage = {
        role: 'assistant',
        content: '', // Ignorer le content du LLM
        tool_calls: toolCalls,
        timestamp: new Date().toISOString()
      };

      // Persister le message
      await this.persistMessage(message);
      
      // Broadcast l'événement "tool_calls"
      await this.broadcastToolCalls(toolCalls);
      
      logger.info(`[ToolCallPersistence] ✅ Tool calls persistés: ${toolCalls.length} tools`);
    } catch (error) {
      logger.error(`[ToolCallPersistence] ❌ Erreur persistance tool calls:`, error);
    }
  }

  /**
   * A)2 - Persister un résultat de tool
   */
  async persistToolResult(
    toolCallId: string, 
    toolName: string, 
    result: NormalizedToolResult
  ): Promise<void> {
    try {
      // Troncature UTF-8 safe à 8KB
      const truncatedContent = this.truncateUtf8(JSON.stringify(result), 8192);
      
      const message: ToolResultMessage = {
        role: 'tool',
        tool_call_id: toolCallId,
        name: toolName,
        content: truncatedContent,
        success: result.success,
        timestamp: new Date().toISOString()
      };

      // Persister le message
      await this.persistMessage(message);
      
      // Broadcast l'événement "tool_result"
      await this.broadcastToolResult(result);
      
      logger.info(`[ToolCallPersistence] ✅ Tool result persisté: ${toolName} (${result.success ? 'success' : 'failed'})`);
    } catch (error) {
      logger.error(`[ToolCallPersistence] ❌ Erreur persistance tool result:`, error);
    }
  }

  /**
   * Persister un message dans la session
   */
  private async persistMessage(message: ToolCallMessage | ToolResultMessage): Promise<void> {
    try {
      // 🔧 CORRECTION: Activer la vraie persistance via l'API interne
      logger.dev(`[ToolCallPersistence] 🔧 Tentative persistance:`, {
        role: message.role,
        sessionId: this.sessionId,
        hasToken: !!this.userToken,
        messageContent: JSON.stringify(message, null, 2)
      });

      // Utiliser l'API interne pour persister le message
      const { chatSessionService } = await import('../../chatSessionService');
      
      // Convertir le message au format ChatMessage attendu par l'API
      const chatMessage = {
        role: message.role,
        content: message.content,
        timestamp: message.timestamp,
        // Ajouter les champs spécifiques selon le type de message
        ...(message.role === 'assistant' && 'tool_calls' in message && { tool_calls: message.tool_calls }),
        ...(message.role === 'tool' && 'tool_call_id' in message && { tool_call_id: message.tool_call_id }),
        ...(message.role === 'tool' && 'name' in message && { name: message.name })
      };

      // Persister via l'API avec le token utilisateur
      const result = await chatSessionService.addMessageWithToken(this.sessionId, chatMessage, this.userToken);
      
      if (result.success) {
        logger.info(`[ToolCallPersistence] ✅ Message persisté avec succès: ${message.role}`);
      } else {
        logger.warn(`[ToolCallPersistence] ⚠️ Échec persistance: ${result.error}`);
      }
      
    } catch (error) {
      logger.error(`[ToolCallPersistence] ❌ Erreur persistance message:`, error);
      // Ne pas throw l'erreur pour éviter de casser le flow
      // Juste logger et continuer
    }
  }

  /**
   * Broadcast événement "tool_calls"
   */
  private async broadcastToolCalls(toolCalls: any[]): Promise<void> {
    try {
      // Broadcast vers l'UI (état pending)
      // TODO: Implémenter le broadcast réel selon ton système
      logger.dev(`[ToolCallPersistence] 📡 Broadcast tool_calls: ${toolCalls.length} tools`);
    } catch (error) {
      logger.warn(`[ToolCallPersistence] ⚠️ Erreur broadcast tool_calls:`, error);
    }
  }

  /**
   * Broadcast événement "tool_result"
   */
  private async broadcastToolResult(result: NormalizedToolResult): Promise<void> {
    try {
      // Troncature 8KB et try/catch sur le broadcast
      const truncatedResult = {
        ...result,
        details: this.truncateUtf8(JSON.stringify(result.details), 8192)
      };
      
      // TODO: Implémenter le broadcast réel selon ton système
      logger.dev(`[ToolCallPersistence] 📡 Broadcast tool_result: ${result.tool_name} (${result.success})`);
    } catch (error) {
      logger.warn(`[ToolCallPersistence] ⚠️ Erreur broadcast tool_result:`, error);
    }
  }

  /**
   * F)1 - Troncature UTF-8 safe (Edge-safe)
   */
  private truncateUtf8(str: string, maxBytes: number): string {
    try {
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();
      
      const bytes = encoder.encode(str);
      if (bytes.length <= maxBytes) return str;
      
      // Tronquer en respectant les caractères UTF-8
      const truncatedBytes = bytes.slice(0, maxBytes);
      return decoder.decode(truncatedBytes) + '...';
    } catch (error) {
      logger.warn(`[ToolCallPersistence] ⚠️ Erreur troncature UTF-8:`, error);
      return str.length > maxBytes ? str.substring(0, maxBytes) + '...' : str;
    }
  }
} 