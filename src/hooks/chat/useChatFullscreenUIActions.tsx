/**
 * Hook pour gérer les handlers UI de ChatFullscreenV2
 * Extrait de ChatFullscreenV2.tsx (lignes 109-138, 337-363, 613-712, 715-739, 908-949)
 * 
 * Responsabilités:
 * - Handlers UI (sidebar, edit, send, canva, retry, dismiss)
 * - Render auth status
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
  handleCancelEdit: () => void;
  handleSendMessage: (
    message: string | MessageContent,
    images?: ImageAttachment[],
    notes?: Note[],
    mentions?: NoteMention[],
    usedPrompts?: PromptMention[],
    reasoningOverride?: 'advanced' | 'general' | 'fast' | null // ✅ NOUVEAU : Override reasoning
  ) => Promise<void>;
  handleOpenCanva: () => Promise<void>;
  handleRetryMessage: () => Promise<void>;
  handleDismissError: () => void;
  handleSelectCanva: (canvaId: string, noteId: string) => Promise<void>;
  handleCloseCanva: (canvaId: string, options?: { delete?: boolean }) => Promise<void>;
  renderAuthStatus: () => React.ReactNode;
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
    reasoningOverride?: 'advanced' | 'general' | 'fast' | null // ✅ NOUVEAU : Override reasoning
  ) => {
    // ✏️ Si en mode édition, router vers editMessage
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

    // Mode normal (avec mentions légères + prompts metadata + reasoning override)
    await messageActions.sendMessage(message, images, notes, mentions, usedPrompts, reasoningOverride);
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
    if (!uiState.lastUserMessage || !currentSession) {
      logger.warn('[useChatFullscreenUIActions] ⚠️ Pas de dernier message à relancer');
      return;
    }
    
    logger.info('[useChatFullscreenUIActions] 🔄 Relance du dernier message:', {
      content: typeof uiState.lastUserMessage.content === 'string' 
        ? uiState.lastUserMessage.content.substring(0, 100) 
        : '[rich content]',
      hasImages: !!uiState.lastUserMessage.images && uiState.lastUserMessage.images.length > 0
    });
    
    // Clear l'erreur avant de relancer
    uiState.setStreamError(null);
    
    // Relancer avec le même contenu
    await messageActions.sendMessage(
      uiState.lastUserMessage.content, 
      uiState.lastUserMessage.images || []
    );
  }, [uiState.lastUserMessage, uiState.setStreamError, currentSession, messageActions]);
  
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

  const renderAuthStatus = useCallback(() => {
    if (authLoading) return null;
    
    if (!user) {
      return (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mx-4 mb-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Authentification requise</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>Vous devez être connecté pour utiliser le chat et les outils.</p>
              </div>
            </div>
          </div>
        </div>
      );
    }
    
    return null;
  }, [authLoading, user]);

  const result: UseChatFullscreenUIActionsReturn = {
    handleSidebarToggle,
    handleSidebarMouseEnter,
    handleSidebarMouseLeave,
    handleEditMessage,
    handleCancelEdit,
    handleSendMessage,
    handleOpenCanva,
    handleRetryMessage,
    handleDismissError,
    handleSelectCanva,
    handleCloseCanva,
    renderAuthStatus
  };
  
  return result;
}

