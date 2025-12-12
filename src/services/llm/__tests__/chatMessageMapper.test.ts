/**
 * Tests unitaires pour chatMessageMapper
 * Vérifie la conversion type-safe frontend ↔ backend
 */

import { describe, it, expect } from 'vitest';
import { 
  frontendToBackend, 
  frontendHistoryToBackend,
  messageContentToString,
  isValidBackendMessage
} from '../chatMessageMapper';
import type { ChatMessage as FrontendChatMessage } from '@/types/chat';
import type { LLMChatMessage as BackendChatMessage } from '@/services/llm/types/agentTypes';

describe('chatMessageMapper', () => {
  describe('frontendToBackend', () => {
    it('devrait convertir un message user simple', () => {
      const frontendMsg: FrontendChatMessage = {
        id: 'test-1',
        role: 'user',
        content: 'Hello world',
        timestamp: '2025-01-01T00:00:00.000Z'
      };

      const result = frontendToBackend(frontendMsg);

      expect(result).toEqual({
        id: 'test-1',
        role: 'user',
        content: 'Hello world',
        timestamp: '2025-01-01T00:00:00.000Z'
      });
    });

    it('devrait extraire le texte d\'un message multi-modal', () => {
      const frontendMsg: FrontendChatMessage = {
        id: 'test-2',
        role: 'user',
        content: [
          { type: 'text', text: 'Décris cette image' },
          { type: 'image_url', image_url: { url: 'data:image/png;base64,...' } }
        ] as any, // Multi-modal content
        timestamp: '2025-01-01T00:00:00.000Z'
      };

      const result = frontendToBackend(frontendMsg);

      expect(result.content).toBe('Décris cette image');
      expect(result.role).toBe('user');
    });

    it('devrait gérer un message assistant avec tool_calls', () => {
      const frontendMsg: FrontendChatMessage = {
        id: 'test-3',
        role: 'assistant',
        content: 'Voici le résultat',
        tool_calls: [
          {
            id: 'call_1',
            type: 'function',
            function: {
              name: 'searchContent',
              arguments: '{"query":"test"}'
            }
          }
        ],
        timestamp: '2025-01-01T00:00:00.000Z'
      };

      const result = frontendToBackend(frontendMsg);

      expect(result.tool_calls).toHaveLength(1);
      expect(result.tool_calls?.[0].function.name).toBe('searchContent');
    });

    it('devrait gérer un message tool', () => {
      const frontendMsg: FrontendChatMessage = {
        id: 'test-4',
        role: 'tool',
        content: '{"result":"success"}',
        tool_call_id: 'call_1',
        name: 'searchContent',
        timestamp: '2025-01-01T00:00:00.000Z'
      };

      const result = frontendToBackend(frontendMsg);

      expect(result.role).toBe('tool');
      expect(result.tool_call_id).toBe('call_1');
      expect(result.name).toBe('searchContent');
    });

    it('devrait retirer les propriétés UI-only (attachedNotes, mentions)', () => {
      const frontendMsg: FrontendChatMessage = {
        id: 'test-5',
        role: 'user',
        content: 'Message avec notes',
        attachedNotes: [
          { id: 'note-1', slug: 'test', title: 'Test Note' }
        ],
        mentions: [
          { id: 'note-2', slug: 'mention', title: 'Mention' }
        ],
        timestamp: '2025-01-01T00:00:00.000Z'
      } as any;

      const result = frontendToBackend(frontendMsg);

      expect(result).not.toHaveProperty('attachedNotes');
      expect(result).not.toHaveProperty('mentions');
      expect(result.content).toBe('Message avec notes');
    });
  });

  describe('frontendHistoryToBackend', () => {
    it('devrait convertir un tableau de messages', () => {
      const history: FrontendChatMessage[] = [
        {
          id: '1',
          role: 'user',
          content: 'Question',
          timestamp: '2025-01-01T00:00:00.000Z'
        },
        {
          id: '2',
          role: 'assistant',
          content: 'Réponse',
          timestamp: '2025-01-01T00:01:00.000Z'
        }
      ];

      const result = frontendHistoryToBackend(history);

      expect(result).toHaveLength(2);
      expect(result[0].role).toBe('user');
      expect(result[1].role).toBe('assistant');
    });

    it('devrait gérer un tableau vide', () => {
      const result = frontendHistoryToBackend([]);
      expect(result).toEqual([]);
    });
  });

  describe('messageContentToString', () => {
    it('devrait retourner un string tel quel', () => {
      const result = messageContentToString('Hello');
      expect(result).toBe('Hello');
    });

    it('devrait extraire le texte d\'un array multi-modal', () => {
      const content = [
        { type: 'text' as const, text: 'Texte extrait' },
        { type: 'image_url' as const, image_url: { url: 'data:...' } }
      ];

      const result = messageContentToString(content);
      expect(result).toBe('Texte extrait');
    });

    it('devrait retourner string vide si pas de partie texte', () => {
      const content = [
        { type: 'image_url' as const, image_url: { url: 'data:...' } }
      ];

      const result = messageContentToString(content);
      expect(result).toBe('');
    });
  });

  describe('isValidBackendMessage', () => {
    it('devrait valider un message backend correct', () => {
      const msg: BackendChatMessage = {
        id: 'test',
        role: 'user',
        content: 'test',
        timestamp: '2025-01-01T00:00:00.000Z'
      };

      expect(isValidBackendMessage(msg)).toBe(true);
    });

    it('devrait rejeter un message sans id', () => {
      const msg = {
        role: 'user',
        content: 'test',
        timestamp: '2025-01-01T00:00:00.000Z'
      };

      expect(isValidBackendMessage(msg)).toBe(false);
    });

    it('devrait rejeter un message avec role invalide', () => {
      const msg = {
        id: 'test',
        role: 'invalid',
        content: 'test',
        timestamp: '2025-01-01T00:00:00.000Z'
      };

      expect(isValidBackendMessage(msg)).toBe(false);
    });

    it('devrait accepter content null', () => {
      const msg: BackendChatMessage = {
        id: 'test',
        role: 'assistant',
        content: null,
        timestamp: '2025-01-01T00:00:00.000Z'
      };

      expect(isValidBackendMessage(msg)).toBe(true);
    });

    it('devrait rejeter un non-objet', () => {
      expect(isValidBackendMessage(null)).toBe(false);
      expect(isValidBackendMessage('string')).toBe(false);
      expect(isValidBackendMessage(123)).toBe(false);
    });
  });
});

