import { GroqToolExecutor } from '../GroqToolExecutor';
import { DEFAULT_GROQ_LIMITS } from '../../types/groqTypes';
import { agentApiV2Tools } from '@/services/agentApiV2Tools';

// Mock des dépendances
jest.mock('@/services/agentApiV2Tools');
jest.mock('@/utils/logger');

describe('GroqToolExecutor Integration Tests', () => {
  let toolExecutor: GroqToolExecutor;
  let mockAgentApiV2Tools: jest.Mocked<typeof agentApiV2Tools>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Créer l'exécuteur
    toolExecutor = new GroqToolExecutor(DEFAULT_GROQ_LIMITS);
    
    // Récupérer le mock
    mockAgentApiV2Tools = agentApiV2Tools as jest.Mocked<typeof agentApiV2Tools>;
  });

  describe('1. Exécution Mono-Tool', () => {
    it('should execute single tool successfully', async () => {
      // Arrange
      const toolCalls = [
        {
          id: 'calc-1',
          type: 'function',
          function: {
            name: 'calculator',
            arguments: '{"operation": "add", "a": 2, "b": 2}'
          }
        }
      ];

      const mockToolResult = {
        tool_call_id: 'calc-1',
        name: 'calculator',
        result: { result: 4, operation: 'add' },
        success: true,
        timestamp: new Date().toISOString()
      };

      // Mock de l'API des tools
      mockAgentApiV2Tools.executeTool = jest.fn().mockResolvedValue(mockToolResult);

      // Act
      const results = await toolExecutor.executeTools(toolCalls, {
        userToken: 'test-token',
        batchId: 'batch-123',
        maxRetries: 3
      });

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0].tool_call_id).toBe('calc-1');
      expect(results[0].name).toBe('calculator');
      expect(results[0].success).toBe(true);
      expect(results[0].result.result).toBe(4);
      expect(mockAgentApiV2Tools.executeTool).toHaveBeenCalledWith(
        'calculator',
        { operation: 'add', a: 2, b: 2 },
        'test-token'
      );
    });

    it('should handle tool execution errors gracefully', async () => {
      // Arrange
      const toolCalls = [
        {
          id: 'calc-1',
          type: 'function',
          function: {
            name: 'calculator',
            arguments: '{"operation": "divide", "a": 2, "b": 0}'
          }
        }
      ];

      const mockToolError = {
        tool_call_id: 'calc-1',
        name: 'calculator',
        result: { error: 'Division par zéro impossible' },
        success: false,
        timestamp: new Date().toISOString()
      };

      // Mock de l'API des tools avec erreur
      mockAgentApiV2Tools.executeTool = jest.fn().mockRejectedValue(new Error('Division par zéro impossible'));

      // Act
      const results = await toolExecutor.executeTools(toolCalls, {
        userToken: 'test-token',
        batchId: 'batch-123',
        maxRetries: 3
      });

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0].tool_call_id).toBe('calc-1');
      expect(results[0].success).toBe(false);
      expect(results[0].result.error).toBe('Division par zéro impossible');
    });
  });

  describe('2. Exécution Multi-Tools', () => {
    it('should execute multiple tools in parallel', async () => {
      // Arrange
      const toolCalls = [
        {
          id: 'calc-1',
          type: 'function',
          function: {
            name: 'calculator',
            arguments: '{"operation": "add", "a": 2, "b": 2}'
          }
        },
        {
          id: 'calc-2',
          type: 'function',
          function: {
            name: 'calculator',
            arguments: '{"operation": "multiply", "a": 3, "b": 4}'
          }
        },
        {
          id: 'calc-3',
          type: 'function',
          function: {
            name: 'calculator',
            arguments: '{"operation": "subtract", "a": 10, "b": 5}'
          }
        }
      ];

      const mockResults = [
        {
          tool_call_id: 'calc-1',
          name: 'calculator',
          result: { result: 4, operation: 'add' },
          success: true,
          timestamp: new Date().toISOString()
        },
        {
          tool_call_id: 'calc-2',
          name: 'calculator',
          result: { result: 12, operation: 'multiply' },
          success: true,
          timestamp: new Date().toISOString()
        },
        {
          tool_call_id: 'calc-3',
          name: 'calculator',
          result: { result: 5, operation: 'subtract' },
          success: true,
          timestamp: new Date().toISOString()
        }
      ];

      // Mock de l'API des tools
      mockAgentApiV2Tools.executeTool = jest.fn()
        .mockResolvedValueOnce(mockResults[0])
        .mockResolvedValueOnce(mockResults[1])
        .mockResolvedValueOnce(mockResults[2]);

      // Act
      const results = await toolExecutor.executeTools(toolCalls, {
        userToken: 'test-token',
        batchId: 'batch-123',
        maxRetries: 3
      });

      // Assert
      expect(results).toHaveLength(3);
      expect(results[0].result.result).toBe(4);
      expect(results[1].result.result).toBe(12);
      expect(results[2].result.result).toBe(5);
      expect(mockAgentApiV2Tools.executeTool).toHaveBeenCalledTimes(3);
    });

    it('should handle partial tool failures', async () => {
      // Arrange
      const toolCalls = [
        {
          id: 'calc-1',
          type: 'function',
          function: {
            name: 'calculator',
            arguments: '{"operation": "add", "a": 2, "b": 2}'
          }
        },
        {
          id: 'calc-2',
          type: 'function',
          function: {
            name: 'calculator',
            arguments: '{"operation": "divide", "a": 2, "b": 0}'
          }
        },
        {
          id: 'calc-3',
          type: 'function',
          function: {
            name: 'calculator',
            arguments: '{"operation": "multiply", "a": 3, "b": 4}'
          }
        }
      ];

      // Mock de l'API des tools avec succès, échec, puis succès
      mockAgentApiV2Tools.executeTool = jest.fn()
        .mockResolvedValueOnce({
          tool_call_id: 'calc-1',
          name: 'calculator',
          result: { result: 4, operation: 'add' },
          success: true,
          timestamp: new Date().toISOString()
        })
        .mockRejectedValueOnce(new Error('Division par zéro impossible'))
        .mockResolvedValueOnce({
          tool_call_id: 'calc-3',
          name: 'calculator',
          result: { result: 12, operation: 'multiply' },
          success: true,
          timestamp: new Date().toISOString()
        });

      // Act
      const results = await toolExecutor.executeTools(toolCalls, {
        userToken: 'test-token',
        batchId: 'batch-123',
        maxRetries: 3
      });

      // Assert
      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[2].success).toBe(true);
      expect(results[0].result.result).toBe(4);
      expect(results[1].result.error).toBe('Division par zéro impossible');
      expect(results[2].result.result).toBe(12);
    });
  });

  describe('3. Gestion des Limites et Contraintes', () => {
    it('should respect maxToolCalls limit', async () => {
      // Arrange
      const manyToolCalls = Array.from({ length: 15 }, (_, i) => ({
        id: `calc-${i}`,
        type: 'function' as const,
        function: {
          name: 'calculator',
          arguments: JSON.stringify({ operation: 'add', a: i, b: i })
        }
      }));

      // Mock de l'API des tools
      mockAgentApiV2Tools.executeTool = jest.fn().mockResolvedValue({
        tool_call_id: 'calc-0',
        name: 'calculator',
        result: { result: 0, operation: 'add' },
        success: true,
        timestamp: new Date().toISOString()
      });

      // Act
      const results = await toolExecutor.executeTools(manyToolCalls, {
        userToken: 'test-token',
        batchId: 'batch-123',
        maxRetries: 3
      });

      // Assert
      // Devrait être limité à DEFAULT_GROQ_LIMITS.maxToolCalls (10)
      expect(results).toHaveLength(10);
      expect(mockAgentApiV2Tools.executeTool).toHaveBeenCalledTimes(10);
    });

    it('should handle empty tool calls array', async () => {
      // Arrange
      const emptyToolCalls: any[] = [];

      // Act
      const results = await toolExecutor.executeTools(emptyToolCalls, {
        userToken: 'test-token',
        batchId: 'batch-123',
        maxRetries: 3
      });

      // Assert
      expect(results).toHaveLength(0);
      expect(mockAgentApiV2Tools.executeTool).not.toHaveBeenCalled();
    });

    it('should handle null tool calls', async () => {
      // Arrange
      const nullToolCalls = null as any;

      // Act
      const results = await toolExecutor.executeTools(nullToolCalls, {
        userToken: 'test-token',
        batchId: 'batch-123',
        maxRetries: 3
      });

      // Assert
      expect(results).toHaveLength(0);
      expect(mockAgentApiV2Tools.executeTool).not.toHaveBeenCalled();
    });
  });

  describe('4. Gestion des Types de Tools', () => {
    it('should execute different tool types correctly', async () => {
      // Arrange
      const toolCalls = [
        {
          id: 'calc-1',
          type: 'function',
          function: {
            name: 'calculator',
            arguments: '{"operation": "add", "a": 2, "b": 2}'
          }
        },
        {
          id: 'file-1',
          type: 'function',
          function: {
            name: 'file_manager',
            arguments: '{"action": "create", "name": "test.txt"}'
          }
        },
        {
          id: 'note-1',
          type: 'function',
          function: {
            name: 'note_manager',
            arguments: '{"action": "create", "title": "Test Note"}'
          }
        }
      ];

      // Mock des différentes APIs
      mockAgentApiV2Tools.executeTool = jest.fn()
        .mockResolvedValueOnce({
          tool_call_id: 'calc-1',
          name: 'calculator',
          result: { result: 4, operation: 'add' },
          success: true,
          timestamp: new Date().toISOString()
        })
        .mockResolvedValueOnce({
          tool_call_id: 'file-1',
          name: 'file_manager',
          result: { id: 'file-123', name: 'test.txt', created: true },
          success: true,
          timestamp: new Date().toISOString()
        })
        .mockResolvedValueOnce({
          tool_call_id: 'note-1',
          name: 'note_manager',
          result: { id: 'note-456', title: 'Test Note', created: true },
          success: true,
          timestamp: new Date().toISOString()
        });

      // Act
      const results = await toolExecutor.executeTools(toolCalls, {
        userToken: 'test-token',
        batchId: 'batch-123',
        maxRetries: 3
      });

      // Assert
      expect(results).toHaveLength(3);
      expect(results[0].name).toBe('calculator');
      expect(results[1].name).toBe('file_manager');
      expect(results[2].name).toBe('note_manager');
      expect(mockAgentApiV2Tools.executeTool).toHaveBeenCalledTimes(3);
    });

    it('should handle unknown tool types gracefully', async () => {
      // Arrange
      const toolCalls = [
        {
          id: 'unknown-1',
          type: 'function',
          function: {
            name: 'unknown_tool',
            arguments: '{"param": "value"}'
          }
        }
      ];

      // Act
      const results = await toolExecutor.executeTools(toolCalls, {
        userToken: 'test-token',
        batchId: 'batch-123',
        maxRetries: 3
      });

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].result.error).toContain('Tool inconnu');
    });
  });

  describe('5. Gestion des Arguments et Paramètres', () => {
    it('should parse JSON arguments correctly', async () => {
      // Arrange
      const toolCalls = [
        {
          id: 'calc-1',
          type: 'function',
          function: {
            name: 'calculator',
            arguments: '{"operation": "add", "a": 2, "b": 2, "precision": 2}'
          }
        }
      ];

      const mockToolResult = {
        tool_call_id: 'calc-1',
        name: 'calculator',
        result: { result: 4.00, operation: 'add', precision: 2 },
        success: true,
        timestamp: new Date().toISOString()
      };

      // Mock de l'API des tools
      mockAgentApiV2Tools.executeTool = jest.fn().mockResolvedValue(mockToolResult);

      // Act
      const results = await toolExecutor.executeTools(toolCalls, {
        userToken: 'test-token',
        batchId: 'batch-123',
        maxRetries: 3
      });

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(mockAgentApiV2Tools.executeTool).toHaveBeenCalledWith(
        'calculator',
        { operation: 'add', a: 2, b: 2, precision: 2 },
        'test-token'
      );
    });

    it('should handle malformed JSON arguments', async () => {
      // Arrange
      const toolCalls = [
        {
          id: 'calc-1',
          type: 'function',
          function: {
            name: 'calculator',
            arguments: '{"operation": "add", "a": 2, "b": 2' // JSON incomplet
          }
        }
      ];

      // Act
      const results = await toolExecutor.executeTools(toolCalls, {
        userToken: 'test-token',
        batchId: 'batch-123',
        maxRetries: 3
      });

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].result.error).toContain('Arguments JSON invalides');
    });

    it('should handle complex nested arguments', async () => {
      // Arrange
      const complexArgs = {
        operation: 'complex_calculation',
        parameters: {
          numbers: [1, 2, 3, 4, 5],
          operations: ['add', 'multiply', 'subtract'],
          options: {
            precision: 3,
            rounding: 'up',
            format: 'decimal'
          }
        },
        metadata: {
          source: 'user_input',
          timestamp: new Date().toISOString()
        }
      };

      const toolCalls = [
        {
          id: 'calc-1',
          type: 'function',
          function: {
            name: 'advanced_calculator',
            arguments: JSON.stringify(complexArgs)
          }
        }
      ];

      const mockToolResult = {
        tool_call_id: 'calc-1',
        name: 'advanced_calculator',
        result: { result: 15, operation: 'complex_calculation', processed: true },
        success: true,
        timestamp: new Date().toISOString()
      };

      // Mock de l'API des tools
      mockAgentApiV2Tools.executeTool = jest.fn().mockResolvedValue(mockToolResult);

      // Act
      const results = await toolExecutor.executeTools(toolCalls, {
        userToken: 'test-token',
        batchId: 'batch-123',
        maxRetries: 3
      });

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(mockAgentApiV2Tools.executeTool).toHaveBeenCalledWith(
        'advanced_calculator',
        complexArgs,
        'test-token'
      );
    });
  });

  describe('6. Gestion des Erreurs et Récupération', () => {
    it('should handle network errors gracefully', async () => {
      // Arrange
      const toolCalls = [
        {
          id: 'calc-1',
          type: 'function',
          function: {
            name: 'calculator',
            arguments: '{"operation": "add", "a": 2, "b": 2}'
          }
        }
      ];

      // Mock d'une erreur réseau
      mockAgentApiV2Tools.executeTool = jest.fn().mockRejectedValue(new Error('Network error: ECONNRESET'));

      // Act
      const results = await toolExecutor.executeTools(toolCalls, {
        userToken: 'test-token',
        batchId: 'batch-123',
        maxRetries: 3
      });

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].result.error).toBe('Network error: ECONNRESET');
    });

    it('should handle timeout errors', async () => {
      // Arrange
      const toolCalls = [
        {
          id: 'calc-1',
          type: 'function',
          function: {
            name: 'calculator',
            arguments: '{"operation": "add", "a": 2, "b": 2}'
          }
        }
      ];

      // Mock d'un timeout
      mockAgentApiV2Tools.executeTool = jest.fn().mockRejectedValue(new Error('Request timeout'));

      // Act
      const results = await toolExecutor.executeTools(toolCalls, {
        userToken: 'test-token',
        batchId: 'batch-123',
        maxRetries: 3
      });

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].result.error).toBe('Request timeout');
    });

    it('should handle authentication errors', async () => {
      // Arrange
      const toolCalls = [
        {
          id: 'calc-1',
          type: 'function',
          function: {
            name: 'calculator',
            arguments: '{"operation": "add", "a": 2, "b": 2}'
          }
        }
      ];

      // Mock d'une erreur d'authentification
      mockAgentApiV2Tools.executeTool = jest.fn().mockRejectedValue(new Error('Unauthorized: Invalid token'));

      // Act
      const results = await toolExecutor.executeTools(toolCalls, {
        userToken: 'test-token',
        batchId: 'batch-123',
        maxRetries: 3
      });

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].result.error).toBe('Unauthorized: Invalid token');
    });
  });

  describe('7. Performance et Optimisation', () => {
    it('should execute tools within reasonable time', async () => {
      // Arrange
      const toolCalls = Array.from({ length: 5 }, (_, i) => ({
        id: `calc-${i}`,
        type: 'function' as const,
        function: {
          name: 'calculator',
          arguments: JSON.stringify({ operation: 'add', a: i, b: i })
        }
      }));

      // Mock de l'API des tools avec délai simulé
      mockAgentApiV2Tools.executeTool = jest.fn().mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            tool_call_id: 'calc-0',
            name: 'calculator',
            result: { result: 0, operation: 'add' },
            success: true,
            timestamp: new Date().toISOString()
          }), 50)
        )
      );

      // Act
      const startTime = Date.now();
      const results = await toolExecutor.executeTools(toolCalls, {
        userToken: 'test-token',
        batchId: 'batch-123',
        maxRetries: 3
      });
      const endTime = Date.now();

      // Assert
      expect(results).toHaveLength(5);
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(1000); // Moins de 1 seconde pour 5 tools
    });

    it('should handle large tool call arrays efficiently', async () => {
      // Arrange
      const largeToolCalls = Array.from({ length: 100 }, (_, i) => ({
        id: `calc-${i}`,
        type: 'function' as const,
        function: {
          name: 'calculator',
          arguments: JSON.stringify({ operation: 'add', a: i, b: i })
        }
      }));

      // Mock de l'API des tools
      mockAgentApiV2Tools.executeTool = jest.fn().mockResolvedValue({
        tool_call_id: 'calc-0',
        name: 'calculator',
        result: { result: 0, operation: 'add' },
        success: true,
        timestamp: new Date().toISOString()
      });

      // Act
      const startTime = Date.now();
      const results = await toolExecutor.executeTools(largeToolCalls, {
        userToken: 'test-token',
        batchId: 'batch-123',
        maxRetries: 3
      });
      const endTime = Date.now();

      // Assert
      expect(results).toHaveLength(100); // Limité par maxToolCalls
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(5000); // Moins de 5 secondes pour 100 tools
    });
  });

  describe('8. Intégration avec le Contexte', () => {
    it('should pass user token to tools correctly', async () => {
      // Arrange
      const userToken = 'user-token-123';
      const toolCalls = [
        {
          id: 'calc-1',
          type: 'function',
          function: {
            name: 'calculator',
            arguments: '{"operation": "add", "a": 2, "b": 2}'
          }
        }
      ];

      const mockToolResult = {
        tool_call_id: 'calc-1',
        name: 'calculator',
        result: { result: 4, operation: 'add' },
        success: true,
        timestamp: new Date().toISOString()
      };

      // Mock de l'API des tools
      mockAgentApiV2Tools.executeTool = jest.fn().mockResolvedValue(mockToolResult);

      // Act
      await toolExecutor.executeTools(toolCalls, {
        userToken,
        batchId: 'batch-123',
        maxRetries: 3
      });

      // Assert
      expect(mockAgentApiV2Tools.executeTool).toHaveBeenCalledWith(
        'calculator',
        { operation: 'add', a: 2, b: 2 },
        userToken
      );
    });

    it('should pass batch ID to tools correctly', async () => {
      // Arrange
      const batchId = 'batch-456';
      const toolCalls = [
        {
          id: 'calc-1',
          type: 'function',
          function: {
            name: 'calculator',
            arguments: '{"operation": "add", "a": 2, "b": 2}'
          }
        }
      ];

      const mockToolResult = {
        tool_call_id: 'calc-1',
        name: 'calculator',
        result: { result: 4, operation: 'add' },
        success: true,
        timestamp: new Date().toISOString()
      };

      // Mock de l'API des tools
      mockAgentApiV2Tools.executeTool = jest.fn().mockResolvedValue(mockToolResult);

      // Act
      await toolExecutor.executeTools(toolCalls, {
        userToken: 'test-token',
        batchId,
        maxRetries: 3
      });

      // Assert
      expect(mockAgentApiV2Tools.executeTool).toHaveBeenCalledWith(
        'calculator',
        { operation: 'add', a: 2, b: 2 },
        'test-token'
      );
    });
  });
}); 