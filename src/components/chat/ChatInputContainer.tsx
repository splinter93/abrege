/**
 * Composant Container pour l'input du chat
 * Extrait de ChatFullscreenV2.tsx (JSX lignes 1221-1236)
 * 
 * Wrapper autour de ChatInput avec auth status
 */

import React, { useEffect, useRef } from 'react';
import ChatInput from './ChatInput';
import { useTextToSpeechContextOptional } from '@/contexts/TextToSpeechContext';
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
    mentions?: import('@/types/noteMention').NoteMention[],
    usedPrompts?: import('@/types/promptMention').PromptMention[],
    canvasSelections?: import('@/types/canvasSelection').CanvasSelection[],
    reasoningOverride?: 'advanced' | 'general' | 'fast' | null
  ) => void;
  onStopGeneration?: () => void;
  loading: boolean;
  sessionId: string;
  currentAgentModel?: string;
  editingMessageId: string | null;
  editingContent: string;
  onCancelEdit: () => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  selectedAgent: { name: string; display_name?: string } | null;
  keyboardInset?: number;
  isVocalMode?: boolean;
  onToggleVocalMode?: () => void;
}

/**
 * Container pour l'input du chat (auth gérée par AuthRequiredModal en non-connecté).
 */
const VOCAL_TTS_START = 'chat-vocal-tts-start';
const VOCAL_TTS_PUSH = 'chat-vocal-tts-push';
const VOCAL_TTS_END = 'chat-vocal-tts-end';
const VOCAL_TTS_STOP = 'chat-vocal-tts-stop';
const VOCAL_MODE_SPEAK_EVENT = 'chat-vocal-mode-speak';

const ChatInputContainer: React.FC<ChatInputContainerProps> = ({
  onSend,
  onStopGeneration,
  loading,
  sessionId,
  currentAgentModel,
  editingMessageId,
  editingContent,
  onCancelEdit,
  textareaRef,
  selectedAgent,
  keyboardInset = 0,
  isVocalMode = false,
  onToggleVocalMode
}) => {
  const tts = useTextToSpeechContextOptional();
  const ttsRef = useRef(tts);
  ttsRef.current = tts;

  useEffect(() => {
    const onStart = () => ttsRef.current?.startStream();
    const onPush = (e: Event) => {
      const text = (e as CustomEvent<{ text: string }>).detail?.text;
      if (text) ttsRef.current?.pushText(text);
    };
    const onEnd = () => ttsRef.current?.endStream();
    const onStop = () => ttsRef.current?.stop();
    const onSpeak = (e: Event) => {
      const text = (e as CustomEvent<{ text: string }>).detail?.text?.trim();
      if (text) ttsRef.current?.speak(text);
    };

    window.addEventListener(VOCAL_TTS_START, onStart);
    window.addEventListener(VOCAL_TTS_PUSH, onPush);
    window.addEventListener(VOCAL_TTS_END, onEnd);
    window.addEventListener(VOCAL_TTS_STOP, onStop);
    window.addEventListener(VOCAL_MODE_SPEAK_EVENT, onSpeak);
    return () => {
      window.removeEventListener(VOCAL_TTS_START, onStart);
      window.removeEventListener(VOCAL_TTS_PUSH, onPush);
      window.removeEventListener(VOCAL_TTS_END, onEnd);
      window.removeEventListener(VOCAL_TTS_STOP, onStop);
      window.removeEventListener(VOCAL_MODE_SPEAK_EVENT, onSpeak);
    };
  }, []);

  return (
    <div className="chatgpt-input-container" style={{ background: 'transparent' }}>
      <ChatInput
        onSend={onSend}
        onStopGeneration={onStopGeneration}
        loading={loading}
        textareaRef={textareaRef}
        disabled={false}
        placeholder='Type / for prompts • @ to mention notes.'
        sessionId={sessionId}
        currentAgentModel={currentAgentModel}
        editingMessageId={editingMessageId}
        editingContent={editingContent}
        onCancelEdit={onCancelEdit}
        isVocalMode={isVocalMode}
        onToggleVocalMode={onToggleVocalMode}
      />
    </div>
  );
};

export default ChatInputContainer;

