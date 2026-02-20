/**
 * Tests pour LiminalityProvider
 * 
 * Tests unitaires couvrant :
 * - Validation de configuration
 * - Conversion de tools (function → custom, MCP → MCP)
 * - Appels API (non-streaming et streaming)
 * - Orchestration automatique
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { LiminalityProvider } from '../liminality';
import { LiminalityToolsAdapter } from '../../adapters/LiminalityToolsAdapter';
import type { FunctionTool, McpTool } from '../../../types/strictTypes';

// Mock fetch globalement
global.fetch = vi.fn();

describe('LiminalityProvider', () => {
  let provider: LiminalityProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Configuration de test
    provider = new LiminalityProvider({
      apiKey: 'test-api-key',
      baseUrl: 'https://test.api.com',
      model: 'gpt-4o-mini',
      temperature: 0.7,
      maxLoops: 5
    });
  });

  describe('Configuration', () => {
    test('should validate config correctly', () => {
      expect(provider.isAvailable()).toBe(true);
      expect(provider.id).toBe('liminality');
      expect(provider.name).toBe('Liminality');
    });

    test('should have correct default config', () => {
      const defaultProvider = new LiminalityProvider();
      expect(defaultProvider.config.model).toBe('gpt-4o-mini');
      expect(defaultProvider.config.maxLoops).toBe(10);
      expect(defaultProvider.config.baseUrl).toBe('https://origins-server.up.railway.app');
    });

    test('should support custom config', () => {
      const customProvider = new LiminalityProvider({
        model: 'claude-3-haiku',
        temperature: 0.5,
        maxLoops: 15
      });
      
      expect(customProvider.config.model).toBe('claude-3-haiku');
      expect(customProvider.config.temperature).toBe(0.5);
      expect(customProvider.config.maxLoops).toBe(15);
    });
  });

  describe('Tools Adapter', () => {
    test('should convert function tool to custom tool', () => {
      const functionTool: FunctionTool = {
        type: 'function',
        function: {
          name: 'test_tool',
          description: 'Test tool description',
          parameters: {
            type: 'object',
            properties: {
              query: { type: 'string' }
            },
            required: ['query']
          }
        }
      };

      const converted = LiminalityToolsAdapter.convert([functionTool]);
      
      expect(converted).toHaveLength(1);
      expect(converted[0].type).toBe('custom');
      expect((converted[0] as { name: string }).name).toBe('test_tool');
    });

    test('should convert MCP tool to Liminality MCP format', () => {
      const mcpTool: McpTool = {
        type: 'mcp',
        name: 'test-mcp',
        server_label: 'test-mcp',
        server_url: 'https://mcp.test.com',
        allowed_tools: ['tool1', 'tool2'],
        headers: { 'X-Test': 'test' }
      };

      const converted = LiminalityToolsAdapter.convert([mcpTool]);
      
      expect(converted).toHaveLength(1);
      expect(converted[0].type).toBe('mcp');
      const mcpConverted = converted[0] as { server_label: string; server_url: string };
      expect(mcpConverted.server_label).toBe('test-mcp');
      expect(mcpConverted.server_url).toBe('https://mcp.test.com');
    });

    test('should add Synesia tools (callable, knowledge)', () => {
      const converted = LiminalityToolsAdapter.addSynesiaTools([], {
        callables: ['agent-123'],
        knowledgeBases: [
          {
            id: 'kb-456',
            name: 'docs',
            description: 'Documentation knowledge base'
          }
        ]
      });

      expect(converted).toHaveLength(2);
      expect(converted[0].type).toBe('callable');
      expect(converted[1].type).toBe('knowledge');
    });

    test('should validate tools correctly', () => {
      const validCallable = { type: 'callable' as const, callable_id: 'test-123' };
      const invalidCallable = { type: 'callable' as const, callable_id: '' };
      
      expect(LiminalityToolsAdapter.validateTool(validCallable)).toBe(true);
      expect(LiminalityToolsAdapter.validateTool(invalidCallable)).toBe(false);
    });
  });

  describe('API Calls', () => {
    test('should make non-streaming call successfully', async () => {
      const mockResponse = {
        message: {
          role: 'assistant',
          content: 'Test response'
        },
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30
        },
        finish_reason: 'stop'
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const messages = [
        {
          id: '1',
          role: 'user' as const,
          content: 'Hello',
          created_at: new Date().toISOString(),
          user_id: 'test-user',
          conversation_id: 'test-conv'
        }
      ];

      const result = await provider.callWithMessages(messages, []);

      expect(result.content).toBe('Test response');
      expect(result.usage).toEqual(mockResponse.usage);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/llm-exec/round'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'x-api-key': 'test-api-key'
          })
        })
      );
    });

    test('should handle API errors correctly', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => JSON.stringify({ error: 'Invalid request' })
      });

      const messages = [
        {
          id: '1',
          role: 'user' as const,
          content: 'Hello',
          created_at: new Date().toISOString(),
          user_id: 'test-user',
          conversation_id: 'test-conv'
        }
      ];

      await expect(provider.callWithMessages(messages, [])).rejects.toThrow('Invalid request');
    });
  });

  describe('Capabilities', () => {
    test('should return correct capabilities', () => {
      const capabilities = provider.getCapabilities();
      
      expect(capabilities.functionCalls).toBe(true);
      expect(capabilities.streaming).toBe(true);
      expect(capabilities.reasoning).toBe(true);
      expect(capabilities.webSearch).toBe(true);
    });

    test('should return supported models', () => {
      const models = provider.getSupportedModels();

      expect(models.length).toBeGreaterThan(0);
      expect(models).toContain('openrouter/mimo-v2-flash');
      expect(models).toContain('openrouter/glm-5');
    });

    test('should return pricing info', () => {
      const pricing = provider.getPricing();
      
      expect(pricing.input).toBeTruthy();
      expect(pricing.output).toBeTruthy();
    });
  });

  describe('Stream internal_tool events (callables)', () => {
    const encoder = new TextEncoder();

    function sseLine(data: object): string {
      return `data: ${JSON.stringify(data)}\n\n`;
    }

    test('should yield internal_tool.start, internal_tool.done, internal_tool.error chunks', async () => {
      const streamBody = [
        sseLine({ type: 'start' }),
        sseLine({ type: 'tool_block.start', block_id: 'blk-1' }),
        sseLine({
          type: 'internal_tool.start',
          tool_call_id: 'fc_abc-123',
          block_id: 'blk-1',
          name: 'tim',
          arguments: { value: 'Send a message to K.' }
        }),
        sseLine({
          type: 'internal_tool.done',
          tool_call_id: 'fc_abc-123',
          block_id: 'blk-1',
          name: 'tim',
          result: 'Message sent successfully.'
        }),
        sseLine({ type: 'tool_block.done', block_id: 'blk-1' }),
        sseLine({ type: 'text.delta', delta: 'Done!' }),
        sseLine({ type: 'done', complete: true, usage: { prompt_tokens: 1, completion_tokens: 2, total_tokens: 3 } })
      ].join('');

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode(streamBody));
            controller.close();
          }
        })
      });

      const messages = [
        {
          id: '1',
          role: 'user' as const,
          content: 'Ask Tim to message K',
          created_at: new Date().toISOString(),
          user_id: 'test-user',
          conversation_id: 'test-conv'
        }
      ];

      const chunks: unknown[] = [];
      for await (const chunk of provider.callWithMessagesStream(messages, [])) {
        chunks.push(chunk);
      }

      const startChunk = chunks.find((c): c is { type: 'internal_tool.start'; tool_call_id: string; name: string; arguments?: Record<string, unknown> } =>
        typeof c === 'object' && c !== null && 'type' in c && (c as { type: string }).type === 'internal_tool.start'
      );
      const doneChunk = chunks.find((c): c is { type: 'internal_tool.done'; tool_call_id: string; name: string; result: unknown } =>
        typeof c === 'object' && c !== null && 'type' in c && (c as { type: string }).type === 'internal_tool.done'
      );

      expect(startChunk).toBeDefined();
      expect(startChunk?.type).toBe('internal_tool.start');
      expect(startChunk?.tool_call_id).toBe('fc_abc-123');
      expect(startChunk?.name).toBe('tim');
      expect(startChunk?.arguments).toEqual({ value: 'Send a message to K.' });

      expect(doneChunk).toBeDefined();
      expect(doneChunk?.type).toBe('internal_tool.done');
      expect(doneChunk?.tool_call_id).toBe('fc_abc-123');
      expect(doneChunk?.name).toBe('tim');
      expect(doneChunk?.result).toBe('Message sent successfully.');
    });

    test('should yield internal_tool.error chunk and not throw', async () => {
      const streamBody = [
        sseLine({ type: 'start' }),
        sseLine({
          type: 'internal_tool.start',
          tool_call_id: 'fc_err-1',
          name: 'tim',
          arguments: {}
        }),
        sseLine({
          type: 'internal_tool.error',
          tool_call_id: 'fc_err-1',
          name: 'tim',
          error: 'Invalid tool results: timeout'
        }),
        sseLine({ type: 'done', complete: true, usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 } })
      ].join('');

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode(streamBody));
            controller.close();
          }
        })
      });

      const messages = [
        {
          id: '1',
          role: 'user' as const,
          content: 'Call tim',
          created_at: new Date().toISOString(),
          user_id: 'test-user',
          conversation_id: 'test-conv'
        }
      ];

      const chunks: unknown[] = [];
      await (async () => {
        for await (const chunk of provider.callWithMessagesStream(messages, [])) {
          chunks.push(chunk);
        }
      })();

      const errorChunk = chunks.find((c): c is { type: 'internal_tool.error'; tool_call_id: string; name: string; error: string } =>
        typeof c === 'object' && c !== null && 'type' in c && (c as { type: string }).type === 'internal_tool.error'
      );

      expect(errorChunk).toBeDefined();
      expect(errorChunk?.type).toBe('internal_tool.error');
      expect(errorChunk?.tool_call_id).toBe('fc_err-1');
      expect(errorChunk?.name).toBe('tim');
      expect(errorChunk?.error).toBe('Invalid tool results: timeout');
    });

    test('should not throw on internal_tool.start with missing tool_call_id (yields no chunk)', async () => {
      const streamBody = [
        sseLine({ type: 'start' }),
        sseLine({
          type: 'internal_tool.start',
          name: 'tim',
          arguments: { value: 'x' }
        }),
        sseLine({ type: 'done', complete: true, usage: { prompt_tokens: 1, completion_tokens: 0, total_tokens: 1 } })
      ].join('');

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode(streamBody));
            controller.close();
          }
        })
      });

      const messages = [
        {
          id: '1',
          role: 'user' as const,
          content: 'Hi',
          created_at: new Date().toISOString(),
          user_id: 'test-user',
          conversation_id: 'test-conv'
        }
      ];

      const chunks: unknown[] = [];
      await (async () => {
        for await (const chunk of provider.callWithMessagesStream(messages, [])) {
          chunks.push(chunk);
        }
      })();

      const internalToolChunks = chunks.filter(
        (c) => typeof c === 'object' && c !== null && 'type' in c && String((c as { type: string }).type).startsWith('internal_tool.')
      );
      expect(internalToolChunks).toHaveLength(0);
    });
  });
});

