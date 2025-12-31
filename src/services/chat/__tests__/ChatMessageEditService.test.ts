/**
 * Tests unitaires pour ChatMessageEditService
 * 
 * Couvre:
 * - Recherche message (ID exact, timestamp fallback)
 * - Suppression cascade (message édité + tous après)
 * - Gestion erreurs (NotFoundError, AuthError, DeleteError)
 * - Gestion token auth
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChatMessageEditService, NotFoundError, AuthError, DeleteError } from '../ChatMessageEditService';
import type { ChatMessage, ChatSession, Agent } from '@/types/chat';
import type { LLMContext } from '@/types/llmContext';

// Mock tokenManager
vi.mock('@/utils/tokenManager', () => ({
  tokenManager: {
    getValidToken: vi.fn()
  }
}));

// Mock fetch global
global.fetch = vi.fn();

import { tokenManager } from '@/utils/tokenManager';

describe('[ChatMessageEditService]', () => {
  let service: ChatMessageEditService;
  const mockSessionId = 'test-session-123';
  const mockUserId = 'test-user-456';
  const mockToken = 'mock-jwt-token';

  const mockSession: ChatSession = {
    id: mockSessionId,
    user_id: mockUserId,
    title: 'Test Session',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const mockAgent: Agent = {
    id: 'agent-123',
    name: 'Test Agent',
    description: 'Test agent description',
    system_prompt: 'You are a helpful assistant',
    model: 'gpt-4',
    temperature: 0.7,
    max_tokens: 2000,
    user_id: mockUserId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const mockLLMContext: LLMContext = {
    device: 'desktop',
    browser: 'chrome',
    os: 'macos'
  };

  const createMockMessages = (count: number): ChatMessage[] => {
    return Array.from({ length: count }, (_, i) => ({
      id: `msg-${i + 1}`,
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `Message ${i + 1}`,
      timestamp: new Date(Date.now() + i * 1000).toISOString(),
      sequence_number: i + 1
    }));
  };

  beforeEach(() => {
    // Réinitialiser l'instance pour chaque test
    service = ChatMessageEditService.getInstance();
    
    // Reset mocks
    vi.clearAllMocks();
    
    // Mock tokenManager par défaut (succès)
    vi.mocked(tokenManager.getValidToken).mockResolvedValue({
      isValid: true,
      token: mockToken
    });
    
    // Mock fetch par défaut (succès)
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: { deletedCount: 3 }
      })
    } as Response);
  });

  describe('getInstance', () => {
    it('devrait retourner une instance singleton', () => {
      const instance1 = ChatMessageEditService.getInstance();
      const instance2 = ChatMessageEditService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('edit', () => {
    it('devrait trouver message par ID exact', async () => {
      const messages = createMockMessages(5);
      const targetMessage = messages[2]; // sequence_number = 3

      const result = await service.edit({
        messageId: targetMessage.id!,
        newContent: 'Edited content',
        sessionId: mockSessionId,
        currentSession: mockSession,
        infiniteMessages: messages,
        selectedAgent: mockAgent,
        llmContext: mockLLMContext
      });

      expect(result.success).toBe(true);
      expect(result.deletedCount).toBe(3); // Message 3 + 4 + 5
      expect(result.token).toBe(mockToken);
      expect(result.editedSequence).toBe(3);
    });

    it('devrait trouver message par timestamp fallback', async () => {
      const timestamp = Date.now();
      const messages: ChatMessage[] = [
        {
          id: `msg-${timestamp}-abc`,
          role: 'user',
          content: 'Test message',
          timestamp: new Date(timestamp).toISOString(),
          sequence_number: 1
        }
      ];

      const result = await service.edit({
        messageId: `msg-${timestamp}-xyz`, // ID différent mais même timestamp
        newContent: 'Edited content',
        sessionId: mockSessionId,
        currentSession: mockSession,
        infiniteMessages: messages,
        selectedAgent: mockAgent,
        llmContext: mockLLMContext
      });

      expect(result.success).toBe(true);
    });

    it('devrait utiliser messageIndex si fourni', async () => {
      const messages = createMockMessages(5);
      const targetIndex = 2;

      const result = await service.edit({
        messageId: messages[targetIndex].id!,
        newContent: 'Edited content',
        sessionId: mockSessionId,
        currentSession: mockSession,
        infiniteMessages: messages,
        selectedAgent: mockAgent,
        llmContext: mockLLMContext,
        messageIndex: targetIndex
      });

      expect(result.success).toBe(true);
      expect(result.editedSequence).toBe(3);
    });

    it('devrait supprimer message édité et tous ceux après', async () => {
      const messages = createMockMessages(10);
      const targetMessage = messages[4]; // sequence_number = 5

      const result = await service.edit({
        messageId: targetMessage.id!,
        newContent: 'Edited content',
        sessionId: mockSessionId,
        currentSession: mockSession,
        infiniteMessages: messages,
        selectedAgent: mockAgent,
        llmContext: mockLLMContext
      });

      expect(result.success).toBe(true);
      // Devrait supprimer messages 5, 6, 7, 8, 9, 10 = 6 messages
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/messages/delete-after'),
        expect.objectContaining({
          method: 'DELETE',
          body: JSON.stringify({ afterSequence: 4 }) // sequence - 1
        })
      );
    });

    it('devrait gérer message non trouvé', async () => {
      const messages = createMockMessages(5);

      const result = await service.edit({
        messageId: 'non-existent-id',
        newContent: 'Edited content',
        sessionId: mockSessionId,
        currentSession: mockSession,
        infiniteMessages: messages,
        selectedAgent: mockAgent,
        llmContext: mockLLMContext
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('non trouvé');
    });

    it('devrait gérer message sans sequence_number', async () => {
      const messages: ChatMessage[] = [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Test',
          timestamp: new Date().toISOString()
          // Pas de sequence_number
        }
      ];

      const result = await service.edit({
        messageId: 'msg-1',
        newContent: 'Edited content',
        sessionId: mockSessionId,
        currentSession: mockSession,
        infiniteMessages: messages,
        selectedAgent: mockAgent,
        llmContext: mockLLMContext
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('sequence_number');
    });

    it('devrait gérer erreur token auth', async () => {
      vi.mocked(tokenManager.getValidToken).mockResolvedValue({
        isValid: false,
        token: null,
        error: 'Token expired'
      });

      const messages = createMockMessages(5);

      const result = await service.edit({
        messageId: messages[2].id!,
        newContent: 'Edited content',
        sessionId: mockSessionId,
        currentSession: mockSession,
        infiniteMessages: messages,
        selectedAgent: mockAgent,
        llmContext: mockLLMContext
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Token');
    });

    it('devrait gérer erreur delete API', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({
          error: 'Internal server error'
        })
      } as Response);

      const messages = createMockMessages(5);

      const result = await service.edit({
        messageId: messages[2].id!,
        newContent: 'Edited content',
        sessionId: mockSessionId,
        currentSession: mockSession,
        infiniteMessages: messages,
        selectedAgent: mockAgent,
        llmContext: mockLLMContext
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('devrait gérer erreur réseau', async () => {
      vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'));

      const messages = createMockMessages(5);

      const result = await service.edit({
        messageId: messages[2].id!,
        newContent: 'Edited content',
        sessionId: mockSessionId,
        currentSession: mockSession,
        infiniteMessages: messages,
        selectedAgent: mockAgent,
        llmContext: mockLLMContext
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });
  });

  describe('canEdit', () => {
    it('devrait accepter message user avec ID et sequence_number', () => {
      const message: ChatMessage = {
        id: 'msg-1',
        role: 'user',
        content: 'Test',
        timestamp: new Date().toISOString(),
        sequence_number: 1
      };

      expect(service.canEdit(message)).toBe(true);
    });

    it('devrait rejeter message sans ID', () => {
      const message: ChatMessage = {
        role: 'user',
        content: 'Test',
        timestamp: new Date().toISOString(),
        sequence_number: 1
      };

      expect(service.canEdit(message)).toBe(false);
    });

    it('devrait rejeter message sans sequence_number', () => {
      const message: ChatMessage = {
        id: 'msg-1',
        role: 'user',
        content: 'Test',
        timestamp: new Date().toISOString()
      };

      expect(service.canEdit(message)).toBe(false);
    });

    it('devrait rejeter message assistant', () => {
      const message: ChatMessage = {
        id: 'msg-1',
        role: 'assistant',
        content: 'Test',
        timestamp: new Date().toISOString(),
        sequence_number: 1
      };

      expect(service.canEdit(message)).toBe(false);
    });
  });
});

