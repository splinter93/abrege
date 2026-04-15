/**
 * Composant principal de l'éditeur de notes
 * 
 * @description Éditeur de texte riche basé sur Tiptap avec support Markdown.
 * Le Markdown est la source de vérité, le HTML est utilisé uniquement pour l'affichage.
 * Optimisé pour les performances avec extensions réduites et gestion d'état intelligente.
 */

import React from 'react';
import '@/styles/editor-bundle.css';
import EditorLayout from './EditorLayout';
import EditorMainContent from './EditorMainContent';
import EditorHeaderSection from './EditorHeaderSection';
import CraftedButton from '@/components/CraftedButton';
import EditorTitle from './EditorTitle';
import PublicTableOfContents from '@/components/TableOfContents';
import { useMarkdownRender } from '@/hooks/editor/useMarkdownRender';
import type { ShareSettings } from '@/types/sharing';
import { getDefaultShareSettings } from '@/types/sharing';
import { useRouter } from 'next/navigation';
import ImageMenu from '@/components/ImageMenu';
import { useAuth } from '@/hooks/useAuth';
import { logger, LogCategory } from '@/utils/logger';
import { useRealtime } from '@/hooks/useRealtime';
import RealtimeStatus from '@/components/RealtimeStatus';
import { useEditorState } from '@/hooks/editor/useEditorState';
import { useEditorHandlers } from '@/hooks/editor/useEditorHandlers';
import { useEditorEffects } from '@/hooks/editor/useEditorEffects';
import { useEditorHeadings } from '@/hooks/editor/useEditorHeadings';
import { useEditorInitialization } from '@/hooks/editor/useEditorInitialization';
import { useEditorData } from '@/hooks/editor/useEditorData';
// import EditorSyncManager from './EditorCore/EditorSyncManager'; // ✅ DÉSACTIVÉ pour test
import EditorContextMenuContainer from './EditorMenus/EditorContextMenuContainer';
import { useShareManager } from './EditorMenus/EditorShareManager';
import { useEditorNavigation } from '@/hooks/useEditorNavigation';
import { EmbedDepthProvider } from '@/contexts/EmbedDepthContext';
import EditorSidebar from './EditorSidebar';
import type { Editor as TiptapEditor } from '@tiptap/react';
import { type EditorSlashMenuHandle } from '@/components/EditorSlashMenu';
import { cleanupMermaidSVGs } from '@/utils/mermaidCleanup';
import { prepareStoredMarkdownForEditor } from '@/utils/markdownSanitizer.client';
import { useEditorStreamListener } from '@/hooks/useEditorStreamListener';
import { getEditorMarkdown } from '@/utils/editorHelpers';
import { EditorErrorBoundary } from './EditorErrorBoundary';
import { useCanvasSelection } from '@/hooks/useCanvasSelection';
import PlanNoteOverlay from './PlanNoteOverlay';
import HtmlNoteEditor from './HtmlNoteEditor';
import ChatWidgetFab from '@/components/chat/ChatWidgetFab';
import ChatWidgetRoot from '@/components/chat/ChatWidgetRoot';

interface EditorProps { 
  noteId: string; 
  readonly?: boolean; 
  userId?: string;
  canEdit?: boolean;
  onClose?: () => void;
  onEditorRef?: (editor: TiptapEditor | null) => void;
  onReady?: () => void;
  forceShowToolbar?: boolean; // Force la toolbar visible (pour canvas)
  toolbarContext?: 'editor' | 'canvas'; // Contexte pour séparer localStorage
  layoutMode?: 'full' | 'side-panel' | 'modal'; // Mode side-panel : bouton agrandir à la place de la plume
}

