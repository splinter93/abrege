import React from 'react';
// ✅ OPTIMISÉ: Bundle CSS consolidé (17 imports → 1)
// Ordre critique conservé dans editor-bundle.css
import '@/styles/editor-bundle.css';
import EditorLayout from './EditorLayout';
import EditorHeader from './EditorHeader';
import EditorContent from './EditorContent';
import ModernToolbar from './ModernToolbar';
import EditorHeaderImage from '@/components/EditorHeaderImage';
import EditorKebabMenu from '@/components/EditorKebabMenu';
import EditorTitle from './EditorTitle';
import PublicTableOfContents from '@/components/TableOfContents';
import LinkDebugger from '@/components/debug/LinkDebugger';
import { useFileSystemStore } from '@/store/useFileSystemStore';
import type { FileSystemState } from '@/store/useFileSystemStore';
import { useMarkdownRender } from '@/hooks/editor/useMarkdownRender';
import useEditorSave from '@/hooks/useEditorSave';
import { useFontManager } from '@/hooks/useFontManager';
import { useWideModeManager } from '@/hooks/useWideModeManager';
import type { ShareSettings, ShareSettingsUpdate } from '@/types/sharing';
import { getDefaultShareSettings } from '@/types/sharing';
import { useEditor, EditorContent as TiptapEditorContent } from '@tiptap/react';
import lowlight from '@/utils/lowlightInstance';
import EditorSlashMenu, { type EditorSlashMenuHandle } from '@/components/EditorSlashMenu';
import TableControls from '@/components/editor/TableControls';
import FloatingMenuNotion from './FloatingMenuNotion';
// import DragHandle from './DragHandle'; // Plus nécessaire - extension intégrée
import { useRouter } from 'next/navigation';
import { FiEye, FiX, FiImage } from 'react-icons/fi';
import { v2UnifiedApi } from '@/services/V2UnifiedApi';
import { supabase } from '@/supabaseClient';
import { toast } from 'react-hot-toast';
import ImageMenu from '@/components/ImageMenu';
import { useAuth } from '@/hooks/useAuth';
import { uploadImageForNote } from '@/utils/fileUpload';
import { logger, LogCategory } from '@/utils/logger';
import type { FullEditorInstance } from '@/types/editor';
import { useRealtime } from '@/hooks/useRealtime';
import RealtimeStatus from '@/components/RealtimeStatus';
import { preprocessMarkdown } from '@/utils/markdownPreprocessor';
import { debounce, cleanEscapedMarkdown, hashString } from '@/utils/editorHelpers';
import { 
  DEBOUNCE_DELAYS, 
  TIMEOUTS, 
  DEFAULT_HEADER_IMAGE_CONFIG,
  CONTEXT_MENU_CONFIG,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES 
} from '@/utils/editorConstants';
import { useNoteUpdate, useHeaderImageUpdate } from '@/hooks/editor/useNoteUpdate';
import { useEditorState } from '@/hooks/editor/useEditorState';
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
import { useUIContext } from '@/hooks/useUIContext';

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
const Editor: React.FC<{ noteId: string; readonly?: boolean; userId?: string }> = ({ noteId, readonly = false, userId: propUserId }) => {
  // 🔧 CORRECTION : Utiliser le vrai ID utilisateur de la session
  const { user } = useAuth();
  const userId = propUserId || user?.id || 'anonymous';
  
  const router = useRouter();
  
  const selectNote = React.useCallback((s: FileSystemState) => s.notes[noteId], [noteId]);
  const note = useFileSystemStore(selectNote);
  
  // Collecter le contexte UI pour l'injection dans le chat
  const uiContext = useUIContext({
    activeNote: note ? {
      id: note.id,
      slug: note.slug || note.id,
      name: note.source_title || 'Note sans titre'
    } : undefined
  });

  // 🔍 DEBUG: Log du contexte UI collecté
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
      visibility: (note.share_settings.visibility as any) || 'private',
      invited_users: note.share_settings.invited_users || [],
      allow_edit: note.share_settings.allow_edit || false,
      allow_comments: note.share_settings.allow_comments || false,
    } : getDefaultShareSettings(),
  });

  // Forcer la mise à jour de la TOC quand la note arrive
  React.useEffect(() => {
    if (note && content && !editorState.document.noteLoaded) {
      editorState.setNoteLoaded(true);
      editorState.updateTOC();
    }
  }, [note, content, noteId, editorState]);

  // Synchroniser le titre avec la note
  React.useEffect(() => { 
    editorState.setTitle(note?.source_title || ''); 
  }, [note?.source_title, editorState]);

  // Ref pour le bouton kebab (besoin de calcul de position)
  const kebabBtnRef = React.useRef<HTMLButtonElement | null>(null);

  // 🔄 Realtime Integration - Service simple et robuste
  const realtime = useRealtime({
    userId,
    noteId,
    debug: false,
    onEvent: (event) => {
      
      // Les événements sont déjà traités par le dispatcher
      // qui met à jour le store via updateNoteContent
      // L'éditeur réagira automatiquement via le useEffect ci-dessus
    },
    onStateChange: (state) => {
    }
  });

  // Context menu géré par editorState
  const isReadonly = readonly || editorState.ui.previewMode;

  const handleHeaderChange = React.useCallback(async (url: string | null) => {
    const normalize = (u: string | null): string | null => {
      if (!u) return null;
      try {
        if (u.startsWith('/')) {
          // Root-relative path → make absolute for API validation
          const abs = new URL(u, window.location.origin).toString();
          return abs;
        }
        // If it's already absolute, keep as is
        // Will throw if invalid
        // eslint-disable-next-line no-new
        new URL(u);
        return u;
      } catch {
        return u;
      }
    };
    const normalized = normalize(url);
    editorState.setHeaderImageUrl(normalized);
    try {
      updateNote(noteId, { header_image: normalized || undefined });
      await v2UnifiedApi.updateNote(noteId, { header_image: normalized }, userId);
    } catch (error) {
      logger.error(LogCategory.EDITOR, 'Error updating header image');
    }
  }, [noteId, updateNote, userId, editorState]);

  React.useEffect(() => {
    if (editorState.menus.kebabOpen && kebabBtnRef.current) {
      const rect = kebabBtnRef.current.getBoundingClientRect();
      editorState.setKebabPos({ 
        top: rect.bottom + CONTEXT_MENU_CONFIG.kebabMenuOffsetTop, 
        left: rect.left - CONTEXT_MENU_CONFIG.kebabMenuOffsetLeft
      });
    }
  }, [editorState]);

  // Ref to the element that contains .ProseMirror so TOC can scroll into view
  const editorContainerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (note?.header_image) editorState.setHeaderImageUrl(note.header_image);
  }, [note?.header_image, editorState]);

  // Hydrate appearance fields from note
  React.useEffect(() => {
    if (typeof note?.header_image_offset === 'number') editorState.setHeaderImageOffset(note.header_image_offset);
  }, [note?.header_image_offset, editorState]);
  React.useEffect(() => {
    if (typeof note?.header_image_blur === 'number') editorState.setHeaderImageBlur(note.header_image_blur);
  }, [note?.header_image_blur, editorState]);
  React.useEffect(() => {
    if (typeof note?.header_image_overlay === 'number') editorState.setHeaderImageOverlay(note.header_image_overlay);
  }, [note?.header_image_overlay, editorState]);
  React.useEffect(() => {
    if (typeof note?.header_title_in_image === 'boolean') editorState.setHeaderTitleInImage(note.header_title_in_image);
  }, [note?.header_title_in_image, editorState]);
  // Initialisation du wide mode depuis la note (seulement au chargement initial)
  React.useEffect(() => {
    if (typeof note?.wide_mode === 'boolean' && !editorState.ui.fullWidth) {
      editorState.setFullWidth(note.wide_mode);
    }
  }, [note?.wide_mode, editorState]);
  


  const slashMenuRef = React.useRef<EditorSlashMenuHandle | null>(null);

  // Gestion du menu contextuel
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleContextMenu = (event: CustomEvent) => {
      if (isReadonly) return;
      
      const { coords, nodeType, hasSelection, position } = event.detail;
      editorState.openContextMenu(coords, nodeType, hasSelection, position);
    };

    document.addEventListener('tiptap-context-menu', handleContextMenu as EventListener);
    return () => document.removeEventListener('tiptap-context-menu', handleContextMenu as EventListener);
  }, [isReadonly, editorState]);


  // Real Tiptap editor instance (Markdown as source of truth)
  // Mise à jour intelligente du contenu de l'éditeur quand la note change
  // (géré par editorState.internal.isUpdatingFromStore)

  /**
   * Gestionnaire de mise à jour de l'éditeur
   * 
   * @description Callback optimisé pour gérer les changements de contenu de l'éditeur.
   * Met à jour le Markdown source de vérité et synchronise avec le store.
   * 
   * @param editor - Instance de l'éditeur Tiptap
   */
  const handleEditorUpdate = React.useCallback(({ editor }: { editor: any }) => {
    if (!editor || editorState.internal.isUpdatingFromStore) return;
    
    try {
      const md = (editor.storage as any)?.markdown?.getMarkdown?.() as string | undefined;
      const nextMarkdown = typeof md === 'string' ? md : content;
      if (nextMarkdown !== content) {
        // 🔧 CORRECTION : Nettoyer le Markdown échappé avant sauvegarde
        const cleanMarkdown = cleanEscapedMarkdown(nextMarkdown);
        updateNote(noteId, { markdown_content: cleanMarkdown });
      }
    } catch (error) {
      logger.error(LogCategory.EDITOR, 'Erreur lors de la mise à jour du contenu:', error);
    }
  }, [content, noteId, updateNote, editorState]);

  const editor = useEditor({
    editable: !isReadonly,
    immediatelyRender: false, // Éviter les erreurs de SSR/hydration
    extensions: createEditorExtensions(PRODUCTION_EXTENSIONS_CONFIG, lowlight), // Configuration stable mais fonctionnelle
    content: content || '',
    onUpdate: handleEditorUpdate,
  });

  // 🔄 Synchronisation gérée par EditorSyncManager (composant séparé)

  // Gestion du menu contextuel déléguée au composant EditorContextMenuContainer

  // Note: cleanEscapedMarkdown maintenant importé depuis @/utils/editorHelpers

  // Mettre à jour la TOC quand l'éditeur change - optimisé avec debounce
  React.useEffect(() => {
    if (!editor) return;
    
    // Écouter les changements de l'éditeur avec debounce
    const debouncedUpdateTOC = debounce(editorState.updateTOC, DEBOUNCE_DELAYS.TOC_UPDATE);
    
    // ✅ OPTIMISATION: Retrait de 'selectionUpdate' - pas besoin de recalculer la TOC
    // quand l'utilisateur déplace simplement le curseur
    editor.on('update', debouncedUpdateTOC);
    
    return () => {
      editor.off('update', debouncedUpdateTOC);
    };
  }, [editor, editorState]);
  
  // Synchronisation gérée par EditorSyncManager (composant séparé)

  // Open slash menu on '/'
  React.useEffect(() => {
    if (!editor || isReadonly) return;
    const el = editor.view.dom as HTMLElement;
    const onKeyDown = (e: KeyboardEvent) => {
      // DEBUG désactivé en prod
      // if (e.key === ' ') {
      //   console.log('🔍 ESPACE DÉTECTÉ:', {
      //     key: e.key,
      //     selectionType: editor?.state.selection.constructor.name,
      //     isEditable: editor?.isEditable,
      //     activeElement: document.activeElement?.tagName,
      //     defaultPrevented: e.defaultPrevented,
      //   });
      // }
      
      // If user types a space right after '/', close menu but do not delete any text
      if (e.key === ' ' && editor) {
        try {
          const { state } = editor.view;
          const { selection } = state;
          
          // CRITICAL: Si c'est une NodeSelection, on skip toute la logique
          // Laisser juste l'espace passer normalement
          if (selection.constructor.name === 'NodeSelection' || selection.constructor.name === 'NodeRangeSelection') {
            console.log('⚠️ NodeSelection détectée, skip logique slash menu');
            // Ne rien faire, laisser Tiptap gérer l'espace normalement
            return;
          }
          
          const pos = selection.from;
          const $pos = state.doc.resolve(pos);
          const textBefore = $pos.parent.textBetween(0, $pos.parentOffset, undefined, '\uFFFC');
          if (/^\/$/.test(textBefore)) {
            // User typed "/ ": close menu and keep the slash in content
            slashMenuRef.current?.closeMenu?.();
            return; // do not open
          }
        } catch (err) {
          console.error('❌ Erreur dans onKeyDown:', err);
          // En cas d'erreur, laisser passer l'événement normalement
        }
      }
      if (e.key === '/') {
        // Ne pas preventDefault - laisser le slash être tapé
        // Le menu s'ouvrira après que le slash soit dans le texte
        setTimeout(() => {
          const coords = editor.view.coordsAtPos(editor.state.selection.from);
          console.log('Editor: ouverture du menu à:', coords);
          slashMenuRef.current?.openMenu({ left: coords.left, top: coords.top });
        }, 10);
      } else if (e.key === ' ') {
        // Fermer le menu slash si ouvert et laisser l'espace être tapé
        if (slashMenuRef.current) {
          slashMenuRef.current.closeMenu();
        }
      }
    };
    el.addEventListener('keydown', onKeyDown);
    return () => el.removeEventListener('keydown', onKeyDown);
  }, [editor, isReadonly]);

  // Save hook
  const { handleSave } = useEditorSave({
    editor: editor ? {
      getHTML: () => editor.getHTML(),
      storage: { markdown: { getMarkdown: () => ((editor.storage as any).markdown as any)?.getMarkdown?.() || '' } }
    } : undefined,
    onSave: async ({ title: newTitle, markdown_content, html_content }) => {
      await v2UnifiedApi.updateNote(noteId, {
        source_title: newTitle ?? editorState.document.title ?? 'Untitled',
        markdown_content,
        html_content,
      }, userId);
    }
  });

  // Gestionnaire de police avec changement CSS automatique
  const { changeFont } = useFontManager(note?.font_family || 'Noto Sans');

  // Gestionnaire de mode large avec changement CSS automatique
  // Utiliser l'état local fullWidth au lieu de note?.wide_mode pour éviter les conflits
  const { changeWideMode } = useWideModeManager(editorState.ui.fullWidth);

  // Initialize share settings from note data
  React.useEffect(() => {
    if (note?.share_settings) {
      const shareSettings = note.share_settings;
      editorState.setShareSettings({
        visibility: (shareSettings.visibility as ShareSettings['visibility']) || 'private',
        invited_users: shareSettings.invited_users || [],
        allow_edit: shareSettings.allow_edit || false,
        allow_comments: shareSettings.allow_comments || false
      });
    }
  }, [note?.share_settings, editorState]);

  // ✅ OPTIMISÉ: Utilisation du hook useShareManager
  const { handleShareSettingsChange } = useShareManager({
    noteId,
    editorState,
    onUpdate: updateNote,
  });

  // ✅ OPTIMISÉ: Utilisation du hook useNoteUpdate
  const updateFontInDb = useNoteUpdate({
        noteId,
        userId,
    field: 'font_family',
    currentValue: note?.font_family || 'Noto Sans',
    errorMessage: ERROR_MESSAGES.SAVE_FONT,
  });

  // Persist font changes via toolbar callback
  const handleFontChange = React.useCallback(async (fontName: string, scope?: 'all' | 'headings' | 'body') => {
    // Changer la police en CSS immédiatement (optimistic)
      changeFont(fontName, scope || 'all');
    
    // Mettre à jour dans la DB
    await updateFontInDb(fontName);
  }, [changeFont, updateFontInDb]);

  // ✅ OPTIMISÉ: Utilisation du hook useNoteUpdate
  const updateWideMode = useNoteUpdate({
    noteId,
    userId,
    field: 'wide_mode',
    currentValue: editorState.ui.fullWidth,
    onSuccess: (value) => {
      editorState.setFullWidth(value);
      changeWideMode(value);
    },
    onError: (error, oldValue) => {
      editorState.setFullWidth(oldValue);
      changeWideMode(oldValue);
    },
    errorMessage: ERROR_MESSAGES.SAVE_WIDE_MODE,
  });

  // Persist fullWidth changes
  const handleFullWidthChange = React.useCallback(async (value: boolean) => {
    await updateWideMode(value);
  }, [updateWideMode]);

  // ✅ OPTIMISÉ: Utilisation du hook useNoteUpdate
  const updateA4Mode = useNoteUpdate({
    noteId,
    userId,
    field: 'a4_mode',
    currentValue: editorState.ui.a4Mode,
    onSuccess: editorState.setA4Mode,
    onError: (error, oldValue) => editorState.setA4Mode(oldValue),
    errorMessage: ERROR_MESSAGES.SAVE_A4_MODE,
  });

  // Persist a4Mode changes
  const handleA4ModeChange = React.useCallback(async (value: boolean) => {
    await updateA4Mode(value);
  }, [updateA4Mode]);

  // ✅ OPTIMISÉ: Utilisation du hook useNoteUpdate
  const updateSlashLang = useNoteUpdate({
    noteId,
    userId,
    field: 'slash_lang',
    currentValue: editorState.ui.slashLang,
    onSuccess: editorState.setSlashLang,
    onError: (error, oldValue) => editorState.setSlashLang(oldValue),
    errorMessage: ERROR_MESSAGES.SAVE_SLASH_LANG,
  });

  // Persist slashLang changes
  const handleSlashLangChange = React.useCallback(async (value: 'fr' | 'en') => {
    await updateSlashLang(value);
  }, [updateSlashLang]);

  // ✅ OPTIMISÉ: Utilisation du hook useHeaderImageUpdate pour les paramètres d'image
  const updateHeaderOffset = useHeaderImageUpdate({
    noteId,
    userId,
    field: 'header_image_offset',
    currentValue: editorState.headerImage.offset,
    onSuccess: (value) => {
      editorState.setHeaderImageOffset(value);
      updateNote(noteId, { header_image_offset: value });
    },
    onError: (error, oldValue) => editorState.setHeaderImageOffset(oldValue),
    errorMessage: ERROR_MESSAGES.SAVE_HEADER_IMAGE_OFFSET,
  });

  const updateHeaderBlur = useHeaderImageUpdate({
    noteId,
    userId,
    field: 'header_image_blur',
    currentValue: editorState.headerImage.blur,
    onSuccess: (value) => {
      editorState.setHeaderImageBlur(value);
      updateNote(noteId, { header_image_blur: value });
    },
    onError: (error, oldValue) => editorState.setHeaderImageBlur(oldValue),
    errorMessage: ERROR_MESSAGES.SAVE_HEADER_IMAGE_BLUR,
  });

  const updateHeaderOverlay = useHeaderImageUpdate({
    noteId,
    userId,
    field: 'header_image_overlay',
    currentValue: editorState.headerImage.overlay,
    onSuccess: (value) => {
      editorState.setHeaderImageOverlay(value);
      updateNote(noteId, { header_image_overlay: value });
    },
    onError: (error, oldValue) => editorState.setHeaderImageOverlay(oldValue),
    errorMessage: ERROR_MESSAGES.SAVE_HEADER_IMAGE_OVERLAY,
  });

  const updateTitleInImage = useNoteUpdate({
    noteId,
    userId,
    field: 'header_title_in_image',
    currentValue: editorState.headerImage.titleInImage,
    onSuccess: (value) => {
      editorState.setHeaderTitleInImage(value);
      updateNote(noteId, { header_title_in_image: value });
    },
    onError: (error, oldValue) => editorState.setHeaderTitleInImage(oldValue),
    errorMessage: ERROR_MESSAGES.SAVE_HEADER_TITLE_IN_IMAGE,
  });

  // Ctrl/Cmd+S
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { 
        e.preventDefault(); 
        handleSave(editorState.document.title || 'Untitled', content); 
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleSave, editorState, content]);

  // Save title on blur
  const handleTitleBlur = React.useCallback(() => {
    handleSave(editorState.document.title || 'Untitled', content);
  }, [handleSave, editorState, content]);

  // Gérer la transcription audio complétée
  const handleTranscriptionComplete = React.useCallback((text: string) => {
    if (!editor) return;
    
    try {
      // Insérer le texte transcrit à la position du curseur
      const { state, dispatch } = editor.view;
      const from = state.selection.from;
      
      // Insérer le texte avec un espace avant si nécessaire
      const insertText = from > 0 && state.doc.textBetween(from - 1, from) !== ' ' ? ` ${text}` : text;
      
      dispatch(state.tr.insertText(insertText, from));
      
      // Mettre le focus sur l'éditeur et placer le curseur après le texte inséré
      editor.commands.focus();
      editor.commands.setTextSelection(from + insertText.length);
      
      if (process.env.NODE_ENV === 'development') {
        logger.debug(LogCategory.EDITOR, `Texte transcrit inséré: "${text}"`);
      }
    } catch (error) {
      logger.error(LogCategory.EDITOR, 'Erreur lors de l\'insertion du texte transcrit:', error);
    }
  }, [editor]);

  // ✅ OPTIMISATION: Créer un hash du contenu pour éviter les re-calculs fréquents
  const contentHash = React.useMemo(() => {
    if (!editor) return 0;
    try {
      const markdown = (editor.storage as any)?.markdown?.getMarkdown?.() || '';
      return hashString(markdown);
    } catch {
      return hashString(content || '');
    }
  }, [editor, content, editorState.document.forceTOCUpdate]);

  // Build headings for TOC - DIRECTEMENT depuis l'éditeur Tiptap (optimisé)
  const headings = React.useMemo(() => {
    // PRIORITÉ 1 : Éditeur Tiptap (si disponible)
    if (editor) {
      try {
        // SOURCE DE VÉRITÉ : Utiliser directement l'éditeur Tiptap
        const doc = editor.state.doc;
        const items: { id: string; text: string; level: number }[] = [];
        
        // Parcourir le document ProseMirror pour trouver les headings
        doc.descendants((node, pos) => {
          if (node.type.name === 'heading') {
            const level = node.attrs.level;
            const text = node.textContent;
            
            // Ne prendre que les h2 et h3 pour la TOC
            if (level >= 2 && level <= 3 && text.trim()) {
              const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
              items.push({ id, text: text.trim(), level });
            }
          }
        });
        
        return items;
        
      } catch (error) {
        logger.error(LogCategory.EDITOR, 'Erreur lors de l\'extraction des headings:', error);
        // Continuer vers le fallback
      }
    }
    
    // PRIORITÉ 2 : Fallback markdown brut (pour chargement initial et erreurs)
    if (content && content.trim()) {
      const markdownLines = content.split('\n');
      const fallbackItems: { id: string; text: string; level: number }[] = [];
      
      markdownLines.forEach((line) => {
        const match = line.match(/^(#{1,6})\s+(.+)/);
        if (match) {
          const level = match[1].length;
          const title = match[2].trim();
          const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
          
          if (level >= 2 && level <= 3) {
            fallbackItems.push({ id, text: title, level });
          }
        }
      });
      
      return fallbackItems;
    }
    
    // AUCUN CONTENU : Retourner tableau vide
    return [];
  }, [editor, contentHash]); // ✅ OPTIMISÉ: Utilise contentHash au lieu de editor.state.doc

  const handlePreviewClick = React.useCallback(async () => {
    try {
      // Prendre le slug depuis le store local
      const noteData = useFileSystemStore.getState().notes[noteId];
      
      // Vérifier si l'utilisateur est connecté et s'il est le créateur de la note
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Vous devez être connecté.');
        return;
      }

      // Si la note est privée, vérifier que l'utilisateur est le créateur
      if (noteData?.share_settings?.visibility === 'private') {
        // Pour les notes privées, on permet toujours la prévisualisation au créateur
        // La vérification se fait côté serveur
      }
      
      if (!noteData?.slug) {
        toast.error('Cette note n\'a pas de slug. Publiez-la d\'abord.');
        return;
      }

      // Récupérer le username
      const { data: userData } = await supabase
        .from('users')
        .select('username')
        .eq('id', user.id)
        .single();

      if (!userData?.username) {
        toast.error('Username non trouvé.');
        return;
      }

      // Construire et ouvrir l'URL
      const url = `${window.location.origin}/${userData.username}/${noteData.slug}`;
      if (process.env.NODE_ENV === 'development') {
        logger.debug(LogCategory.EDITOR, 'Ouverture de l\'URL publique:', url);
      }
      window.open(url, '_blank', 'noopener,noreferrer');
      
    } catch (error) {
      logger.error(LogCategory.EDITOR, 'Erreur bouton œil:', error);
      toast.error('Erreur lors de l\'ouverture de la prévisualisation');
    }
  }, [noteId]);

  React.useEffect(() => {
    if (!editor || isReadonly) return;
    const el = editor.view.dom as HTMLElement;

    const onDrop = async (e: DragEvent) => {
      try {
        if (!e.dataTransfer) return;
        const files = Array.from(e.dataTransfer.files || []);
        if (!files.length) return;
        const image = files.find(f => /^image\/(jpeg|png|webp|gif)$/.test(f.type));
        if (!image) return;
        e.preventDefault();
        const { publicUrl } = await uploadImageForNote(image, noteId);
        // Determine drop position and replace image if dropping over one
        const view = editor.view;
        const coords = { left: e.clientX, top: e.clientY };
        const posAt = view.posAtCoords(coords);
        if (posAt && typeof posAt.pos === 'number') {
          const { state } = view;
          const $pos = state.doc.resolve(posAt.pos);
          const nodeHere = ($pos.nodeAfter && $pos.nodeAfter.type.name === 'image')
            ? $pos.nodeAfter
            : ($pos.nodeBefore && $pos.nodeBefore.type.name === 'image')
              ? $pos.nodeBefore
              : null;
          if (nodeHere) {
            // Select the image node at this position and update its src
            const { NodeSelection } = require('prosemirror-state');
            const imagePos = $pos.nodeAfter && $pos.nodeAfter.type.name === 'image' ? posAt.pos : (posAt.pos - (nodeHere?.nodeSize || 1));
            const tr = state.tr.setSelection(NodeSelection.create(state.doc, imagePos));
            view.dispatch(tr);
            editor.commands.updateAttributes('image', { src: publicUrl });
            return;
          }
          // Otherwise, insert at the computed position
          const { TextSelection } = require('prosemirror-state');
          const tr = state.tr.setSelection(TextSelection.near(state.doc.resolve(posAt.pos)));
          view.dispatch(tr);
        }
        editor.chain().focus().setImage({ src: publicUrl }).run();
      } catch {}
    };

    const onDragOver = (e: DragEvent) => {
      if (!e.dataTransfer) return;
      const hasImage = Array.from(e.dataTransfer.items || []).some(it => it.kind === 'file');
      if (hasImage) e.preventDefault();
    };

    el.addEventListener('drop', onDrop);
    el.addEventListener('dragover', onDragOver);
    return () => {
      el.removeEventListener('drop', onDrop);
      el.removeEventListener('dragover', onDragOver);
    };
  }, [editor, isReadonly, noteId]);

  if (!note) {
    return <div className="editor-flex-center editor-padding-standard">Chargement…</div>;
  }

  return (
    <>
      {/* 🔍 Debug: Vérifier les liens */}
      <LinkDebugger />
      
      {/* 🔄 Realtime System - Service simple et robuste */}
        <div className="editor-toc-fixed">
          <PublicTableOfContents headings={headings} containerRef={editorContainerRef} />
        </div>
      <EditorLayout
        layoutClassName={editorState.headerImage.url ? (editorState.headerImage.titleInImage ? 'noteLayout imageWithTitle' : 'noteLayout imageOnly') : 'noteLayout noImage'}
        header={(
          <>
            <EditorHeader
              headerImageUrl={null}
              rightSlot={(
                <>
                  <button
                    className={`editor-header-preview${editorState.ui.previewMode ? ' active' : ''}`}
                    aria-label="Aperçu"
                    title="Aperçu"
                    onClick={handlePreviewClick}
                  >
                    <FiEye size={16} />
                  </button>
                  <button ref={kebabBtnRef} className="editor-header-kebab" aria-label="Options" title="Options" onClick={editorState.toggleKebabMenu}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="5" cy="12" r="2" fill="currentColor" />
                      <circle cx="12" cy="12" r="2" fill="currentColor" />
                      <circle cx="19" cy="12" r="2" fill="currentColor" />
                    </svg>
                  </button>
                  <button
                    className="editor-header-close"
                    aria-label="Fermer"
                    title="Fermer"
                    onClick={() => router.back()}
                  >
                    <FiX size={16} />
                  </button>
                </>
              )}
            >
              <ModernToolbar 
                editor={isReadonly ? null : (editor as any)} 
                setImageMenuOpen={editorState.setImageMenuOpen} 
                onFontChange={handleFontChange}
                currentFont={note?.font_family || 'Noto Sans'}
                onTranscriptionComplete={handleTranscriptionComplete}
              />
            </EditorHeader>
            {/* Add header image CTA when no image is set */}
            {!editorState.headerImage.url && (
              <>
                <div className="editor-add-header-image-row editor-full-width editor-add-image-center">
                  <div className="editor-container-width editor-image-container-width">
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
                          handleHeaderChange(publicUrl);
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
                        <FiImage size={16} />
                      </button>
                    </div>
                  </div>
                </div>
                {/* ImageMenu is rendered globally below */}
              </>
            )}
            <EditorHeaderImage
              headerImageUrl={editorState.headerImage.url}
              headerImageOffset={editorState.headerImage.offset}
              headerImageBlur={editorState.headerImage.blur}
              headerImageOverlay={editorState.headerImage.overlay}
              headerTitleInImage={editorState.headerImage.titleInImage}
              onHeaderChange={handleHeaderChange}
              onHeaderOffsetChange={updateHeaderOffset}
              onHeaderBlurChange={updateHeaderBlur}
              onHeaderOverlayChange={updateHeaderOverlay}
              onHeaderTitleInImageChange={updateTitleInImage}
              imageMenuOpen={editorState.menus.imageMenuOpen}
              onImageMenuOpen={() => editorState.setImageMenuOpen(true)}
              onImageMenuClose={() => editorState.setImageMenuOpen(false)}
              noteId={note.id}
              userId={userId}
            />
            <EditorKebabMenu
              open={editorState.menus.kebabOpen}
              position={editorState.menus.kebabPos}
              onClose={() => editorState.setKebabOpen(false)}
              a4Mode={editorState.ui.a4Mode}
              setA4Mode={handleA4ModeChange}
              slashLang={editorState.ui.slashLang}
              setSlashLang={handleSlashLangChange}
              fullWidth={editorState.ui.fullWidth}
              setFullWidth={handleFullWidthChange}
              noteId={noteId}
              currentShareSettings={editorState.shareSettings}
              onShareSettingsChange={handleShareSettingsChange}
              publicUrl={note?.public_url || undefined}
            />
          </>
        )}
        title={<EditorTitle value={editorState.document.title} onChange={editorState.setTitle} onBlur={handleTitleBlur} placeholder="Titre de la note..." wideMode={editorState.ui.fullWidth} />}
        content={(
          <>
            {/* Floating menu Notion-like - rendu en dehors du conteneur */}
            {!isReadonly && (
              <FloatingMenuNotion 
                editor={editor as any} 
                onAskAI={(selectedText) => {
                  // TODO: Implémenter l'action Ask AI
                  console.log('Ask AI with text:', selectedText);
                  toast.success(`Ask AI: "${selectedText}"`);
                }}
              />
            )}
            <EditorContent>
            {!isReadonly && (
              <div className="tiptap-editor-container" ref={editorContainerRef}>
                <TiptapEditorContent editor={editor} />
                {/* Drag Handle intégré via l'extension DragHandleExtension */}
                {/* Table controls */}
                <TableControls editor={editor as any} containerRef={editorContainerRef as React.RefObject<HTMLElement>} />
                {/* Slash commands menu */}
                <EditorSlashMenu
                  ref={slashMenuRef}
                  editor={editor as any}
                  lang={editorState.ui.slashLang}
                  onOpenImageMenu={() => { 
                    editorState.setImageMenuTarget('content'); 
                    editorState.setImageMenuOpen(true); 
                  }}
                  onInsert={(cmd) => {
                    if (!editor) {
                      logger.error(LogCategory.EDITOR, 'Editor non disponible pour slash command');
                      return;
                    }
                    
                    try {
                      // Remove any preceding slash token if present
                      const { state, dispatch } = editor.view;
                      const from = state.selection.from;
                      const $pos = state.doc.resolve(from);
                      const start = $pos.start();
                      const textBefore = $pos.parent.textBetween(0, $pos.parentOffset, undefined, '\uFFFC');
                      const match = textBefore.match(/\/?[\w-]*$/);
                      if (match) {
                        const deleteFrom = start + $pos.parentOffset - match[0].length;
                        dispatch(state.tr.delete(deleteFrom, from));
                      }
                    } catch (error) {
                      logger.error(LogCategory.EDITOR, 'Erreur suppression slash:', error);
                    }
                    
                      // Execute command action
                    console.log('Exécution de la commande:', cmd.id, cmd);
                    if (typeof cmd.action === 'function') {
                      try {
                        cmd.action(editor as any);
                        console.log('Commande exécutée avec succès:', cmd.id);
                      } catch (error) {
                        console.error('Erreur exécution commande:', error);
                        logger.error(LogCategory.EDITOR, 'Erreur exécution commande:', error);
                      }
                    } else {
                      console.error('Action non définie pour la commande:', cmd.id);
                      logger.error(LogCategory.EDITOR, 'Action non définie pour la commande:', cmd.id);
                    }
                  }}
                />
              </div>
            )}
            {isReadonly && (
              <div className="markdown-body" dangerouslySetInnerHTML={{ __html: html }} />
            )}
          </EditorContent>
          </>
        )}
      />
      {/* Global ImageMenu for both header and content insertions */}
      <ImageMenu
        open={editorState.menus.imageMenuOpen}
        onClose={() => editorState.setImageMenuOpen(false)}
        onInsertImage={(src: string) => {
          if (editorState.menus.imageMenuTarget === 'header') {
            return handleHeaderChange(src);
          }
          if (editor) {
            try { editor.chain().focus().setImage({ src }).run(); } catch {}
          }
        }}
        noteId={note.id}
        userId={userId}
      />
      
      {/* Menu contextuel Notion-like */}
      <EditorContextMenuContainer
        editor={editor as any}
        editorState={editorState}
        onOpenImageMenu={() => {
          editorState.setImageMenuTarget('content');
          editorState.setImageMenuOpen(true);
        }}
      />
      
      {/* Gestionnaire de synchronisation store ↔ éditeur */}
      <EditorSyncManager
        editor={editor as any}
        storeContent={content}
        editorState={editorState}
      />
      
      {/* 🔍 Realtime Status (dev only) */}
      {process.env.NODE_ENV === 'development' && userId && (
        <RealtimeStatus userId={userId} noteId={noteId} />
      )}
      
      {/* 🧪 Test simple du contexte UI */}
      {process.env.NODE_ENV === 'development' && uiContext && (
        <div style={{
          position: 'fixed',
          top: '10px',
          left: '10px',
          background: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '10px',
          borderRadius: '8px',
          fontSize: '12px',
          zIndex: 9999,
          maxWidth: '300px'
        }}>
          <div><strong>🎯 Contexte UI:</strong></div>
          <div>Utilisateur: {uiContext.user?.name || 'N/A'}</div>
          <div>Page: {uiContext.page?.name || 'N/A'}</div>
          <div>Note: {uiContext.activeNote?.name || 'N/A'}</div>
        </div>
      )}
      
    </>
  );
};

export default Editor; 