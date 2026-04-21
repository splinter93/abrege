/**
 * EditorMainContent - Orchestrateur du contenu principal de l'éditeur
 * 
 * Responsabilités:
 * - Choisir entre mode éditable et mode preview
 * - Orchestrer EditorEditableContent et EditorPreview
 */

import React from 'react';
import type { Editor as TiptapEditor } from '@tiptap/react';
import type { NoteSourceType } from '@/types/supabase';
import EditorEditableContent from './EditorEditableContent';
import EditorPreview from './EditorPreview';
import HtmlNoteRenderer from './HtmlNoteRenderer';
import QcmNoteRenderer from './QcmNoteRenderer';
import { type EditorSlashMenuHandle } from '@/components/EditorSlashMenu';
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
  noteId?: string;
  noteTitle?: string;
  noteContent?: string;
  noteSlug?: string;
  classeurId?: string;
  classeurName?: string;
  toolbarContext?: 'editor' | 'canvas';
  isContentReady?: boolean;
  sourceType?: NoteSourceType | null;
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
  toolbarContext = 'editor',
  isContentReady = true,
  sourceType
}) => {
  if (sourceType === 'html') {
    return <HtmlNoteRenderer htmlContent={html || noteContent || ''} />;
  }

  if (sourceType === 'qcm') {
    return <QcmNoteRenderer markdownContent={noteContent || ''} />;
  }

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
      toolbarContext={toolbarContext}
            />
  );
};

export default EditorMainContent;
