/**
 * EditorHeaderSection - Section header de l'éditeur (header + image + kebab menu)
 * Extrait de Editor.tsx pour respecter la limite de 300 lignes
 */

import React from 'react';
import type { Editor as TiptapEditor } from '@tiptap/react';
import { FiImage } from 'react-icons/fi';
import EditorHeader from './EditorHeader';
import EditorHeaderImage from '@/components/EditorHeaderImage';
import EditorKebabMenu from '@/components/EditorKebabMenu';
import EditorTitle from './EditorTitle';
import { uploadImageForNote } from '@/utils/fileUpload';
import type { ShareSettings } from '@/types/sharing';
import type { EditorState } from '@/hooks/editor/useEditorState';
import type { UseEditorHandlersReturn } from '@/hooks/editor/useEditorHandlers';

interface EditorHeaderSectionProps {
  editor: TiptapEditor | null;
  noteId: string;
  userId: string;
  isReadonly: boolean;
  editorState: EditorState;
  currentFont: string;
  kebabBtnRef: React.RefObject<HTMLButtonElement>;
  canEdit: boolean;
  handlers: UseEditorHandlersReturn;
  handleShareSettingsChange: (settings: Partial<ShareSettings>) => Promise<void>;
  publicUrl?: string;
  onClose: () => void;
}

const EditorHeaderSection: React.FC<EditorHeaderSectionProps> = ({
  editor,
  noteId,
  userId,
  isReadonly,
  editorState,
  currentFont,
  kebabBtnRef,
  canEdit,
  handlers,
  handleShareSettingsChange,
  publicUrl,
  onClose
}) => {
  return (
    <>
      <EditorHeader
        editor={isReadonly ? null : editor}
        onClose={onClose}
        onPreview={handlers.handlePreviewClick}
        onMenuOpen={editorState.toggleKebabMenu}
        onImageClick={() => editorState.setImageMenuOpen(true)}
        onFontChange={handlers.handleFontChange}
        currentFont={currentFont}
        kebabBtnRef={kebabBtnRef}
        readonly={isReadonly}
        previewMode={editorState.ui.previewMode}
        showToolbar={editorState.ui.showToolbar}
        canEdit={canEdit}
        noteId={noteId}
        kebabMenu={
          editorState.menus.kebabOpen && (
            <EditorKebabMenu
              open={editorState.menus.kebabOpen}
              position={editorState.menus.kebabPos}
              onClose={() => editorState.setKebabOpen(false)}
              a4Mode={editorState.ui.a4Mode}
              setA4Mode={handlers.handleA4ModeChange}
              slashLang={editorState.ui.slashLang}
              setSlashLang={handlers.handleSlashLangChange}
              fullWidth={editorState.ui.fullWidth}
              setFullWidth={handlers.handleFullWidthChange}
              showToolbar={editorState.ui.showToolbar}
              toggleToolbar={editorState.toggleToolbar}
              noteId={noteId}
              currentShareSettings={editorState.shareSettings}
              onShareSettingsChange={handleShareSettingsChange}
              publicUrl={publicUrl}
            />
          )
        }
      />
      
      {/* Add header image CTA */}
      {!editorState.headerImage.url && !editorState.ui.previewMode && (
        <div className="editor-add-header-image-row editor-add-image-center">
          <div
            className="editor-add-header-image"
            onDragOver={(e) => {
              const items = Array.from(e.dataTransfer?.items || []);
              if (items.some(it => it.kind === 'file')) e.preventDefault();
            }}
            onDrop={async (e) => {
              try {
                if (!e.dataTransfer) return;
                const files = Array.from(e.dataTransfer.files || []);
                if (!files.length) return;
                const image = files.find(f => /^image\/(jpeg|png|webp|gif)$/.test(f.type));
                if (!image) return;
                e.preventDefault();
                const { publicUrl } = await uploadImageForNote(image, noteId);
                handlers.handleHeaderChange(publicUrl);
              } catch {}
            }}
          >
            <button
              className="editor-add-header-image-btn"
              onClick={() => { 
                editorState.setImageMenuTarget('header'); 
                editorState.setImageMenuOpen(true); 
              }}
              aria-label="Ajouter une image d'en-tête"
              title="Ajouter une image d'en-tête"
            >
              <FiImage size={20} />
            </button>
          </div>
        </div>
      )}
      
      <EditorHeaderImage
        headerImageUrl={editorState.headerImage.url}
        headerImageOffset={editorState.headerImage.offset}
        headerImageBlur={editorState.headerImage.blur}
        headerImageOverlay={editorState.headerImage.overlay}
        headerTitleInImage={editorState.headerImage.titleInImage}
        onHeaderChange={handlers.handleHeaderChange}
        onHeaderOffsetChange={handlers.updateHeaderOffset}
        onHeaderBlurChange={handlers.updateHeaderBlur}
        onHeaderOverlayChange={handlers.updateHeaderOverlay}
        onHeaderTitleInImageChange={handlers.updateTitleInImage}
        imageMenuOpen={editorState.menus.imageMenuOpen}
        onImageMenuOpen={() => editorState.setImageMenuOpen(true)}
        onImageMenuClose={() => editorState.setImageMenuOpen(false)}
        noteId={noteId}
        userId={userId}
        titleElement={
          <EditorTitle 
            value={editorState.document.title} 
            onChange={editorState.setTitle} 
            onBlur={handlers.handleTitleBlur} 
            placeholder="Titre de la note..." 
            disabled={isReadonly} 
          />
        }
        previewMode={editorState.ui.previewMode}
        readonly={isReadonly}
      />
    </>
  );
};

export default EditorHeaderSection;

