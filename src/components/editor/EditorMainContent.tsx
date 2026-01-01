/**
 * EditorMainContent - Orchestrateur du contenu principal de l'éditeur
 * 
 * Responsabilités:
 * - Choisir entre mode éditable et mode preview
 * - Orchestrer EditorEditableContent et EditorPreview
 */

import React from 'react';
import type { Editor as TiptapEditor } from '@tiptap/react';
import EditorEditableContent from './EditorEditableContent';
import EditorPreview from './EditorPreview';
import EditorSlashMenu, { type EditorSlashMenuHandle } from '@/components/EditorSlashMenu';
import type { EditorSlashCommand } from '@/components/EditorSlashMenu';

interface EditorMainContentProps {
  isReadonly: boolean;
  editor: TiptapEditor | null;
  html: string;
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
  // FIX React 18: Attendre que le contenu initial soit chargé
  isContentReady?: boolean;
}

const EditorMainContent: React.FC<EditorMainContentProps> = ({
  isReadonly,
  editor,
  html,
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
  isContentReady = true
}) => {
  if (isReadonly) {
    return (
      <EditorPreview
        html={html}
        containerRef={editorContainerRef}
        noteId={noteId}
      />
    );
  }

  return (
    <EditorEditableContent
              editor={editor}
      editorContainerRef={editorContainerRef}
      slashMenuRef={slashMenuRef}
      slashLang={slashLang}
      onOpenImageMenu={onOpenImageMenu}
      onSlashInsert={onSlashInsert}
              noteId={noteId}
              noteTitle={noteTitle}
              noteContent={noteContent}
              noteSlug={noteSlug}
              classeurId={classeurId}
              classeurName={classeurName}
            />
  );
};

export default EditorMainContent;
