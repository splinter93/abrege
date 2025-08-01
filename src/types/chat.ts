// Types pour le système de sessions de chat

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
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