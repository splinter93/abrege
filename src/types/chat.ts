// Types pour le système de sessions de chat

export interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string | null;
  reasoning?: string | null;
  timestamp: string;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }>;
  tool_call_id?: string;
  name?: string;
  tool_results?: Array<{
    tool_call_id: string;
    name: string;
    content: string;
    success?: boolean;
  }>;
  isStreaming?: boolean; // Pour indiquer si le message est en cours de streaming
}

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
  id: string;
  name: string;
  provider: string;
  profile_picture?: string;
  temperature: number;
  top_p: number;
  instructions?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Nouvelles colonnes pour le système template
  model: string;
  max_tokens: number;
  system_instructions?: string;
  context_template?: string;
  api_config: Record<string, any>;
  personality?: string;
  expertise?: string[];
  capabilities: string[];
  version: string;
  is_default: boolean;
  priority: number;
  // Capacités API v2
  api_v2_capabilities?: string[];
} 