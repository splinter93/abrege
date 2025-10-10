// Types pour le système de sessions de chat

export type ToolCall = {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
};

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool' | 'developer';
  content: string | null;
  reasoning?: string | null;
  // 🎼 Canaux Harmony séparés
  harmony_analysis?: string;
  harmony_commentary?: string;
  harmony_final?: string;
  timestamp: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
  tool_results?: Array<{
    tool_call_id: string;
    name: string;
    content: string;
    success?: boolean;
  }>;
  isStreaming?: boolean;
  channel?: 'analysis' | 'commentary' | 'final';
};

export interface ChatSession {
  id: string;
  user_id: string;
  name: string;
  thread: ChatMessage[];
  created_at: string;
  updated_at: string;
  is_active: boolean;
  history_limit: number;
  metadata?: Record<string, any>;
}

export interface CreateChatSessionData {
  name?: string;
  initial_message?: string;
  history_limit?: number;
  metadata?: Record<string, any>;
}

export interface UpdateChatSessionData {
  name?: string;
  thread?: ChatMessage[];
  is_active?: boolean;
  history_limit?: number;
  metadata?: Record<string, any>;
}

export interface ChatSessionResponse {
  success: boolean;
  data?: ChatSession;
  error?: string;
}

export interface ChatSessionsListResponse {
  success: boolean;
  data?: ChatSession[];
  error?: string;
}

export interface AddMessageData {
  sessionId: string;
  message: ChatMessage;
}

export interface ChatSessionFilters {
  is_active?: boolean;
  limit?: number;
  offset?: number;
  search?: string;
}

// Types pour la gestion de l'historique
export interface HistoryConfig {
  maxMessages: number;
  includeSystemMessages?: boolean;
  truncateStrategy?: 'keep_latest' | 'keep_oldest' | 'keep_middle';
  excludeChannels?: Array<'analysis' | 'commentary' | 'final'>;
}

export interface ProcessedHistory {
  messages: ChatMessage[];
  totalMessages: number;
  truncatedMessages: number;
  historyLimit: number;
}

// Types pour l'API Synesia
export interface SynesiaPayload {
  callable_id: string;
  args: string;
  settings: {
    history_messages: Array<{
      role: 'user' | 'assistant';
      content: string;
    }>;
    history_limit?: number;
  };
}

export interface Agent {
  // Identification
  id: string;
  user_id?: string;
  name: string;
  slug?: string;
  display_name?: string;
  
  // Configuration LLM
  provider: string;
  model: string;
  temperature: number;
  top_p: number;
  max_tokens: number;
  
  // Instructions et comportement
  system_instructions?: string;
  personality?: string;
  expertise?: string[];
  context_template?: string;
  
  // Type et état
  is_active: boolean;
  is_chat_agent?: boolean;
  is_endpoint_agent?: boolean;
  priority: number;
  
  // Schémas
  input_schema?: Record<string, any>;
  output_schema?: Record<string, any>;
  
  // Capacités
  capabilities: string[];
  api_v2_capabilities?: string[];
  
  // Apparence
  profile_picture?: string;
  description?: string;
  
  // Métadonnées
  version: string;
  is_default: boolean;
  api_config: Record<string, any>;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
} 