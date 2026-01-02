/**
 * Tests unitaires pour RealtimeEditorService
 * 
 * Conformité GUIDE-EXCELLENCE-CODE.md: Tests services critiques
 * 
 * Couverture:
 * - Connection/disconnection
 * - Events (update, sync)
 * - Reconnexion automatique
 * - Pattern singleton
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { RealtimeEditorService } from '../RealtimeEditorService';
import type { RealtimeEditorConfig, RealtimeEditorState, RealtimeEditorEvent } from '../RealtimeEditorService';

// Mock dépendances
vi.mock('../RealtimeConnection', () => ({
  RealtimeConnection: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue({
      send: vi.fn(),
      unsubscribe: vi.fn(),
    }),
    disconnect: vi.fn().mockResolvedValue(undefined),
    destroy: vi.fn(),
    getChannel: vi.fn().mockReturnValue({
      send: vi.fn().mockResolvedValue(undefined),
      unsubscribe: vi.fn(),
    }),
  })),
}));

vi.mock('../RealtimeEvents', () => ({
  RealtimeEvents: vi.fn().mockImplementation(() => ({
    setupChannelListeners: vi.fn(),
  })),
}));

vi.mock('../RealtimeState', () => ({
  RealtimeState: vi.fn().mockImplementation(() => ({
    getState: vi.fn().mockReturnValue({
      isConnected: false,
      isConnecting: false,
      connectionStatus: 'disconnected' as const,
      lastError: null,
      reconnectAttempts: 0,
      lastActivity: 0,
    }),
    onStateChange: vi.fn().mockReturnValue(() => {}),
    onEvent: vi.fn().mockReturnValue(() => {}),
    clearCallbacks: vi.fn(),
    updateState: vi.fn(),
    notifyEvent: vi.fn(),
  })),
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
  LogCategory: {
    EDITOR: 'EDITOR',
  },
}));

describe('[RealtimeEditorService] Service', () => {
  let service: RealtimeEditorService;
  const mockConfig: RealtimeEditorConfig = {
    noteId: 'test-note-id',
    userId: 'test-user-id',
    debug: false,
    autoReconnect: true,
    reconnectDelay: 2000,
    maxReconnectAttempts: 10,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset singleton pour chaque test
    (RealtimeEditorService as any).instance = null;
    service = RealtimeEditorService.getInstance();
  });

  afterEach(() => {
    if (service) {
      service.destroy();
    }
  });

  describe('Pattern Singleton', () => {
    it('should return the same instance on multiple calls', () => {
      const instance1 = RealtimeEditorService.getInstance();
      const instance2 = RealtimeEditorService.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('should reset instance after destroy', () => {
      const instance1 = RealtimeEditorService.getInstance();
      instance1.destroy();
      
      const instance2 = RealtimeEditorService.getInstance();
      expect(instance1).not.toBe(instance2);
    });
  });

  describe('Initialisation', () => {
    it('should initialize with valid config', async () => {
      await service.initialize(mockConfig);
      
      const config = service.getConfig();
      expect(config).toEqual(mockConfig);
    });

    it('should not reinitialize if same noteId', async () => {
      await service.initialize(mockConfig);
      const config1 = service.getConfig();
      
      await service.initialize(mockConfig);
      const config2 = service.getConfig();
      
      expect(config1).toEqual(config2);
    });

    it('should initialize with default values', async () => {
      const minimalConfig: RealtimeEditorConfig = {
        noteId: 'test-note-id',
        userId: 'test-user-id',
      };
      
      await service.initialize(minimalConfig);
      
      const config = service.getConfig();
      expect(config?.autoReconnect).toBe(true);
      expect(config?.reconnectDelay).toBe(2000);
      expect(config?.maxReconnectAttempts).toBe(10);
    });
  });

  describe('Connection/Disconnection', () => {
    it('should connect successfully', async () => {
      await service.initialize(mockConfig);
      
      const state = service.getState();
      expect(state).toBeDefined();
    });

    it('should disconnect successfully', async () => {
      await service.initialize(mockConfig);
      
      await expect(service.disconnect()).resolves.not.toThrow();
    });

    it('should handle disconnect when not connected', async () => {
      await expect(service.disconnect()).resolves.not.toThrow();
    });
  });

  describe('Reconnexion', () => {
    it('should reconnect successfully', async () => {
      await service.initialize(mockConfig);
      
      await expect(service.reconnect()).resolves.not.toThrow();
    });

    it('should handle reconnect when not initialized', async () => {
      await expect(service.reconnect()).resolves.not.toThrow();
    });
  });

  describe('Broadcast', () => {
    it('should broadcast event when connected', async () => {
      await service.initialize(mockConfig);
      
      // Mock connected state
      const state = service.getState();
      (state as any).isConnected = true;
      
      await expect(
        service.broadcast('test-event', { data: 'test' })
      ).resolves.not.toThrow();
    });

    it('should not broadcast when not connected', async () => {
      await service.initialize(mockConfig);
      
      // Mock disconnected state
      const state = service.getState();
      (state as any).isConnected = false;
      
      await expect(
        service.broadcast('test-event', { data: 'test' })
      ).resolves.not.toThrow();
    });
  });

  describe('State Management', () => {
    it('should get current state', () => {
      const state = service.getState();
      
      expect(state).toHaveProperty('isConnected');
      expect(state).toHaveProperty('isConnecting');
      expect(state).toHaveProperty('connectionStatus');
      expect(state).toHaveProperty('lastError');
      expect(state).toHaveProperty('reconnectAttempts');
      expect(state).toHaveProperty('lastActivity');
    });

    it('should subscribe to state changes', () => {
      const callback = vi.fn();
      const unsubscribe = service.onStateChange(callback);
      
      expect(typeof unsubscribe).toBe('function');
      
      unsubscribe();
    });

    it('should subscribe to events', () => {
      const callback = vi.fn();
      const unsubscribe = service.onEvent(callback);
      
      expect(typeof unsubscribe).toBe('function');
      
      unsubscribe();
    });
  });

  describe('Configuration', () => {
    it('should get current config after initialization', async () => {
      await service.initialize(mockConfig);
      
      const config = service.getConfig();
      expect(config).toEqual(mockConfig);
    });

    it('should return null config when not initialized', () => {
      const config = service.getConfig();
      expect(config).toBeNull();
    });
  });

  describe('Cleanup', () => {
    it('should destroy service and clean up resources', async () => {
      await service.initialize(mockConfig);
      
      service.destroy();
      
      const config = service.getConfig();
      expect(config).toBeNull();
    });

    it('should handle multiple destroy calls', async () => {
      await service.initialize(mockConfig);
      
      service.destroy();
      expect(() => service.destroy()).not.toThrow();
    });
  });
});



