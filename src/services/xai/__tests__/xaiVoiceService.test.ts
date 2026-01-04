/**
 * Tests unitaires pour XAIVoiceService
 * Vérifie la logique inFlight guard, reconnexion, cleanup
 * Conforme au GUIDE D'EXCELLENCE - >80% coverage, Arrange/Act/Assert
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { XAIVoiceService } from '../xaiVoiceService';
import type { XAIVoiceCallbacks, XAIVoiceMessage } from '../xaiVoiceService';

// Mock logger
vi.mock('@/utils/logger', () => ({
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

// Mock WebSocket global
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  url: string;

  private sendSpy = vi.fn();
  private closeSpy = vi.fn();

  constructor(url: string) {
    this.url = url;
    // Simuler connexion immédiate
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 0);
  }

  send(data: string): void {
    this.sendSpy(data);
  }

  close(code?: number, reason?: string): void {
    this.readyState = MockWebSocket.CLOSING;
    this.closeSpy(code, reason);
    setTimeout(() => {
      this.readyState = MockWebSocket.CLOSED;
      if (this.onclose) {
        this.onclose(new CloseEvent('close', { code: code || 1000, reason: reason || '' }));
      }
    }, 0);
  }

  // Helpers pour tests
  simulateMessage(message: XAIVoiceMessage): void {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data: JSON.stringify(message) }));
    }
  }

  getSendCalls(): string[] {
    return this.sendSpy.mock.calls.map(call => call[0]);
  }

  getCloseCalls(): Array<[number?, string?]> {
    return this.closeSpy.mock.calls;
  }

  reset(): void {
    this.sendSpy.mockClear();
    this.closeSpy.mockClear();
  }
}

// Remplacer WebSocket global
global.WebSocket = MockWebSocket as unknown as typeof WebSocket;

describe('XAIVoiceService - inFlight Guard', () => {
  let service: XAIVoiceService;
  let mockWs: MockWebSocket;
  let callbacks: XAIVoiceCallbacks;

  beforeEach(() => {
    // Créer une nouvelle instance pour chaque test
    service = new XAIVoiceService();
    callbacks = {};
    
    // Setup environnement
    process.env.NEXT_PUBLIC_XAI_VOICE_PROXY_URL = 'ws://localhost:3001/ws/xai-voice';
  });

  afterEach(() => {
    // Cleanup
    try {
      service.disconnect();
    } catch {
      // Ignore errors during cleanup
    }
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe('disconnect() defer si inFlight=true', () => {
    it('devrait reporter disconnect() si inFlight=true', async () => {
      // Arrange
      await service.connect('test-token', callbacks);
      await new Promise(resolve => setTimeout(resolve, 10)); // Attendre connexion
      
      mockWs = (service as any).ws as MockWebSocket;
      mockWs.reset();

      // Simuler commitAudio() → inFlight = true
      service.commitAudio();

      // Act
      service.disconnect();

      // Assert
      // WebSocket ne doit PAS être fermé immédiatement
      const closeCalls = mockWs.getCloseCalls();
      expect(closeCalls.length).toBe(0);
      
      // pendingDisconnect doit être set (vérifié indirectement via état)
      // On ne peut pas vérifier directement car c'est privé, mais on vérifie que ws n'est pas fermé
      expect(mockWs.readyState).toBe(MockWebSocket.OPEN);
    });
  });

  describe('exécution pendingDisconnect après response.done', () => {
    it('devrait exécuter pendingDisconnect après réception response.done', async () => {
      // Arrange
      await service.connect('test-token', callbacks);
      await new Promise(resolve => setTimeout(resolve, 10));
      
      mockWs = (service as any).ws as MockWebSocket;
      mockWs.reset();

      let disconnectExecuted = false;
      const originalDisconnect = service.disconnect.bind(service);
      vi.spyOn(service, 'disconnect').mockImplementation(() => {
        disconnectExecuted = true;
        return originalDisconnect();
      });

      // Simuler commitAudio() → inFlight = true, puis disconnect() → pendingDisconnect set
      service.commitAudio();
      service.disconnect(); // Doit être reporté

      // Act : Simuler réception response.done
      const responseDoneMessage: XAIVoiceMessage = {
        type: 'response.done'
      };
      mockWs.simulateMessage(responseDoneMessage);
      
      await new Promise(resolve => setTimeout(resolve, 10)); // Attendre traitement message

      // Assert
      // disconnect doit avoir été exécuté
      expect(disconnectExecuted).toBe(true);
      
      // WebSocket doit être fermé
      const closeCalls = mockWs.getCloseCalls();
      expect(closeCalls.length).toBeGreaterThan(0);
    });
  });

  describe('timeout sécurité (5s)', () => {
    it('devrait réinitialiser inFlight après 5s si pas de response.done', async () => {
      // Arrange
      vi.useFakeTimers();
      
      await service.connect('test-token', callbacks);
      vi.advanceTimersByTime(10); // Simuler délai connexion
      
      mockWs = (service as any).ws as MockWebSocket;
      mockWs.reset();

      let disconnectExecuted = false;
      const originalDisconnect = service.disconnect.bind(service);
      vi.spyOn(service, 'disconnect').mockImplementation(() => {
        disconnectExecuted = true;
        return originalDisconnect();
      });

      // Simuler commitAudio() → inFlight = true, puis disconnect() → pendingDisconnect set
      service.commitAudio();
      service.disconnect(); // Doit être reporté

      // Act : Avancer de 5.1s (timeout sécurité)
      vi.advanceTimersByTime(5100);

      // Assert
      // disconnect doit avoir été exécuté après timeout
      expect(disconnectExecuted).toBe(true);
      
      // WebSocket doit être fermé
      const closeCalls = mockWs.getCloseCalls();
      expect(closeCalls.length).toBeGreaterThan(0);

      vi.useRealTimers();
    });
  });
});

describe('XAIVoiceService - Reconnexion et Cleanup', () => {
  let service: XAIVoiceService;
  let mockWs: MockWebSocket;
  let callbacks: XAIVoiceCallbacks;

  beforeEach(() => {
    service = new XAIVoiceService();
    callbacks = {};
    process.env.NEXT_PUBLIC_XAI_VOICE_PROXY_URL = 'ws://localhost:3001/ws/xai-voice';
  });

  afterEach(() => {
    try {
      service.disconnect();
    } catch {
      // Ignore errors during cleanup
    }
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe('cleanup timeouts sur disconnect()', () => {
    it('devrait nettoyer tous les timeouts actifs', async () => {
      // Arrange
      vi.useFakeTimers();
      
      await service.connect('test-token', callbacks);
      vi.advanceTimersByTime(10); // Simuler délai connexion
      
      mockWs = (service as any).ws as MockWebSocket;
      
      // Vérifier que connexion est active (idleTimeout est démarré dans onopen)
      const stateBefore = service.getState();
      expect(stateBefore).toBe('connected');

      // Act
      service.disconnect();
      vi.advanceTimersByTime(100); // Avancer temps

      // Assert
      // État doit être disconnected
      expect(service.getState()).toBe('disconnected');
      
      // WebSocket doit être fermé
      const closeCalls = mockWs.getCloseCalls();
      expect(closeCalls.length).toBeGreaterThan(0);
      
      // Plus de timeout idle déclenché même après délai (timeouts cleared)
      vi.advanceTimersByTime(20000); // 20s, normalement timeout idle serait déclenché
      expect(service.getState()).toBe('disconnected'); // Toujours disconnected, pas de reconnexion

      vi.useRealTimers();
    });
  });

  describe('idle timeout (15s)', () => {
    it('devrait déconnecter automatiquement après 15s d\'inactivité', async () => {
      // Arrange
      vi.useFakeTimers();
      
      await service.connect('test-token', callbacks);
      vi.advanceTimersByTime(10); // Simuler délai connexion
      
      mockWs = (service as any).ws as MockWebSocket;
      mockWs.reset();

      // Act : Avancer de 15.1s (timeout idle)
      vi.advanceTimersByTime(15100);

      // Assert
      // disconnect doit avoir été appelé (état = disconnected)
      expect(service.getState()).toBe('disconnected');
      
      // WebSocket doit être fermé
      const closeCalls = mockWs.getCloseCalls();
      expect(closeCalls.length).toBeGreaterThan(0);

      vi.useRealTimers();
    });

    it('devrait reschedule idle timeout si activité détectée', async () => {
      // Arrange
      vi.useFakeTimers();
      
      await service.connect('test-token', callbacks);
      vi.advanceTimersByTime(10); // Simuler délai connexion
      
      mockWs = (service as any).ws as MockWebSocket;
      mockWs.reset();

      // Act : Avancer de 10s, puis simuler activité (sendAudio met à jour lastActivity)
      vi.advanceTimersByTime(10000);
      
      // Simuler activité
      service.sendAudio('test-audio-base64');
      
      // Avancer encore de 10s (total 20s, mais dernière activité il y a 10s seulement)
      vi.advanceTimersByTime(10000);

      // Assert
      // Connexion doit encore être active (lastActivity récent)
      expect(service.getState()).toBe('connected');
      
      // Maintenant, avancer de 15s supplémentaires (total 25s depuis dernière activité)
      vi.advanceTimersByTime(15000);
      
      // Maintenant, doit être déconnecté
      expect(service.getState()).toBe('disconnected');

      vi.useRealTimers();
    });
  });
});
