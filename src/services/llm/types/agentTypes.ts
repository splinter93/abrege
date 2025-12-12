/**
 * Types stricts pour la configuration des agents
 * Remplace les 'any' par des types précis
 */

import type { MessageContent } from '@/types/image';

export interface AgentConfig {
  id: string;
  name: string;
  model: string;
  provider?: string;
  temperature?: number;
  max_tokens?: number;
  max_completion_tokens?: number;
  top_p?: number;
  reasoning_effort?: 'low' | 'medium' | 'high' | number;
  service_tier?: string;
  parallel_tool_calls?: boolean;
  system_instructions?: string;
  context_template?: string;
  personality?: string;
  expertise?: string[];
  capabilities?: string[]; // Legacy
  api_v2_capabilities?: string[];
  api_config?: Record<string, unknown>;
  toolExecutionMode?: 'sequential' | 'parallel';
  toolBatchSize?: number;
  is_active: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface LLMResponse {
  content?: string;
  reasoning?: string;
  tool_calls?: ToolCall[];
  choices?: Array<{
    message: {
      content: string;
    };
  }>;
}

export interface ToolCall {
  id: string;
  type?: 'function';
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

export interface ToolResult {
  tool_call_id: string;
  name: string;
  content: string;
  success: boolean;
  timestamp?: string;
  result?: unknown;
  duration_ms?: number;
}

export interface SessionHistory {
  messages: LLMChatMessage[];
  toolCalls: ToolCall[];
  toolResults: ToolResult[];
}

export interface LLMChatMessage {
  id: string;
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: MessageContent | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
  timestamp: string;
  channel?: string;
}

export interface AppContext {
  type: 'chat_session';
  name: string;
  id: string;
  content: string;
  attachedNotes?: Array<{
    id: string;
    slug: string;
    title: string;
    description?: string;
    word_count?: number;
  }>;
}

export interface SessionIdentity {
  userToken: string;
  sessionId: string;
}
