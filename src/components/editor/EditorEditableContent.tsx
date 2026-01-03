/**
 * EditorEditableContent - Contenu éditable avec Tiptap
 * 
 * Responsabilités:
 * - Rendu du contenu éditable Tiptap
 * - Floating menu Notion-like
 * - Table controls
 * - Slash menu
 */

import React from 'react';
import { EditorContent as TiptapEditorContent } from '@tiptap/react';
import type { Editor as TiptapEditor } from '@tiptap/react';
import FloatingMenuNotion from './floating-menu-notion';
import TableControls from './TableControls';
import EditorSlashMenu, { type EditorSlashMenuHandle, type EditorSlashCommand } from '@/components/EditorSlashMenu';
import EditorContentWrapper from './EditorContentWrapper';

interface EditorEditableContentProps {
  editor: TiptapEditor | null;
  editorContainerRef: React.RefObject<HTMLDivElement | null>;
  slashMenuRef: React.RefObject<EditorSlashMenuHandle | null>;
  slashLang: 'fr' | 'en';
  onOpenImageMenu: () => void;
  onSlashInsert: (cmd: EditorSlashCommand) => void;
  // Props pour contexte enrichi Ask AI
  noteId?: string;
  noteTitle?: string;
  noteContent?: string;
  noteSlug?: string;
  classeurId?: string;
  classeurName?: string;
  /** Contexte de l'éditeur : 'editor' (normal) ou 'canvas' (mode canvas) */
  toolbarContext?: 'editor' | 'canvas';
}

const EditorEditableContent: React.FC<EditorEditableContentProps> = ({
  editor,
  editorContainerRef,
  slashMenuRef,
  slashLang,
  onOpenImageMenu,
  onSlashInsert,
  noteId,
  noteTitle,
  noteContent,
  noteSlug,
  classeurId,
  classeurName,
  toolbarContext = 'editor'
}) => {
  return (
    <EditorContentWrapper>
      <div className="tiptap-editor-container" ref={editorContainerRef} style={{ position: 'relative' }}>
        {/* Floating menu Notion-like avec contexte enrichi */}
        <FloatingMenuNotion 
          editor={editor}
          noteId={noteId}
          noteTitle={noteTitle}
          noteContent={noteContent}
          noteSlug={noteSlug}
          classeurId={classeurId}
          classeurName={classeurName}
          toolbarContext={toolbarContext}
        />
        
        {/* Contenu Tiptap */}
        {/* TOUJOURS rendu pour que les drag handles fonctionnent */}
        <TiptapEditorContent editor={editor} />
        
        {/* Loading géré par EditorSyncManager - Pas besoin d'overlay visible */}
        
        {/* Table controls */}
        <TableControls 
          editor={editor} 
          containerRef={editorContainerRef as React.RefObject<HTMLElement>} 
        />
        
        {/* Slash commands menu */}
        <EditorSlashMenu
          ref={slashMenuRef}
          editor={editor}
          lang={slashLang}
          onOpenImageMenu={onOpenImageMenu}
          onInsert={onSlashInsert}
        />
      </div>
    </EditorContentWrapper>
  );
};

export default EditorEditableContent;

