/**
 * EditorHeaderSection - Section header de l'éditeur (header + image + kebab menu)
 * Extrait de Editor.tsx pour respecter la limite de 300 lignes
 */

import React from 'react';
import type { FullEditorInstance } from '@/types/editor';
import EditorHeader from './EditorHeader';
import { AddHeaderImageRow } from './AddHeaderImageRow';
import EditorHeaderImage from '@/components/EditorHeaderImage';
import EditorKebabMenu from '@/components/EditorKebabMenu';
import EditorTitle from './EditorTitle';
import type { ShareSettings } from '@/types/sharing';
import type { EditorState } from '@/hooks/editor/useEditorState';
import type { UseEditorHandlersReturn } from '@/hooks/editor/useEditorHandlers';
import { logger, LogCategory } from '@/utils/logger';

interface EditorHeaderSectionProps {
  editor: FullEditorInstance | null;
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
  currentTitle?: string;
  renderToolbar?: boolean;
  renderDocumentHeader?: boolean;
  layoutMode?: 'full' | 'side-panel' | 'modal';
  /** Affiche le bouton kebab pour un visiteur en lecture seule (page publique) */
  showReadonlyVisitorKebab?: boolean;
  kebabMenuVariant?: 'editor' | 'public';
  /** `canvas` → toolbar compacte (police + menu Plus) */
  toolbarContext?: 'editor' | 'canvas';
  /** Panneau latéral : le CTA image est rendu dans EditorLayout (coin du contenu) */
  suppressAddHeaderImage?: boolean;
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
  onClose,
  currentTitle,
  renderToolbar = true,
  renderDocumentHeader = true,
  layoutMode = 'full',
  showReadonlyVisitorKebab = false,
  kebabMenuVariant = 'editor',
  toolbarContext = 'editor',
  suppressAddHeaderImage = false,
}) => {
  const handleToolbarTranscription = React.useCallback(
    (text: string) => {
      if (!editor) {
        return;
      }

      const trimmed = text.trim();
      if (!trimmed) {
        return;
      }

      editor
        .chain()
        .focus()
        .insertContent(`${trimmed} `)
        .run();
    },
    [editor]
  );

  // ✅ DEBUG: Log synchrone pour capturer le problème (pas dans useEffect)
  if (process.env.NODE_ENV === 'development') {
    logger.debug(LogCategory.EDITOR, '[EditorHeaderSection] Toolbar state (SYNC)', {
      showToolbar: editorState.ui.showToolbar,
      previewMode: editorState.ui.previewMode,
      isReadonly,
      shouldRender: !editorState.ui.previewMode && editorState.ui.showToolbar && !isReadonly,
      noteId,
      timestamp: Date.now(),
      context: { operation: 'headerSectionRender' }
    });
  }

  // ✅ DEBUG: Log pour diagnostiquer (asynchrone)
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      logger.debug(LogCategory.EDITOR, '[EditorHeaderSection] Toolbar state (ASYNC)', {
        showToolbar: editorState.ui.showToolbar,
        previewMode: editorState.ui.previewMode,
        isReadonly,
        shouldRender: !editorState.ui.previewMode && editorState.ui.showToolbar && !isReadonly,
        noteId,
        context: { operation: 'headerSectionRenderAsync' }
      });
    }
  }, [editorState.ui.showToolbar, editorState.ui.previewMode, isReadonly, noteId]);

  return (
    <>
      {renderToolbar && (
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
          onTranscriptionComplete={handleToolbarTranscription}
          canEdit={canEdit}
          noteId={noteId}
          layoutMode={layoutMode}
          showReadonlyVisitorKebab={showReadonlyVisitorKebab}
          noteTitle={currentTitle}
          slashLang={editorState.ui.slashLang}
          toolbarVariant={toolbarContext === 'canvas' ? 'compact' : 'full'}
          kebabMenu={
            /* Toujours monter EditorKebabMenu : la modale Export doit rester au DOM quand kebabOpen passe à false */
            <EditorKebabMenu
              open={editorState.menus.kebabOpen}
              position={editorState.menus.kebabPos}
              onClose={() => editorState.setKebabOpen(false)}
              exportModalOpen={editorState.menus.exportModalOpen}
              setExportModalOpen={editorState.setExportModalOpen}
              menuVariant={kebabMenuVariant}
              a4Mode={editorState.ui.a4Mode}
              setA4Mode={handlers.handleA4ModeChange}
              slashLang={editorState.ui.slashLang}
              setSlashLang={handlers.handleSlashLangChange}
              fullWidth={editorState.ui.fullWidth}
              setFullWidth={handlers.handleFullWidthChange}
              showToolbar={editorState.ui.showToolbar}
              toggleToolbar={editorState.toggleToolbar}
              noteId={noteId}
              currentTitle={currentTitle}
              currentHtmlContent={isReadonly ? undefined : editor?.getHTML()}
              currentFontFamily={currentFont}
              currentShareSettings={editorState.shareSettings}
              onShareSettingsChange={handleShareSettingsChange}
              publicUrl={publicUrl}
            />
          }
        />
      )}
      
      {/* Add header image CTA — masqué si rendu ailleurs (ex. coin du wrapper en panneau latéral) */}
      {/* 🔧 FIX: Masquer en mode readonly (page publique) - aucun bouton de modification */}
      {renderDocumentHeader &&
        !suppressAddHeaderImage &&
        !editorState.headerImage.url &&
        !editorState.ui.previewMode &&
        !isReadonly && (
          <AddHeaderImageRow noteId={noteId} editorState={editorState} handlers={handlers} />
        )}
      
      {renderDocumentHeader && (
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
          onImageMenuClose={() => {
            if (process.env.NODE_ENV === 'development') {
              logger.debug(LogCategory.EDITOR, '[EditorHeaderSection] editorState.headerImage.url', {
                url: editorState.headerImage.url?.substring(0, 100),
                context: { noteId, operation: 'headerImageClose' }
              });
            }
            editorState.setImageMenuOpen(false);
          }}
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
          showToolbar={editorState.ui.showToolbar}
        />
      )}
    </>
  );
};

export default EditorHeaderSection;

