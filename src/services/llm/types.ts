import type { ChatMessage as CoreChatMessage } from '@/types/chat';
import type { Tool } from './types/strictTypes';

/**
 * Datasource Synesia liée à un agent, sérialisable vers les entrées `tools` LLM Exec (Liminality uniquement).
 */
export interface LlmAgentDatasourceRef {
  id: string;
  type: string;
  name: string;
  description: string | null;
}

export interface LLMProvider {
  name: string;
  id: string;
  call(message: string, context: AppContext, history: ChatMessage[]): Promise<unknown>;
  isAvailable(): boolean;
  /** Liminality : 3e = IDs callables Synesia, 4e = datasources agent ; les autres providers ignorent ces arguments. */
  callWithMessages(
    messages: ChatMessage[],
    tools: Tool[],
    callables?: string[],
    agentDatasources?: LlmAgentDatasourceRef[]
  ): Promise<unknown>;
  callWithMessagesStream(
    messages: ChatMessage[],
    tools: Tool[],
    callables?: string[],
    agentDatasources?: LlmAgentDatasourceRef[]
  ): AsyncGenerator<unknown>;
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