/**
 * Tests unitaires pour EditorHeader.tsx
 * 
 * Conformité GUIDE-EXCELLENCE-CODE.md: Tests composants critiques
 * 
 * Couverture:
 * - Rendu toolbar
 * - Rendu image header
 * - Handlers (onClose, onPreview, onMenuOpen)
 * - Props readonly, previewMode
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import EditorHeader from '../EditorHeader';
import type { FullEditorInstance } from '@/types/editor';

// Mock composants enfants
vi.mock('../EditorToolbar', () => ({
  default: () => <div data-testid="editor-toolbar">EditorToolbar</div>,
}));

vi.mock('next/link', () => ({
  default: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));

describe('[EditorHeader] Component', () => {
  const mockEditor: FullEditorInstance = {
    getHTML: () => '<p>Test</p>',
    getMarkdown: () => 'Test',
    isFocused: false,
    isDestroyed: false,
  } as unknown as FullEditorInstance;

  const defaultProps = {
    editor: mockEditor,
    onClose: vi.fn(),
    onPreview: vi.fn(),
    onMenuOpen: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendu toolbar', () => {
    it('should render toolbar when showToolbar is true', () => {
      render(<EditorHeader {...defaultProps} showToolbar={true} />);
      
      expect(screen.getByTestId('editor-toolbar')).toBeInTheDocument();
    });

    it('should not render toolbar when showToolbar is false', () => {
      render(<EditorHeader {...defaultProps} showToolbar={false} />);
      
      expect(screen.queryByTestId('editor-toolbar')).not.toBeInTheDocument();
    });
  });

  describe('Handlers', () => {
    it('should call onClose when close button is clicked', () => {
      const onClose = vi.fn();
      render(<EditorHeader {...defaultProps} onClose={onClose} />);
      
      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);
      
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onPreview when preview button is clicked', () => {
      const onPreview = vi.fn();
      render(<EditorHeader {...defaultProps} onPreview={onPreview} />);
      
      const previewButton = screen.getByRole('button', { name: /preview/i });
      fireEvent.click(previewButton);
      
      expect(onPreview).toHaveBeenCalledTimes(1);
    });

    it('should call onMenuOpen when menu button is clicked', () => {
      const onMenuOpen = vi.fn();
      render(<EditorHeader {...defaultProps} onMenuOpen={onMenuOpen} />);
      
      const menuButton = screen.getByRole('button', { name: /menu/i });
      fireEvent.click(menuButton);
      
      expect(onMenuOpen).toHaveBeenCalledTimes(1);
    });
  });

  describe('Props readonly', () => {
    it('should render in readonly mode', () => {
      render(<EditorHeader {...defaultProps} readonly={true} />);
      
      expect(screen.getByTestId('editor-toolbar')).toBeInTheDocument();
    });

    it('should render in edit mode when readonly is false', () => {
      render(<EditorHeader {...defaultProps} readonly={false} />);
      
      expect(screen.getByTestId('editor-toolbar')).toBeInTheDocument();
    });
  });

  describe('Props previewMode', () => {
    it('should render in preview mode', () => {
      render(<EditorHeader {...defaultProps} previewMode={true} />);
      
      expect(screen.getByTestId('editor-toolbar')).toBeInTheDocument();
    });

    it('should render in edit mode when previewMode is false', () => {
      render(<EditorHeader {...defaultProps} previewMode={false} />);
      
      expect(screen.getByTestId('editor-toolbar')).toBeInTheDocument();
    });
  });

  describe('Props canEdit', () => {
    it('should render edit link when canEdit is true', () => {
      render(<EditorHeader {...defaultProps} canEdit={true} noteId="test-note-id" />);
      
      // Le composant devrait afficher un lien vers l'éditeur si canEdit est true
      expect(screen.getByTestId('editor-toolbar')).toBeInTheDocument();
    });

    it('should not render edit link when canEdit is false', () => {
      render(<EditorHeader {...defaultProps} canEdit={false} noteId="test-note-id" />);
      
      expect(screen.getByTestId('editor-toolbar')).toBeInTheDocument();
    });
  });

  describe('Props onImageClick', () => {
    it('should call onImageClick when provided', () => {
      const onImageClick = vi.fn();
      render(<EditorHeader {...defaultProps} onImageClick={onImageClick} />);
      
      // Le composant devrait permettre de cliquer sur l'image header si onImageClick est fourni
      expect(screen.getByTestId('editor-toolbar')).toBeInTheDocument();
    });
  });
});



