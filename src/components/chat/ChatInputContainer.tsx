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
    mentions?: import('@/types/noteMention').NoteMention[] // ✅ NOUVEAU : Mentions légères
  ) => void;
  loading: boolean;
  sessionId: string;
  currentAgentModel?: string;
  editingMessageId: string | null;
  editingContent: string;
  onCancelEdit: () => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  renderAuthStatus: () => React.ReactNode;
  selectedAgent: { name: string } | null;
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
  selectedAgent
}) => {
  return (
    <div className="chatgpt-input-container">
      {renderAuthStatus()}
      <ChatInput
        onSend={onSend}
        loading={loading}
        textareaRef={textareaRef}
        disabled={false}
        placeholder={
          selectedAgent
            ? `Discuter avec ${selectedAgent.display_name || selectedAgent.name}`
            : "Commencez à discuter..."
        }
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

