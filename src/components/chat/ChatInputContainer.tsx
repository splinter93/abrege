/**
 * Composant Container pour l'input du chat
 * Extrait de ChatFullscreenV2.tsx (JSX lignes 1221-1236)
 * 
 * Wrapper autour de ChatInput avec auth status
 */

import React from 'react';
import ChatInput from './ChatInput';
import type { MessageContent, ImageAttachment } from '@/types/image';
import type { Note } from '@/services/chat/ChatContextBuilder';

/**
 * Props du composant
 */
export interface ChatInputContainerProps {
  onSend: (
    message: string | MessageContent,
    images?: ImageAttachment[],
    notes?: Note[],
    mentions?: import('@/types/noteMention').NoteMention[], // ✅ Mentions légères
    usedPrompts?: import('@/types/promptMention').PromptMention[] // ✅ NOUVEAU : Prompts utilisés
  ) => void;
  loading: boolean;
  sessionId: string;
  currentAgentModel?: string;
  editingMessageId: string | null;
  editingContent: string;
  onCancelEdit: () => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  renderAuthStatus: () => React.ReactNode;
  selectedAgent: { name: string; display_name?: string } | null;
  keyboardInset?: number;
}

/**
 * Container pour l'input du chat
 * Affiche le warning auth + ChatInput
 */
const ChatInputContainer: React.FC<ChatInputContainerProps> = ({
  onSend,
  loading,
  sessionId,
  currentAgentModel,
  editingMessageId,
  editingContent,
  onCancelEdit,
  textareaRef,
  renderAuthStatus,
  selectedAgent,
  keyboardInset = 0
}) => {
  return (
    <div
      className="chatgpt-input-container"
      style={
        keyboardInset > 0
          ? {
              paddingBottom: Math.max(24, keyboardInset + 16)
            }
          : undefined
      }
    >
      {renderAuthStatus()}
      <ChatInput
        onSend={onSend}
        loading={loading}
        textareaRef={textareaRef}
        disabled={false}
        placeholder='Type / for prompts • @ to mention notes.'
        sessionId={sessionId}
        currentAgentModel={currentAgentModel}
        editingMessageId={editingMessageId}
        editingContent={editingContent}
        onCancelEdit={onCancelEdit}
      />
    </div>
  );
};

export default ChatInputContainer;

