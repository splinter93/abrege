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
  metadata?: Record<string, any>;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
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