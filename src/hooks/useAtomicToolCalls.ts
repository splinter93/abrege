import { useCallback, useRef } from 'react';
import { useChatStore } from '@/store/useChatStore';
import { batchMessageService } from '@/services/batchMessageService';
import { ChatMessage } from '@/types/chat';
import { simpleLogger as logger } from '@/utils/logger';

export interface ToolCallResult {
  tool_call_id: string;
  name: string;
  content: string;
  success: boolean;
}

export interface UseAtomicToolCallsReturn {
  addToolCallSequence: (
    assistantMessage: Omit<ChatMessage, 'id'>,
    toolResults: ToolCallResult[],
    finalAssistantMessage?: Omit<ChatMessage, 'id'>
  ) => Promise<boolean>;
  addToolResult: (toolResult: ToolCallResult) => Promise<boolean>;
  isProcessing: boolean;
}

/**
 * Hook pour gérer les tool calls de manière atomique
 * Garantit la persistance complète des tool calls et leurs résultats
 */
export function useAtomicToolCalls(): UseAtomicToolCallsReturn {
  const { currentSession, setCurrentSession } = useChatStore();
  const isProcessingRef = useRef(false);

  /**
   * 🔧 Ajouter une séquence complète de tool calls de manière atomique
   * Inclut: assistant → tool calls → résultats → relance (si nécessaire)
   */
  const addToolCallSequence = useCallback(async (
    assistantMessage: Omit<ChatMessage, 'id'>,
    toolResults: ToolCallResult[],
    finalAssistantMessage?: Omit<ChatMessage, 'id'>
  ): Promise<boolean> => {
    if (!currentSession) {
      logger.error('[useAtomicToolCalls] ❌ Aucune session active');
      return false;
    }

    if (isProcessingRef.current) {
      logger.warn('[useAtomicToolCalls] ⚠️ Traitement déjà en cours');
      return false;
    }

    isProcessingRef.current = true;

    try {
      logger.dev('[useAtomicToolCalls] 🔧 Ajout séquence tool call atomique:', {
        sessionId: currentSession.id,
        hasToolCalls: !!assistantMessage.tool_calls,
        toolResultsCount: toolResults.length,
        hasFinalMessage: !!finalAssistantMessage
      });

      // Utiliser le service batch pour l'ajout atomique
      const result = await batchMessageService.addToolCallSequence(
        currentSession.id,
        assistantMessage,
        toolResults,
        finalAssistantMessage
      );

      if (result.success && result.data) {
        // Mettre à jour le store avec la session mise à jour
        setCurrentSession(result.data.session);
        
        logger.dev('[useAtomicToolCalls] ✅ Séquence tool call persistée avec succès:', {
          sessionId: currentSession.id,
          messagesAjoutés: result.data.messages.length,
          doublonsFiltrés: result.data.duplicatesFiltered
        });

        return true;
      } else {
        logger.error('[useAtomicToolCalls] ❌ Échec persistance séquence:', result.error);
        return false;
      }

    } catch (error) {
      logger.error('[useAtomicToolCalls] ❌ Erreur lors de l\'ajout de la séquence:', error);
      return false;
    } finally {
      isProcessingRef.current = false;
    }
  }, [currentSession, setCurrentSession]);

  /**
   * 🔧 Ajouter un résultat de tool de manière atomique
   * Utilise le service batch pour garantir la persistance
   */
  const addToolResult = useCallback(async (toolResult: ToolCallResult): Promise<boolean> => {
    if (!currentSession) {
      logger.error('[useAtomicToolCalls] ❌ Aucune session active');
      return false;
    }

    if (isProcessingRef.current) {
      logger.warn('[useAtomicToolCalls] ⚠️ Traitement déjà en cours');
      return false;
    }

    isProcessingRef.current = true;

    try {
      logger.dev('[useAtomicToolCalls] 🔧 Ajout résultat tool atomique:', {
        sessionId: currentSession.id,
        toolName: toolResult.name,
        toolCallId: toolResult.tool_call_id
      });

      // Créer le message tool
      const toolMessage: Omit<ChatMessage, 'id'> = {
        role: 'tool',
        tool_call_id: toolResult.tool_call_id,
        name: toolResult.name,
        content: toolResult.content,
        timestamp: new Date().toISOString()
      };

      // Utiliser le service batch
      const result = await batchMessageService.addBatchMessages({
        messages: [toolMessage],
        sessionId: currentSession.id,
        batchId: `tool-result-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      });

      if (result.success && result.data) {
        // Mettre à jour le store avec la session mise à jour
        setCurrentSession(result.data.session);
        
        logger.dev('[useAtomicToolCalls] ✅ Résultat tool persisté avec succès:', {
          sessionId: currentSession.id,
          toolName: toolResult.name,
          toolCallId: toolResult.tool_call_id
        });

        return true;
      } else {
        // Améliorer la gestion des erreurs d'authentification
        if (result.error?.includes('Authentification requise') || result.error?.includes('Problème d\'authentification')) {
          logger.error('[useAtomicToolCalls] ❌ Erreur d\'authentification:', result.error);
          // Optionnel: rediriger vers la page de connexion ou afficher un message
          // window.location.href = '/auth/login';
        } else {
          logger.error('[useAtomicToolCalls] ❌ Échec persistance résultat tool:', result.error);
        }
        return false;
      }

    } catch (error) {
      logger.error('[useAtomicToolCalls] ❌ Erreur lors de l\'ajout du résultat tool:', error);
      
      // Gérer spécifiquement les erreurs d'authentification
      if (error instanceof Error && error.message.includes('Authentification')) {
        logger.error('[useAtomicToolCalls] ❌ Erreur d\'authentification détectée:', error.message);
      }
      
      return false;
    } finally {
      isProcessingRef.current = false;
    }
  }, [currentSession, setCurrentSession]);

  return {
    addToolCallSequence,
    addToolResult,
    isProcessing: isProcessingRef.current
  };
} 