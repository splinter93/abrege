/**
 * Hook pour gérer les handlers UI de ChatFullscreenV2
 * Extrait de ChatFullscreenV2.tsx (lignes 109-138, 337-363, 613-712, 715-739, 908-949)
 * 
 * Responsabilités:
 * - Handlers UI (sidebar, edit, send, canva, retry, dismiss)
 * (Auth non connecté = AuthRequiredModal dans ChatFullscreenV2)
 * 
 * Conformité GUIDE-EXCELLENCE-CODE.md: Hook < 300 lignes, types stricts
 */

import { useCallback } from 'react';
import React from 'react';
import type { ChatMessage, ChatSession, Agent, EditingState } from '@/types/chat';
import type { MessageContent, ImageAttachment } from '@/types/image';
import type { Note } from '@/services/chat/ChatContextBuilder';
import type { NoteMention } from '@/types/noteMention';
import type { PromptMention } from '@/types/promptMention';
import type { CanvasSelection } from '@/types/canvasSelection';
import type { UseChatMessageActionsReturn } from './useChatMessageActions';
import type { UseChatFullscreenUIStateReturn } from './useChatFullscreenUIState';
import type { CanvaSession } from '@/store/useCanvaStore';
import { simpleLogger as logger } from '@/utils/logger';
import { chatError, chatSuccess } from '@/utils/chatToast';

/**
 * Options du hook
 */
export interface UseChatFullscreenUIActionsOptions {
  requireAuth: () => boolean;
  user: { id: string; email?: string } | null;
  authLoading: boolean;
  isDesktop: boolean;
  isCanvaOpen: boolean;
  allowSidebarHover: boolean;
  editingMessage: EditingState | null;
  currentSession: ChatSession | null;
  infiniteMessages: ChatMessage[];
  messageActions: UseChatMessageActionsReturn;
  uiState: UseChatFullscreenUIStateReturn;
  openCanva: (userId: string, chatSessionId: string, options?: { title?: string }) => Promise<CanvaSession>;
  closeCanva: (sessionId?: string, options?: { delete?: boolean }) => Promise<void>;
  switchCanva: (canvaId: string, noteId: string) => Promise<'activated' | 'not_found'>;
  startEditingMessage: (messageId: string, content: string, index: number) => void;
  cancelEditing: () => void;
  activeCanvaId: string | null;
}

/**
 * Interface de retour du hook
 */
export interface UseChatFullscreenUIActionsReturn {
  handleSidebarToggle: () => void;
  handleSidebarMouseEnter: () => void;
  handleSidebarMouseLeave: () => void;
  handleEditMessage: (messageId: string, content: string, index: number) => void;
  handleRegenerateResponse: (assistantMessageId: string) => Promise<void>;
  handleCancelEdit: () => void;
  handleSendMessage: (
    message: string | MessageContent,
    images?: ImageAttachment[],
    notes?: Note[],
    mentions?: NoteMention[],
    usedPrompts?: PromptMention[],
    canvasSelections?: CanvasSelection[], // ✅ NOUVEAU : Sélections du canvas
    reasoningOverride?: 'advanced' | 'general' | 'fast' | null // ✅ NOUVEAU : Override reasoning
  ) => Promise<void>;
  handleOpenCanva: () => Promise<void>;
  handleRetryMessage: () => Promise<void>;
  handleDismissError: () => void;
  handleSelectCanva: (canvaId: string, noteId: string) => Promise<void>;
  handleCloseCanva: (canvaId: string, options?: { delete?: boolean }) => Promise<void>;
}

/**
 * Hook pour gérer les handlers UI de ChatFullscreenV2
 * 
 * Groupe tous les handlers UI dans un seul hook pour éviter la duplication
 * et garantir la cohérence.
 * 
 * @param options - Options du hook
 * @returns Handlers UI
 */
