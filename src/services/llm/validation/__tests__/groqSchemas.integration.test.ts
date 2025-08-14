import {
  validateToolCall,
  validateToolMessage,
  validateBatchPayload,
  validateToolCallArguments,
  validateToolMessageContent,
  validateToolCallIdMapping,
  validateBatchMessageOrder,
  ToolCallSchema,
  AssistantWithToolCallsSchema,
  ToolMessageSchema,
  BatchApiPayloadSchema
} from '../groqSchemas';
import { z } from 'zod';

describe('Groq Schemas Integration Tests', () => {
  describe('1. Validation des Tool Calls', () => {
    it('should validate valid tool call structure', () => {
      // Arrange
      const validToolCall = {
        id: 'calc-1',
        type: 'function',
        function: {
          name: 'calculator',
          arguments: '{"operation": "add", "a": 2, "b": 2}'
        }
      };

      // Act
      const validation = validateToolCall(validToolCall);

      // Assert
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject tool call with missing id', () => {
      // Arrange
      const invalidToolCall = {
        type: 'function',
        function: {
          name: 'calculator',
          arguments: '{"operation": "add", "a": 2, "b": 2}'
        }
      };

      // Act
      const validation = validateToolCall(invalidToolCall);

      // Assert
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('id: ID du tool call requis');
    });

    it('should reject tool call with invalid type', () => {
      // Arrange
      const invalidToolCall = {
        id: 'calc-1',
        type: 'invalid_type',
        function: {
          name: 'calculator',
          arguments: '{"operation": "add", "a": 2, "b": 2}'
        }
      };

      // Act
      const validation = validateToolCall(invalidToolCall);

      // Assert
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('type: Invalid literal value');
    });

    it('should reject tool call with missing function name', () => {
      // Arrange
      const invalidToolCall = {
        id: 'calc-1',
        type: 'function',
        function: {
          arguments: '{"operation": "add", "a": 2, "b": 2}'
        }
      };

      // Act
      const validation = validateToolCall(invalidToolCall);

      // Assert
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('function.name: Nom de la fonction requis');
    });
  });

  describe('2. Validation des Messages Assistant avec Tool Calls', () => {
    it('should validate valid assistant message with tool calls', () => {
      // Arrange
      const validMessage = {
        role: 'assistant',
        content: 'Je vais calculer pour vous.',
        tool_calls: [
          {
            id: 'calc-1',
            type: 'function',
            function: {
              name: 'calculator',
              arguments: '{"operation": "add", "a": 2, "b": 2}'
            }
          }
        ]
      };

      // Act
      const result = AssistantWithToolCallsSchema.safeParse(validMessage);

      // Assert
      expect(result.success).toBe(true);
    });

    it('should reject assistant message without tool calls', () => {
      // Arrange
      const invalidMessage = {
        role: 'assistant',
        content: 'Je vais calculer pour vous.',
        tool_calls: []
      };

      // Act
      const result = AssistantWithToolCallsSchema.safeParse(invalidMessage);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Au moins un tool call requis');
      }
    });

    it('should accept assistant message with null content', () => {
      // Arrange
      const validMessage = {
        role: 'assistant',
        content: null,
        tool_calls: [
          {
            id: 'calc-1',
            type: 'function',
            function: {
              name: 'calculator',
              arguments: '{"operation": "add", "a": 2, "b": 2}'
            }
          }
        ]
      };

      // Act
      const result = AssistantWithToolCallsSchema.safeParse(validMessage);

      // Assert
      expect(result.success).toBe(true);
    });
  });

  describe('3. Validation des Messages Tool', () => {
    it('should validate valid tool message', () => {
      // Arrange
      const validToolMessage = {
        role: 'tool',
        tool_call_id: 'calc-1',
        name: 'calculator',
        content: '{"result": 4, "operation": "add"}',
        success: true,
        timestamp: new Date().toISOString()
      };

      // Act
      const validation = validateToolMessage(validToolMessage);

      // Assert
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject tool message without tool_call_id', () => {
      // Arrange
      const invalidToolMessage = {
        role: 'tool',
        name: 'calculator',
        content: '{"result": 4}'
      };

      // Act
      const validation = validateToolMessage(invalidToolMessage);

      // Assert
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('tool_call_id: tool_call_id requis');
    });

    it('should reject tool message with empty content', () => {
      // Arrange
      const invalidToolMessage = {
        role: 'tool',
        tool_call_id: 'calc-1',
        name: 'calculator',
        content: ''
      };

      // Act
      const validation = validateToolMessage(invalidToolMessage);

      // Assert
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('content: Contenu du tool requis');
    });
  });

  describe('4. Validation des Arguments JSON', () => {
    it('should validate valid JSON arguments', () => {
      // Arrange
      const validToolCall = {
        id: 'calc-1',
        type: 'function',
        function: {
          name: 'calculator',
          arguments: '{"operation": "add", "a": 2, "b": 2}'
        }
      };

      // Act
      const validation = validateToolCallArguments(validToolCall);

      // Assert
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject invalid JSON arguments', () => {
      // Arrange
      const invalidToolCall = {
        id: 'calc-1',
        type: 'function',
        function: {
          name: 'calculator',
          arguments: '{"operation": "add", "a": 2, "b": 2' // JSON incomplet
        }
      };

      // Act
      const validation = validateToolCallArguments(invalidToolCall);

      // Assert
      expect(validation.isValid).toBe(false);
      expect(validation.errors[0]).toContain('Arguments JSON invalides');
    });

    it('should reject non-string arguments', () => {
      // Arrange
      const invalidToolCall = {
        id: 'calc-1',
        type: 'function',
        function: {
          name: 'calculator',
          arguments: { operation: 'add', a: 2, b: 2 } // Objet au lieu de string
        }
      };

      // Act
      const validation = validateToolCallArguments(invalidToolCall);

      // Assert
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('arguments: Arguments requis');
    });
  });

  describe('5. Validation du Contenu des Messages Tool', () => {
    it('should validate valid JSON content', () => {
      // Arrange
      const validToolMessage = {
        role: 'tool',
        tool_call_id: 'calc-1',
        name: 'calculator',
        content: '{"result": 4, "operation": "add"}'
      };

      // Act
      const validation = validateToolMessageContent(validToolMessage);

      // Assert
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject non-JSON content', () => {
      // Arrange
      const invalidToolMessage = {
        role: 'tool',
        tool_call_id: 'calc-1',
        name: 'calculator',
        content: 'plain text content' // Texte simple au lieu de JSON
      };

      // Act
      const validation = validateToolMessageContent(invalidToolMessage);

      // Assert
      expect(validation.isValid).toBe(false);
      expect(validation.errors[0]).toContain('Contenu du tool non JSON stringifié');
    });

    it('should reject object content', () => {
      // Arrange
      const invalidToolMessage = {
        role: 'tool',
        tool_call_id: 'calc-1',
        name: 'calculator',
        content: { result: 4, operation: 'add' } // Objet au lieu de string JSON
      };

      // Act
      const validation = validateToolMessageContent(invalidToolMessage);

      // Assert
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('content: Contenu du tool requis');
    });
  });

  describe('6. Validation de l\'Appariement Tool Call ID', () => {
    it('should validate correct 1:1 mapping', () => {
      // Arrange
      const toolCalls = [
        { id: 'call-1', type: 'function', function: { name: 'test1', arguments: '{}' } },
        { id: 'call-2', type: 'function', function: { name: 'test2', arguments: '{}' } }
      ];

      const toolResults = [
        { tool_call_id: 'call-1', name: 'test1', result: { success: true } },
        { tool_call_id: 'call-2', name: 'test2', result: { success: true } }
      ];

      // Act
      const validation = validateToolCallIdMapping(toolCalls, toolResults);

      // Assert
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect missing tool results', () => {
      // Arrange
      const toolCalls = [
        { id: 'call-1', type: 'function', function: { name: 'test1', arguments: '{}' } },
        { id: 'call-2', type: 'function', function: { name: 'test2', arguments: '{}' } }
      ];

      const toolResults = [
        { tool_call_id: 'call-1', name: 'test1', result: { success: true } }
        // call-2 manquant
      ];

      // Act
      const validation = validateToolCallIdMapping(toolCalls, toolResults);

      // Assert
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Tool call call-2 n\'a pas de résultat correspondant');
    });

    it('should detect orphaned tool results', () => {
      // Arrange
      const toolCalls = [
        { id: 'call-1', type: 'function', function: { name: 'test1', arguments: '{}' } }
      ];

      const toolResults = [
        { tool_call_id: 'call-1', name: 'test1', result: { success: true } },
        { tool_call_id: 'call-2', name: 'test2', result: { success: true } } // call-2 n'existe pas
      ];

      // Act
      const validation = validateToolCallIdMapping(toolCalls, toolResults);

      // Assert
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Tool result call-2 n\'a pas d\'appel correspondant');
    });
  });

  describe('7. Validation de l\'Ordre des Messages Batch', () => {
    it('should validate correct message order', () => {
      // Arrange
      const validMessages = [
        {
          role: 'assistant',
          tool_calls: [{ id: '1', type: 'function', function: { name: 'test', arguments: '{}' } }]
        },
        {
          role: 'tool',
          tool_call_id: '1',
          name: 'test',
          content: '{"result": "success"}'
        }
      ];

      // Act
      const validation = validateBatchMessageOrder(validMessages);

      // Assert
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject incorrect message order', () => {
      // Arrange
      const invalidMessages = [
        {
          role: 'tool', // Tool en premier (incorrect)
          tool_call_id: '1',
          name: 'test',
          content: '{"result": "success"}'
        },
        {
          role: 'assistant', // Assistant en second (incorrect)
          tool_calls: [{ id: '1', type: 'function', function: { name: 'test', arguments: '{}' } }]
        }
      ];

      // Act
      const validation = validateBatchMessageOrder(invalidMessages);

      // Assert
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Le premier message doit être un assistant avec tool calls');
    });

    it('should reject batch with insufficient messages', () => {
      // Arrange
      const invalidMessages = [
        {
          role: 'assistant',
          tool_calls: [{ id: '1', type: 'function', function: { name: 'test', arguments: '{}' } }]
        }
        // Message tool manquant
      ];

      // Act
      const validation = validateBatchMessageOrder(invalidMessages);

      // Assert
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Un batch doit contenir au moins 2 messages');
    });
  });

  describe('8. Validation des Payloads d\'API Batch', () => {
    it('should validate valid batch payload', () => {
      // Arrange
      const validPayload = {
        messages: [
          {
            role: 'assistant',
            tool_calls: [{ id: '1', type: 'function', function: { name: 'test', arguments: '{}' } }]
          },
          {
            role: 'tool',
            tool_call_id: '1',
            name: 'test',
            content: '{"result": "success"}'
          }
        ],
        operationId: 'op-123',
        sessionId: 'session-123',
        roundId: 'round-123'
      };

      // Act
      const validation = validateBatchPayload(validPayload);

      // Assert
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject batch payload with missing operationId', () => {
      // Arrange
      const invalidPayload = {
        messages: [
          {
            role: 'assistant',
            tool_calls: [{ id: '1', type: 'function', function: { name: 'test', arguments: '{}' } }]
          },
          {
            role: 'tool',
            tool_call_id: '1',
            name: 'test',
            content: '{"result": "success"}'
          }
        ],
        sessionId: 'session-123',
        roundId: 'round-123'
        // operationId manquant
      };

      // Act
      const validation = validateBatchPayload(invalidPayload);

      // Assert
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('operationId: ID de l\'opération requis');
    });

    it('should reject batch payload with empty messages', () => {
      // Arrange
      const invalidPayload = {
        messages: [], // Messages vide
        operationId: 'op-123',
        sessionId: 'session-123',
        roundId: 'round-123'
      };

      // Act
      const validation = validateBatchPayload(invalidPayload);

      // Assert
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('messages: Au moins 2 messages requis (assistant + tool)');
    });
  });

  describe('9. Validation des Schémas Zod', () => {
    it('should parse valid data with ToolCallSchema', () => {
      // Arrange
      const validData = {
        id: 'test-1',
        type: 'function',
        function: {
          name: 'test_function',
          arguments: '{"param": "value"}'
        }
      };

      // Act
      const result = ToolCallSchema.safeParse(validData);

      // Assert
      expect(result.success).toBe(true);
    });

    it('should parse valid data with AssistantWithToolCallsSchema', () => {
      // Arrange
      const validData = {
        role: 'assistant',
        content: 'Test message',
        tool_calls: [
          {
            id: 'test-1',
            type: 'function',
            function: {
              name: 'test_function',
              arguments: '{"param": "value"}'
            }
          }
        ]
      };

      // Act
      const result = AssistantWithToolCallsSchema.safeParse(validData);

      // Assert
      expect(result.success).toBe(true);
    });

    it('should parse valid data with ToolMessageSchema', () => {
      // Arrange
      const validData = {
        role: 'tool',
        tool_call_id: 'test-1',
        name: 'test_function',
        content: '{"result": "success"}'
      };

      // Act
      const result = ToolMessageSchema.safeParse(validData);

      // Assert
      expect(result.success).toBe(true);
    });

    it('should parse valid data with BatchApiPayloadSchema', () => {
      // Arrange
      const validData = {
        messages: [
          {
            role: 'assistant',
            tool_calls: [{ id: '1', type: 'function', function: { name: 'test', arguments: '{}' } }]
          },
          {
            role: 'tool',
            tool_call_id: '1',
            name: 'test',
            content: '{"result": "success"}'
          }
        ],
        operationId: 'op-123',
        sessionId: 'session-123',
        roundId: 'round-123'
      };

      // Act
      const result = BatchApiPayloadSchema.safeParse(validData);

      // Assert
      expect(result.success).toBe(true);
    });
  });

  describe('10. Validation des Cas Limites', () => {
    it('should handle very long tool names', () => {
      // Arrange
      const longName = 'a'.repeat(1000); // Nom très long
      const validToolCall = {
        id: 'calc-1',
        type: 'function',
        function: {
          name: longName,
          arguments: '{"operation": "add", "a": 2, "b": 2}'
        }
      };

      // Act
      const validation = validateToolCall(validToolCall);

      // Assert
      expect(validation.isValid).toBe(true);
    });

    it('should handle very long arguments', () => {
      // Arrange
      const longArgs = JSON.stringify({ 
        data: 'a'.repeat(10000), // Arguments très longs
        operation: 'add',
        a: 2,
        b: 2
      });
      
      const validToolCall = {
        id: 'calc-1',
        type: 'function',
        function: {
          name: 'calculator',
          arguments: longArgs
        }
      };

      // Act
      const validation = validateToolCallArguments(validToolCall);

      // Assert
      expect(validation.isValid).toBe(true);
    });

    it('should handle special characters in tool names', () => {
      // Arrange
      const specialName = 'tool-with-special-chars_123-456';
      const validToolCall = {
        id: 'calc-1',
        type: 'function',
        function: {
          name: specialName,
          arguments: '{"operation": "add", "a": 2, "b": 2}'
        }
      };

      // Act
      const validation = validateToolCall(validToolCall);

      // Assert
      expect(validation.isValid).toBe(true);
    });

    it('should handle unicode characters in content', () => {
      // Arrange
      const unicodeContent = JSON.stringify({ 
        result: 'Résultat avec accents éèàç',
        operation: 'add',
        value: 'valeur avec 🚀 emojis'
      });
      
      const validToolMessage = {
        role: 'tool',
        tool_call_id: 'calc-1',
        name: 'calculator',
        content: unicodeContent
      };

      // Act
      const validation = validateToolMessageContent(validToolMessage);

      // Assert
      expect(validation.isValid).toBe(true);
    });
  });
}); 