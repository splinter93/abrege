/**
 * Types stricts pour l'API DeepSeek
 * 
 * Documentation: https://api-docs.deepseek.com/
 * Format compatible OpenAI avec spécificités DeepSeek
 */

/**
 * Message DeepSeek (format compatible OpenAI)
 * 
 * ⚠️ CRITIQUE: Pour les messages assistant avec tool_calls,
 * DeepSeek REQUIS le champ `reasoning_content` (même si vide)
 */
export interface DeepSeekMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string | null;
  /**
   * ✅ REQUIS pour messages assistant avec tool_calls
   * Doit être présent (peut être string vide) quand tool_calls existe
   */
  reasoning_content?: string;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string; // JSON string
    };
  }>;
  tool_call_id?: string; // Pour messages tool
  name?: string; // Pour messages tool
}

/**
 * Request payload pour /chat/completions
 */
export interface DeepSeekChatCompletionRequest {
  model: string;
  messages: DeepSeekMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  stream?: boolean;
  tools?: Array<{
    type: 'function';
    function: {
      name: string;
      description: string;
      /**
       * ✅ DeepSeek strict mode (beta)
       * Requis pour utiliser base_url="https://api.deepseek.com/beta"
       * En mode strict, le modèle respecte strictement le JSON Schema
       */
      strict?: boolean;
      parameters: {
        type: 'object';
        properties: Record<string, {
          type: string;
          description?: string;
          enum?: string[];
          [key: string]: unknown;
        }>;
        required?: string[];
        /**
         * ✅ En mode strict, additionalProperties doit être false
         * pour tous les objects
         */
        additionalProperties?: boolean;
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
  /**
   * ✅ DeepSeek spécifique: Thinking mode
   * Pour deepseek-reasoner uniquement
   */
  thinking_mode?: 'auto' | 'enabled' | 'disabled';
}

/**
 * Response de l'API DeepSeek
 */
export interface DeepSeekChatCompletionResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: 'assistant';
      content: string | null;
      tool_calls?: Array<{
        id: string;
        type: 'function';
        function: {
          name: string;
          arguments: string; // JSON string
        };
      }>;
      /**
       * ✅ DeepSeek: Reasoning content (thinking mode)
       */
      reasoning_content?: string;
    };
    finish_reason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | null;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Stream chunk pour DeepSeek (SSE)
 */
export interface DeepSeekStreamChunk {
  id: string;
  object: 'chat.completion.chunk';
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: 'assistant';
      content?: string | null;
      tool_calls?: Array<{
        index?: number;
        id?: string;
        type?: 'function';
        function?: {
          name?: string;
          arguments?: string;
        };
      }>;
      /**
       * ✅ DeepSeek: Reasoning content delta (thinking mode)
       */
      reasoning_content?: string;
    };
    finish_reason?: 'stop' | 'length' | 'tool_calls' | 'content_filter' | null;
  }>;
}
