/**
 * Types stricts pour l'API Cerebras
 * Format compatible OpenAI avec streaming SSE
 */

import type { ToolCall, Usage } from './strictTypes';

/**
 * Message Cerebras (format OpenAI compatible)
 */
export interface CerebrasMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

/**
 * Payload de requête pour chat completions
 */
export interface CerebrasChatCompletionRequest {
  model: string;
  messages: CerebrasMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  stream?: boolean;
  tools?: Array<{
    type: 'function';
    function: {
      name: string;
      description: string;
      strict?: boolean; // ✅ Mode strict pour conformité schéma garantie
      parameters: {
        type: 'object';
        properties: Record<string, {
          type: string;
          description?: string;
          enum?: string[];
          [key: string]: unknown;
        }>;
        required?: string[];
        additionalProperties?: boolean; // ✅ Requis en mode strict (doit être false)
        [key: string]: unknown;
      };
    };
  }>;
  tool_choice?: 'auto' | 'none' | {
    type: 'function';
    function: {
      name: string;
    };
  };
  parallel_tool_calls?: boolean; // ✅ Support des appels parallèles
  clear_thinking?: boolean; // ✅ zai-glm-4.7: Contrôle si le thinking précédent est inclus (défaut: true)
  reasoning_effort?: 'low' | 'medium' | 'high'; // ✅ gpt-oss-120b: Contrôle le niveau de reasoning (défaut: medium)
  min_tokens?: number; // ✅ gpt-oss-120b: Minimum de tokens à générer (peut causer des EOS tokens)
}

/**
 * Réponse de chat completion (non-streaming)
 */
export interface CerebrasChatCompletionResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: 'assistant';
      content: string | null;
      tool_calls?: ToolCall[];
      reasoning?: string;
    };
    finish_reason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | null;
  }>;
  usage: Usage;
}

/**
 * Chunk de streaming SSE
 */
export interface CerebrasStreamChunk {
  id: string;
  object: 'chat.completion.chunk';
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      content?: string;
      tool_calls?: Array<{
        index: number;
        id?: string;
        type?: 'function';
        function?: {
          name?: string;
          arguments?: string;
        };
      }>;
      reasoning?: string;
      role?: 'assistant';
    };
    finish_reason?: 'stop' | 'length' | 'tool_calls' | 'content_filter' | null;
  }>;
  usage?: Usage;
}
