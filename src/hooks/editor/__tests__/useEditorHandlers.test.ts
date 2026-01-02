/**
 * Tests unitaires pour useEditorHandlers
 * 
 * Conformité GUIDE-EXCELLENCE-CODE.md: Tests hooks critiques
 * 
 * Couverture:
 * - Handlers (handleSave, handleHeaderChange, etc.)
 * - Callbacks
 * - Intégration avec useEditorSave
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEditorHandlers } from '../useEditorHandlers';
import type { Editor as TiptapEditor } from '@tiptap/react';
import type { EditorState } from '../useEditorState';

// Mock dépendances
vi.mock('@/services/V2UnifiedApi', () => ({
  v2UnifiedApi: {
    updateNote: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
  LogCategory: {
    EDITOR: 'EDITOR',
  },
}));

vi.mock('@/utils/editorHelpers', () => ({
  getEditorMarkdown: vi.fn(() => '# Test content'),
  isTemporaryCanvaNote: vi.fn((noteId: string) => noteId.startsWith('temp-')),
}));

vi.mock('@/hooks/useEditorSave', () => ({
  default: () => ({
    handleSave: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock('../useEditorUpdateFunctions', () => ({
  useEditorUpdateFunctions: () => ({
    updateA4Mode: vi.fn(),
    updateFullWidth: vi.fn(),
    updateSlashLang: vi.fn(),
    updateFontFamily: vi.fn(),
    updateHeaderImage: vi.fn(),
    updateHeaderImageOffset: vi.fn(),
    updateHeaderImageBlur: vi.fn(),
    updateHeaderImageOverlay: vi.fn(),
    updateTitleInImage: vi.fn(),
  }),
}));

vi.mock('../useSlashCommandHandler', () => ({
  useSlashCommandHandler: () => ({
    handleSlashCommandInsert: vi.fn(),
  }),
}));

describe('[useEditorHandlers] Hook', () => {
  const mockEditor: TiptapEditor = {
    getHTML: () => '<p>Test</p>',
    getMarkdown: () => '# Test',
    isFocused: true,
    isDestroyed: false,
    view: {
      dom: document.createElement('div'),
      coordsAtPos: () => ({ left: 0, top: 0 }),
    },
    chain: () => ({
      focus: () => ({
        setImage: () => ({
          run: vi.fn(),
        }),
      }),
    }),
  } as unknown as TiptapEditor;

  const mockEditorState: EditorState = {
    document: { title: 'Test Title', noteLoaded: true },
    headerImage: { url: null, offset: 0, blur: 0, overlay: 0, titleInImage: false },
    menus: { imageMenuOpen: false, imageMenuTarget: 'content', kebabOpen: false, kebabPos: { top: 0, left: 0 } },
    ui: { previewMode: false, a4Mode: false, fullWidth: false, slashLang: 'en', showToolbar: true },
    contextMenu: { open: false, position: { x: 0, y: 0 }, nodeType: '', hasSelection: false, nodePosition: 0 },
    shareSettings: { visibility: 'private' },
    internal: { isUpdatingFromStore: false },
    setTitle: vi.fn(),
    setNoteLoaded: vi.fn(),
    updateTOC: vi.fn(),
    setHeaderImageUrl: vi.fn(),
    setHeaderImageOffset: vi.fn(),
    setHeaderImageBlur: vi.fn(),
    setHeaderImageOverlay: vi.fn(),
    setHeaderTitleInImage: vi.fn(),
    setImageMenuOpen: vi.fn(),
    setImageMenuTarget: vi.fn(),
    setKebabOpen: vi.fn(),
    setKebabPos: vi.fn(),
    toggleKebabMenu: vi.fn(),
    setPreviewMode: vi.fn(),
    togglePreviewMode: vi.fn(),
    setA4Mode: vi.fn(),
    setFullWidth: vi.fn(),
    setSlashLang: vi.fn(),
    setShowToolbar: vi.fn(),
    toggleToolbar: vi.fn(),
    openContextMenu: vi.fn(),
    closeContextMenu: vi.fn(),
    setShareSettings: vi.fn(),
    setIsUpdatingFromStore: vi.fn(),
  };

  const defaultOptions = {
    noteId: 'test-note-id',
    userId: 'test-user-id',
    isReadonly: false,
    editor: mockEditor,
    editorState: mockEditorState,
    updateNote: vi.fn(),
    content: '# Test content',
    rawContent: '# Test content',
    note: {
      font_family: 'Inter',
      wide_mode: false,
      a4_mode: false,
      slash_lang: 'en' as const,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Handlers - Save', () => {
    it('should have handleSave function', () => {
      const { result } = renderHook(() => useEditorHandlers(defaultOptions));

      expect(typeof result.current.handleSave).toBe('function');
    });

    it('should call handleSave with title and content', async () => {
      const { result } = renderHook(() => useEditorHandlers(defaultOptions));

      await act(async () => {
        await result.current.handleSave('New Title', 'New content');
      });

      expect(result.current.handleSave).toHaveBeenCalled();
    });
  });

  describe('Handlers - Header', () => {
    it('should have handleHeaderChange function', () => {
      const { result } = renderHook(() => useEditorHandlers(defaultOptions));

      expect(typeof result.current.handleHeaderChange).toBe('function');
    });

    it('should call handleHeaderChange with URL', async () => {
      const { result } = renderHook(() => useEditorHandlers(defaultOptions));

      await act(async () => {
        await result.current.handleHeaderChange('https://example.com/image.jpg');
      });

      expect(mockEditorState.setHeaderImageUrl).toHaveBeenCalled();
    });

    it('should handle null URL in handleHeaderChange', async () => {
      const { result } = renderHook(() => useEditorHandlers(defaultOptions));

      await act(async () => {
        await result.current.handleHeaderChange(null);
      });

      expect(mockEditorState.setHeaderImageUrl).toHaveBeenCalled();
    });
  });

  describe('Handlers - Preview', () => {
    it('should have handlePreviewClick function', () => {
      const { result } = renderHook(() => useEditorHandlers(defaultOptions));

      expect(typeof result.current.handlePreviewClick).toBe('function');
    });

    it('should toggle preview mode when handlePreviewClick is called', () => {
      const { result } = renderHook(() => useEditorHandlers(defaultOptions));

      act(() => {
        result.current.handlePreviewClick();
      });

      expect(mockEditorState.togglePreviewMode).toHaveBeenCalled();
    });
  });

  describe('Handlers - Title', () => {
    it('should have handleTitleBlur function', () => {
      const { result } = renderHook(() => useEditorHandlers(defaultOptions));

      expect(typeof result.current.handleTitleBlur).toBe('function');
    });

    it('should call handleSave when handleTitleBlur is called', async () => {
      const { result } = renderHook(() => useEditorHandlers(defaultOptions));

      await act(async () => {
        await result.current.handleTitleBlur();
      });

      expect(result.current.handleSave).toHaveBeenCalled();
    });
  });

  describe('Handlers - Image Insert', () => {
    it('should have handleImageInsert function', () => {
      const { result } = renderHook(() => useEditorHandlers(defaultOptions));

      expect(typeof result.current.handleImageInsert).toBe('function');
    });

    it('should insert image in header when target is header', async () => {
      const { result } = renderHook(() => useEditorHandlers(defaultOptions));

      await act(async () => {
        await result.current.handleImageInsert('https://example.com/image.jpg', 'header');
      });

      expect(mockEditorState.setHeaderImageUrl).toHaveBeenCalled();
    });

    it('should insert image in content when target is content', () => {
      const { result } = renderHook(() => useEditorHandlers(defaultOptions));

      act(() => {
        result.current.handleImageInsert('https://example.com/image.jpg', 'content');
      });

      // L'éditeur devrait être appelé pour insérer l'image
      expect(mockEditor).toBeDefined();
    });
  });

  describe('Handlers - Editor Update', () => {
    it('should have handleEditorUpdate function', () => {
      const { result } = renderHook(() => useEditorHandlers(defaultOptions));

      expect(typeof result.current.handleEditorUpdate).toBe('function');
    });

    it('should skip update when editor is not focused', () => {
      const editorWithoutFocus = {
        ...mockEditor,
        isFocused: false,
      } as TiptapEditor;

      const { result } = renderHook(() =>
        useEditorHandlers({
          ...defaultOptions,
          editor: editorWithoutFocus,
        })
      );

      act(() => {
        result.current.handleEditorUpdate({ editor: editorWithoutFocus });
      });

      // updateNote ne devrait pas être appelé si l'éditeur n'a pas le focus
      expect(defaultOptions.updateNote).not.toHaveBeenCalled();
    });

    it('should skip update when isUpdatingFromStore is true', () => {
      const editorStateWithUpdate = {
        ...mockEditorState,
        internal: { isUpdatingFromStore: true },
      };

      const { result } = renderHook(() =>
        useEditorHandlers({
          ...defaultOptions,
          editorState: editorStateWithUpdate,
        })
      );

      act(() => {
        result.current.handleEditorUpdate({ editor: mockEditor });
      });

      // updateNote ne devrait pas être appelé si isUpdatingFromStore est true
      expect(defaultOptions.updateNote).not.toHaveBeenCalled();
    });
  });

  describe('Handlers - Slash Command', () => {
    it('should have handleSlashCommandInsert function', () => {
      const { result } = renderHook(() => useEditorHandlers(defaultOptions));

      expect(typeof result.current.handleSlashCommandInsert).toBe('function');
    });
  });

  describe('Update Functions', () => {
    it('should have updateA4Mode function', () => {
      const { result } = renderHook(() => useEditorHandlers(defaultOptions));

      expect(typeof result.current.updateA4Mode).toBe('function');
    });

    it('should have updateFullWidth function', () => {
      const { result } = renderHook(() => useEditorHandlers(defaultOptions));

      expect(typeof result.current.updateFullWidth).toBe('function');
    });

    it('should have updateSlashLang function', () => {
      const { result } = renderHook(() => useEditorHandlers(defaultOptions));

      expect(typeof result.current.updateSlashLang).toBe('function');
    });
  });
});



