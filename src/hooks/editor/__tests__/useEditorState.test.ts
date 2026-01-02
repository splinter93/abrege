/**
 * Tests unitaires pour useEditorState
 * 
 * Conformité GUIDE-EXCELLENCE-CODE.md: Tests hooks critiques
 * 
 * Couverture:
 * - État initial
 * - Actions (setTitle, setPreviewMode, etc.)
 * - Side effects
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEditorState } from '../useEditorState';
import type { ShareSettings } from '@/types/sharing';

// Mock hooks enfants
vi.mock('../useDocumentState', () => ({
  useDocumentState: (options: { initialTitle?: string }) => ({
    document: {
      title: options.initialTitle || '',
      noteLoaded: false,
    },
    setTitle: vi.fn((title: string) => {
      // Simuler la mise à jour
    }),
    setNoteLoaded: vi.fn((loaded: boolean) => {
      // Simuler la mise à jour
    }),
    updateTOC: vi.fn(),
  }),
}));

vi.mock('../useHeaderImageState', () => ({
  useHeaderImageState: (options: {
    initialHeaderImage?: string | null;
    initialHeaderOffset?: number;
    initialHeaderBlur?: number;
    initialHeaderOverlay?: number;
    initialTitleInImage?: boolean;
  }) => ({
    headerImage: {
      url: options.initialHeaderImage || null,
      offset: options.initialHeaderOffset || 0,
      blur: options.initialHeaderBlur || 0,
      overlay: options.initialHeaderOverlay || 0,
      titleInImage: options.initialTitleInImage || false,
    },
    setHeaderImageUrl: vi.fn(),
    setHeaderImageOffset: vi.fn(),
    setHeaderImageBlur: vi.fn(),
    setHeaderImageOverlay: vi.fn(),
    setHeaderTitleInImage: vi.fn(),
  }),
}));

vi.mock('../useMenusState', () => ({
  useMenusState: () => ({
    menus: {
      imageMenuOpen: false,
      imageMenuTarget: 'content' as const,
      kebabOpen: false,
      kebabPos: { top: 0, left: 0 },
    },
    contextMenu: {
      open: false,
      position: { x: 0, y: 0 },
      nodeType: '',
      hasSelection: false,
      nodePosition: 0,
    },
    setImageMenuOpen: vi.fn(),
    setImageMenuTarget: vi.fn(),
    setKebabOpen: vi.fn(),
    setKebabPos: vi.fn(),
    toggleKebabMenu: vi.fn(),
    openContextMenu: vi.fn(),
    closeContextMenu: vi.fn(),
  }),
}));

vi.mock('../useUIState', () => ({
  useUIState: (options: {
    initialA4Mode?: boolean;
    initialFullWidth?: boolean;
    initialSlashLang?: 'fr' | 'en';
    toolbarContext?: 'editor' | 'canvas';
    forceShowToolbar?: boolean;
  }) => ({
    ui: {
      previewMode: false,
      a4Mode: options.initialA4Mode || false,
      fullWidth: options.initialFullWidth || false,
      slashLang: options.initialSlashLang || 'en',
      showToolbar: options.forceShowToolbar || false,
    },
    setPreviewMode: vi.fn(),
    togglePreviewMode: vi.fn(),
    setA4Mode: vi.fn(),
    setFullWidth: vi.fn(),
    setSlashLang: vi.fn(),
    setShowToolbar: vi.fn(),
    toggleToolbar: vi.fn(),
  }),
}));

describe('[useEditorState] Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('État initial', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useEditorState());

      expect(result.current.document.title).toBe('');
      expect(result.current.document.noteLoaded).toBe(false);
      expect(result.current.headerImage.url).toBeNull();
      expect(result.current.menus.imageMenuOpen).toBe(false);
      expect(result.current.ui.previewMode).toBe(false);
      expect(result.current.internal.isUpdatingFromStore).toBe(false);
    });

    it('should initialize with provided initialTitle', () => {
      const { result } = renderHook(() =>
        useEditorState({ initialTitle: 'Test Title' })
      );

      expect(result.current.document.title).toBe('Test Title');
    });

    it('should initialize with provided initialHeaderImage', () => {
      const { result } = renderHook(() =>
        useEditorState({ initialHeaderImage: 'https://example.com/image.jpg' })
      );

      expect(result.current.headerImage.url).toBe('https://example.com/image.jpg');
    });

    it('should initialize with provided initialA4Mode', () => {
      const { result } = renderHook(() =>
        useEditorState({ initialA4Mode: true })
      );

      expect(result.current.ui.a4Mode).toBe(true);
    });

    it('should initialize with provided initialFullWidth', () => {
      const { result } = renderHook(() =>
        useEditorState({ initialFullWidth: true })
      );

      expect(result.current.ui.fullWidth).toBe(true);
    });

    it('should initialize with provided initialSlashLang', () => {
      const { result } = renderHook(() =>
        useEditorState({ initialSlashLang: 'fr' })
      );

      expect(result.current.ui.slashLang).toBe('fr');
    });

    it('should initialize with provided initialShareSettings', () => {
      const shareSettings: ShareSettings = {
        visibility: 'public',
        allowComments: true,
        allowEdit: false,
      };
      const { result } = renderHook(() =>
        useEditorState({ initialShareSettings: shareSettings })
      );

      expect(result.current.shareSettings).toEqual(shareSettings);
    });
  });

  describe('Actions - Document', () => {
    it('should have setTitle function', () => {
      const { result } = renderHook(() => useEditorState());

      expect(typeof result.current.setTitle).toBe('function');
    });

    it('should have setNoteLoaded function', () => {
      const { result } = renderHook(() => useEditorState());

      expect(typeof result.current.setNoteLoaded).toBe('function');
    });

    it('should have updateTOC function', () => {
      const { result } = renderHook(() => useEditorState());

      expect(typeof result.current.updateTOC).toBe('function');
    });
  });

  describe('Actions - Header Image', () => {
    it('should have setHeaderImageUrl function', () => {
      const { result } = renderHook(() => useEditorState());

      expect(typeof result.current.setHeaderImageUrl).toBe('function');
    });

    it('should have setHeaderImageOffset function', () => {
      const { result } = renderHook(() => useEditorState());

      expect(typeof result.current.setHeaderImageOffset).toBe('function');
    });

    it('should have setHeaderImageBlur function', () => {
      const { result } = renderHook(() => useEditorState());

      expect(typeof result.current.setHeaderImageBlur).toBe('function');
    });

    it('should have setHeaderImageOverlay function', () => {
      const { result } = renderHook(() => useEditorState());

      expect(typeof result.current.setHeaderImageOverlay).toBe('function');
    });

    it('should have setHeaderTitleInImage function', () => {
      const { result } = renderHook(() => useEditorState());

      expect(typeof result.current.setHeaderTitleInImage).toBe('function');
    });
  });

  describe('Actions - Menus', () => {
    it('should have setImageMenuOpen function', () => {
      const { result } = renderHook(() => useEditorState());

      expect(typeof result.current.setImageMenuOpen).toBe('function');
    });

    it('should have setKebabOpen function', () => {
      const { result } = renderHook(() => useEditorState());

      expect(typeof result.current.setKebabOpen).toBe('function');
    });

    it('should have toggleKebabMenu function', () => {
      const { result } = renderHook(() => useEditorState());

      expect(typeof result.current.toggleKebabMenu).toBe('function');
    });
  });

  describe('Actions - UI', () => {
    it('should have setPreviewMode function', () => {
      const { result } = renderHook(() => useEditorState());

      expect(typeof result.current.setPreviewMode).toBe('function');
    });

    it('should have togglePreviewMode function', () => {
      const { result } = renderHook(() => useEditorState());

      expect(typeof result.current.togglePreviewMode).toBe('function');
    });

    it('should have setA4Mode function', () => {
      const { result } = renderHook(() => useEditorState());

      expect(typeof result.current.setA4Mode).toBe('function');
    });

    it('should have setFullWidth function', () => {
      const { result } = renderHook(() => useEditorState());

      expect(typeof result.current.setFullWidth).toBe('function');
    });

    it('should have setSlashLang function', () => {
      const { result } = renderHook(() => useEditorState());

      expect(typeof result.current.setSlashLang).toBe('function');
    });
  });

  describe('Actions - Share Settings', () => {
    it('should have setShareSettings function', () => {
      const { result } = renderHook(() => useEditorState());

      expect(typeof result.current.setShareSettings).toBe('function');
    });

    it('should update shareSettings when setShareSettings is called', () => {
      const { result } = renderHook(() => useEditorState());

      const newSettings: ShareSettings = {
        visibility: 'public',
        allowComments: true,
        allowEdit: true,
      };

      act(() => {
        result.current.setShareSettings(newSettings);
      });

      expect(result.current.shareSettings).toEqual(newSettings);
    });
  });

  describe('Actions - Internal', () => {
    it('should have setIsUpdatingFromStore function', () => {
      const { result } = renderHook(() => useEditorState());

      expect(typeof result.current.setIsUpdatingFromStore).toBe('function');
    });

    it('should update isUpdatingFromStore when setIsUpdatingFromStore is called', () => {
      const { result } = renderHook(() => useEditorState());

      act(() => {
        result.current.setIsUpdatingFromStore(true);
      });

      expect(result.current.internal.isUpdatingFromStore).toBe(true);
    });
  });
});



