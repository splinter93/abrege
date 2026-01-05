/**
 * Tests unitaires pour useChatActions
 * Focus: handlers (input, send, keydown, transcription)
 * @module hooks/__tests__/useChatActions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useChatActions } from '../useChatActions';
import { createRef } from 'react';

describe('useChatActions', () => {
  const mockDetectCommands = vi.fn();
  const mockSend = vi.fn();
  const mockSetMessage = vi.fn();
  const mockSetSelectedNotes = vi.fn();
  const mockSetAudioError = vi.fn();
  const mockClearImages = vi.fn();
  const mockSetMentions = vi.fn();
  const mockSetUsedPrompts = vi.fn();
  const mockSetCanvasSelections = vi.fn();

  const defaultProps = {
    message: '',
    images: [],
    selectedNotes: [],
    loading: false,
    disabled: false,
    textareaRef: createRef<HTMLTextAreaElement>(),
    setMessage: mockSetMessage,
    setSelectedNotes: mockSetSelectedNotes,
    setAudioError: mockSetAudioError,
    detectCommands: mockDetectCommands,
    send: mockSend,
    clearImages: mockClearImages,
    mentions: [],
    usedPrompts: [],
    canvasSelections: [],
    setMentions: mockSetMentions,
    setUsedPrompts: mockSetUsedPrompts,
    setCanvasSelections: mockSetCanvasSelections
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSend.mockResolvedValue(true);
  });

  describe('handleInputChange', () => {
    it('should update message and detect commands', () => {
      const { result } = renderHook(() => useChatActions(defaultProps));

      const mockEvent = {
        target: {
          value: '/test command',
          selectionStart: 13
        }
      } as React.ChangeEvent<HTMLTextAreaElement>;

      act(() => {
        result.current.handleInputChange(mockEvent);
      });

      expect(mockSetMessage).toHaveBeenCalledWith('/test command');
      expect(mockDetectCommands).toHaveBeenCalledWith('/test command', 13);
    });
  });

  describe('handleSend', () => {
    it('should send message with text', async () => {
      const props = {
        ...defaultProps,
        message: 'Hello world'
      };

      const { result } = renderHook(() => useChatActions(props));

      await act(async () => {
        await result.current.handleSend();
      });

      expect(mockSend).toHaveBeenCalledWith('Hello world', [], [], [], [], [], undefined);
    });

    it('should send message with images', async () => {
      const mockImages = [
        { id: 'img-1', previewUrl: 'test.png', base64: 'data:image/png;base64,test', detail: 'auto' as const, fileName: 'test.png', mimeType: 'image/png' as const, size: 100, addedAt: Date.now(), file: new File([''], 'test.png', { type: 'image/png' }) }
      ];

      const props = {
        ...defaultProps,
        message: 'Look at this',
        images: mockImages
      };

      const { result } = renderHook(() => useChatActions(props));

      await act(async () => {
        await result.current.handleSend();
      });

      expect(mockSend).toHaveBeenCalledWith('Look at this', mockImages, [], [], [], [], undefined);
    });

    it('should not send if message empty and no images', async () => {
      const props = {
        ...defaultProps,
        message: '   '  // Whitespace only
      };

      const { result } = renderHook(() => useChatActions(props));

      await act(async () => {
        await result.current.handleSend();
      });

      expect(mockSend).not.toHaveBeenCalled();
    });

    it('should not send if loading', async () => {
      const props = {
        ...defaultProps,
        message: 'Test',
        loading: true
      };

      const { result } = renderHook(() => useChatActions(props));

      await act(async () => {
        await result.current.handleSend();
      });

      expect(mockSend).not.toHaveBeenCalled();
    });

    it('should not send if disabled', async () => {
      const props = {
        ...defaultProps,
        message: 'Test',
        disabled: true
      };

      const { result } = renderHook(() => useChatActions(props));

      await act(async () => {
        await result.current.handleSend();
      });

      expect(mockSend).not.toHaveBeenCalled();
    });

    it('should clear message and notes after successful send', async () => {
      const props = {
        ...defaultProps,
        message: 'Test',
        selectedNotes: [{ id: 'note-1', slug: 'note-1', title: 'Note 1' }]
      };

      const { result } = renderHook(() => useChatActions(props));

      await act(async () => {
        await result.current.handleSend();
      });

      expect(mockSetMessage).toHaveBeenCalledWith('');
      expect(mockSetSelectedNotes).toHaveBeenCalledWith([]);
      expect(mockSetMentions).toHaveBeenCalledWith([]);
      expect(mockSetUsedPrompts).toHaveBeenCalledWith([]);
      expect(mockSetCanvasSelections).toHaveBeenCalledWith([]);
      expect(mockClearImages).toHaveBeenCalled();
    });

    it('should not clear if send fails', async () => {
      mockSend.mockResolvedValue(false);

      const props = {
        ...defaultProps,
        message: 'Test'
      };

      const { result } = renderHook(() => useChatActions(props));

      await act(async () => {
        await result.current.handleSend();
      });

      expect(mockSetMessage).not.toHaveBeenCalled();
      expect(mockClearImages).not.toHaveBeenCalled();
    });
  });

  describe('handleKeyDown', () => {
    it('should send on Enter without Shift', async () => {
      const { result } = renderHook(() => useChatActions({
        ...defaultProps,
        message: 'Test'
      }));

      const mockEvent = {
        key: 'Enter',
        shiftKey: false,
        preventDefault: vi.fn()
      } as unknown as React.KeyboardEvent<HTMLTextAreaElement>;

      await act(async () => {
        result.current.handleKeyDown(mockEvent);
      });

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      // Wait for async send
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(mockSend).toHaveBeenCalled();
    });

    it('should NOT send on Enter + Shift (new line)', () => {
      const { result } = renderHook(() => useChatActions({
        ...defaultProps,
        message: 'Test'
      }));

      const mockEvent = {
        key: 'Enter',
        shiftKey: true,
        preventDefault: vi.fn()
      } as unknown as React.KeyboardEvent<HTMLTextAreaElement>;

      act(() => {
        result.current.handleKeyDown(mockEvent);
      });

      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
      expect(mockSend).not.toHaveBeenCalled();
    });

    it('should ignore other keys', () => {
      const { result } = renderHook(() => useChatActions(defaultProps));

      const mockEvent = {
        key: 'a',
        shiftKey: false,
        preventDefault: vi.fn()
      } as unknown as React.KeyboardEvent<HTMLTextAreaElement>;

      act(() => {
        result.current.handleKeyDown(mockEvent);
      });

      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
      expect(mockSend).not.toHaveBeenCalled();
    });
  });

  describe('handleTranscriptionComplete', () => {
    it('should append text to message', () => {
      const props = {
        ...defaultProps,
        message: 'Hello'
      };

      const { result } = renderHook(() => useChatActions(props));

      act(() => {
        result.current.handleTranscriptionComplete('world');
      });

      // Devrait ajouter avec un espace
      expect(mockSetMessage).toHaveBeenCalled();
      const setMessageCall = mockSetMessage.mock.calls[0][0];
      expect(typeof setMessageCall).toBe('string');
      expect(setMessageCall).toContain('Hello');
      expect(setMessageCall).toContain('world');
    });

    it('should clear audio error', () => {
      const { result } = renderHook(() => useChatActions(defaultProps));

      act(() => {
        result.current.handleTranscriptionComplete('test');
      });

      expect(mockSetAudioError).toHaveBeenCalledWith(null);
    });
  });
});

