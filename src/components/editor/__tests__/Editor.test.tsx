/**
 * Tests unitaires pour Editor.tsx
 * 
 * Conformité GUIDE-EXCELLENCE-CODE.md: Tests composants critiques
 * 
 * Couverture:
 * - Rendu avec props valides
 * - Lifecycle (mount, unmount)
 * - Props readonly, canEdit, onClose
 * - Intégration hooks (useEditorState, useEditorHandlers)
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import Editor from '../Editor';

// Setup variables d'environnement
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// Mock hooks
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id' },
  }),
}));

vi.mock('@/hooks/editor/useEditorData', () => ({
  useEditorData: () => ({
    note: {
      id: 'test-note-id',
      source_title: 'Test Note',
      markdown_content: '# Test',
      html_content: '<h1>Test</h1>',
    },
    rawContent: '# Test',
    content: '# Test',
    html: '<h1>Test</h1>',
    updateNote: vi.fn(),
  }),
}));

vi.mock('@/hooks/editor/useEditorState', () => ({
  useEditorState: () => ({
    document: { title: 'Test Note', noteLoaded: true },
    headerImage: { url: null },
    menus: { imageMenuOpen: false, kebabOpen: false },
    ui: { previewMode: false, a4Mode: false, fullWidth: false, slashLang: 'en' },
    contextMenu: { open: false },
    shareSettings: { visibility: 'private' },
    internal: { isUpdatingFromStore: false },
    setTitle: vi.fn(),
    setNoteLoaded: vi.fn(),
    updateTOC: vi.fn(),
    setHeaderImageUrl: vi.fn(),
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
  }),
}));

vi.mock('@/hooks/editor/useEditorHandlers', () => ({
  useEditorHandlers: () => ({
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
  }),
}));

vi.mock('@/hooks/editor/useEditorEffects', () => ({
  useEditorEffects: vi.fn(),
}));

vi.mock('@/hooks/editor/useEditorHeadings', () => ({
  useEditorHeadings: () => ({
    headings: [],
    updateTOC: vi.fn(),
  }),
}));

vi.mock('@/hooks/editor/useEditorInitialization', () => ({
  useEditorInitialization: () => ({
    editor: null,
    slashMenuRef: { current: null },
    editorContainerRef: { current: null },
    kebabBtnRef: { current: null },
  }),
}));

vi.mock('@/hooks/useRealtime', () => ({
  useRealtime: () => ({
    isConnected: false,
    reconnect: vi.fn(),
  }),
}));

vi.mock('@/hooks/useEditorNavigation', () => ({
  useEditorNavigation: () => ({
    currentClasseurId: null,
    onNoteSelect: vi.fn(),
  }),
}));

// Mock composants enfants
vi.mock('../EditorLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="editor-layout">{children}</div>,
}));

vi.mock('../EditorMainContent', () => ({
  default: () => <div data-testid="editor-main-content">EditorMainContent</div>,
}));

vi.mock('../EditorHeaderSection', () => ({
  default: () => <div data-testid="editor-header-section">EditorHeaderSection</div>,
}));

vi.mock('../EditorSidebar', () => ({
  default: () => <div data-testid="editor-sidebar">EditorSidebar</div>,
}));

vi.mock('@/components/RealtimeStatus', () => ({
  default: () => <div data-testid="realtime-status">RealtimeStatus</div>,
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
  LogCategory: {
    EDITOR: 'EDITOR',
  },
}));

describe('[Editor] Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendu avec props valides', () => {
    it('should render with valid noteId', async () => {
      render(<Editor noteId="test-note-id" />);
      
      await waitFor(() => {
        expect(screen.getByTestId('editor-layout')).toBeInTheDocument();
      });
    });

    it('should render in readonly mode', async () => {
      render(<Editor noteId="test-note-id" readonly={true} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('editor-layout')).toBeInTheDocument();
      });
    });

    it('should render with canEdit false', async () => {
      render(<Editor noteId="test-note-id" canEdit={false} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('editor-layout')).toBeInTheDocument();
      });
    });

    it('should render with toolbar context', async () => {
      render(<Editor noteId="test-note-id" toolbarContext="canvas" />);
      
      await waitFor(() => {
        expect(screen.getByTestId('editor-layout')).toBeInTheDocument();
      });
    });
  });

  describe('Lifecycle', () => {
    it('should mount without errors', async () => {
      const { unmount } = render(<Editor noteId="test-note-id" />);
      
      await waitFor(() => {
        expect(screen.getByTestId('editor-layout')).toBeInTheDocument();
      });
      
      unmount();
    });

    it('should handle unmount gracefully', async () => {
      const { unmount } = render(<Editor noteId="test-note-id" />);
      
      await waitFor(() => {
        expect(screen.getByTestId('editor-layout')).toBeInTheDocument();
      });
      
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Props', () => {
    it('should accept onClose callback', async () => {
      const onClose = vi.fn();
      render(<Editor noteId="test-note-id" onClose={onClose} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('editor-layout')).toBeInTheDocument();
      });
    });

    it('should accept onEditorRef callback', async () => {
      const onEditorRef = vi.fn();
      render(<Editor noteId="test-note-id" onEditorRef={onEditorRef} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('editor-layout')).toBeInTheDocument();
      });
    });

    it('should accept onReady callback', async () => {
      const onReady = vi.fn();
      render(<Editor noteId="test-note-id" onReady={onReady} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('editor-layout')).toBeInTheDocument();
      });
    });

    it('should accept forceShowToolbar prop', async () => {
      render(<Editor noteId="test-note-id" forceShowToolbar={true} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('editor-layout')).toBeInTheDocument();
      });
    });
  });
});



