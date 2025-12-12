/**
 * Tests unitaires pour useChatSend
 * Focus: déduplication envois simultanés
 * @module hooks/__tests__/useChatSend
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useChatSend } from '../useChatSend';
import type { SelectedNote, NoteWithContent } from '../useNotesLoader';
import type { ImageAttachment } from '@/types/image';

describe('useChatSend', () => {
  // Mocks
  const mockLoadNotes = vi.fn();
  const mockGetAccessToken = vi.fn();
  const mockOnSend = vi.fn();
  const mockSetUploadError = vi.fn();

  const emptyMentions: [] = [];
  const emptyPrompts: [] = [];

  const defaultProps = {
    loadNotes: mockLoadNotes,
    getAccessToken: mockGetAccessToken,
    onSend: mockOnSend,
    setUploadError: mockSetUploadError,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAccessToken.mockResolvedValue('mock-token');
    mockLoadNotes.mockResolvedValue({
      notes: [],
      stats: { requested: 0, loaded: 0, failed: 0, timedOut: false }
    });
  });

  describe('Déduplication', () => {
    it('should deduplicate identical simultaneous sends', async () => {
      const { result } = renderHook(() => useChatSend(defaultProps));

      const message = 'Test message';
      const images: ImageAttachment[] = [];
      const notes: SelectedNote[] = [];

      // Envoyer 3 fois simultanément le même message
      const promise1 = result.current.send(message, images, notes, emptyMentions, emptyPrompts);
      const promise2 = result.current.send(message, images, notes, emptyMentions, emptyPrompts);
      const promise3 = result.current.send(message, images, notes, emptyMentions, emptyPrompts);

      await Promise.all([promise1, promise2, promise3]);

      // Vérifier qu'un seul appel onSend a été fait
      expect(mockOnSend).toHaveBeenCalledTimes(1);
      expect(mockOnSend).toHaveBeenCalledWith('Test message', [], undefined, undefined, undefined);
    });

    it('should NOT deduplicate different messages', async () => {
      const { result } = renderHook(() => useChatSend(defaultProps));

      const images: ImageAttachment[] = [];
      const notes: SelectedNote[] = [];

      // Envoyer 3 messages différents
      await result.current.send('Message 1', images, notes, emptyMentions, emptyPrompts);
      await result.current.send('Message 2', images, notes, emptyMentions, emptyPrompts);
      await result.current.send('Message 3', images, notes, emptyMentions, emptyPrompts);

      // Vérifier que 3 appels onSend ont été faits
      expect(mockOnSend).toHaveBeenCalledTimes(3);
    });

    it('should deduplicate by operation ID (message + images + notes)', async () => {
      const { result } = renderHook(() => useChatSend(defaultProps));

      const message = 'Test';
      const images: ImageAttachment[] = [{
        id: 'img-1',
        previewUrl: 'data:image/png;base64,test',
        base64: 'data:image/png;base64,test',
        detail: 'auto',
        fileName: 'test.png',
        mimeType: 'image/png',
        size: 1000,
        addedAt: Date.now(),
        file: new File([''], 'test.png', { type: 'image/png' })
      }];
      const notes: SelectedNote[] = [{ id: 'note-1', slug: 'test', title: 'Test' }];

      // Configuration mock pour loadNotes
      mockLoadNotes.mockResolvedValue({
        notes: [{ id: 'note-1', slug: 'test', title: 'Test', markdown_content: 'Content' }],
        stats: { requested: 1, loaded: 1, failed: 0, timedOut: false }
      });

      // Envoyer 2 fois avec mêmes images + notes
      const promise1 = result.current.send(message, images, notes, emptyMentions, emptyPrompts);
      const promise2 = result.current.send(message, images, notes, emptyMentions, emptyPrompts);

      await Promise.all([promise1, promise2]);

      // Vérifier déduplication
      expect(mockOnSend).toHaveBeenCalledTimes(1);
      expect(mockLoadNotes).toHaveBeenCalledTimes(1);
    });
  });

  describe('Chargement notes', () => {
    it('should load notes when selectedNotes provided', async () => {
      const { result } = renderHook(() => useChatSend(defaultProps));

      const notes: SelectedNote[] = [
        { id: 'note-1', slug: 'note-1', title: 'Note 1' },
        { id: 'note-2', slug: 'note-2', title: 'Note 2' }
      ];

      const mockNotesWithContent: NoteWithContent[] = [
        { id: 'note-1', slug: 'note-1', title: 'Note 1', markdown_content: 'Content 1' },
        { id: 'note-2', slug: 'note-2', title: 'Note 2', markdown_content: 'Content 2' }
      ];

      mockLoadNotes.mockResolvedValue({
        notes: mockNotesWithContent,
        stats: { requested: 2, loaded: 2, failed: 0, timedOut: false }
      });

      await result.current.send('Test message', [], notes, emptyMentions, emptyPrompts);

      // Vérifier que loadNotes a été appelé avec les bonnes options
      expect(mockLoadNotes).toHaveBeenCalledWith(notes, {
        token: 'mock-token',
        timeoutMs: 3000
      });

      // Vérifier que onSend a reçu les notes chargées
      expect(mockOnSend).toHaveBeenCalledWith(
        'Test message',
        [],
        mockNotesWithContent,
        undefined,
        undefined
      );
    });

    it('should handle note loading failure gracefully', async () => {
      const { result } = renderHook(() => useChatSend(defaultProps));

      const notes: SelectedNote[] = [{ id: 'note-1', slug: 'note-1', title: 'Note 1' }];

      mockLoadNotes.mockRejectedValue(new Error('Network error'));

      const success = await result.current.send('Test', [], notes, emptyMentions, emptyPrompts);

      expect(success).toBe(false);
      expect(mockSetUploadError).toHaveBeenCalledWith('Erreur lors de l\'envoi du message');
      expect(mockOnSend).not.toHaveBeenCalled();
    });

    it('should handle missing token', async () => {
      const { result } = renderHook(() => useChatSend(defaultProps));

      const notes: SelectedNote[] = [{ id: 'note-1', slug: 'note-1', title: 'Note 1' }];

      mockGetAccessToken.mockResolvedValue(null);

      const success = await result.current.send('Test', [], notes, emptyMentions, emptyPrompts);

      expect(success).toBe(false);
      expect(mockSetUploadError).toHaveBeenCalled();
      expect(mockLoadNotes).not.toHaveBeenCalled();
    });
  });

  describe('Construction message', () => {
    it('should build message content with images', async () => {
      const { result } = renderHook(() => useChatSend(defaultProps));

      const images: ImageAttachment[] = [{
        id: 'img-1',
        previewUrl: 'https://example.com/image.png',
        base64: 'data:image/png;base64,test',
        detail: 'auto',
        fileName: 'test.png',
        mimeType: 'image/png',
        size: 1000,
        addedAt: Date.now(),
        file: new File([''], 'test.png', { type: 'image/png' })
      }];

      await result.current.send('Test message', images, [], emptyMentions, emptyPrompts);

      expect(mockOnSend).toHaveBeenCalledTimes(1);
      
      const [messageContent] = mockOnSend.mock.calls[0];
      
      // buildMessageContent retourne un tableau de content parts
      expect(Array.isArray(messageContent)).toBe(true);
      expect(messageContent.length).toBeGreaterThan(0);
      
      // Vérifier qu'il y a du texte et des images
      const hasText = messageContent.some((part: any) => part.type === 'text');
      const hasImage = messageContent.some((part: any) => part.type === 'image_url');
      
      expect(hasText).toBe(true);
      expect(hasImage).toBe(true);
    });

    it('should send without images when empty', async () => {
      const { result } = renderHook(() => useChatSend(defaultProps));

      await result.current.send('Simple message', [], [], emptyMentions, emptyPrompts);

      expect(mockOnSend).toHaveBeenCalledWith('Simple message', [], undefined, undefined, undefined);
    });
  });

  describe('Return value', () => {
    it('should return true on success', async () => {
      const { result } = renderHook(() => useChatSend(defaultProps));

      const success = await result.current.send('Test', [], [], emptyMentions, emptyPrompts);

      expect(success).toBe(true);
    });

    it('should return false on error', async () => {
      const { result } = renderHook(() => useChatSend(defaultProps));

      mockOnSend.mockImplementation(() => {
        throw new Error('Send error');
      });

      const success = await result.current.send('Test', [], [], emptyMentions, emptyPrompts);

      expect(success).toBe(false);
      expect(mockSetUploadError).toHaveBeenCalled();
    });
  });
});