export function useChatFullscreenUIActions(
  options: UseChatFullscreenUIActionsOptions
): UseChatFullscreenUIActionsReturn {
  const {
    requireAuth,
    user,
    authLoading,
    isDesktop,
    isCanvaOpen,
    allowSidebarHover,
    editingMessage,
    currentSession,
    infiniteMessages,
    messageActions,
    uiState,
    openCanva,
    closeCanva,
    switchCanva,
    startEditingMessage,
    cancelEditing,
    activeCanvaId
  } = options;

  const handleSidebarToggle = useCallback(() => {
    if (!requireAuth()) return;
    uiState.setSidebarOpen(!uiState.sidebarOpen);
    localStorage.setItem('sidebar-interacted', 'true');
    localStorage.setItem('sidebar-preference', !uiState.sidebarOpen ? 'open' : 'closed');
  }, [requireAuth, uiState.sidebarOpen, uiState.setSidebarOpen]);

  const handleSidebarMouseEnter = useCallback(() => {
    if (!allowSidebarHover) return;
    uiState.setSidebarHovered(true);
  }, [allowSidebarHover, uiState.setSidebarHovered]);

  const handleSidebarMouseLeave = useCallback(() => {
    if (!allowSidebarHover) return;
    uiState.setSidebarHovered(false);
  }, [allowSidebarHover, uiState.setSidebarHovered]);

  const handleEditMessage = useCallback((messageId: string, content: string, index: number) => {
    if (!requireAuth()) return;
    
    const realIndex = infiniteMessages.findIndex(msg => {
      if (msg.id === messageId) return true;
      if (msg.timestamp && messageId.match(/^msg-(\d+)-/)) {
        const timestampMatch = messageId.match(/^msg-(\d+)-/);
        if (timestampMatch) {
          const targetTimestamp = parseInt(timestampMatch[1]);
          const msgTimestamp = new Date(msg.timestamp).getTime();
          return Math.abs(msgTimestamp - targetTimestamp) < 1000 && msg.role === 'user';
        }
      }
      return false;
    });

    if (realIndex === -1) {
      logger.error('[useChatFullscreenUIActions] ❌ Message non trouvé:', { messageId });
      return;
    }

    startEditingMessage(messageId, content, realIndex);
    uiState.setEditingContent(content);
  }, [startEditingMessage, requireAuth, infiniteMessages, uiState.setEditingContent]);

  /** Régénère la réponse : retrouve le message user précédant l'assistant donné par id, le renvoie tel quel en supprimant ce qui suit. */
  const handleRegenerateResponse = useCallback(async (assistantMessageId: string) => {
    if (!requireAuth() || !currentSession) return;

    const assistantIndex = infiniteMessages.findIndex(m => m.id === assistantMessageId);
    if (assistantIndex <= 0) {
      logger.warn('[useChatFullscreenUIActions] Régénération impossible : message assistant introuvable ou en premier', { assistantMessageId });
      return;
    }

    let userIndex = -1;
    for (let i = assistantIndex - 1; i >= 0; i--) {
      if (infiniteMessages[i]?.role === 'user') {
        userIndex = i;
        break;
      }
    }
    if (userIndex === -1) {
      logger.warn('[useChatFullscreenUIActions] Régénération impossible : aucun message user avant l\'assistant', { assistantMessageId });
      return;
    }

    const userMsg = infiniteMessages[userIndex];
    const messageId = userMsg.id;
    if (!messageId) {
      logger.error('[useChatFullscreenUIActions] Message user sans id — impossible de régénérer', { userIndex });
      return;
    }

    const content = typeof userMsg.content === 'string' ? userMsg.content : '';
    await messageActions.editMessage({
      messageId,
      newContent: content,
      messageIndex: userIndex
    });
  }, [requireAuth, currentSession, infiniteMessages, messageActions]);

  const handleCancelEdit = useCallback(() => {
    cancelEditing();
    uiState.setEditingContent('');
  }, [cancelEditing, uiState.setEditingContent]);

  const handleSendMessage = useCallback(async (
    message: string | MessageContent,
    images?: ImageAttachment[],
    notes?: Note[],
    mentions?: NoteMention[],
    usedPrompts?: PromptMention[],
    canvasSelections?: CanvasSelection[], // ✅ NOUVEAU : Sélections du canvas
    reasoningOverride?: 'advanced' | 'general' | 'fast' | null // ✅ NOUVEAU : Override reasoning
  ) => {
    // ✏️ Si en mode édition, router vers editMessage (avec mentions, notes et prompts)
    if (editingMessage) {
      let textContent = '';
      if (typeof message === 'string') {
        textContent = message;
      } else if (Array.isArray(message)) {
        const textPart = message.find(part => part.type === 'text');
        textContent = textPart && 'text' in textPart ? textPart.text : '';
      }
      await messageActions.editMessage({
        messageId: editingMessage.messageId,
        newContent: textContent,
        images,
        notes,
        mentions,
        usedPrompts,
        messageIndex: editingMessage.messageIndex
      });
      return;
    }

    // ✅ Capturer le message pour retry en cas d'erreur
    const messageText = typeof message === 'string' 
      ? message 
      : Array.isArray(message)
        ? (message.find(part => part.type === 'text' && 'text' in part) as { text: string } | undefined)?.text || ''
        : '';
    
    uiState.setLastUserMessage({
      content: messageText,
      images: images && images.length > 0 ? images : undefined
    });

    // Mode normal (avec mentions légères + prompts metadata + canvas selections + reasoning override)
    await messageActions.sendMessage(message, images, notes, mentions, usedPrompts, canvasSelections, reasoningOverride);
  }, [editingMessage, messageActions, uiState.setLastUserMessage]);

  const handleOpenCanva = useCallback(async () => {
    if (!user?.id || !currentSession?.id) {
      return;
    }
    const previousCanvaId = activeCanvaId;

    try {
      const newSession = await openCanva(user.id, currentSession.id);
      logger.dev('[useChatFullscreenUIActions] Canva opened', {
        newCanvaId: newSession.id,
        noteId: newSession.noteId,
        previousCanvaId
      });

      if (previousCanvaId && previousCanvaId !== newSession.id) {
        try {
          await closeCanva(previousCanvaId);
          logger.dev('[useChatFullscreenUIActions] Previous canva closed', { previousCanvaId });
        } catch (closeError) {
          logger.error('[useChatFullscreenUIActions] Failed to close previous canva', closeError);
        }
      }
    } catch (error) {
      logger.error('[useChatFullscreenUIActions] Failed to open canva', error);
      chatError('Impossible d\'ouvrir le canva', {
        suggestion: 'Vérifiez que la note existe et que vous y avez accès.',
        duration: 4000
      });
    }
  }, [openCanva, closeCanva, user, currentSession, activeCanvaId]);

  const handleRetryMessage = useCallback(async () => {
    if (!currentSession) {
      logger.warn('[useChatFullscreenUIActions] ⚠️ Pas de session active pour relancer');
      return;
    }

    // Trouver le dernier message user dans l'historique
    let userIndex = -1;
    for (let i = infiniteMessages.length - 1; i >= 0; i--) {
      if (infiniteMessages[i]?.role === 'user') {
        userIndex = i;
        break;
      }
    }

    if (userIndex === -1) {
      logger.warn('[useChatFullscreenUIActions] ⚠️ Aucun message user à relancer');
      return;
    }

    const userMsg = infiniteMessages[userIndex];
    const messageId = userMsg.id;
    if (!messageId) {
      logger.error('[useChatFullscreenUIActions] ⚠️ Message user sans id — impossible de relancer');
      return;
    }

    logger.info('[useChatFullscreenUIActions] 🔄 Relance (même flow que régénération):', {
      messageId,
      contentPreview: typeof userMsg.content === 'string' ? userMsg.content.substring(0, 100) : '[multi-modal]'
    });

    // Clear l'erreur avant de relancer
    uiState.setStreamError(null);

    // Même effet que régénération : delete cascade + renvoi tel quel (sans doublon)
    const content = typeof userMsg.content === 'string' ? userMsg.content : '';
    await messageActions.editMessage({
      messageId,
      newContent: content,
      messageIndex: userIndex
    });
  }, [currentSession, infiniteMessages, uiState.setStreamError, messageActions]);
  
  const handleDismissError = useCallback(() => {
    uiState.setStreamError(null);
    logger.dev('[useChatFullscreenUIActions] ✅ Erreur dismissée');
  }, [uiState.setStreamError]);

  const handleSelectCanva = useCallback(async (canvaId: string, noteId: string) => {
    try {
      logger.dev('[useChatFullscreenUIActions] Switching canva', { canvaId, noteId });
      const result = await switchCanva(canvaId, noteId);
      if (result === 'not_found') {
        chatError('Canva introuvable', {
          suggestion: 'La note associée a peut-être été supprimée ou vous n\'y avez plus accès.',
          duration: 4000
        });
        return;
      }
      chatSuccess('Canva ouvert', {
        suggestion: 'Le panneau d\'édition est maintenant visible à droite.'
      });
    } catch (error) {
      logger.error('[useChatFullscreenUIActions] Failed to switch canva', error);
      chatError('Erreur lors de l\'ouverture du canva', {
        suggestion: 'Vérifiez votre connexion et réessayez.',
        duration: 4000
      });
    }
  }, [switchCanva]);

  const handleCloseCanva = useCallback(async (canvaId: string, options?: { delete?: boolean }) => {
    try {
      await closeCanva(canvaId, options);
      if (options?.delete) {
        chatSuccess('Canva supprimé', {
          suggestion: 'Le panneau d\'édition a été fermé et supprimé.'
        });
      } else {
        chatSuccess('Canva fermé', {
          suggestion: 'Le panneau d\'édition a été fermé. Vous pouvez le rouvrir à tout moment.'
        });
      }
    } catch (error) {
      logger.error('[useChatFullscreenUIActions] Failed to close canva', error);
      chatError(options?.delete ? 'Erreur lors de la suppression' : 'Erreur lors de la fermeture', {
        suggestion: 'Vérifiez votre connexion et réessayez.',
        duration: 4000
      });
    }
  }, [closeCanva]);

  const result: UseChatFullscreenUIActionsReturn = {
    handleSidebarToggle,
    handleSidebarMouseEnter,
    handleSidebarMouseLeave,
    handleEditMessage,
    handleRegenerateResponse,
    handleCancelEdit,
    handleSendMessage,
    handleOpenCanva,
    handleRetryMessage,
    handleDismissError,
    handleSelectCanva,
    handleCloseCanva
  };
  
  return result;
}

