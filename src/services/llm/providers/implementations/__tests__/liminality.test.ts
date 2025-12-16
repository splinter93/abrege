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
      
      expect(models).toContain('gpt-4o-mini');
      expect(models).toContain('claude-3-haiku');
      expect(models).toContain('groq-llama-3-70b');
    });

    test('should return pricing info', () => {
      const pricing = provider.getPricing();
      
      expect(pricing.input).toBeTruthy();
      expect(pricing.output).toBeTruthy();
    });
  });
});

