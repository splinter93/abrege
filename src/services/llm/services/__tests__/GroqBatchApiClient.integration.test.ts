import { GroqBatchApiClient } from '../GroqBatchApiClient';
import { DEFAULT_FSM_CONFIG } from '../../types/groqTypes';

// Mock des dépendances
jest.mock('@/utils/logger');

describe('GroqBatchApiClient Integration Tests', () => {
  let batchApiClient: GroqBatchApiClient;
  let mockFetch: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Créer le client
    batchApiClient = new GroqBatchApiClient({
      baseUrl: 'http://localhost:3000',
      timeout: 30000,
      maxRetries: 3,
      idempotencyKey: ''
    });

    // Mock de fetch
    mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
    global.fetch = mockFetch;
  });

  describe('1. Persistance des Tool Results', () => {
    it('should persist tool results successfully', async () => {
      // Arrange
      const payload = {
        messages: [
          {
            role: 'assistant',
            tool_calls: [{
              id: 'calc-1',
              type: 'function',
              function: { name: 'calculator', arguments: '{"op": "add", "a": 2, "b": 2}' }
            }]
          },
          {
            role: 'tool',
            tool_call_id: 'calc-1',
            name: 'calculator',
            content: '{"result": 4}'
          }
        ],
        operationId: 'op-123',
        sessionId: 'test-session',
        roundId: 'round-123'
      };

      const roundContext = {
        roundId: 'round-123',
        sessionId: 'test-session',
        currentState: 'PERSIST_TOOLS_BATCH',
        previousState: 'EXECUTE_TOOLS',
        stateHistory: [],
        lockAcquired: true,
        lockExpiresAt: new Date(Date.now() + 30000).toISOString()
      };

      const mockResponse = {
        success: true,
        applied: true,
        operationId: 'op-123',
        messageIds: ['msg-1', 'msg-2'],
        sequence: 1
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse
      } as Response);

      // Act
      const result = await batchApiClient.persistBatch(payload, roundContext);

      // Assert
      expect(result.success).toBe(true);
      expect(result.applied).toBe(true);
      expect(result.operationId).toBe('op-123');
      expect(result.messageIds).toHaveLength(2);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/batch',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'If-Match': expect.any(String)
          }),
          body: JSON.stringify(payload)
        })
      );
    });

    it('should handle idempotency correctly', async () => {
      // Arrange
      const payload = {
        messages: [
          {
            role: 'assistant',
            tool_calls: [{ id: 'test-1', type: 'function', function: { name: 'test', arguments: '{}' } }]
          },
          {
            role: 'tool',
            tool_call_id: 'test-1',
            name: 'test',
            content: '{"result": "success"}'
          }
        ],
        operationId: 'op-idempotent',
        sessionId: 'test-session',
        roundId: 'round-idempotent'
      };

      const roundContext = {
        roundId: 'round-idempotent',
        sessionId: 'test-session',
        currentState: 'PERSIST_TOOLS_BATCH',
        previousState: 'EXECUTE_TOOLS',
        stateHistory: [],
        lockAcquired: true,
        lockExpiresAt: new Date(Date.now() + 30000).toISOString()
      };

      // Premier appel - succès
      const mockFirstResponse = {
        success: true,
        applied: true,
        operationId: 'op-idempotent',
        messageIds: ['msg-1', 'msg-2'],
        sequence: 1
      };

      // Deuxième appel - idempotent (non appliqué)
      const mockSecondResponse = {
        success: true,
        applied: false,
        operationId: 'op-idempotent',
        messageIds: [],
        sequence: 1
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockFirstResponse
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockSecondResponse
        } as Response);

      // Act
      const result1 = await batchApiClient.persistBatch(payload, roundContext);
      const result2 = await batchApiClient.persistBatch(payload, roundContext);

      // Assert
      expect(result1.applied).toBe(true);
      expect(result1.messageIds).toHaveLength(2);
      expect(result2.applied).toBe(false);
      expect(result2.messageIds).toHaveLength(0);
      expect(result1.operationId).toBe(result2.operationId);
    });
  });

  describe('2. Gestion des Conflits et Erreurs', () => {
    it('should handle 409 conflicts gracefully', async () => {
      // Arrange
      const payload = {
        messages: [
          {
            role: 'assistant',
            tool_calls: [{ id: 'conflict-1', type: 'function', function: { name: 'test', arguments: '{}' } }]
          },
          {
            role: 'tool',
            tool_call_id: 'conflict-1',
            name: 'test',
            content: '{"result": "conflict"}'
          }
        ],
        operationId: 'op-conflict',
        sessionId: 'test-session',
        roundId: 'round-conflict'
      };

      const roundContext = {
        roundId: 'round-conflict',
        sessionId: 'test-session',
        currentState: 'PERSIST_TOOLS_BATCH',
        previousState: 'EXECUTE_TOOLS',
        stateHistory: [],
        lockAcquired: true,
        lockExpiresAt: new Date(Date.now() + 30000).toISOString()
      };

      // Mock d'un conflit 409
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        statusText: 'Conflict',
        json: async () => ({
          error: 'Concurrent modification detected',
          operationId: 'op-conflict'
        })
      } as Response);

      // Act & Assert
      await expect(batchApiClient.persistBatch(payload, roundContext))
        .rejects.toThrow('Concurrent modification detected');
    });

    it('should handle 422 validation errors', async () => {
      // Arrange
      const invalidPayload = {
        messages: [
          {
            role: 'assistant',
            tool_calls: [{ id: 'invalid-1', type: 'function', function: { name: '', arguments: '' } }]
          }
        ],
        operationId: 'op-invalid',
        sessionId: '',
        roundId: ''
      };

      const roundContext = {
        roundId: 'round-invalid',
        sessionId: 'test-session',
        currentState: 'PERSIST_TOOLS_BATCH',
        previousState: 'EXECUTE_TOOLS',
        stateHistory: [],
        lockAcquired: true,
        lockExpiresAt: new Date(Date.now() + 30000).toISOString()
      };

      // Mock d'une erreur de validation 422
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        statusText: 'Unprocessable Entity',
        json: async () => ({
          error: 'Validation failed',
          details: ['Messages array cannot be empty', 'Operation ID is required']
        })
      } as Response);

      // Act & Assert
      await expect(batchApiClient.persistBatch(invalidPayload as any, roundContext))
        .rejects.toThrow('Validation failed');
    });

    it('should handle network timeouts', async () => {
      // Arrange
      const payload = {
        messages: [
          {
            role: 'assistant',
            tool_calls: [{ id: 'timeout-1', type: 'function', function: { name: 'test', arguments: '{}' } }]
          }
        ],
        operationId: 'op-timeout',
        sessionId: 'test-session',
        roundId: 'round-timeout'
      };

      const roundContext = {
        roundId: 'round-timeout',
        sessionId: 'test-session',
        currentState: 'PERSIST_TOOLS_BATCH',
        previousState: 'EXECUTE_TOOLS',
        stateHistory: [],
        lockAcquired: true,
        lockExpiresAt: new Date(Date.now() + 30000).toISOString()
      };

      // Mock d'un timeout
      mockFetch.mockRejectedValueOnce(new Error('Request timeout'));

      // Act & Assert
      await expect(batchApiClient.persistBatch(payload, roundContext))
        .rejects.toThrow('Request timeout');
    });
  });

  describe('3. Gestion des Retry et Fallbacks', () => {
    it('should retry on transient errors', async () => {
      // Arrange
      const payload = {
        messages: [
          {
            role: 'assistant',
            tool_calls: [{ id: 'retry-1', type: 'function', function: { name: 'test', arguments: '{}' } }]
          }
        ],
        operationId: 'op-retry',
        sessionId: 'test-session',
        roundId: 'round-retry'
      };

      const roundContext = {
        roundId: 'round-retry',
        sessionId: 'test-session',
        currentState: 'PERSIST_TOOLS_BATCH',
        previousState: 'EXECUTE_TOOLS',
        stateHistory: [],
        lockAcquired: true,
        lockExpiresAt: new Date(Date.now() + 30000).toISOString()
      };

      // Premier appel - erreur 500 (transient)
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ error: 'Internal server error' })
      } as Response);

      // Deuxième appel - succès
      const mockSuccessResponse = {
        success: true,
        applied: true,
        operationId: 'op-retry',
        messageIds: ['msg-retry'],
        sequence: 1
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockSuccessResponse
      } as Response);

      // Act
      const result = await batchApiClient.persistBatch(payload, roundContext);

      // Assert
      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should not retry on client errors (4xx)', async () => {
      // Arrange
      const payload = {
        messages: [
          {
            role: 'assistant',
            tool_calls: [{ id: 'client-error-1', type: 'function', function: { name: 'test', arguments: '{}' } }]
          }
        ],
        operationId: 'op-client-error',
        sessionId: 'test-session',
        roundId: 'round-client-error'
      };

      const roundContext = {
        roundId: 'round-client-error',
        sessionId: 'test-session',
        currentState: 'PERSIST_TOOLS_BATCH',
        previousState: 'EXECUTE_TOOLS',
        stateHistory: [],
        lockAcquired: true,
        lockExpiresAt: new Date(Date.now() + 30000).toISOString()
      };

      // Mock d'une erreur client 400
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({ error: 'Bad request' })
      } as Response);

      // Act & Assert
      await expect(batchApiClient.persistBatch(payload, roundContext))
        .rejects.toThrow('Bad request');
      
      expect(mockFetch).toHaveBeenCalledTimes(1); // Pas de retry
    });
  });

  describe('4. Gestion des Headers et Métadonnées', () => {
    it('should include proper headers for idempotency', async () => {
      // Arrange
      const payload = {
        messages: [
          {
            role: 'assistant',
            tool_calls: [{ id: 'header-1', type: 'function', function: { name: 'test', arguments: '{}' } }]
          }
        ],
        operationId: 'op-headers',
        sessionId: 'test-session',
        roundId: 'round-headers'
      };

      const roundContext = {
        roundId: 'round-headers',
        sessionId: 'test-session',
        currentState: 'PERSIST_TOOLS_BATCH',
        previousState: 'EXECUTE_TOOLS',
        stateHistory: [],
        lockAcquired: true,
        lockExpiresAt: new Date(Date.now() + 30000).toISOString()
      };

      const mockResponse = {
        success: true,
        applied: true,
        operationId: 'op-headers',
        messageIds: ['msg-headers'],
        sequence: 1
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse
      } as Response);

      // Act
      await batchApiClient.persistBatch(payload, roundContext);

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/batch',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'If-Match': expect.any(String),
            'X-Operation-ID': 'op-headers',
            'X-Session-ID': 'test-session',
            'X-Round-ID': 'round-headers'
          })
        })
      );
    });

    it('should handle custom timeout configuration', async () => {
      // Arrange
      const customClient = new GroqBatchApiClient({
        baseUrl: 'http://localhost:3000',
        timeout: 5000, // 5 secondes
        maxRetries: 1,
        idempotencyKey: ''
      });

      const payload = {
        messages: [
          {
            role: 'assistant',
            tool_calls: [{ id: 'timeout-1', type: 'function', function: { name: 'test', arguments: '{}' } }]
          }
        ],
        operationId: 'op-timeout-custom',
        sessionId: 'test-session',
        roundId: 'round-timeout-custom'
      };

      const roundContext = {
        roundId: 'round-timeout-custom',
        sessionId: 'test-session',
        currentState: 'PERSIST_TOOLS_BATCH',
        previousState: 'EXECUTE_TOOLS',
        stateHistory: [],
        lockAcquired: true,
        lockExpiresAt: new Date(Date.now() + 30000).toISOString()
      };

      // Mock d'un timeout après 6 secondes
      mockFetch.mockImplementationOnce(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 6000)
        )
      );

      // Act & Assert
      await expect(customClient.persistBatch(payload, roundContext))
        .rejects.toThrow('Request timeout');
    });
  });

  describe('5. Validation des Payloads', () => {
    it('should validate message structure before sending', async () => {
      // Arrange
      const invalidPayload = {
        messages: [], // Messages vide
        operationId: 'op-invalid',
        sessionId: 'test-session',
        roundId: 'round-invalid'
      };

      const roundContext = {
        roundId: 'round-invalid',
        sessionId: 'test-session',
        currentState: 'PERSIST_TOOLS_BATCH',
        previousState: 'EXECUTE_TOOLS',
        stateHistory: [],
        lockAcquired: true,
        lockExpiresAt: new Date(Date.now() + 30000).toISOString()
      };

      // Act & Assert
      await expect(batchApiClient.persistBatch(invalidPayload as any, roundContext))
        .rejects.toThrow('Invalid payload');
    });

    it('should validate tool call structure', async () => {
      // Arrange
      const invalidPayload = {
        messages: [
          {
            role: 'assistant',
            tool_calls: [{ 
              id: 'invalid-1', 
              type: 'function', 
              function: { name: '', arguments: 'invalid json' } // Nom vide, JSON invalide
            }]
          }
        ],
        operationId: 'op-invalid-tool',
        sessionId: 'test-session',
        roundId: 'round-invalid-tool'
      };

      const roundContext = {
        roundId: 'round-invalid-tool',
        sessionId: 'test-session',
        currentState: 'PERSIST_TOOLS_BATCH',
        previousState: 'EXECUTE_TOOLS',
        stateHistory: [],
        lockAcquired: true,
        lockExpiresAt: new Date(Date.now() + 30000).toISOString()
      };

      // Act & Assert
      await expect(batchApiClient.persistBatch(invalidPayload as any, roundContext))
        .rejects.toThrow('Invalid tool call structure');
    });
  });

  describe('6. Performance et Monitoring', () => {
    it('should track request duration', async () => {
      // Arrange
      const payload = {
        messages: [
          {
            role: 'assistant',
            tool_calls: [{ id: 'perf-1', type: 'function', function: { name: 'test', arguments: '{}' } }]
          }
        ],
        operationId: 'op-perf',
        sessionId: 'test-session',
        roundId: 'round-perf'
      };

      const roundContext = {
        roundId: 'round-perf',
        sessionId: 'test-session',
        currentState: 'PERSIST_TOOLS_BATCH',
        previousState: 'EXECUTE_TOOLS',
        stateHistory: [],
        lockAcquired: true,
        lockExpiresAt: new Date(Date.now() + 30000).toISOString()
      };

      const mockResponse = {
        success: true,
        applied: true,
        operationId: 'op-perf',
        messageIds: ['msg-perf'],
        sequence: 1
      };

      // Simuler un délai de réponse
      mockFetch.mockImplementationOnce(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            status: 200,
            json: async () => mockResponse
          } as Response), 100)
        )
      );

      // Act
      const startTime = Date.now();
      const result = await batchApiClient.persistBatch(payload, roundContext);
      const endTime = Date.now();

      // Assert
      expect(result.success).toBe(true);
      const duration = endTime - startTime;
      expect(duration).toBeGreaterThanOrEqual(100);
      expect(duration).toBeLessThan(200);
    });

    it('should handle large payloads efficiently', async () => {
      // Arrange
      const largeMessage = 'A'.repeat(10000); // Message de 10KB
      const payload = {
        messages: [
          {
            role: 'assistant',
            tool_calls: [{ 
              id: 'large-1', 
              type: 'function', 
              function: { name: 'test', arguments: JSON.stringify({ content: largeMessage }) }
            }]
          }
        ],
        operationId: 'op-large',
        sessionId: 'test-session',
        roundId: 'round-large'
      };

      const roundContext = {
        roundId: 'round-large',
        sessionId: 'test-session',
        currentState: 'PERSIST_TOOLS_BATCH',
        previousState: 'EXECUTE_TOOLS',
        stateHistory: [],
        lockAcquired: true,
        lockExpiresAt: new Date(Date.now() + 30000).toISOString()
      };

      const mockResponse = {
        success: true,
        applied: true,
        operationId: 'op-large',
        messageIds: ['msg-large'],
        sequence: 1
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse
      } as Response);

      // Act
      const result = await batchApiClient.persistBatch(payload, roundContext);

      // Assert
      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/batch',
        expect.objectContaining({
          body: expect.stringContaining(largeMessage)
        })
      );
    });
  });
}); 