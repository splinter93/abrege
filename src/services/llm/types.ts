export interface LLMProvider {
  name: string;
  id: string;
  call(message: string, context: AppContext, history: ChatMessage[]): Promise<string>;
  isAvailable(): boolean;
}

export interface AppContext {
  type: 'article' | 'folder' | 'chat_session';
  id: string;
  name: string;
  content?: string;
  metadata?: Record<string, unknown>;
  uiContext?: unknown; // ✅ Support pour le contexte UI (UIContext from ContextCollector)
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string | null;
  timestamp?: string;
  isStreaming?: boolean; // Pour indiquer si le message est en cours de streaming
  // Support pour les tool calls (format OpenAI/Groq)
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }>;
  tool_call_id?: string; // Pour les messages tool
  name?: string; // Pour les messages tool (nom de la fonction appelée)
  // Support pour les tool results (format Groq Responses API)
  tool_results?: Array<{
    tool_call_id: string;
    output: string;
  }>;
}

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