/**
 * Tests unitaires pour les schémas de validation Zod
 * Vérifie la validation stricte des payloads API chat
 */

import { describe, it, expect } from 'vitest';
import {
  llmRequestSchema,
  llmStreamRequestSchema,
  type LLMRequest,
  type LLMStreamRequest
} from '../validation';

describe('validation schemas', () => {
  describe('llmRequestSchema', () => {
    it('devrait valider un payload correct', () => {
      const validPayload = {
        message: 'Hello',
        context: {
          sessionId: '123e4567-e89b-12d3-a456-426614174000'
        },
        history: [
          {
            role: 'user',
            content: 'Question',
            timestamp: '2025-01-01T00:00:00.000Z'
          }
        ]
      };

      const result = llmRequestSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('devrait rejeter un message vide', () => {
      const invalidPayload = {
        message: '',
        context: { sessionId: '123e4567-e89b-12d3-a456-426614174000' },
        history: []
      };

      const result = llmRequestSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });

    it('devrait rejeter si context manquant', () => {
      const invalidPayload = {
        message: 'Hello',
        history: []
      };

      const result = llmRequestSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });

    it('devrait rejeter si history manquant', () => {
      const invalidPayload = {
        message: 'Hello',
        context: { sessionId: '123e4567-e89b-12d3-a456-426614174000' }
      };

      const result = llmRequestSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });

    it('devrait valider avec provider optionnel', () => {
      const validPayload = {
        message: 'Hello',
        context: { sessionId: '123e4567-e89b-12d3-a456-426614174000' },
        history: [],
        provider: 'xai'
      };

      const result = llmRequestSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });
  });

  describe('llmStreamRequestSchema', () => {
    it('devrait valider un payload correct avec message', () => {
      const validPayload = {
        message: 'Hello',
        context: {
          sessionId: '123e4567-e89b-12d3-a456-426614174000',
          agentId: '123e4567-e89b-12d3-a456-426614174001'
        },
        history: []
      };

      const result = llmStreamRequestSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('devrait valider un message multi-modal', () => {
      const validPayload = {
        message: [
          { type: 'text', text: 'Décris cette image' },
          { 
            type: 'image_url', 
            image_url: { 
              url: 'data:image/png;base64,...',
              detail: 'high' as const
            }
          }
        ],
        context: { sessionId: '123e4567-e89b-12d3-a456-426614174000' },
        history: []
      };

      const result = llmStreamRequestSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('devrait valider skipAddingUserMessage = true sans message', () => {
      const validPayload = {
        context: { sessionId: '123e4567-e89b-12d3-a456-426614174000' },
        history: [],
        skipAddingUserMessage: true
      };

      const result = llmStreamRequestSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('devrait rejeter skipAddingUserMessage = false sans message', () => {
      const invalidPayload = {
        context: { sessionId: '123e4567-e89b-12d3-a456-426614174000' },
        history: [],
        skipAddingUserMessage: false
      };

      const result = llmStreamRequestSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('message');
      }
    });

    it('devrait valider avec notes attachées', () => {
      const validPayload = {
        message: 'Question',
        context: {
          sessionId: '123e4567-e89b-12d3-a456-426614174000',
          attachedNotes: [
            {
              id: '123e4567-e89b-12d3-a456-426614174002',
              slug: 'test-note',
              title: 'Test Note',
              markdown_content: '# Test'
            }
          ]
        },
        history: []
      };

      const result = llmStreamRequestSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('devrait valider avec mentions légères', () => {
      const validPayload = {
        message: 'Question',
        context: {
          sessionId: '123e4567-e89b-12d3-a456-426614174000',
          mentionedNotes: [
            {
              id: '123e4567-e89b-12d3-a456-426614174002',
              slug: 'test-mention',
              title: 'Test Mention',
              word_count: 100
            }
          ]
        },
        history: []
      };

      const result = llmStreamRequestSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('devrait valider avec prompts', () => {
      const validPayload = {
        message: 'Question',
        context: {
          sessionId: '123e4567-e89b-12d3-a456-426614174000',
          prompts: [
            {
              id: '123e4567-e89b-12d3-a456-426614174003',
              slug: 'test-prompt',
              name: 'Test Prompt',
              context: 'chat' as const
            }
          ]
        },
        history: []
      };

      const result = llmStreamRequestSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('devrait rejeter un UUID invalide pour note id', () => {
      const invalidPayload = {
        message: 'Question',
        context: {
          sessionId: '123e4567-e89b-12d3-a456-426614174000',
          attachedNotes: [
            {
              id: 'not-a-uuid',
              slug: 'test',
              title: 'Test',
              markdown_content: 'test'
            }
          ]
        },
        history: []
      };

      const result = llmStreamRequestSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });

    it('devrait rejeter un role invalide dans history', () => {
      const invalidPayload = {
        message: 'Hello',
        context: { sessionId: '123e4567-e89b-12d3-a456-426614174000' },
        history: [
          {
            role: 'invalid_role',
            content: 'test'
          }
        ]
      };

      const result = llmStreamRequestSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });

    it('devrait valider content null dans history', () => {
      const validPayload = {
        message: 'Hello',
        context: { sessionId: '123e4567-e89b-12d3-a456-426614174000' },
        history: [
          {
            role: 'assistant' as const,
            content: null
          }
        ]
      };

      const result = llmStreamRequestSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });
  });
});



















