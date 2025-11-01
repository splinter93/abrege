/**
 * EditorMainContent - Rendu du contenu principal de l'éditeur
 * Extrait de Editor.tsx pour respecter la limite de 300 lignes
 */

import React from 'react';
import { EditorContent as TiptapEditorContent } from '@tiptap/react';
import type { Editor as TiptapEditor } from '@tiptap/react';
import FloatingMenuNotion from './FloatingMenuNotion';
import EditorContent from './EditorContent';
import TableControls from './TableControls';
import EditorSlashMenu, { type EditorSlashMenuHandle } from '@/components/EditorSlashMenu';
import type { SlashCommand } from '@/types/editor';

interface EditorMainContentProps {
  isReadonly: boolean;
  editor: TiptapEditor | null;
  html: string;
  editorContainerRef: React.RefObject<HTMLDivElement | null>;
  slashMenuRef: React.RefObject<EditorSlashMenuHandle | null>;
  slashLang: 'fr' | 'en';
  onOpenImageMenu: () => void;
  onSlashInsert: (cmd: SlashCommand) => void;
}

const EditorMainContent: React.FC<EditorMainContentProps> = ({
  isReadonly,
  editor,
  html,
  editorContainerRef,
  slashMenuRef,
  slashLang,
  onOpenImageMenu,
  onSlashInsert
}) => {
  return (
    <EditorContent>
      <div className="tiptap-editor-container" ref={editorContainerRef}>
        {!isReadonly && (
          <>
            {/* Floating menu Notion-like */}
            <FloatingMenuNotion editor={editor} />
            
            {/* Contenu Tiptap */}
            <TiptapEditorContent editor={editor} />
            
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
          </>
        )}
        {isReadonly && (
          <div className="markdown-body" dangerouslySetInnerHTML={{ __html: html }} />
        )}
      </div>
    </EditorContent>
  );
};

export default EditorMainContent;

