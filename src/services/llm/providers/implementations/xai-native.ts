import { BaseProvider, type ProviderConfig, type ProviderInfo } from '../base/BaseProvider';
import type { LLMProvider, AppContext } from '../../types';
import type { ChatMessage } from '@/types/chat';
import { simpleLogger as logger } from '@/utils/logger';
import { getSystemMessage } from '../../templates';
import type {
  LLMResponse,
  ToolCall,
  Tool,
  FunctionTool,
  Usage
} from '../../types/strictTypes';
import { isFunctionTool } from '../../types/strictTypes';
import type { McpServerConfig, XaiMcpServerConfig } from '@/types/mcp';
import { convertToXaiMcpConfig } from '@/types/mcp';

/**
 * Configuration spécifique à xAI Native API
 */
interface XAINativeConfig extends ProviderConfig {
  // Spécifique à xAI
  reasoningMode?: 'fast' | 'reasoning';
  parallelToolCalls?: boolean;
  streamingMode?: 'sse' | 'json'; // Format de streaming
}

/**
 * ✅ Types pour streaming SSE
 */
export interface StreamChunk {
  type: 'delta' | 'done' | 'error';
  content?: string;
  tool_calls?: ToolCall[];
  reasoning?: string;
  usage?: Usage;
  error?: string;
  finishReason?: 'stop' | 'length' | 'tool_calls' | 'content_filter' | null;
}

/**
 * Format natif xAI pour les messages (input array)
 */
interface XAINativeInputMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null | XAINativeContentPart[];
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

/**
 * Content multi-part pour images
 */
interface XAINativeContentPart {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: {
    url: string;
    detail?: 'auto' | 'low' | 'high';
  };
}

/**
 * Réponse de l'API xAI /v1/responses
 */
interface XAINativeResponse {
  id: string;
  object: 'response';
  created: number;
  model: string;
  output: Array<{
    role: 'assistant';
    content: string | null;
    tool_calls?: ToolCall[];
    reasoning?: string;
  }>;
  usage: Usage;
}

/**
 * Chunk SSE de l'API xAI /v1/responses
 */
interface XAINativeStreamChunk {
  id: string;
  object: 'response.chunk';
  created: number;
  model: string;
  output: Array<{
    index: number;
    delta: {
      role?: 'assistant';
      content?: string;
      tool_calls?: Array<{
        index?: number;
        id?: string;
        type?: 'function';
        function?: {
          name?: string;
          arguments?: string;
        };
      }>;
      reasoning?: string;
    };
    finish_reason?: 'stop' | 'length' | 'tool_calls' | 'content_filter' | null;
  }>;
  usage?: Usage;
}

/**
 * Informations sur xAI Native API
 */
const XAI_NATIVE_INFO: ProviderInfo = {
  id: 'xai-native',
  name: 'xAI Native (Grok with MCP)',
  version: '1.0.0',
  description: 'xAI Grok models with Native API endpoint and MCP Remote Tools support',
  capabilities: {
    functionCalls: true,
    streaming: true,
    reasoning: true,
    codeExecution: false,
    webSearch: false,
    structuredOutput: true,
    images: true
  },
  supportedModels: [
    'grok-4-1-fast-reasoning',
    'grok-4-1-fast-non-reasoning',
    'grok-4-1-fast',
    'grok-4-fast-reasoning',       // Legacy reasoning (migrated to 4.1)
    'grok-beta',
    'grok-vision-beta'
  ],
  pricing: {
    input: '$0.20/1M tokens',
    output: '$0.50/1M tokens'
  }
};

/**
 * Configuration par défaut
 */
const DEFAULT_XAI_NATIVE_CONFIG: XAINativeConfig = {
  apiKey: process.env.XAI_API_KEY || '',
  baseUrl: 'https://api.x.ai/v1',
  timeout: 120000,
  model: 'grok-4-1-fast-reasoning',
  temperature: 0.7,
  maxTokens: 8000,
  topP: 0.85,
  supportsFunctionCalls: true,
  supportsStreaming: true,
  supportsReasoning: true,
  enableLogging: true,
  enableMetrics: true,
  reasoningMode: 'fast',
  parallelToolCalls: true,
  streamingMode: 'sse'
};

/**
 * Provider xAI Native API avec support MCP Remote Tools
 * 
 * Utilise l'endpoint /v1/responses (format natif x.ai)
 * Support complet des MCP Remote Tools
 */
export class XAINativeProvider extends BaseProvider implements LLMProvider {
  readonly info = XAI_NATIVE_INFO;
  readonly config: XAINativeConfig;

  get name(): string {
    return this.info.name;
  }

  get id(): string {
    return this.info.id;
  }

