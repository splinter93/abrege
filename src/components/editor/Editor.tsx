import React from 'react';
// ✅ OPTIMISÉ: Bundle CSS consolidé (17 imports → 1)
// Ordre critique conservé dans editor-bundle.css
import '@/styles/editor-bundle.css';
import EditorLayout from './EditorLayout';
import EditorMainContent from './EditorMainContent';
import EditorHeaderSection from './EditorHeaderSection';
import CraftedButton from '@/components/CraftedButton';
import EditorTitle from './EditorTitle';
import PublicTableOfContents from '@/components/TableOfContents';
import { useFileSystemStore } from '@/store/useFileSystemStore';
import type { FileSystemState } from '@/store/useFileSystemStore';
import { useMarkdownRender } from '@/hooks/editor/useMarkdownRender';
import type { ShareSettings, ShareSettingsUpdate } from '@/types/sharing';
import { getDefaultShareSettings } from '@/types/sharing';
import { useEditor, EditorContent as TiptapEditorContent } from '@tiptap/react';
import lowlight from '@/utils/lowlightInstance';
import { type EditorSlashMenuHandle } from '@/components/EditorSlashMenu';
// DragHandle géré par NotionDragHandleExtension (voir editor-extensions.ts)
import { useRouter } from 'next/navigation';
import ImageMenu from '@/components/ImageMenu';
import { useAuth } from '@/hooks/useAuth';
import { logger, LogCategory } from '@/utils/logger';
import type { FullEditorInstance } from '@/types/editor';
import { useRealtime } from '@/hooks/useRealtime';
import RealtimeStatus from '@/components/RealtimeStatus';
import { preprocessMarkdown } from '@/utils/markdownPreprocessor';
import { useEditorState } from '@/hooks/editor/useEditorState';
import { useEditorHandlers } from '@/hooks/editor/useEditorHandlers';
import { useEditorEffects } from '@/hooks/editor/useEditorEffects';
import { useEditorHeadings } from '@/hooks/editor/useEditorHeadings';
import EditorSyncManager from './EditorCore/EditorSyncManager';
import EditorContextMenuContainer from './EditorMenus/EditorContextMenuContainer';
import { useShareManager } from './EditorMenus/EditorShareManager';
// Types pour les mises à jour de note
interface NoteUpdate {
  a4_mode?: boolean;
  slash_lang?: 'fr' | 'en';
  wide_mode?: boolean;
  font_family?: string;
  markdown_content?: string;
  [key: string]: unknown;
}
import { createEditorExtensions, PRODUCTION_EXTENSIONS_CONFIG } from '@/config/editor-extensions';
import ContextMenu from './ContextMenu';
import type { Editor as TiptapEditor } from '@tiptap/react';
// ✅ NOUVEAUX IMPORTS - Sidebar Navigation
import EditorSidebar from './EditorSidebar';
import { useEditorNavigation } from '@/hooks/useEditorNavigation';

/**
 * Composant principal de l'éditeur de notes
 * 
 * @description Éditeur de texte riche basé sur Tiptap avec support Markdown.
 * Le Markdown est la source de vérité, le HTML est utilisé uniquement pour l'affichage.
 * Optimisé pour les performances avec extensions réduites et gestion d'état intelligente.
 * 
 * @param noteId - ID unique de la note à éditer
 * @param readonly - Mode lecture seule (désactive l'édition)
 * @param userId - ID de l'utilisateur (par défaut: 'me')
 * 
 * @returns Composant React de l'éditeur complet
 * 
 * @example
 * ```tsx
 * <Editor noteId="note-123" readonly={false} userId="user-456" />
 * ```
 */
