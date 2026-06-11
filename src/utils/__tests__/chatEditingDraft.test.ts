import { describe, it, expect } from 'vitest';
import type { ChatMessage } from '@/types/chat';
import { extractEditingDraftFromMessage } from '../chatEditingDraft';

describe('extractEditingDraftFromMessage', () => {
  it('extrait texte et pièces jointes d’un message user', () => {
    const message: ChatMessage = {
      id: 'msg-1',
      role: 'user',
      content: 'Regarde cette note @foo',
      attachedImages: [{ url: 'https://cdn.example.com/img.jpg', fileName: 'photo.jpg' }],
      attachedNotes: [{ id: 'n1', slug: 'foo', title: 'Ma note', word_count: 42 }],
      mentions: [{ id: 'n2', slug: 'bar', title: 'Autre note' }],
      prompts: [{ id: 'p1', slug: 'summarize', name: 'Résumer' }],
      canvasSelections: [{ id: 'c1', text: 'extrait', noteId: 'n3', noteTitle: 'Canvas', timestamp: '2026-01-01T00:00:00.000Z' }],
    };

    const draft = extractEditingDraftFromMessage(message, 'msg-1');

    expect(draft).toEqual({
      messageId: 'msg-1',
      content: 'Regarde cette note @foo',
      attachedImages: [{ url: 'https://cdn.example.com/img.jpg', fileName: 'photo.jpg' }],
      attachedNotes: [{ id: 'n1', slug: 'foo', title: 'Ma note', word_count: 42 }],
      mentions: [{ id: 'n2', slug: 'bar', title: 'Autre note' }],
      prompts: [{ id: 'p1', slug: 'summarize', name: 'Résumer' }],
      canvasSelections: [{ id: 'c1', text: 'extrait', noteId: 'n3', noteTitle: 'Canvas', timestamp: '2026-01-01T00:00:00.000Z' }],
    });
  });

  it('retourne null pour un message assistant', () => {
    const message: ChatMessage = {
      id: 'a1',
      role: 'assistant',
      content: 'Réponse',
    };

    expect(extractEditingDraftFromMessage(message, 'a1')).toBeNull();
  });
});
