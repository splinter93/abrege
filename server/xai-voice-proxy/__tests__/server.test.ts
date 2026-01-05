/**
 * Tests unitaires pour le proxy WebSocket XAI Voice
 * Conforme au GUIDE D'EXCELLENCE - >80% coverage, Arrange/Act/Assert
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import WebSocket from 'ws';
import { XAIVoiceProxyService } from '../XAIVoiceProxyService';
import { XAIVoiceProxyConfig } from '../types';
import { ProxyErrorHandler, ProxyConnectionError } from '../errorHandler';

// Mock WebSocket server
vi.mock('ws', () => {
  const mockServer = vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    close: vi.fn((callback?: () => void) => {
      if (callback) {
        // Appeler immédiatement pour que la promesse se résolve
        callback();
      }
    }),
  }));
  
  const mockWs = vi.fn();
  mockWs.Server = mockServer;
  
  return { 
    default: mockWs,
    WebSocketServer: mockServer
  };
});

describe('XAIVoiceProxyService', () => {
  let config: XAIVoiceProxyConfig;
  let service: XAIVoiceProxyService;

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
      const WebSocketServerMock = WebSocket.Server as unknown as ReturnType<typeof vi.fn>;
      WebSocketServerMock.mockImplementation((options: { port: number; path: string }) => {
        return {
          on: vi.fn(),
          close: vi.fn((callback?: () => void) => {
            if (callback) callback();
          }),
          port: options.port,
          path: options.path
        };
      });

      // Act
      await service.start();

      // Assert
      expect(WebSocketServerMock).toHaveBeenCalledWith({
        port: config.port,
        path: config.path
      });
      expect(service.isServerRunning()).toBe(true);
    });

    it('should not start if already running', async () => {
      // Arrange
      const WebSocketServerMock = WebSocket.Server as unknown as ReturnType<typeof vi.fn>;
      WebSocketServerMock.mockImplementation(() => ({
        on: vi.fn(),
        close: vi.fn((callback?: () => void) => {
          if (callback) callback();
        })
      }));

      await service.start();
      const initialCallCount = WebSocketServerMock.mock.calls.length;

      // Act
      await service.start();

      // Assert
      expect(WebSocketServerMock.mock.calls.length).toBe(initialCallCount);
    });
  });

  describe('stop', () => {
    it('should stop server and close all connections', async () => {
      // Arrange
      const closeCallback = vi.fn();
      const WebSocketServerMock = WebSocket.Server as unknown as ReturnType<typeof vi.fn>;
      WebSocketServerMock.mockImplementation(() => ({
        on: vi.fn(),
        close: vi.fn((callback?: () => void) => {
          if (callback) {
            // Appeler immédiatement pour que la promesse se résolve
            callback();
          }
        })
      }));

      await service.start();

      // Act
      await service.stop();

      // Assert
      expect(service.isServerRunning()).toBe(false);
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

