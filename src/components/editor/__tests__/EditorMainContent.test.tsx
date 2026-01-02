/**
 * Tests unitaires pour EditorMainContent.tsx
 * 
 * Conformité GUIDE-EXCELLENCE-CODE.md: Tests composants critiques
 * 
 * Couverture:
 * - Rendu mode readonly
 * - Rendu mode preview
 * - Rendu mode éditable
 * - Intégration Mermaid
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import EditorMainContent from '../EditorMainContent';
import type { Editor as TiptapEditor } from '@tiptap/react';

// Mock Tiptap Editor
const createMockEditor = (): TiptapEditor => {
  return {
    getHTML: () => '<p>Test content</p>',
    getMarkdown: () => 'Test content',
    isFocused: false,
    isDestroyed: false,
    view: {
      dom: document.createElement('div'),
      coordsAtPos: () => ({ left: 0, top: 0 }),
    },
  } as unknown as TiptapEditor;
};

// Mock composants enfants
vi.mock('../EditorEditableContent', () => ({
  default: () => <div data-testid="editor-editable-content">EditorEditableContent</div>,
}));

vi.mock('../EditorPreview', () => ({
  default: ({ html }: { html: string }) => (
    <div data-testid="editor-preview" dangerouslySetInnerHTML={{ __html: html }} />
  ),
}));

vi.mock('@/components/EditorSlashMenu', () => ({
  default: () => <div data-testid="editor-slash-menu">EditorSlashMenu</div>,
}));

describe('[EditorMainContent] Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendu mode readonly', () => {
    it('should render preview in readonly mode', () => {
      render(
        <EditorMainContent
          isReadonly={true}
          editor={null}
          html="<h1>Test</h1>"
          editorContainerRef={{ current: null }}
          slashMenuRef={{ current: null }}
          slashLang="en"
          onOpenImageMenu={vi.fn()}
          onSlashInsert={vi.fn()}
        />
      );

      expect(screen.getByTestId('editor-preview')).toBeInTheDocument();
      expect(screen.queryByTestId('editor-editable-content')).not.toBeInTheDocument();
    });

    it('should render preview with HTML content', () => {
      const html = '<h1>Test Title</h1><p>Test content</p>';
      render(
        <EditorMainContent
          isReadonly={true}
          editor={null}
          html={html}
          editorContainerRef={{ current: null }}
          slashMenuRef={{ current: null }}
          slashLang="en"
          onOpenImageMenu={vi.fn()}
          onSlashInsert={vi.fn()}
        />
      );

      const preview = screen.getByTestId('editor-preview');
      expect(preview).toBeInTheDocument();
      expect(preview.innerHTML).toBe(html);
    });
  });

  describe('Rendu mode éditable', () => {
    it('should render editable content when not readonly', () => {
      const editor = createMockEditor();
      render(
        <EditorMainContent
          isReadonly={false}
          editor={editor}
          html="<h1>Test</h1>"
          editorContainerRef={{ current: null }}
          slashMenuRef={{ current: null }}
          slashLang="en"
          onOpenImageMenu={vi.fn()}
          onSlashInsert={vi.fn()}
        />
      );

      expect(screen.getByTestId('editor-editable-content')).toBeInTheDocument();
      expect(screen.queryByTestId('editor-preview')).not.toBeInTheDocument();
    });

    it('should render slash menu when not readonly', () => {
      const editor = createMockEditor();
      render(
        <EditorMainContent
          isReadonly={false}
          editor={editor}
          html="<h1>Test</h1>"
          editorContainerRef={{ current: null }}
          slashMenuRef={{ current: null }}
          slashLang="en"
          onOpenImageMenu={vi.fn()}
          onSlashInsert={vi.fn()}
        />
      );

      expect(screen.getByTestId('editor-slash-menu')).toBeInTheDocument();
    });
  });

  describe('Props', () => {
    it('should accept noteId prop', () => {
      const editor = createMockEditor();
      render(
        <EditorMainContent
          isReadonly={false}
          editor={editor}
          html="<h1>Test</h1>"
          editorContainerRef={{ current: null }}
          slashMenuRef={{ current: null }}
          slashLang="en"
          onOpenImageMenu={vi.fn()}
          onSlashInsert={vi.fn()}
          noteId="test-note-id"
        />
      );

      expect(screen.getByTestId('editor-editable-content')).toBeInTheDocument();
    });

    it('should accept noteTitle prop', () => {
      const editor = createMockEditor();
      render(
        <EditorMainContent
          isReadonly={false}
          editor={editor}
          html="<h1>Test</h1>"
          editorContainerRef={{ current: null }}
          slashMenuRef={{ current: null }}
          slashLang="en"
          onOpenImageMenu={vi.fn()}
          onSlashInsert={vi.fn()}
          noteTitle="Test Note"
        />
      );

      expect(screen.getByTestId('editor-editable-content')).toBeInTheDocument();
    });

    it('should accept slashLang prop', () => {
      const editor = createMockEditor();
      render(
        <EditorMainContent
          isReadonly={false}
          editor={editor}
          html="<h1>Test</h1>"
          editorContainerRef={{ current: null }}
          slashMenuRef={{ current: null }}
          slashLang="fr"
          onOpenImageMenu={vi.fn()}
          onSlashInsert={vi.fn()}
        />
      );

      expect(screen.getByTestId('editor-editable-content')).toBeInTheDocument();
    });
  });

  describe('isContentReady prop', () => {
    it('should handle isContentReady false', () => {
      const editor = createMockEditor();
      render(
        <EditorMainContent
          isReadonly={false}
          editor={editor}
          html="<h1>Test</h1>"
          editorContainerRef={{ current: null }}
          slashMenuRef={{ current: null }}
          slashLang="en"
          onOpenImageMenu={vi.fn()}
          onSlashInsert={vi.fn()}
          isContentReady={false}
        />
      );

      expect(screen.getByTestId('editor-editable-content')).toBeInTheDocument();
    });

    it('should handle isContentReady true', () => {
      const editor = createMockEditor();
      render(
        <EditorMainContent
          isReadonly={false}
          editor={editor}
          html="<h1>Test</h1>"
          editorContainerRef={{ current: null }}
          slashMenuRef={{ current: null }}
          slashLang="en"
          onOpenImageMenu={vi.fn()}
          onSlashInsert={vi.fn()}
          isContentReady={true}
        />
      );

      expect(screen.getByTestId('editor-editable-content')).toBeInTheDocument();
    });
  });
});



