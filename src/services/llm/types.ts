import type { ChatMessage as CoreChatMessage } from '@/types/chat';

export interface LLMProvider {
  name: string;
  id: string;
  call(message: string, context: AppContext, history: ChatMessage[]): Promise<unknown>;
  isAvailable(): boolean;
}

export interface AppContext {
  type: 'article' | 'folder' | 'chat_session';
  id: string;
  name: string;
  content?: string;
  metadata?: Record<string, unknown>;
  uiContext?: unknown; // ✅ Support pour le contexte UI (UIContext from ContextCollector)
  // Propriétés pour le contexte UI
  activeNote?: {
    id: string;
    slug: string;
    name: string;
  };
  activeClasseur?: {
    id: string;
    name: string;
  };
  activeFolder?: {
    id: string;
    name: string;
  };
  attachedNotes?: Array<{
    id: string;
    slug: string;
    title: string;
    description?: string;
    word_count?: number;
  }>;
}

export type ChatMessage = CoreChatMessage;

export interface LLMResponse {
  content: string;
  provider: string;
  model?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
} 