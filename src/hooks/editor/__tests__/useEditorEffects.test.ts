/**
 * Tests unitaires pour useEditorEffects
 * 
 * Conformité GUIDE-EXCELLENCE-CODE.md: Tests hooks critiques
 * 
 * Couverture:
 * - Side effects (save, sync)
 * - Intégration avec useEditorSyncEffects et useEditorSaveEffects
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useEditorEffects } from '../useEditorEffects';
import type { Editor as TiptapEditor } from '@tiptap/react';
import type { EditorState } from '../useEditorState';
import type { UseEditorHandlersReturn } from '../useEditorHandlers';

// Mock hooks enfants
vi.mock('../useEditorSyncEffects', () => ({
  useEditorSyncEffects: vi.fn(),
}));

vi.mock('../useEditorSaveEffects', () => ({
  useEditorSaveEffects: vi.fn(),
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

vi.mock('@/utils/fileUpload', () => ({
  uploadImageForNote: vi.fn().mockResolvedValue({ publicUrl: 'https://example.com/image.jpg' }),
}));

describe('[useEditorEffects] Hook', () => {
  const mockEditor: TiptapEditor = {
    getHTML: () => '<p>Test</p>',
    getMarkdown: () => '# Test',
    isFocused: true,
    isDestroyed: false,
    view: {
      dom: document.createElement('div'),
      coordsAtPos: () => ({ left: 0, top: 0 }),
    },
    on: vi.fn(),
    off: vi.fn(),
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

  const mockHandlers: UseEditorHandlersReturn = {
    handleHeaderChange: vi.fn(),
    handlePreviewClick: vi.fn(),
    handleTitleBlur: vi.fn(),
    handleTranscriptionComplete: vi.fn(),
    handleEditorUpdate: vi.fn(),
    handleSave: vi.fn(),
    handleSlashCommandInsert: vi.fn(),
    handleImageInsert: vi.fn(),
    updateA4Mode: vi.fn(),
    updateFullWidth: vi.fn(),
    updateSlashLang: vi.fn(),
    updateFontFamily: vi.fn(),
    updateHeaderImage: vi.fn(),
    updateHeaderImageOffset: vi.fn(),
    updateHeaderImageBlur: vi.fn(),
    updateHeaderImageOverlay: vi.fn(),
    updateTitleInImage: vi.fn(),
  };

  const defaultOptions = {
    editor: mockEditor,
    note: {
      source_title: 'Test Note',
      header_image: null,
      header_image_offset: 0,
      header_image_blur: 0,
      header_image_overlay: 0,
      header_title_in_image: false,
      wide_mode: false,
    },
    noteId: 'test-note-id',
    content: '# Test content',
    isReadonly: false,
    editorState: mockEditorState,
    kebabBtnRef: { current: null },
    slashMenuRef: { current: null },
    handlers: mockHandlers,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialisation', () => {
    it('should call useEditorSyncEffects on mount', () => {
      const { useEditorSyncEffects } = require('../useEditorSyncEffects');
      
      renderHook(() => useEditorEffects(defaultOptions));

      expect(useEditorSyncEffects).toHaveBeenCalledWith({
        editor: defaultOptions.editor,
        note: defaultOptions.note,
        noteId: defaultOptions.noteId,
        content: defaultOptions.content,
        editorState: defaultOptions.editorState,
      });
    });

    it('should call useEditorSaveEffects on mount', () => {
      const { useEditorSaveEffects } = require('../useEditorSaveEffects');
      
      renderHook(() => useEditorEffects(defaultOptions));

      expect(useEditorSaveEffects).toHaveBeenCalledWith({
        editorState: defaultOptions.editorState,
        content: defaultOptions.content,
        handlers: defaultOptions.handlers,
      });
    });
  });

  describe('Side effects', () => {
    it('should setup event listeners on mount', () => {
      renderHook(() => useEditorEffects(defaultOptions));

      // L'éditeur devrait avoir des event listeners attachés
      expect(mockEditor.on).toHaveBeenCalled();
    });

    it('should cleanup event listeners on unmount', () => {
      const { unmount } = renderHook(() => useEditorEffects(defaultOptions));

      unmount();

      // L'éditeur devrait avoir ses event listeners détachés
      expect(mockEditor.off).toHaveBeenCalled();
    });
  });

  describe('Props', () => {
    it('should handle null editor', () => {
      renderHook(() =>
        useEditorEffects({
          ...defaultOptions,
          editor: null,
        })
      );

      // Ne devrait pas throw d'erreur
      expect(true).toBe(true);
    });

    it('should handle readonly mode', () => {
      renderHook(() =>
        useEditorEffects({
          ...defaultOptions,
          isReadonly: true,
        })
      );

      // Ne devrait pas throw d'erreur
      expect(true).toBe(true);
    });

    it('should handle null note', () => {
      renderHook(() =>
        useEditorEffects({
          ...defaultOptions,
          note: null,
        })
      );

      // Ne devrait pas throw d'erreur
      expect(true).toBe(true);
    });
  });
});



