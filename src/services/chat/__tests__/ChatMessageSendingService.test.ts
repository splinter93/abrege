/**
 * Tests unitaires pour ChatMessageSendingService
 * 
 * Couvre:
 * - Validation message (texte/images)
 * - Construction historique limité
 * - Gestion token auth (succès/erreur)
 * - Construction contexte (succès/erreur)
 * - Gestion erreurs (try/catch, fallback)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChatMessageSendingService, ValidationError, AuthError } from '../ChatMessageSendingService';
import type { ChatMessage, ChatSession, Agent } from '@/types/chat';
import type { MessageContent, ImageAttachment } from '@/types/image';
import type { LLMContext } from '@/types/llmContext';

// Mock tokenManager
vi.mock('@/utils/tokenManager', () => ({
  tokenManager: {
    getValidToken: vi.fn()
  }
}));

// Mock chatContextBuilder
vi.mock('../ChatContextBuilder', () => ({
  chatContextBuilder: {
    build: vi.fn()
  }
}));

import { tokenManager } from '@/utils/tokenManager';
import { chatContextBuilder } from '../ChatContextBuilder';

describe('[ChatMessageSendingService]', () => {
  let service: ChatMessageSendingService;
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

  const mockMessages: ChatMessage[] = [
    {
      id: 'msg-1',
      role: 'user',
      content: 'Hello',
      timestamp: new Date().toISOString(),
      sequence_number: 1
    },
    {
      id: 'msg-2',
      role: 'assistant',
      content: 'Hi there!',
      timestamp: new Date().toISOString(),
      sequence_number: 2
    }
  ];

  beforeEach(() => {
    // Réinitialiser l'instance pour chaque test
    service = ChatMessageSendingService.getInstance();
    
    // Reset mocks
    vi.clearAllMocks();
    
    // Mock tokenManager par défaut (succès)
    vi.mocked(tokenManager.getValidToken).mockResolvedValue({
      isValid: true,
      token: mockToken
    });
    
    // Mock chatContextBuilder par défaut (succès)
    vi.mocked(chatContextBuilder.build).mockReturnValue({
      type: 'chat',
      sessionId: mockSessionId,
      agentId: mockAgent.id
    });
  });

  describe('getInstance', () => {
    it('devrait retourner une instance singleton', () => {
      const instance1 = ChatMessageSendingService.getInstance();
      const instance2 = ChatMessageSendingService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('prepare', () => {
    it('devrait valider message avec texte', async () => {
      const result = await service.prepare({
        message: 'Hello world',
        sessionId: mockSessionId,
        currentSession: mockSession,
        selectedAgent: mockAgent,
        infiniteMessages: mockMessages,
        llmContext: mockLLMContext
      });

      expect(result.success).toBe(true);
      expect(result.tempMessage).toBeDefined();
      expect(result.tempMessage?.role).toBe('user');
      expect(result.tempMessage?.content).toBe('Hello world');
      expect(result.token).toBe(mockToken);
    });

    it('devrait valider message avec images', async () => {
      const images: ImageAttachment[] = [
        {
          base64: 'data:image/png;base64,iVBORw0KGgoAAAANS',
          fileName: 'test.png',
          mimeType: 'image/png'
        }
      ];

      const result = await service.prepare({
        message: '',
        images,
        sessionId: mockSessionId,
        currentSession: mockSession,
        selectedAgent: mockAgent,
        infiniteMessages: mockMessages,
        llmContext: mockLLMContext
      });

      expect(result.success).toBe(true);
      expect(result.tempMessage).toBeDefined();
      expect(result.tempMessage?.attachedImages).toBeDefined();
      expect(result.tempMessage?.attachedImages?.length).toBe(1);
    });

    it('devrait rejeter message vide sans images', async () => {
      const result = await service.prepare({
        message: '',
        sessionId: mockSessionId,
        currentSession: mockSession,
        selectedAgent: mockAgent,
        infiniteMessages: mockMessages,
        llmContext: mockLLMContext
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('invalide');
    });

    it('devrait rejeter message avec seulement espaces', async () => {
      const result = await service.prepare({
        message: '   ',
        sessionId: mockSessionId,
        currentSession: mockSession,
        selectedAgent: mockAgent,
        infiniteMessages: mockMessages,
        llmContext: mockLLMContext
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('invalide');
    });

    it('devrait construire historique limité', async () => {
      // Créer 100 messages pour tester la limitation
      const manyMessages: ChatMessage[] = Array.from({ length: 100 }, (_, i) => ({
        id: `msg-${i}`,
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}`,
        timestamp: new Date().toISOString(),
        sequence_number: i + 1
      }));

      const result = await service.prepare({
        message: 'Test',
        sessionId: mockSessionId,
        currentSession: mockSession,
        selectedAgent: mockAgent,
        infiniteMessages: manyMessages,
        llmContext: mockLLMContext,
        maxHistoryForLLM: 50
      });

      expect(result.success).toBe(true);
      expect(result.limitedHistory).toBeDefined();
      expect(result.limitedHistory?.length).toBe(50);
      // Devrait prendre les 50 derniers
      expect(result.limitedHistory?.[0].id).toBe('msg-50');
      expect(result.limitedHistory?.[49].id).toBe('msg-99');
    });

    it('devrait gérer erreur token auth', async () => {
      vi.mocked(tokenManager.getValidToken).mockResolvedValue({
        isValid: false,
        token: null,
        error: 'Token expired'
      });

      const result = await service.prepare({
        message: 'Hello',
        sessionId: mockSessionId,
        currentSession: mockSession,
        selectedAgent: mockAgent,
        infiniteMessages: mockMessages,
        llmContext: mockLLMContext
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Token');
    });

    it('devrait gérer erreur construction contexte', async () => {
      vi.mocked(chatContextBuilder.build).mockImplementation(() => {
        throw new Error('Context build failed');
      });

      const result = await service.prepare({
        message: 'Hello',
        sessionId: mockSessionId,
        currentSession: mockSession,
        selectedAgent: mockAgent,
        infiniteMessages: mockMessages,
        llmContext: mockLLMContext
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Context build failed');
    });

    it('devrait construire message temporaire avec notes', async () => {
      const notes = [
        {
          id: 'note-1',
          slug: 'test-note',
          title: 'Test Note',
          markdown_content: 'Test content'
        }
      ];

      const result = await service.prepare({
        message: 'Hello',
        notes,
        sessionId: mockSessionId,
        currentSession: mockSession,
        selectedAgent: mockAgent,
        infiniteMessages: mockMessages,
        llmContext: mockLLMContext
      });

      expect(result.success).toBe(true);
      expect(result.tempMessage?.attachedNotes).toBeDefined();
      expect(result.tempMessage?.attachedNotes?.length).toBe(1);
      expect(result.tempMessage?.attachedNotes?.[0].id).toBe('note-1');
    });

    it('devrait gérer MessageContent (array multi-modal)', async () => {
      const messageContent: MessageContent = [
        { type: 'text', text: 'Hello' },
        { type: 'image_url', image_url: { url: 'data:image/png;base64,test' } }
      ];

      const result = await service.prepare({
        message: messageContent,
        sessionId: mockSessionId,
        currentSession: mockSession,
        selectedAgent: mockAgent,
        infiniteMessages: mockMessages,
        llmContext: mockLLMContext
      });

      expect(result.success).toBe(true);
      expect(result.tempMessage?.content).toBe('Hello');
    });
  });

  describe('validateMessage', () => {
    it('devrait accepter message texte', () => {
      // Test via prepare (validateMessage est private)
      const result = service.prepare({
        message: 'Valid message',
        sessionId: mockSessionId,
        currentSession: mockSession,
        selectedAgent: mockAgent,
        infiniteMessages: mockMessages,
        llmContext: mockLLMContext
      });

      return expect(result).resolves.toMatchObject({ success: true });
    });

    it('devrait accepter message avec images', () => {
      const images: ImageAttachment[] = [
        {
          base64: 'data:image/png;base64,test',
          fileName: 'test.png',
          mimeType: 'image/png'
        }
      ];

      const result = service.prepare({
        message: '',
        images,
        sessionId: mockSessionId,
        currentSession: mockSession,
        selectedAgent: mockAgent,
        infiniteMessages: mockMessages,
        llmContext: mockLLMContext
      });

      return expect(result).resolves.toMatchObject({ success: true });
    });

    it('devrait rejeter message vide', () => {
      const result = service.prepare({
        message: '',
        sessionId: mockSessionId,
        currentSession: mockSession,
        selectedAgent: mockAgent,
        infiniteMessages: mockMessages,
        llmContext: mockLLMContext
      });

      return expect(result).resolves.toMatchObject({ success: false });
    });
  });

  describe('extractText', () => {
    it('devrait extraire texte de string', () => {
      const text = service.extractText('Hello world');
      expect(text).toBe('Hello world');
    });

    it('devrait extraire texte de MessageContent', () => {
      const messageContent: MessageContent = [
        { type: 'text', text: 'Hello' },
        { type: 'image_url', image_url: { url: 'test' } }
      ];
      const text = service.extractText(messageContent);
      expect(text).toBe('Hello');
    });

    it('devrait retourner string vide si pas de texte', () => {
      const messageContent: MessageContent = [
        { type: 'image_url', image_url: { url: 'test' } }
      ];
      const text = service.extractText(messageContent);
      expect(text).toBe('');
    });
  });

  describe('countImages', () => {
    it('devrait retourner 0 pour string', () => {
      const count = service.countImages('Hello');
      expect(count).toBe(0);
    });

    it('devrait compter images dans MessageContent', () => {
      const messageContent: MessageContent = [
        { type: 'text', text: 'Hello' },
        { type: 'image_url', image_url: { url: 'test1' } },
        { type: 'image_url', image_url: { url: 'test2' } }
      ];
      const count = service.countImages(messageContent);
      expect(count).toBe(2);
    });
  });
});

