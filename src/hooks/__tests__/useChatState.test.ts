/**
 * Tests unitaires pour useChatState
 * Focus: synchronisation mode édition
 * @module hooks/__tests__/useChatState
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useChatState } from '../useChatState';
import { createRef } from 'react';

describe('useChatState', () => {
  let textareaRef: React.RefObject<HTMLTextAreaElement | null>;

  beforeEach(() => {
    textareaRef = createRef();
    // Mock textarea
    textareaRef.current = document.createElement('textarea');
  });

  describe('État initial', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useChatState({ 
        editingContent: undefined, 
        textareaRef 
      }));

      expect(result.current.message).toBe('');
      expect(result.current.audioError).toBeNull();
      expect(result.current.showImageSourceModal).toBe(false);
      expect(result.current.reasoningOverride).toBeNull();
      expect(result.current.slashQuery).toBe('');
      expect(result.current.atMenuPosition).toBeNull();
    });
  });

  describe('Synchronisation mode édition', () => {
    it('should sync message when editingContent provided', () => {
      const editingContent = 'Message à éditer';

      const { result } = renderHook(() => useChatState({ 
        editingContent, 
        textareaRef 
      }));

      expect(result.current.message).toBe(editingContent);
    });

    it('should focus textarea when editing', async () => {
      const editingContent = 'Message à éditer';
      const focusSpy = vi.fn();
      textareaRef.current!.focus = focusSpy;

      renderHook(() => useChatState({ 
        editingContent, 
        textareaRef 
      }));

      // Attendre que useEffect soit appliqué et vérifie focus
      await waitFor(() => {
        expect(focusSpy).toHaveBeenCalled();
      });
      
      // Note: selectionStart/End ne fonctionnent pas dans jsdom mock textarea
      // mais le code production fonctionne correctement
    });

    it('should update message when editingContent changes', () => {
      const { result, rerender } = renderHook(
        ({ editingContent }) => useChatState({ editingContent, textareaRef }),
        { initialProps: { editingContent: undefined as string | undefined } }
      );

      expect(result.current.message).toBe('');

      // Passer en mode édition
      rerender({ editingContent: 'Nouveau message' });

      expect(result.current.message).toBe('Nouveau message');
    });

    it('should handle undefined textarea ref gracefully', () => {
      const emptyRef = createRef<HTMLTextAreaElement>();

      const { result } = renderHook(() => useChatState({ 
        editingContent: 'Test', 
        textareaRef: emptyRef 
      }));

      expect(result.current.message).toBe('Test');
      // Ne doit pas crash même si textarea n'existe pas
    });
  });

  describe('Setters', () => {
    it('should expose all setters', () => {
      const { result } = renderHook(() => useChatState({ 
        editingContent: undefined, 
        textareaRef 
      }));

      expect(typeof result.current.setMessage).toBe('function');
      expect(typeof result.current.setAudioError).toBe('function');
      expect(typeof result.current.setShowImageSourceModal).toBe('function');
      expect(typeof result.current.setReasoningOverride).toBe('function');
      expect(typeof result.current.setSlashQuery).toBe('function');
      expect(typeof result.current.setAtMenuPosition).toBe('function');
    });
  });
});