const Editor: React.FC<{ 
  noteId: string; 
  readonly?: boolean; 
  userId?: string;
  canEdit?: boolean; // Si l'user peut éditer (pour afficher le lien vers l'éditeur sur pages publiques)
}> = ({ noteId, readonly = false, userId: propUserId, canEdit = true }) => {
  // 🔧 CORRECTION : Utiliser le vrai ID utilisateur de la session
  const { user } = useAuth();
  const userId = propUserId || user?.id || 'anonymous';
  
  const router = useRouter();
  
  const selectNote = React.useCallback((s: FileSystemState) => s.notes[noteId], [noteId]);
  const note = useFileSystemStore(selectNote);
  
  const updateNote = useFileSystemStore(s => s.updateNote);
  // ✅ PRÉTRAITER le Markdown pour échapper les ~ dans les tables (fix LLM)
  const rawContent = note?.markdown_content || '';
  const content = React.useMemo(() => preprocessMarkdown(rawContent), [rawContent]);
  const { html } = useMarkdownRender({ content });

  // ✅ OPTIMISÉ: État centralisé avec useEditorState
  const editorState = useEditorState({
    initialTitle: note?.source_title || '',
    initialHeaderImage: note?.header_image || null,
    initialHeaderOffset: note?.header_image_offset,
    initialHeaderBlur: note?.header_image_blur,
    initialHeaderOverlay: note?.header_image_overlay,
    initialTitleInImage: note?.header_title_in_image,
    initialA4Mode: note?.a4_mode || false,
    initialFullWidth: note?.wide_mode || false,
    initialSlashLang: (note?.slash_lang as 'fr' | 'en') || 'en',
    initialShareSettings: note?.share_settings ? {
      visibility: (note.share_settings.visibility as ShareSettings['visibility']) || 'private',
      invited_users: note.share_settings.invited_users || [],
      allow_edit: note.share_settings.allow_edit || false,
      allow_comments: note.share_settings.allow_comments || false,
    } : getDefaultShareSettings(),
  });

  // Refs
  const kebabBtnRef = React.useRef<HTMLButtonElement>(null) as React.RefObject<HTMLButtonElement>;
  const slashMenuRef = React.useRef<EditorSlashMenuHandle | null>(null);
  const editorContainerRef = React.useRef<HTMLDivElement | null>(null);

  // ✅ Sidebar Navigation - Pattern chat (hover zone + transform)
  const [sidebarVisible, setSidebarVisible] = React.useState(false);

  // Mode readonly (pages publiques ou preview mode)
  const isReadonly = readonly || editorState.ui.previewMode;

  // 🔄 Realtime Integration - Désactivé en mode readonly (pages publiques)
  const realtime = useRealtime({
    userId,
    noteId,
    debug: false,
    enabled: !isReadonly,
    onEvent: (event) => {
      // Les événements sont déjà traités par le dispatcher
    },
    onStateChange: (state) => {
    }
  });


  // ✅ OPTIMISÉ: Utilisation du hook useShareManager
  const { handleShareSettingsChange } = useShareManager({
    noteId,
    editorState,
    onUpdate: updateNote,
  });

  // Initialize share settings from note data
  React.useEffect(() => {
    if (note?.share_settings) {
      const shareSettings = note.share_settings;
      const visibility = shareSettings.visibility as ShareSettings['visibility'];
      const validVisibility: ShareSettings['visibility'] = 
        ['private', 'link-private', 'link-public', 'limited', 'scrivia'].includes(visibility)
          ? visibility
          : 'private';
      
      editorState.setShareSettings({
        visibility: validVisibility,
        invited_users: shareSettings.invited_users || [],
        allow_edit: shareSettings.allow_edit || false,
        allow_comments: shareSettings.allow_comments || false
      });
    }
  }, [note?.share_settings, editorState.setShareSettings]); // Utiliser setShareSettings au lieu de editorState complet

  // ✅ REFACTO: Tous les handlers extraits dans useEditorHandlers
  const handlers = useEditorHandlers({
    noteId,
    userId,
    isReadonly,
    editor: null, // Sera passé après création de l'instance Tiptap
    editorState,
    updateNote,
    content,
    rawContent,
    note
  });

  // Real Tiptap editor instance
  const editor = useEditor({
    editable: !isReadonly,
    immediatelyRender: false,
    extensions: createEditorExtensions(PRODUCTION_EXTENSIONS_CONFIG, lowlight),
    content: rawContent || '',
    onUpdate: handlers.handleEditorUpdate,
  });

  // ✅ REFACTO: Mettre à jour le handler avec l'instance editor réelle
  const handlersWithEditor = useEditorHandlers({
    noteId,
    userId,
    isReadonly,
    editor,
    editorState,
    updateNote,
    content,
    rawContent,
    note
  });

  // ✅ NOUVEAUX HOOKS - Navigation entre notes
  const { switchNote } = useEditorNavigation({
    currentNoteId: noteId,
    hasUnsavedChanges: () => {
      // Vérifier si l'éditeur a des modifications non sauvegardées
      if (!editor) return false;
      const editorContent = editor.getText();
      const originalContent = rawContent || '';
      return editorContent !== originalContent;
    },
    onBeforeNavigate: () => {
      // Cleanup avant navigation (optionnel)
      logger.dev('[Editor] Navigation vers une autre note...');
    }
  });

  // ✅ REFACTO: Tous les effects extraits dans useEditorEffects
  useEditorEffects({
    editor,
    note,
    noteId,
    content,
    isReadonly,
    editorState,
    kebabBtnRef,
    slashMenuRef,
    handlers: handlersWithEditor
  });

  // ✅ REFACTO: Extraction des headings dans useEditorHeadings
  const headings = useEditorHeadings({
    editor,
    content,
    forceTOCUpdate: editorState.document.forceTOCUpdate
  });

  if (!note) {
    return null;
  }

  return (
    <>
      {/* ✅ Sidebar Navigation - Pattern chat exact */}
      {!isReadonly && (
        <>
          {/* Hover zone 100px à gauche */}
          <div
            className="editor-sidebar-hover-zone"
            onMouseEnter={() => setSidebarVisible(true)}
            onMouseLeave={() => setSidebarVisible(false)}
          />
          
          {/* Sidebar (transform slide) */}
          <EditorSidebar
            isVisible={sidebarVisible}
            currentNoteId={noteId}
            currentClasseurId={note?.classeur_id}
            onNoteSelect={switchNote}
          />
        </>
      )}

      {/* 🔄 Realtime System - Service simple et robuste */}
        <div className="editor-toc-fixed">
          <PublicTableOfContents headings={headings} containerRef={editorContainerRef} />
        </div>
      <EditorLayout
        layoutClassName={editorState.headerImage.url ? (editorState.headerImage.titleInImage ? 'noteLayout imageWithTitle' : 'noteLayout imageOnly') : 'noteLayout imageOnly noImage'}
        header={(
          <EditorHeaderSection
            editor={editor}
            noteId={noteId}
            userId={userId}
            isReadonly={isReadonly}
            editorState={editorState}
              currentFont={note?.font_family || 'Noto Sans'}
              kebabBtnRef={kebabBtnRef}
            canEdit={canEdit}
            handlers={handlersWithEditor}
            handleShareSettingsChange={handleShareSettingsChange}
              publicUrl={note?.public_url || undefined}
            onClose={() => router.back()}
            />
        )}
        title={editorState.headerImage.titleInImage ? undefined : <EditorTitle value={editorState.document.title} onChange={editorState.setTitle} onBlur={handlersWithEditor.handleTitleBlur} placeholder="Titre de la note..." disabled={isReadonly} />}
        content={(
          <EditorMainContent
            isReadonly={isReadonly}
                editor={editor} 
            html={html}
            editorContainerRef={editorContainerRef}
            slashMenuRef={slashMenuRef}
            slashLang={editorState.ui.slashLang}
                  onOpenImageMenu={() => { 
                    editorState.setImageMenuTarget('content'); 
                    editorState.setImageMenuOpen(true); 
                  }}
            onSlashInsert={(cmd) => handlersWithEditor.handleSlashCommandInsert(cmd)}
            noteId={note?.id}
            noteTitle={note?.source_title}
            noteContent={rawContent}
            noteSlug={note?.slug}
            classeurId={note?.classeur_id}
          />
        )}
      />
      {/* Global ImageMenu for both header and content insertions */}
      <ImageMenu
        open={editorState.menus.imageMenuOpen}
        onClose={() => editorState.setImageMenuOpen(false)}
        onInsertImage={(src: string) => handlersWithEditor.handleImageInsert(src, editorState.menus.imageMenuTarget)}
        noteId={note.id}
        userId={userId}
      />
      
      {/* Menu contextuel Notion-like */}
      <EditorContextMenuContainer
        editor={editor}
        editorState={editorState}
        onOpenImageMenu={() => {
          editorState.setImageMenuTarget('content');
          editorState.setImageMenuOpen(true);
        }}
      />
      
      {/* ✅ EditorSyncManager SIMPLIFIÉ - Charge le contenu UNE FOIS seulement */}
      <EditorSyncManager
        editor={editor}
        storeContent={rawContent}
        editorState={editorState}
      />
      
      {/* 🔍 Realtime Status (dev only) */}
      {process.env.NODE_ENV === 'development' && userId && (
        <RealtimeStatus userId={userId} noteId={noteId} />
      )}
      
      {/* Bouton "Crafted with Scrivia" - visible en mode preview */}
      {editorState.ui.previewMode && <CraftedButton />}
      
    </>
  );
};

export default Editor; 