const Editor: React.FC<EditorProps> = ({ 
  noteId, 
  readonly = false, 
  userId: propUserId, 
  canEdit = true, 
  onClose, 
  onEditorRef, 
  onReady, 
  forceShowToolbar, 
  toolbarContext = 'editor',
  layoutMode = 'full'
}) => {
  // DEBUG: Log pour diagnostiquer
  React.useEffect(() => {
    logger.info(LogCategory.EDITOR, '[Editor] Props reçues', {
      noteId,
      forceShowToolbar,
      toolbarContext,
      readonly,
      context: { operation: 'editorInit' }
    });
  }, [noteId, forceShowToolbar, toolbarContext, readonly]);

  // CORRECTION : Utiliser le vrai ID utilisateur de la session
  const { user } = useAuth();
  const userId = propUserId || user?.id || 'anonymous';
  const router = useRouter();
  
  // Récupérer les données de la note
  const { note, rawContent, content, html, updateNote } = useEditorData({ noteId });

  // OPTIMISÉ: État centralisé avec useEditorState
  const editorState = useEditorState({
    noteId,
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
    toolbarContext,
    forceShowToolbar,
  });

  // Refs
  const kebabBtnRef = React.useRef<HTMLButtonElement>(null) as React.RefObject<HTMLButtonElement>;
  const slashMenuRef = React.useRef<EditorSlashMenuHandle | null>(null);
  const editorContainerRef = React.useRef<HTMLDivElement | null>(null);

  // Sidebar Navigation - Pattern chat (hover zone + transform)
  const [sidebarVisible, setSidebarVisible] = React.useState(false);

  // Plan mode: read-only by default, togglable
  const isPlanNote = note?.source_type === 'plan';
  const [isPlanEditUnlocked, setIsPlanEditUnlocked] = React.useState(false);

  // Mode readonly (pages publiques ou preview mode ou plan verrouillé)
  const isReadonly = readonly || editorState.ui.previewMode || (isPlanNote && !isPlanEditUnlocked);

  /** Visiteur sur URL publique : kebab simplifié (partage social, export, layout) */
  const showReadonlyVisitorKebab = isReadonly && !canEdit;
  const kebabMenuVariant = showReadonlyVisitorKebab ? 'public' : 'editor';

  // REFACTO: Tous les handlers extraits dans useEditorHandlers
  const handlers = useEditorHandlers({
    noteId,
    userId,
    isReadonly,
    canEdit,
    editor: null, // Sera passé après création de l'instance Tiptap
    editorState,
    updateNote,
    content,
    rawContent,
    note
  });

  // Initialisation de l'éditeur Tiptap
  const { editor, isContentReady, setIsContentReady } = useEditorInitialization({
    noteId,
    isReadonly,
    onEditorUpdate: handlers.handleEditorUpdate,
    onEditorRef,
    onReady
  });

  // Sync TipTap editable state (plan lock/unlock, prop readonly).
  // Preview mode is excluded: EditorMainContent swaps to EditorPreview entirely,
  // so calling setEditable would needlessly re-render TipTap and destroy Mermaid SVGs.
  const editorShouldBeEditable = !readonly && !(isPlanNote && !isPlanEditUnlocked);
  React.useEffect(() => {
    if (editor) {
      editor.setEditable(editorShouldBeEditable);
    }
  }, [editor, editorShouldBeEditable]);

  // ✅ NOTE : Détection automatique des sélections désactivée
  // L'ajout au chat se fait explicitement via le bouton "Add to chat" dans le menu flottant (FloatingMenuNotion)
  // Ce hook (useCanvasSelection) est disponible mais non utilisé pour éviter les sélections automatiques non désirées

  // ✅ DÉSACTIVÉ EditorSyncManager : Chargement manuel du contenu initial
  const hasLoadedInitialContentRef = React.useRef(false);
  const lastNoteIdRef = React.useRef<string>('');
  const contentLoadTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  
  React.useEffect(() => {
    // Reset si noteId change
    if (lastNoteIdRef.current !== noteId) {
      hasLoadedInitialContentRef.current = false;
      lastNoteIdRef.current = noteId;
      setIsContentReady(false); // ✅ FIX: Reset isContentReady quand noteId change
      
      // Cleanup timeout précédent
      if (contentLoadTimeoutRef.current) {
        clearTimeout(contentLoadTimeoutRef.current);
        contentLoadTimeoutRef.current = null;
      }
    }
    
    // ✅ FIX: Ne pas attendre rawContent si l'éditeur est prêt
    // Si rawContent est null/undefined, on charge quand même un éditeur vide
    if (!editor || hasLoadedInitialContentRef.current || isReadonly) {
      return;
    }
    
    // ✅ FIX: Si rawContent n'est pas encore chargé, attendre un peu puis charger vide
    // Cela évite que le canvas reste bloqué en chargement
    if (rawContent === undefined) {
      // Attendre un peu pour voir si rawContent arrive
      contentLoadTimeoutRef.current = setTimeout(() => {
        if (!editor || hasLoadedInitialContentRef.current) return;
        
        // Si rawContent n'est toujours pas là après 500ms, charger un éditeur vide
        hasLoadedInitialContentRef.current = true;
        editor.commands.clearContent(true);
        editor.commands.insertContent({
          type: 'paragraph',
          attrs: { 'data-placeholder': 'Écrivez quelque chose d\'incroyable...' },
          content: []
        });
        setIsContentReady(true);
        logger.info(LogCategory.EDITOR, '[Editor] Contenu initial chargé (vide - rawContent undefined)', {
          noteId,
          timestamp: Date.now()
        });
      }, 500);
      
      return () => {
        if (contentLoadTimeoutRef.current) {
          clearTimeout(contentLoadTimeoutRef.current);
          contentLoadTimeoutRef.current = null;
        }
      };
    }
    
    // rawContent est défini (même si null ou vide)
    hasLoadedInitialContentRef.current = true;
    
    // Cleanup timeout si rawContent arrive avant
    if (contentLoadTimeoutRef.current) {
      clearTimeout(contentLoadTimeoutRef.current);
      contentLoadTimeoutRef.current = null;
    }
    
    // Charger le contenu dans l'éditeur
    setTimeout(() => {
      if (!editor) return;
      
      // ✅ Dé-échapper entités (sanitize serveur) + {{embed:…}} → HTML pour TipTap
      const processedContent = prepareStoredMarkdownForEditor(rawContent || '');
      
      if (!processedContent.trim()) {
        editor.commands.clearContent(true);
        editor.commands.insertContent({
          type: 'paragraph',
          attrs: { 'data-placeholder': 'Écrivez quelque chose d\'incroyable...' },
          content: []
        });
      } else {
        editor.commands.setContent(processedContent);
      }
      
      setIsContentReady(true);
      logger.info(LogCategory.EDITOR, '[Editor] Contenu initial chargé', {
        noteId,
        contentLength: processedContent.length,
        timestamp: Date.now()
      });
    }, 0);
  }, [editor, rawContent, noteId, isReadonly, setIsContentReady]);

  // ✅ FIX: Synchroniser les mises à jour realtime du store vers l'éditeur
  // (remplace la partie désactivée de EditorSyncManager)
  const lastStoreContentRef = React.useRef<string>('');
  React.useEffect(() => {
    // Ne synchroniser que si :
    // 1. L'éditeur existe et le contenu initial est chargé
    // 2. On n'est pas en mode readonly
    // 3. Le contenu du store a vraiment changé
    if (!editor || !hasLoadedInitialContentRef.current || isReadonly) {
      return;
    }

    // Normaliser le contenu pour la comparaison (éviter les différences d'espaces)
    const normalizeContent = (content: string): string => {
      return content.trim().replace(/\s+/g, ' ');
    };

    const normalizedStoreContent = normalizeContent(rawContent || '');
    const normalizedLastContent = normalizeContent(lastStoreContentRef.current);
    const normalizedEditorContent = normalizeContent(getEditorMarkdown(editor));

    // Si le store a changé ET est différent de l'éditeur
    if (normalizedStoreContent !== normalizedLastContent && 
        normalizedStoreContent !== normalizedEditorContent) {
      
      // Ne pas mettre à jour si l'utilisateur est en train de taper (éviter conflits)
      if (editor.isFocused) {
        logger.debug(LogCategory.EDITOR, '[Editor] ⏭️ Store mis à jour mais utilisateur en train de taper, skip', {
          storeLength: normalizedStoreContent.length,
          editorLength: normalizedEditorContent.length
        });
        return;
      }

      // Mettre à jour l'éditeur avec le contenu du store
      logger.info(LogCategory.EDITOR, '[Editor] 🔄 Mise à jour realtime: store → éditeur', {
        storeLength: normalizedStoreContent.length,
        editorLength: normalizedEditorContent.length,
        noteId
      });

      editorState.setIsUpdatingFromStore(true);
      
      const processedContent = prepareStoredMarkdownForEditor(rawContent || '');
      editor.commands.setContent(processedContent);
      
      lastStoreContentRef.current = rawContent || '';
      
      // Réinitialiser le flag après un court délai
      setTimeout(() => {
        editorState.setIsUpdatingFromStore(false);
      }, 100);
    } else {
      // Mettre à jour la référence même si pas de changement visible
      lastStoreContentRef.current = rawContent || '';
    }
  }, [rawContent, editor, isReadonly, noteId, editorState]);

  // REFACTO: Mettre à jour le handler avec l'instance editor réelle
  const handlersWithEditor = useEditorHandlers({
    noteId,
    userId,
    isReadonly,
    canEdit,
    editor,
    editorState,
    updateNote,
    content,
    rawContent,
    note
  });

  // Navigation entre notes (sans popup confirmation car autosave actif)
  const { switchNote } = useEditorNavigation({
    currentNoteId: noteId,
    onBeforeNavigate: () => {
      logger.debug(LogCategory.EDITOR, '[Editor] Navigation vers une autre note...', {
        noteId,
        context: { operation: 'noteNavigation' }
      });
    }
  });

  // REFACTO: Tous les effects extraits dans useEditorEffects
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

  // REFACTO: Extraction des headings dans useEditorHeadings
  const headings = useEditorHeadings({
    editor,
    content,
    forceTOCUpdate: editorState.document.forceTOCUpdate
  });

  // ✅ Streaming LLM - Écoute les streams SSE pour les mises à jour LLM
  // ✅ Désactivé dans le canevas chat : ChatCanvaPane a son propre abonnement note-stream et insertion
  // (évite double abonnement et double insertion sur le même canal)
  useEditorStreamListener(noteId, editor, {
    enabled: !isReadonly && !!editor && toolbarContext !== 'canvas',
    debug: toolbarContext !== 'canvas',
    defaultPosition: 'cursor'
  });

  // Realtime Integration - Désactivé en mode readonly (pages publiques)
  // ✅ FIX: Activer même sans éditeur - le realtime peut fonctionner indépendamment
  useRealtime({
    userId,
    noteId,
    debug: false,
    enabled: !isReadonly && !!userId && userId !== 'anonymous', // ✅ Activer dès qu'on a un userId valide
    onEvent: () => {
      // Les événements sont déjà traités par le dispatcher
    },
    onStateChange: () => {
      // Gestion de l'état realtime
    }
  });

  // OPTIMISÉ: Utilisation du hook useShareManager
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
  }, [note?.share_settings, editorState.setShareSettings]);

  // CLEANUP: Nettoyer SVG Mermaid orphelins au unmount et à chaque changement de page
  React.useEffect(() => {
    cleanupMermaidSVGs();
    return () => {
      cleanupMermaidSVGs();
    };
  }, [noteId]);

  // Plan progress tracking
  const planProgress = React.useMemo(() => {
    if (!isPlanNote || !rawContent) return { completed: 0, total: 0 };
    const checkboxes = rawContent.match(/- \[[ x]\]/g) || [];
    const completed = (rawContent.match(/- \[x\]/g) || []).length;
    return { completed, total: checkboxes.length };
  }, [isPlanNote, rawContent]);

  if (!note) {
    return null;
  }

  // HTML notes: dedicated fullscreen layout + sidebar
  if (note.source_type === 'html') {
    return (
      <>
        <div
          className="editor-sidebar-hover-zone"
          onMouseEnter={() => setSidebarVisible(true)}
          onMouseLeave={() => setSidebarVisible(false)}
        />
        <EditorSidebar
          isVisible={sidebarVisible}
          currentNoteId={noteId}
          currentClasseurId={note?.classeur_id}
          onNoteSelect={switchNote}
        />
        <HtmlNoteEditor
          noteId={note.id}
          title={note.source_title}
          rawContent={rawContent}
          updateNote={updateNote}
          onClose={onClose ?? (() => {
            if (window.history.length > 1) {
              router.back();
            } else {
              router.push('/');
            }
          })}
        />
      </>
    );
  }

  return (
    <EditorErrorBoundary>
      <EmbedDepthProvider>
        {/* Plan Note overlay bar */}
        {isPlanNote && (
          <PlanNoteOverlay
            isEditUnlocked={isPlanEditUnlocked}
            onToggleEdit={() => setIsPlanEditUnlocked(prev => !prev)}
            completedCount={planProgress.completed}
            totalCount={planProgress.total}
          />
        )}

        {/* Sidebar Navigation - Pattern chat exact */}
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

        {/* Table des matières fixe */}
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
              currentFont={note?.font_family || 'Manrope'}
              kebabBtnRef={kebabBtnRef}
              canEdit={canEdit}
              handlers={handlersWithEditor}
              handleShareSettingsChange={handleShareSettingsChange}
              publicUrl={note?.public_url || undefined}
              onClose={onClose ?? (() => router.back())}
              currentTitle={editorState.document.title}
              renderDocumentHeader={false}
              layoutMode={layoutMode}
              showReadonlyVisitorKebab={showReadonlyVisitorKebab}
              kebabMenuVariant={kebabMenuVariant}
            />
          )}
          documentHeader={(
            <EditorHeaderSection
              editor={editor}
              noteId={noteId}
              userId={userId}
              isReadonly={isReadonly}
              editorState={editorState}
              currentFont={note?.font_family || 'Manrope'}
              kebabBtnRef={kebabBtnRef}
              canEdit={canEdit}
              handlers={handlersWithEditor}
              handleShareSettingsChange={handleShareSettingsChange}
              publicUrl={note?.public_url || undefined}
              onClose={onClose ?? (() => router.back())}
              currentTitle={editorState.document.title}
              renderToolbar={false}
              layoutMode={layoutMode}
            />
          )}
          a4Mode={editorState.ui.a4Mode}
          title={editorState.headerImage.titleInImage ? undefined : (
            <EditorTitle 
              value={editorState.document.title} 
              onChange={editorState.setTitle} 
              onBlur={handlersWithEditor.handleTitleBlur} 
              placeholder="Titre de la note..." 
              disabled={isReadonly} 
            />
          )}
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
              toolbarContext={toolbarContext}
              classeurId={note?.classeur_id ?? undefined}
              isContentReady={isContentReady}
              sourceType={note?.source_type}
            />
          )}
        />
        
        {/* Global ImageMenu for both header and content insertions */}
        {/* ✅ Afficher le menu d'image si ouvert ET (toolbar visible OU target = header) */}
        {(editorState.ui.showToolbar || editorState.menus.imageMenuTarget === 'header') && (
          <ImageMenu
            open={editorState.menus.imageMenuOpen}
            onClose={() => editorState.setImageMenuOpen(false)}
            onInsertImage={(src: string) => handlersWithEditor.handleImageInsert(src, editorState.menus.imageMenuTarget)}
            noteId={note.id}
            userId={userId}
          />
        )}
        
        {/* Menu contextuel Notion-like */}
        <EditorContextMenuContainer
          editor={editor}
          editorState={editorState}
          onOpenImageMenu={() => {
            editorState.setImageMenuTarget('content');
            editorState.setImageMenuOpen(true);
          }}
        />
        
        {/* ✅ DÉSACTIVÉ : EditorSyncManager - Test pour diagnostiquer un bug */}
        {/* <EditorSyncManager
          editor={editor}
          storeContent={rawContent}
          editorState={editorState}
          noteId={noteId}
          onInitialContentLoaded={() => setIsContentReady(true)}
        /> */}
        
        {/* Realtime Status (dev only) */}
        {process.env.NODE_ENV === 'development' && userId && (
          <RealtimeStatus userId={userId} noteId={noteId} />
        )}
        
        {/* Bouton "Crafted with Scrivia" - visible en mode preview */}
        {editorState.ui.previewMode && <CraftedButton />}

        {/* Chat FAB + widget panel — pleine page desktop, jamais sur pages publiques/readonly */}
        {layoutMode === 'full' && !readonly && <ChatWidgetFab />}
        {layoutMode === 'full' && !readonly && <ChatWidgetRoot />}
      </EmbedDepthProvider>
    </EditorErrorBoundary>
  );
};

export default Editor;