  constructor(customConfig?: Partial<XAINativeConfig>) {
    super();
    this.config = { ...DEFAULT_XAI_NATIVE_CONFIG, ...customConfig };
  }

  /**
   * Vérifie si xAI Native est disponible
   */
  isAvailable(): boolean {
    return this.validateConfig();
  }

  /**
   * Valide la configuration
   */
  validateConfig(): boolean {
    if (!this.validateBaseConfig()) {
      logger.error('[XAINativeProvider] ❌ Configuration de base invalide');
      return false;
    }

    if (!this.config.model) {
      logger.error('[XAINativeProvider] ❌ Modèle non spécifié');
      return false;
    }

    return true;
  }

  /**
   * Appel simple (non-streaming)
   */
  async call(message: string, context: AppContext, history: ChatMessage[]): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error('xAI Native provider non configuré');
    }

    try {
      const input = this.prepareInput(message, context, history);
      const payload = await this.preparePayload(input, []);
      payload.stream = false;

      const response = await this.makeApiCall(payload);
      const result = this.extractResponse(response);

      return result.content || '';

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('[XAINativeProvider] ❌ Erreur:', { message: errorMessage });
      throw error;
    }
  }

  /**
   * Appel avec messages préparés + tools (OpenAPI + MCP)
   * 
   * ✅ Support hybride:
   * - OpenAPI tools (type: 'function')
   * - MCP Remote Tools (type: 'mcp', server_url, ...)
   */
  async callWithMessages(
    messages: ChatMessage[],
    tools: Tool[] | Array<Tool | McpServerConfig>
  ): Promise<LLMResponse> {
    if (!this.isAvailable()) {
      throw new Error('xAI Native provider non configuré');
    }

    try {
      const input = this.convertChatMessagesToInput(messages);
      const payload = await this.preparePayload(input, tools);
      payload.stream = false;

      const response = await this.makeApiCall(payload);
      const result = this.extractResponse(response);

      return {
        content: result.content || '',
        tool_calls: result.tool_calls || [],
        model: result.model,
        usage: result.usage,
        reasoning: result.reasoning
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('[XAINativeProvider] ❌ Erreur:', { message: errorMessage });
      throw error;
    }
  }

  /**
   * ✅ Streaming avec Server-Sent Events (SSE)
   * 
   * ROUTING AUTOMATIQUE:
   * - MCP tools + images → /v1/chat/completions (images non supportées par /v1/responses)
   * - MCP tools sans images → /v1/responses (MCP Remote Tools)
   * - OpenAPI tools → /v1/chat/completions (format standard)
   * - Pas de tools → /v1/chat/completions
   * 
   * ⚠️ CRITICAL: /v1/responses ne supporte PAS les images (content array)
   * Solution: Fallback vers /v1/chat/completions si images présentes
   */
  async *callWithMessagesStream(
    messages: ChatMessage[],
    tools: Tool[] | Array<Tool | McpServerConfig>
  ): AsyncGenerator<StreamChunk, void, unknown> {
    if (!this.isAvailable()) {
      throw new Error('xAI Native provider non configuré');
    }

    try {
      // ✅ Détecter le type de tools
      const hasMcpTools = Array.isArray(tools) && tools.some(t => this.isMcpTool(t));
      const hasOpenApiTools = Array.isArray(tools) && tools.some(t => isFunctionTool(t as Tool));
      
      // ✅ CRITICAL FIX: Détecter si on a des images dans les messages
      const hasImages = messages.some(msg => 
        msg.role === 'user' && 
        'attachedImages' in msg && 
        Array.isArray((msg as { attachedImages?: unknown[] }).attachedImages) &&
        (msg as { attachedImages?: unknown[] }).attachedImages!.length > 0
      );

      // ✅ ROUTING: /v1/responses si MCP tools SANS images
      // ⚠️ FALLBACK: /v1/chat/completions si MCP tools AVEC images (images non supportées par /v1/responses)
      if (hasMcpTools && !hasImages) {
        logger.dev('[XAINativeProvider] 🔀 Route: /v1/responses (MCP Remote Tools, pas d\'images)');
        yield* this.streamWithResponsesApi(messages, tools);
      } else if (hasMcpTools && hasImages) {
        logger.warn('[XAINativeProvider] ⚠️ MCP tools + images détectés → Fallback /v1/chat/completions (images non supportées par /v1/responses)');
        // ⚠️ FALLBACK: Filtrer les MCP tools (non supportés par /v1/chat/completions)
        // On ne peut pas utiliser MCP tools avec images, donc on les désactive temporairement
        const filteredTools = Array.isArray(tools) ? tools.filter(t => !this.isMcpTool(t)) : [];
        if (filteredTools.length === 0) {
          logger.warn('[XAINativeProvider] ⚠️ Aucun tool disponible après filtrage MCP → Pas de tools');
        }
        yield* this.streamWithChatCompletions(messages, filteredTools);
      } else if (hasOpenApiTools) {
        logger.dev('[XAINativeProvider] 🔀 Route: /v1/chat/completions (OpenAPI tools)');
        yield* this.streamWithChatCompletions(messages, tools);
      } else {
        // Pas de tools, utiliser chat/completions par défaut
        logger.dev('[XAINativeProvider] 🔀 Route: /v1/chat/completions (no tools)');
        yield* this.streamWithChatCompletions(messages, []);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('[XAINativeProvider] ❌ Erreur streaming:', { message: errorMessage });
      throw error;
    }
  }

  /**
   * Convertit les ChatMessage en format OpenAI standard (pour /chat/completions)
   * ✅ Gère les images via buildMessageContent
   */
  private convertChatMessagesToApiFormat(messages: ChatMessage[]): XAINativeInputMessage[] {
    return messages.map(msg => {
      // ✅ Utiliser buildMessageContent pour gérer les images correctement
      const content = this.buildMessageContent(msg);
      
      // ✅ Convertir null → "" pour éviter erreurs
      const apiContent: string | XAINativeContentPart[] = content === null ? '' : content;
      
      const apiMsg: XAINativeInputMessage = {
        role: msg.role as 'system' | 'user' | 'assistant' | 'tool',
        content: apiContent
      };

      if ('tool_calls' in msg && msg.tool_calls && msg.tool_calls.length > 0) {
        apiMsg.tool_calls = msg.tool_calls as ToolCall[];
      }

      if ('tool_call_id' in msg && msg.tool_call_id) {
        apiMsg.tool_call_id = msg.tool_call_id;
        if ('name' in msg && msg.name) {
          apiMsg.name = msg.name;
        }
      }

      return apiMsg;
    });
  }

  /**
   * Stream avec /v1/chat/completions (OpenAPI tools standard)
   * ⚠️ IMPORTANT: /v1/chat/completions NE SUPPORTE PAS les MCP tools (seulement function/live_search)
   */
  private async *streamWithChatCompletions(
    messages: ChatMessage[],
    tools: Tool[] | Array<Tool | McpServerConfig>
  ): AsyncGenerator<StreamChunk, void, unknown> {
    // Convertir au format OpenAI standard (messages, pas input)
    const apiMessages = this.convertChatMessagesToApiFormat(messages);
    
    // Payload pour /chat/completions (format OpenAI)
    const payload: Record<string, unknown> = {
      model: this.config.model,
      messages: apiMessages,
      temperature: this.config.temperature,
      max_tokens: this.config.maxTokens,
      top_p: this.config.topP,
      stream: true
    };

    // ✅ CRITIQUE: Filtrer les MCP tools (non supportés par /v1/chat/completions)
    // /v1/chat/completions supporte seulement: 'function' ou 'live_search'
    if (Array.isArray(tools) && tools.length > 0) {
      const filteredTools = tools.filter(t => {
        if (this.isMcpTool(t)) {
          logger.warn('[XAINativeProvider] ⚠️ MCP tool filtré (non supporté par /v1/chat/completions):', {
            name: 'server_label' in t ? t.server_label : (t as any).name
          });
          return false;
        }
        return true;
      }) as Tool[];
      
      if (filteredTools.length > 0) {
        payload.tools = filteredTools; // Format standard OpenAI (function tools uniquement)
        payload.tool_choice = 'auto';
        
        if (filteredTools.length < tools.length) {
          logger.warn(`[XAINativeProvider] ⚠️ ${tools.length - filteredTools.length} MCP tools filtrés (${filteredTools.length} function tools conservés)`);
        }
      }
    }

    logger.dev('[XAINativeProvider] 📤 Payload (chat/completions):', {
      model: payload.model,
      messages: apiMessages.length,
      tools: Array.isArray(payload.tools) ? (payload.tools as unknown[]).length : 0
    });

    // Appel API
    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorDetails: { error?: { message?: string; type?: string; code?: string } } = {};
      try {
        errorDetails = JSON.parse(errorText);
      } catch {
        // Ignore
      }

      const errorMessage = errorDetails.error?.message || errorText;
      const errorCode = errorDetails.error?.code || errorDetails.error?.type || 'unknown';

      logger.error(`[XAINativeProvider] ❌ Erreur API (/chat/completions):`, {
        statusCode: response.status,
        statusText: response.statusText,
        errorMessage,
        errorCode
      });

      const error = new Error(`xAI Native API error: ${response.status} - ${errorMessage}`);
      (error as Error & { statusCode?: number }).statusCode = response.status;
      throw error;
    }

    if (!response.body) {
      throw new Error('Response body is null');
    }

    // Lire le stream SSE (format OpenAI)
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(':')) continue;

        if (trimmed.startsWith('data: ')) {
          const data = trimmed.slice(6);
          if (data === '[DONE]') break;

          try {
            const parsed = JSON.parse(data);
            const choice = parsed.choices?.[0];
            if (!choice) continue;

            const delta = choice.delta;
            const chunk: StreamChunk = { type: 'delta' };

            if (delta.content) {
              chunk.content = delta.content;
            }

            if (delta.tool_calls && delta.tool_calls.length > 0) {
              chunk.tool_calls = delta.tool_calls.map((tc: { id?: string; type?: string; function?: { name?: string; arguments?: string } }) => ({
                id: tc.id || '',
                type: 'function' as const,
                function: {
                  name: tc.function?.name || '',
                  arguments: tc.function?.arguments || ''
                }
              }));
            }

            if (choice.finish_reason) {
              chunk.finishReason = choice.finish_reason === 'tool_calls' ? 'tool_calls' : 'stop';
            }

            yield chunk;
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
    }
  }

  /**
   * Stream avec /v1/responses (MCP Remote Tools uniquement)
   */
  private async *streamWithResponsesApi(
    messages: ChatMessage[],
    tools: Tool[] | Array<Tool | McpServerConfig>
  ): AsyncGenerator<StreamChunk, void, unknown> {
    try {
      const input = this.convertChatMessagesToInput(messages);
      const payload = await this.preparePayload(input, tools);
      payload.stream = true;

    // ✅ Logger le payload envoyé (avec détails tools pour debug)
    logger.dev('[XAINativeProvider] 📤 Payload:', {
      model: payload.model,
      messages: input.length,
      tools: Array.isArray(payload.tools) ? (payload.tools as unknown[]).length : 0
    });
    
    // ✅ Logger le payload complet pour vérifier le format exact (surtout avec images)
    if (Array.isArray(payload.input)) {
      logger.dev('[XAINativeProvider] 🔍 Payload input preview:', {
        model: payload.model,
        inputLength: payload.input.length,
        messages: payload.input.map((msg: unknown, i: number) => {
          const m = msg as { role?: string; content?: unknown };
          const content = m.content;
          const contentType = typeof content;
          const contentIsArray = Array.isArray(content);
          const preview: Record<string, unknown> = {
            index: i,
            role: m.role,
            contentType,
            contentIsArray
          };
          
          if (contentType === 'string') {
            preview.contentLength = (content as string).length;
            preview.contentPreview = (content as string).substring(0, 100);
          } else if (contentIsArray) {
            const arr = content as unknown[];
            preview.arrayLength = arr.length;
            preview.arrayTypes = arr.map((part: unknown) => {
              const p = part as { type?: string; text?: string; image_url?: { url?: string } };
              if (p.type === 'text') return { type: 'text', textLength: p.text?.length || 0 };
              if (p.type === 'image_url') return { type: 'image_url', urlLength: p.image_url?.url?.length || 0 };
              return { type: 'unknown' };
            });
          }
          
          return preview;
        }),
        toolsCount: Array.isArray(payload.tools) ? (payload.tools as unknown[]).length : 0
      });
    }
    
    // ✅ LOG COMPLET du payload pour debug (JSON stringifié)
    try {
      const payloadStr = JSON.stringify(payload);
      const errorColumn = 1085; // Colonne de l'erreur typique
      const previewStart = Math.max(0, errorColumn - 200);
      const previewEnd = Math.min(payloadStr.length, errorColumn + 200);
      
      logger.dev('[XAINativeProvider] 🔍 Payload JSON (preview around error column 1085):', {
        payloadPreview: payloadStr.substring(0, 2000),
        totalLength: payloadStr.length,
        errorColumnPreview: payloadStr.substring(previewStart, previewEnd),
        errorColumn: errorColumn,
        charAtErrorColumn: payloadStr.charAt(errorColumn - 1),
        contextBefore: payloadStr.substring(Math.max(0, errorColumn - 50), errorColumn),
        contextAfter: payloadStr.substring(errorColumn, Math.min(payloadStr.length, errorColumn + 50))
      });
    } catch (e) {
      logger.warn('[XAINativeProvider] ⚠️ Impossible de stringifier le payload pour debug:', e);
    }
    
    // ✅ Logger les tools en détail pour debug format
    if (Array.isArray(payload.tools) && (payload.tools as unknown[]).length > 0) {
      logger.dev('[XAINativeProvider] 🔧 Tools détails:', {
        toolsCount: (payload.tools as unknown[]).length,
        firstTool: payload.tools[0],
        allToolTypes: (payload.tools as Array<{ type: string; name?: string }>).map(t => ({ type: t.type, name: t.name }))
      });
    }

    // Appel API avec streaming
    const response = await fetch(`${this.config.baseUrl}/responses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorDetails: { error?: { message?: string; type?: string; code?: string } } = {};
      try {
        errorDetails = JSON.parse(errorText);
      } catch {
        // Ignore parse errors
      }

      const errorMessage = errorDetails.error?.message || errorText;
      const errorCode = errorDetails.error?.code || errorDetails.error?.type || 'unknown';

      logger.error(`[XAINativeProvider] ❌ Erreur API (/responses):`, {
        statusCode: response.status,
        statusText: response.statusText,
        errorMessage,
        errorCode,
        model: this.config.model,
        toolsCount: Array.isArray(tools) ? tools.length : 0
      });

      const error = new Error(`xAI Native API error: ${response.status} - ${errorMessage}`);
      (error as Error & { statusCode?: number; provider?: string; errorCode?: string }).statusCode = response.status;
      (error as Error & { statusCode?: number; provider?: string; errorCode?: string }).provider = 'xai-native';
      (error as Error & { statusCode?: number; provider?: string; errorCode?: string }).errorCode = errorCode;
      throw error;
    }

    if (!response.body) {
      throw new Error('Response body is null');
    }

    // Lire le stream SSE
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    
    // ✅ Accumulateurs pour les MCP tool calls
    const mcpCallsInProgress = new Map<string, {
      id: string;
      name: string;
      arguments: string;
      server_label?: string;
    }>();

    while (true) {
      const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();

          if (!trimmed || trimmed.startsWith(':')) {
            continue;
          }

          if (trimmed.startsWith('data: ')) {
            const data = trimmed.slice(6);

            if (data === '[DONE]') break;

            try {
              const parsed = JSON.parse(data) as Record<string, unknown>;
              const eventType = parsed.type as string;
              
              if (eventType === 'response.output_text.delta') {
                // Chunk de contenu
                const deltaText = parsed.delta as string;
                if (deltaText) {
                  yield {
                    type: 'delta',
                    content: deltaText
                  };
                }
              } else if (eventType === 'response.output_item.added') {
                // ✅ MCP call ajouté
                const item = parsed.item as Record<string, unknown>;
                if (item?.type === 'mcp_call') {
                  const itemId = item.id as string;
                  const name = item.name as string;
                  const serverLabel = item.server_label as string | undefined;
                  
                  mcpCallsInProgress.set(itemId, {
                    id: itemId,
                    name,
                    arguments: '',
                    server_label: serverLabel
                  });
                  
                  logger.dev('[XAINativeProvider] 🔧 MCP call:', { name, serverLabel });
                }
              } else if (eventType === 'response.mcp_call_arguments.done') {
                // ✅ Arguments du MCP call terminés
                const itemId = parsed.item_id as string;
                const args = parsed.arguments as string;
                
                const mcpCall = mcpCallsInProgress.get(itemId);
                if (mcpCall) {
                  mcpCall.arguments = args;
                }
              } else if (eventType === 'response.output_item.done') {
                // ✅ Fin d'un output item - peut être un MCP call ou message
                const item = parsed.item as Record<string, unknown>;
                
                if (item?.type === 'mcp_call') {
                  // ✅ MCP tool call terminé - x.ai l'a DÉJÀ exécuté côté serveur
                  const itemId = item.id as string;
                  const output = item.output as string | undefined;
                  const mcpCall = mcpCallsInProgress.get(itemId);
                  
                  if (mcpCall) {
                    logger.dev('[XAINativeProvider] ✅ MCP result:', { 
                      name: mcpCall.name,
                      hasOutput: !!output
                    });
                    
                    // ✅ Yield avec finishReason pour afficher dans l'UI + flag alreadyExecuted
                    yield {
                      type: 'delta',
                      tool_calls: [{
                        id: mcpCall.id,
                        type: 'function' as const,
                        function: {
                          name: mcpCall.name,
                          arguments: mcpCall.arguments || '{}'
                        },
                        alreadyExecuted: true,
                        result: output || 'Executed by x.ai (MCP)'
                      }],
                      finishReason: 'tool_calls' // ✅ Pour afficher dans timeline UI
                    };
                    
                    mcpCallsInProgress.delete(itemId);
                  }
                }
              } else if (eventType === 'response.completed') {
                // ✅ Fin du stream - xAI a terminé (MCP call exécuté + réponse finale)
                const response = parsed.response as Record<string, unknown>;
                const usage = response?.usage as Usage | undefined;
                if (usage) {
                  yield {
                    type: 'delta',
                    usage
                  };
                }
                
                // ✅ CRITICAL FIX: Yield finishReason: 'stop' pour indiquer la fin
                // Sinon route.ts continue la boucle et relance le LLM (double réponse)
                yield {
                  type: 'delta',
                  finishReason: 'stop' // ✅ Indique que c'est la réponse finale
                };
                
                yield {
                  type: 'done'
                };
              }
              // Ignorer les autres événements (response.created, response.in_progress, etc.)

            } catch (parseError) {
              logger.warn('[XAINativeProvider] ⚠️ Erreur parsing chunk SSE:', parseError);
              continue;
            }
          }
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('[XAINativeProvider] ❌ Erreur streaming (responses):', { message: errorMessage });
      throw error;
    }
  }

  /**
   * Prépare l'input array (format natif x.ai)
   */
  private prepareInput(message: string, context: AppContext, history: ChatMessage[]): XAINativeInputMessage[] {
    const input: XAINativeInputMessage[] = [];

    // Message système
    const systemContent = this.formatSystemMessage(context);
    input.push({
      role: 'system',
      content: systemContent
    });

    // Historique
    for (const msg of history) {
      const inputMsg: XAINativeInputMessage = {
        role: msg.role as 'user' | 'assistant' | 'system' | 'tool',
        content: this.buildMessageContent(msg)
      };

      if (msg.role === 'assistant' && msg.tool_calls && msg.tool_calls.length > 0) {
        if (!msg.tool_results || msg.tool_results.length === 0) {
          inputMsg.tool_calls = msg.tool_calls as ToolCall[];
        }
      }

      // ✅ CRITIQUE: /v1/responses - `name` can only be specified for `user` messages
      // Ne pas inclure `name` pour les messages `tool` dans /v1/responses
      if (msg.role === 'tool' && msg.tool_call_id) {
        inputMsg.tool_call_id = msg.tool_call_id;
        // ❌ NE PAS inclure `name` pour les messages tool dans /v1/responses
        // L'API xAI ne permet `name` que pour les messages `user`
      }
      
      // ✅ `name` est uniquement autorisé pour les messages `user`
      if (msg.role === 'user' && 'name' in msg && msg.name) {
        inputMsg.name = msg.name;
      }

      input.push(inputMsg);

      // Tool results
      if (msg.role === 'assistant' && msg.tool_results && msg.tool_results.length > 0) {
        for (const result of msg.tool_results) {
          // ✅ CRITIQUE: /v1/responses - `name` can only be specified for `user` messages
          // Ne pas inclure `name` pour les messages `tool`
          // ✅ CRITICAL FIX: Le content DOIT être une string (pas array, pas null)
          const toolContent = typeof result.content === 'string' 
            ? result.content 
            : (result.content === null || result.content === undefined 
              ? '' 
              : JSON.stringify(result.content));
          
          input.push({
            role: 'tool',
            tool_call_id: result.tool_call_id,
            // ❌ NE PAS inclure `name` - /v1/responses ne permet `name` que pour `user`
            content: toolContent // ✅ String uniquement pour tool
          });
        }
      }
    }

    // Message user actuel
    input.push({
      role: 'user',
      content: message
    });

    return input;
  }

  /**
   * Convertit ChatMessage[] vers format natif x.ai
   * ⚠️ IMPORTANT: Pour /v1/responses, le content doit être string OU array (pas null pour user)
   */
  private convertChatMessagesToInput(messages: ChatMessage[]): XAINativeInputMessage[] {
    return messages.map((msg, index) => {
      const builtContent = this.buildMessageContent(msg);
      
      // ✅ DEBUG: Logger chaque message pour identifier le problème
      logger.dev(`[XAINativeProvider] 🔍 Message ${index} (${msg.role}):`, {
        role: msg.role,
        contentType: typeof builtContent,
        isArray: Array.isArray(builtContent),
        isNull: builtContent === null,
        hasAttachedImages: msg.role === 'user' && 'attachedImages' in msg && Array.isArray((msg as { attachedImages?: unknown[] }).attachedImages) && (msg as { attachedImages: unknown[] }).attachedImages.length > 0,
        contentPreview: typeof builtContent === 'string' 
          ? builtContent.substring(0, 100) 
          : Array.isArray(builtContent) 
            ? `Array[${builtContent.length}]` 
            : 'null'
      });
      
      // ✅ CRITICAL FIX: Pour les messages tool, le content DOIT être une string (pas array, pas null)
      // L'API xAI /v1/responses rejette les messages tool avec content array ou null
      if (msg.role === 'tool') {
        const toolContent = typeof builtContent === 'string' ? builtContent : (builtContent === null ? '' : JSON.stringify(builtContent));
        const inputMsg: XAINativeInputMessage = {
          role: 'tool',
          content: toolContent, // ✅ String uniquement pour tool
          tool_call_id: msg.tool_call_id
        };
        logger.dev(`[XAINativeProvider] ✅ Tool message ${index} formaté:`, {
          role: inputMsg.role,
          contentType: typeof inputMsg.content,
          contentLength: typeof inputMsg.content === 'string' ? inputMsg.content.length : 0,
          hasToolCallId: !!inputMsg.tool_call_id
        });
        return inputMsg;
      }
      
      // ✅ Pour les autres roles (user, assistant, system)
      // SÉCURITÉ: /v1/responses ne supporte pas null pour content (même pour user)
      // Convertir null → "" pour éviter erreurs 422
      let content: string | XAINativeContentPart[];
      if (builtContent === null) {
        content = '';
      } else {
        content = builtContent;
      }
      
      // ✅ CRITICAL FIX: Pour les messages system, le content DOIT être une string (pas array, pas null)
      // L'API xAI /v1/responses rejette les messages system avec content array ou null
      if (msg.role === 'system') {
        const systemContent = typeof content === 'string' ? content : (content === null || content === undefined ? '' : JSON.stringify(content));
        const inputMsg: XAINativeInputMessage = {
          role: 'system',
          content: systemContent // ✅ String uniquement pour system
        };
        logger.dev(`[XAINativeProvider] ✅ System message ${index} formaté:`, {
          role: inputMsg.role,
          contentType: typeof inputMsg.content,
          contentLength: typeof inputMsg.content === 'string' ? inputMsg.content.length : 0
        });
        return inputMsg;
      }
      
      const inputMsg: XAINativeInputMessage = {
        role: msg.role as 'user' | 'assistant',
        content
      };
      
      // ✅ DEBUG: Logger le message formaté
      logger.dev(`[XAINativeProvider] ✅ Message ${index} (${msg.role}) formaté:`, {
        role: inputMsg.role,
        contentType: typeof inputMsg.content,
        isArray: Array.isArray(inputMsg.content),
        contentLength: typeof inputMsg.content === 'string' ? inputMsg.content.length : Array.isArray(inputMsg.content) ? inputMsg.content.length : 0
      });

      if (msg.role === 'assistant' && msg.tool_calls && msg.tool_calls.length > 0) {
        if (!msg.tool_results || msg.tool_results.length === 0) {
          inputMsg.tool_calls = msg.tool_calls as ToolCall[];
        }
      }
      
      // ✅ `name` est uniquement autorisé pour les messages `user`
      // Note: Les messages 'tool' sont déjà gérés et retournés plus haut (ligne 880)
      if (msg.role === 'user' && 'name' in msg && msg.name) {
        inputMsg.name = msg.name;
      }

      return inputMsg;
    });
  }

  /**
   * Construit le content (gère les images)
   * Format exact xAI /v1/responses : images en premier, puis texte
   */
  private buildMessageContent(msg: ChatMessage): string | null | XAINativeContentPart[] {
    if (msg.role === 'user' && msg.attachedImages && msg.attachedImages.length > 0) {
      const contentParts: XAINativeContentPart[] = [];

      // ✅ Format xAI: Images en premier, puis texte (comme dans l'exemple curl)
      for (const image of msg.attachedImages) {
        // ✅ DEBUG: Logger les images pour vérifier qu'elles sont bien là
        logger.dev('[XAINativeProvider] 🖼️ Ajout image au content:', {
          urlLength: image.url.length,
          urlPrefix: image.url.substring(0, 50),
          isDataUri: image.url.startsWith('data:'),
          isHttpUrl: image.url.startsWith('http'),
          fileName: image.fileName
        });
        
        contentParts.push({
          type: 'image_url',
          image_url: {
            url: image.url,
            detail: 'auto'
          }
        });
      }

      // Texte en dernier (comme dans l'exemple curl)
      const textContent = typeof msg.content === 'string' ? msg.content : '';
      contentParts.push({
        type: 'text',
        text: textContent || ''
      });
      
      logger.dev('[XAINativeProvider] 📦 Content multi-modal construit:', {
        textLength: textContent.length,
        imageCount: msg.attachedImages.length,
        totalParts: contentParts.length,
        order: 'images first, then text' // Format exact xAI
      });

      return contentParts;
    }

    const content = typeof msg.content === 'string' ? msg.content : null;
    if (msg.role === 'user' && content === null) {
      return '';
    }

    return content;
  }

  /**
   * Prépare le payload pour /v1/responses
   * 
   * ✅ Support hybride: OpenAPI tools + MCP Remote Tools
   */
  private async preparePayload(
    input: XAINativeInputMessage[],
    tools: Tool[] | Array<Tool | McpServerConfig>
  ): Promise<Record<string, unknown>> {
    const payload: Record<string, unknown> = {
      model: this.config.model,
      input: input,
      temperature: this.config.temperature,
      max_tokens: this.config.maxTokens,
      top_p: this.config.topP,
      stream: false
    };

    // ✅ Gérer les tools (OpenAPI + MCP)
    // xAI API demande un format PLAT (name, description, parameters à la racine)
    if (tools && tools.length > 0) {
      const formattedTools = tools.map(tool => {
        if (this.isMcpTool(tool)) {
          // ✅ MCP tool: Convertir au format exact xAI (conforme à la doc)
          const mcpConfig = tool as McpServerConfig;
          const xaiConfig = convertToXaiMcpConfig(mcpConfig);
          
          // Construire le payload exact selon la doc xAI
          const xaiPayload: XaiMcpServerConfig = {
            type: 'mcp',
            server_url: xaiConfig.server_url
          };
          
          if (xaiConfig.server_label) {
            xaiPayload.server_label = xaiConfig.server_label;
          }
          
          if (xaiConfig.server_description) {
            xaiPayload.server_description = xaiConfig.server_description;
          }
          
          if (xaiConfig.allowed_tool_names !== undefined && xaiConfig.allowed_tool_names !== null) {
            xaiPayload.allowed_tool_names = xaiConfig.allowed_tool_names;
          }
          
          if (xaiConfig.authorization) {
            xaiPayload.authorization = xaiConfig.authorization;
          }
          
          if (xaiConfig.extra_headers && Object.keys(xaiConfig.extra_headers).length > 0) {
            xaiPayload.extra_headers = xaiConfig.extra_headers;
          }
          
          return xaiPayload;
        } else if (isFunctionTool(tool)) {
          // ✅ OpenAPI tool: APLATIR la structure function vers la racine
          return {
            type: 'function',
            name: tool.function.name,
            description: tool.function.description,
            parameters: tool.function.parameters
          };
        }
        return tool;
      });
      
      payload.tools = formattedTools;
    }

    if (this.config.parallelToolCalls !== undefined) {
      payload.parallel_tool_calls = this.config.parallelToolCalls;
    }

    return payload;
  }

  /**
   * Helper: Vérifier si un tool est MCP
   */
  private isMcpTool(tool: Tool | McpServerConfig): tool is McpServerConfig {
    return 'type' in tool && tool.type === 'mcp' && 'server_url' in tool;
  }

  /**
   * Effectue l'appel API
   */
  private async makeApiCall(payload: Record<string, unknown>): Promise<XAINativeResponse> {
    const response = await fetch(`${this.config.baseUrl}/responses`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(this.config.timeout)
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorDetails: { error?: { message?: string; type?: string; code?: string } } = {};
      try {
        errorDetails = JSON.parse(errorText);
      } catch {
        errorDetails = { error: { message: errorText } };
      }

      logger.error('[XAINativeProvider] ❌ Erreur API:', {
        status: response.status,
        statusText: response.statusText,
        error: errorDetails
      });

      throw new Error(`xAI Native API error: ${response.status} - ${errorDetails.error?.message || errorText}`);
    }

    return await response.json() as XAINativeResponse;
  }

  /**
   * Extrait la réponse
   */
  private extractResponse(response: XAINativeResponse): LLMResponse {
    if (!response.output || response.output.length === 0) {
      throw new Error('Réponse invalide de xAI Native API');
    }

    const output = response.output[0];
    const result: LLMResponse = {
      content: output?.content ?? '',
      model: response.model,
      usage: response.usage
    };

    if (output?.tool_calls && output.tool_calls.length > 0) {
      result.tool_calls = output.tool_calls;
    }

    if (output?.reasoning) {
      result.reasoning = output.reasoning;
    }

    return result;
  }

  /**
   * Formate le message système
   */
  private formatSystemMessage(context: AppContext): string {
    if (context.content && context.content.trim().length > 0) {
      return context.content;
    }

    const message = getSystemMessage('assistant-contextual', { context });
    if (!message) {
      return 'Tu es un assistant IA utile et bienveillant.';
    }

    return message;
  }

  /**
   * Retourne les tools disponibles
   */
  getFunctionCallTools(): Tool[] {
    return [];
  }

  /**
   * Test de connexion
   */
  async testConnection(): Promise<boolean> {
    try {
      const testPayload = {
        model: this.config.model,
        input: [
          {
            role: 'user',
            content: 'Hello'
          }
        ],
        max_tokens: 10,
        temperature: 0
      };

      const response = await fetch(`${this.config.baseUrl}/responses`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testPayload),
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      return true;

    } catch (error) {
      logger.error('[XAINativeProvider] ❌ Erreur de connexion:', error);
      return false;
    }
  }
}


