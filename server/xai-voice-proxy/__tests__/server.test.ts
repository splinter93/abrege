/**
 * Tests unitaires pour le proxy WebSocket XAI Voice
 * Conforme au GUIDE D'EXCELLENCE - >80% coverage, Arrange/Act/Assert
 */

import { describe, it, expect, beforeEach, afterEach, vi, type MockedFunction } from 'vitest';
import WebSocket, { WebSocketServer } from 'ws';
import { XAIVoiceProxyService } from '../XAIVoiceProxyService';
import { XAIVoiceProxyConfig } from '../types';
import { ProxyErrorHandler, ProxyConnectionError } from '../errorHandler';

// Mock logger
vi.mock('../../src/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
  LogCategory: {
    AUDIO: 'AUDIO',
  },
}));

// Mock WebSocket server
// Note: vi.mock() est hoisted, donc on crée le mock directement dans la factory
vi.mock('ws', () => {
  // Créer une vraie fonction constructeur pour WebSocketServer
  function MockWebSocketServer(this: { on: ReturnType<typeof vi.fn>; close: ReturnType<typeof vi.fn> }, _options?: { port?: number; path?: string }) {
    this.on = vi.fn();
    this.close = vi.fn((callback?: () => void) => {
      if (callback) {
        // Appeler immédiatement pour que la promesse se résolve
        callback();
      }
    });
  }
  
  // Wrapper pour permettre à vi.mocked() de fonctionner
  const MockWebSocketServerFn = vi.fn(MockWebSocketServer);
  
  const mockWs = vi.fn();
  mockWs.Server = MockWebSocketServerFn;
  mockWs.CONNECTING = 0;
  mockWs.OPEN = 1;
  mockWs.CLOSING = 2;
  mockWs.CLOSED = 3;
  
  return { 
    default: mockWs,
    WebSocketServer: MockWebSocketServerFn
  };
});

describe('XAIVoiceProxyService', () => {
  let config: XAIVoiceProxyConfig;
  let service: XAIVoiceProxyService;
  let mockWebSocketServer: MockedFunction<typeof WebSocketServer>;

  beforeEach(() => {
    config = {
      port: 3001,
      xaiApiKey: 'test-api-key',
      path: '/ws/xai-voice',
      maxConnections: 100,
      connectionTimeout: 10000,
      pingInterval: 30000
    };
    
    // Reset singleton
    (XAIVoiceProxyService as unknown as { instance: XAIVoiceProxyService | null }).instance = null;
    // Récupérer le mock
    mockWebSocketServer = vi.mocked(WebSocketServer);
    mockWebSocketServer.mockClear();
    service = XAIVoiceProxyService.getInstance(config);
  });

  afterEach(async () => {
    if (service.isServerRunning()) {
      await service.stop();
    }
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = XAIVoiceProxyService.getInstance(config);
      const instance2 = XAIVoiceProxyService.getInstance(config);
      expect(instance1).toBe(instance2);
    });
  });

  describe('start', () => {
    it('should start WebSocket server on configured port', async () => {
      // Arrange
      mockWebSocketServer.mockClear();

      // Act
      await service.start();

      // Assert
      expect(mockWebSocketServer).toHaveBeenCalledWith({
        port: config.port,
        path: config.path
      });
      expect(service.isServerRunning()).toBe(true);
    });

    it('should not start if already running', async () => {
      // Arrange
      mockWebSocketServer.mockClear();
      await service.start();
      const initialCallCount = mockWebSocketServer.mock.calls.length;

      // Act
      await service.start();

      // Assert
      expect(mockWebSocketServer.mock.calls.length).toBe(initialCallCount);
      expect(service.isServerRunning()).toBe(true);
    });
  });

  describe('stop', () => {
    it('should stop server and close all connections', async () => {
      // Arrange
      mockWebSocketServer.mockClear();
      await service.start();
      expect(service.isServerRunning()).toBe(true);
      
      // Récupérer l'instance mockée créée par start()
      const mockInstance = mockWebSocketServer.mock.results[0]?.value;
      if (mockInstance) {
        vi.mocked(mockInstance.close).mockClear();
      }

      // Act
      await service.stop();

      // Assert
      expect(service.isServerRunning()).toBe(false);
      if (mockInstance) {
        expect(mockInstance.close).toHaveBeenCalled();
      }
    }, 15000); // Timeout de 15s pour ce test

    it('should handle stop when not running', async () => {
      // Act & Assert (should not throw)
      await expect(service.stop()).resolves.toBeUndefined();
    });
  });

  describe('getActiveConnectionsCount', () => {
    it('should return 0 when no connections', () => {
      // Act
      const count = service.getActiveConnectionsCount();

      // Assert
      expect(count).toBe(0);
    });
  });

  describe('isServerRunning', () => {
    it('should return false when server not started', () => {
      // Act & Assert
      expect(service.isServerRunning()).toBe(false);
    });
  });
});

describe('ProxyErrorHandler', () => {
  describe('handleError', () => {
    it('should handle ProxyConnectionError', () => {
      // Arrange
      const error = new ProxyConnectionError('Test error', 'conn_123', 'TEST_CODE');

      // Act
      const result = ProxyErrorHandler.handleError(error, {
        connectionId: 'conn_123',
        operation: 'test'
      });

      // Assert
      expect(result.message).toBe('Erreur de connexion proxy');
      expect(result.code).toBe('TEST_CODE');
      expect(result.shouldClose).toBe(true);
    });

    it('should handle generic Error', () => {
      // Arrange
      const error = new Error('Generic error');

      // Act
      const result = ProxyErrorHandler.handleError(error, {
        operation: 'test'
      });

      // Assert
      expect(result.message).toBe('Erreur interne du proxy');
      expect(result.code).toBe('INTERNAL_ERROR');
      expect(result.shouldClose).toBe(true);
    });

    it('should handle unknown error type', () => {
      // Arrange
      const error = 'String error';

      // Act
      const result = ProxyErrorHandler.handleError(error, {
        operation: 'test'
      });

      // Assert
      expect(result.message).toBe('Erreur inconnue');
      expect(result.code).toBe('UNKNOWN_ERROR');
      expect(result.shouldClose).toBe(true);
    });
  });

  describe('createConnectionError', () => {
    it('should create ProxyConnectionError from Error', () => {
      // Arrange
      const originalError = new Error('Original error');
      const connectionId = 'conn_123';

      // Act
      const error = ProxyErrorHandler.createConnectionError(originalError, connectionId, 'TEST_CODE');

      // Assert
      expect(error).toBeInstanceOf(ProxyConnectionError);
      expect(error.message).toBe('Original error');
      expect(error.connectionId).toBe(connectionId);
      expect(error.code).toBe('TEST_CODE');
    });
  });
});

