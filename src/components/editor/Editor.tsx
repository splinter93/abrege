import React from 'react';
import '@/styles/markdown.css';
import EditorLayout from './EditorLayout';
import EditorHeader from './EditorHeader';
import EditorContent from './EditorContent';
import EditorToolbar from './EditorToolbar';
import EditorHeaderImage from '@/components/EditorHeaderImage';
import EditorKebabMenu from '@/components/EditorKebabMenu';
import EditorTitle from './EditorTitle';
import PublicTableOfContents from '@/components/TableOfContents';
import { useFileSystemStore } from '@/store/useFileSystemStore';
import type { FileSystemState } from '@/store/useFileSystemStore';
import { useMarkdownRender } from '@/hooks/editor/useMarkdownRender';
import useEditorSave from '@/hooks/useEditorSave';
import { useFontManager } from '@/hooks/useFontManager';
import { useWideModeManager } from '@/hooks/useWideModeManager';
import type { ShareSettings, ShareSettingsUpdate } from '@/types/sharing';
import { getDefaultShareSettings } from '@/types/sharing';
import { useEditor, EditorContent as TiptapEditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import { Markdown } from 'tiptap-markdown';
import Link from '@tiptap/extension-link';
import CustomImage from '@/extensions/CustomImage';
import CodeBlockWithCopy from '@/extensions/CodeBlockWithCopy';
import lowlight from '@/utils/lowlightInstance';
import EditorSlashMenu, { type EditorSlashMenuHandle } from '@/components/EditorSlashMenu';
import TableControls from '@/components/editor/TableControls';
import { useRouter } from 'next/navigation';
import { FiEye, FiX, FiImage } from 'react-icons/fi';
import { v2UnifiedApi } from '@/services/V2UnifiedApi';
import { supabase } from '@/supabaseClient';
import { toast } from 'react-hot-toast';
import ImageMenu from '@/components/ImageMenu';
import { uploadImageForNote } from '@/utils/fileUpload';
import { logger, LogCategory } from '@/utils/logger';
import type { FullEditorInstance, CustomImageExtension, CodeBlockWithCopyExtension } from '@/types/editor';

/**
 * Full Editor – markdown is source of truth; HTML only for display.
 * Optimisé pour les performances avec extensions réduites.
 */
const Editor: React.FC<{ noteId: string; readonly?: boolean; userId?: string }> = ({ noteId, readonly = false, userId = 'me' }) => {
  const router = useRouter();
  const selectNote = React.useCallback((s: FileSystemState) => s.notes[noteId], [noteId]);
  const note = useFileSystemStore(selectNote);
  const updateNote = useFileSystemStore(s => s.updateNote);
  const content = note?.content || note?.markdown_content || '';
  const { html } = useMarkdownRender({ content });

  // 🚨 ÉTAT DE CHARGEMENT : Forcer la régénération de la TOC
  const [noteLoaded, setNoteLoaded] = React.useState(false);
  const [forceTOCUpdate, setForceTOCUpdate] = React.useState(0);

  // 🚨 FORCER la mise à jour de la TOC quand la note arrive
  React.useEffect(() => {
    if (note && content && !noteLoaded) {
      setNoteLoaded(true);
      setForceTOCUpdate(prev => prev + 1);
    }
  }, [note, content, noteId, noteLoaded]);

  const [title, setTitle] = React.useState<string>(note?.source_title || note?.title || '');
  React.useEffect(() => { setTitle(note?.source_title || note?.title || ''); }, [note?.source_title, note?.title]);

  const [headerImageUrl, setHeaderImageUrl] = React.useState<string | null>(note?.header_image || null);
  const [headerOffset, setHeaderOffset] = React.useState<number>(50);
  const [headerBlur, setHeaderBlur] = React.useState<number>(0);
  const [headerOverlay, setHeaderOverlay] = React.useState<number>(0);
  const [titleInImage, setTitleInImage] = React.useState<boolean>(false);
  const [imageMenuOpen, setImageMenuOpen] = React.useState(false);
  const [imageMenuTarget, setImageMenuTarget] = React.useState<'header' | 'content'>('header');

  // header actions state
  const [previewMode, setPreviewMode] = React.useState(false);

  // Kebab state
  const [kebabOpen, setKebabOpen] = React.useState(false);
  const kebabBtnRef = React.useRef<HTMLButtonElement | null>(null);
  const [kebabPos, setKebabPos] = React.useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [a4Mode, setA4Mode] = React.useState(false);
  const [fullWidth, setFullWidth] = React.useState(false);
  const [slashLang, setSlashLang] = React.useState<'fr' | 'en'>('en');
  
  // Share settings state
  const [shareSettings, setShareSettings] = React.useState<ShareSettings>(getDefaultShareSettings());

  const isReadonly = readonly || previewMode;

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
    setHeaderImageUrl(normalized);
    try {
      updateNote(noteId, { header_image: normalized });
      await v2UnifiedApi.updateNote(noteId, { header_image: normalized ?? null }, userId);
    } catch (error) {
      logger.error(LogCategory.EDITOR, 'Error updating header image');
    }
  }, [noteId, updateNote, userId]);

  React.useEffect(() => {
    if (kebabOpen && kebabBtnRef.current) {
      const rect = kebabBtnRef.current.getBoundingClientRect();
      setKebabPos({ 
        top: rect.bottom + 3, 
        left: rect.left - 150 // Décaler vers la gauche pour centrer le menu sur le bouton
      });
    }
  }, [kebabOpen]);

  // Ref to the element that contains .ProseMirror so TOC can scroll into view
  const editorContainerRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (note?.header_image) setHeaderImageUrl(note.header_image);
  }, [note?.header_image]);

  // Hydrate appearance fields from note
  React.useEffect(() => {
    if (typeof note?.header_image_offset === 'number') setHeaderOffset(note.header_image_offset);
  }, [note?.header_image_offset]);
  React.useEffect(() => {
    if (typeof note?.header_image_blur === 'number') setHeaderBlur(note.header_image_blur);
  }, [note?.header_image_blur]);
  React.useEffect(() => {
    if (typeof note?.header_image_overlay === 'number') setHeaderOverlay(note.header_image_overlay as number);
  }, [note?.header_image_overlay]);
  React.useEffect(() => {
    if (typeof note?.header_title_in_image === 'boolean') setTitleInImage(note.header_title_in_image);
  }, [note?.header_title_in_image]);
  React.useEffect(() => {
    if (typeof note?.wide_mode === 'boolean') setFullWidth(note.wide_mode);
  }, [note?.wide_mode]);
  


  const slashMenuRef = React.useRef<EditorSlashMenuHandle | null>(null);

  // Real Tiptap editor instance (Markdown as source of truth)
  const editor = useEditor({
    editable: !isReadonly,
    extensions: [
      StarterKit.configure({ 
        codeBlock: false,
        // Désactiver les extensions non essentielles pour les performances
        code: false,
        horizontalRule: false
      }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TaskList,
      TaskItem,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      // Code block with copy button and lowlight highlighting
      CodeBlockWithCopy.configure({ lowlight }),
      Link.configure({ openOnClick: false, autolink: true, linkOnPaste: true }),
      // Custom image node view to hook our image menu
      CustomImage.configure({ inline: false }),
      Markdown.configure({ html: false })
    ],
    content: content || '',
    onUpdate: React.useCallback(({ editor }) => {
      try {
        const md = editor.storage?.markdown?.getMarkdown?.() as string | undefined;
        const nextMarkdown = typeof md === 'string' ? md : content;
        if (nextMarkdown !== content) {
          updateNote(noteId, { content: nextMarkdown, markdown_content: nextMarkdown });
        }
      } catch {
        // ignore
      }
    }, [content, noteId, updateNote]),
  });

  // 🔧 Mise à jour intelligente du contenu de l'éditeur quand la note change
  const [isUpdatingFromStore, setIsUpdatingFromStore] = React.useState(false);
  
  // 🚨 ÉCOUTEUR TEMPS RÉEL : Mettre à jour la TOC quand l'éditeur change
  React.useEffect(() => {
    if (!editor) return;
    
    const updateTOC = () => {
      // Forcer la mise à jour des headings
    };
    
    // Écouter les changements de l'éditeur
    editor.on('update', updateTOC);
    editor.on('selectionUpdate', updateTOC);
    
    return () => {
      editor.off('update', updateTOC);
      editor.off('selectionUpdate', updateTOC);
    };
  }, [editor]);
  
  React.useEffect(() => {
    if (editor && content && !isUpdatingFromStore) {
      const editorContent = editor.storage?.markdown?.getMarkdown?.() || '';
      
      // Ne mettre à jour que si le contenu est vraiment différent (éviter les boucles)
      if (content !== editorContent) {
        try {
          setIsUpdatingFromStore(true);
          
          // Sauvegarder la position actuelle du curseur
          const currentPos = editor.state.selection.from;
          
          // Mettre à jour le contenu de l'éditeur avec le contenu de la note
          editor.commands.setContent(content);
          
          // Restaurer la position du curseur si elle est toujours valide
          if (currentPos <= editor.state.doc.content.size) {
            editor.commands.setTextSelection(currentPos);
          }
          
          logger.debug(LogCategory.EDITOR, 'Contenu mis à jour depuis la note: ' + content.substring(0, 100) + '...');
        } catch (error) {
          logger.error(LogCategory.EDITOR, 'Erreur mise à jour contenu: ' + error);
        } finally {
          setIsUpdatingFromStore(false);
        }
      }
    }
  }, [editor, content, isUpdatingFromStore]);

  // Open slash menu on '/'
  React.useEffect(() => {
    if (!editor || isReadonly) return;
    const el = editor.view.dom as HTMLElement;
    const onKeyDown = (e: KeyboardEvent) => {
      // If user types a space right after '/', close menu but do not delete any text
      if (e.key === ' ' && editor) {
        try {
          const { state } = editor.view;
          const pos = state.selection.from;
          const $pos = state.doc.resolve(pos);
          const textBefore = $pos.parent.textBetween(0, $pos.parentOffset, undefined, '\uFFFC');
          if (/^\/$/.test(textBefore)) {
            // User typed "/ ": close menu and keep the slash in content
            slashMenuRef.current?.closeMenu?.();
            return; // do not open
          }
        } catch {}
      }
      if (e.key === '/') {
        console.log('🔍 [SLASH] Slash détecté!');
        // Ouvrir le menu slash pour tous les slashes (test)
        e.preventDefault();
        const coords = editor.view.coordsAtPos(editor.state.selection.from);
        console.log('🔍 [SLASH] Coords:', coords);
        console.log('🔍 [SLASH] slashMenuRef.current:', slashMenuRef.current);
        slashMenuRef.current?.openMenu({ left: coords.left, top: coords.top });
      }
    };
    el.addEventListener('keydown', onKeyDown);
    return () => el.removeEventListener('keydown', onKeyDown);
  }, [editor, isReadonly]);

  // Save hook
  const { handleSave } = useEditorSave({
    editor: editor as FullEditorInstance,
    onSave: async ({ title: newTitle, markdown_content, html_content }) => {
      await v2UnifiedApi.updateNote(noteId, {
        source_title: newTitle ?? title ?? 'Untitled',
        markdown_content,
        html_content,
      }, userId);
    }
  });

  // Gestionnaire de police avec changement CSS automatique
  const { changeFont } = useFontManager(note?.font_family || 'Noto Sans');

  // Gestionnaire de mode large avec changement CSS automatique
  const { changeWideMode } = useWideModeManager(note?.wide_mode || false);

  // Initialize share settings from note data
  React.useEffect(() => {
    if (note?.share_settings) {
      setShareSettings(note.share_settings);
    }
  }, [note?.share_settings]);

  // Handle share settings changes
  const handleShareSettingsChange = React.useCallback(async (newSettings: ShareSettingsUpdate) => {
    try {
      logger.info(LogCategory.EDITOR, 'Début de handleShareSettingsChange');
      logger.debug(LogCategory.EDITOR, 'handleShareSettingsChange - newSettings', newSettings);
      
      // Update local state with proper type casting
      const updatedSettings: ShareSettings = {
        visibility: newSettings.visibility || 'private',
        invited_users: newSettings.invited_users || [],
        allow_edit: newSettings.allow_edit || false,
        allow_comments: newSettings.allow_comments || false
      };
      setShareSettings(updatedSettings);
      logger.info(LogCategory.EDITOR, 'État local mis à jour');
      
      // Update note in store
      updateNote(noteId, { 
        share_settings: updatedSettings
      });
      logger.info(LogCategory.EDITOR, 'Store mis à jour');
      
      // Call API to update share settings
      logger.info(LogCategory.EDITOR, 'Début appel API...');
      const { data: { session } } = await supabase.auth.getSession();
      logger.info(LogCategory.EDITOR, 'Session récupérée:', session ? 'PRÉSENTE' : 'ABSENTE');
      
      const token = session?.access_token;
      logger.info(LogCategory.EDITOR, 'Token extrait:', token ? 'PRÉSENT' : 'ABSENT');
      
      if (!token) {
        logger.error(LogCategory.EDITOR, 'Pas de token, erreur authentification');
        throw new Error('Authentification requise');
      }
      
      const apiUrl = `/api/v2/note/${encodeURIComponent(noteId)}/share`;
      logger.info(LogCategory.EDITOR, 'URL API:', apiUrl);
      logger.info(LogCategory.EDITOR, 'Méthode: PATCH');
      logger.debug(LogCategory.EDITOR, 'Headers:', { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${token.substring(0, 20)}...` 
      });
      logger.debug(LogCategory.EDITOR, 'Body:', JSON.stringify(newSettings));
      

      
      const res = await fetch(apiUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(newSettings)
      });
      
      // 🔧 CORRECTION : Ajouter plus de logs pour le debugging
      logger.debug(LogCategory.EDITOR, 'Réponse fetch reçue', {
        status: res.status,
        statusText: res.statusText,
        ok: res.ok,
        url: apiUrl,
        method: 'PATCH'
      });
      

      
      logger.info(LogCategory.EDITOR, 'Réponse reçue:', {
        status: res.status,
        statusText: res.statusText,
        ok: res.ok,
        headers: Object.fromEntries(res.headers.entries())
      });
      
      if (!res.ok) {
        // 🔧 CORRECTION : Ne pas appeler res.json() ici pour éviter le double appel
        const errorText = await res.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText || 'Erreur mise à jour partage' };
        }
        
        // 🔧 DEBUG : Vérifier ce qui est reçu de l'API
        console.log('🔧 DEBUG - API Error Response:', {
          status: res.status,
          statusText: res.statusText,
          errorText,
          errorData,
          parsedErrorData: errorData
        });
        
        // 🔧 CORRECTION : Améliorer la gestion des erreurs pour éviter les objets vides
        const errorMessage = errorData?.error || errorData?.message || errorText || 'Erreur mise à jour partage';
        
        // Créer des détails d'erreur significatifs
        let errorDetails: any = { status: res.status, statusText: res.statusText };
        if (errorData && Object.keys(errorData).length > 0) {
          errorDetails = { ...errorDetails, ...errorData };
        }
        
        console.log('🔧 DEBUG - Error Details:', errorDetails);
        
        logger.error(LogCategory.EDITOR, `Erreur API (${res.status}): ${errorMessage}`, errorDetails);
        throw new Error(errorMessage);
      }
      
      // 🔧 CORRECTION : Vérifier que la réponse a du contenu avant de parser
      const responseText = await res.text();
      let responseData;
      
      if (responseText.trim()) {
        try {
          responseData = JSON.parse(responseText);
          logger.info(LogCategory.EDITOR, 'Données de réponse:', responseData);
        } catch (parseError) {
          logger.warn(LogCategory.EDITOR, 'Réponse non-JSON reçue:', responseText);
          responseData = { message: responseText };
        }
      } else {
        logger.info(LogCategory.EDITOR, 'Réponse vide reçue');
        responseData = { message: 'Succès' };
      }
      
      toast.success('Paramètres de partage mis à jour !');
      logger.info(LogCategory.EDITOR, 'Fin de handleShareSettingsChange avec succès');
      
    } catch (error) {
      // 🔧 CORRECTION : Améliorer la gestion des erreurs pour éviter les objets vides
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : 'Pas de stack trace';
      
      // 🔧 DEBUG : Vérifier l'erreur reçue
      console.log('🔧 DEBUG - Catch Block Error:', {
        error,
        errorType: typeof error,
        isError: error instanceof Error,
        errorMessage,
        errorStack
      });
      
      // Créer un objet d'erreur structuré pour le logger
      const errorDetails = {
        error: errorMessage,
        stack: errorStack,
        noteId,
        userId,
        errorType: typeof error,
        errorString: String(error)
      };
      
      console.log('🔧 DEBUG - Error Details for Logger:', errorDetails);
      console.log('🔧 DEBUG - Calling logger.error with:', {
        category: LogCategory.EDITOR,
        message: `ERREUR dans handleShareSettingsChange: ${errorMessage}`,
        data: errorDetails
      });
      
      logger.error(LogCategory.EDITOR, `ERREUR dans handleShareSettingsChange: ${errorMessage}`, errorDetails);
      logger.info(LogCategory.EDITOR, 'Fin de handleShareSettingsChange avec erreur');
      
      toast.error(errorMessage);
      console.error('Erreur partage:', error);
    }
  }, [noteId, updateNote]);

  // Persist font changes via toolbar callback
  const handleFontChange = React.useCallback(async (fontName: string) => {
    // Sauvegarder l'ancienne valeur pour rollback en cas d'échec
    const oldFontName = note?.font_family || 'Noto Sans';
    
    try {
      // 1. Appeler l'API en premier
      await v2UnifiedApi.updateNote(noteId, { font_family: fontName }, userId);
      
      // 2. Si l'API réussit, changer la police en temps réel et mettre à jour l'état
      changeFont(fontName);
      useFileSystemStore.getState().updateNote(noteId, { font_family: fontName });
      
      if (process.env.NODE_ENV === 'development') {
        logger.debug(LogCategory.EDITOR, `Police changée et persistée: ${fontName}`);
      }
    } catch (error) {
      // 3. En cas d'échec, restaurer l'ancienne valeur
      logger.error(LogCategory.EDITOR, 'Erreur lors du changement de police', error);
      
      // Rollback : restaurer l'ancienne police
      changeFont(oldFontName);
      
      // Optionnel : afficher un message d'erreur à l'utilisateur
      toast.error('Erreur lors de la sauvegarde de la police');
    }
  }, [noteId, changeFont, userId, note?.font_family]);

  // Persist fullWidth changes
  const handleFullWidthChange = React.useCallback(async (value: boolean) => {
    // Sauvegarder l'ancienne valeur pour rollback en cas d'échec
    const oldValue = fullWidth;
    
    try {
      // 1. Appeler l'API en premier
      await v2UnifiedApi.updateNote(noteId, { wide_mode: value }, userId);
      
      // 2. Si l'API réussit, mettre à jour l'état local et le CSS
      updateNote(noteId, { wide_mode: value });
      setFullWidth(value);
      changeWideMode(value);
      
      if (process.env.NODE_ENV === 'development') {
        logger.debug(LogCategory.EDITOR, `Mode large changé et persisté: ${value ? 'ON' : 'OFF'}`);
      }
    } catch (error) {
      // 3. En cas d'échec, restaurer l'ancienne valeur
      logger.error(LogCategory.EDITOR, 'Erreur lors du changement de mode large', error);
      
      // Rollback : restaurer l'état local et le CSS
      setFullWidth(oldValue);
      changeWideMode(oldValue);
      
      // Optionnel : afficher un message d'erreur à l'utilisateur
      toast.error('Erreur lors de la sauvegarde du mode large');
    }
  }, [noteId, updateNote, changeWideMode, userId, fullWidth]);

  // Persist a4Mode changes
  const handleA4ModeChange = React.useCallback(async (value: boolean) => {
    // Sauvegarder l'ancienne valeur pour rollback en cas d'échec
    const oldValue = a4Mode;
    
    try {
      // 1. Appeler l'API en premier
      await v2UnifiedApi.updateNote(noteId, { a4_mode: value }, userId);
      
      // 2. Si l'API réussit, mettre à jour l'état local
      setA4Mode(value);
      updateNote(noteId, { a4_mode: value } as Record<string, unknown>);
      
      if (process.env.NODE_ENV === 'development') {
        logger.debug(LogCategory.EDITOR, `Mode A4 changé et persisté: ${value ? 'ON' : 'OFF'}`);
      }
    } catch (error) {
      // 3. En cas d'échec, restaurer l'ancienne valeur
      logger.error(LogCategory.EDITOR, 'Erreur lors du changement de mode A4', error);
      
      // Rollback : restaurer l'état local
      setA4Mode(oldValue);
      
      // Optionnel : afficher un message d'erreur à l'utilisateur
      toast.error('Erreur lors de la sauvegarde du mode A4');
    }
  }, [noteId, updateNote, userId, a4Mode]);

  // Persist slashLang changes
  const handleSlashLangChange = React.useCallback(async (value: 'fr' | 'en') => {
    // Sauvegarder l'ancienne valeur pour rollback en cas d'échec
    const oldValue = slashLang;
    
    try {
      // 1. Appeler l'API en premier
      await v2UnifiedApi.updateNote(noteId, { slash_lang: value }, userId);
      
      // 2. Si l'API réussit, mettre à jour l'état local
      setSlashLang(value);
      updateNote(noteId, { slash_lang: value } as Record<string, unknown>);
      
      if (process.env.NODE_ENV === 'development') {
        logger.debug(LogCategory.EDITOR, `Langue slash changée et persistée: ${value}`);
      }
    } catch (error) {
      // 3. En cas d'échec, restaurer l'ancienne valeur
      logger.error(LogCategory.EDITOR, 'Erreur lors du changement de langue slash', error);
      
      // Rollback : restaurer l'état local
      setSlashLang(oldValue);
      
      // Optionnel : afficher un message d'erreur à l'utilisateur
      toast.error('Erreur lors de la sauvegarde de la langue slash');
    }
  }, [noteId, updateNote, userId, slashLang]);

  // Ctrl/Cmd+S
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); handleSave(title || 'Untitled', content); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleSave, title, content]);

  // Save title on blur
  const handleTitleBlur = React.useCallback(() => {
    handleSave(title || 'Untitled', content);
  }, [handleSave, title, content]);

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
      
      logger.debug(LogCategory.EDITOR, `Texte transcrit inséré: "${text}"`);
    } catch (error) {
      logger.error(LogCategory.EDITOR, 'Erreur lors de l\'insertion du texte transcrit:', error);
    }
  }, [editor]);

  // Build headings for TOC - 🚨 DIRECTEMENT depuis l'éditeur Tiptap
  const headings = React.useMemo(() => {
    // 🚨 PRIORITÉ 1 : Éditeur Tiptap (si disponible)
    if (editor) {
      try {
        // 🎯 SOURCE DE VÉRITÉ : Utiliser directement l'éditeur Tiptap
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
        // Continuer vers le fallback
      }
    }
    
    // 🚨 PRIORITÉ 2 : Fallback markdown brut (pour chargement initial et erreurs)
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
    
    // 🚨 AUCUN CONTENU : Retourner tableau vide
    return [];
  }, [editor, content, note, noteId, forceTOCUpdate]); // 🚨 Ajout de forceTOCUpdate pour forcer la régénération

  const handlePreviewClick = React.useCallback(async () => {
    try {
      // 🎯 SIMPLE : Prendre le slug depuis le store local
      const noteData = useFileSystemStore.getState().notes[noteId];
      
      // 🔒 VÉRIFICATION CRITIQUE : Vérifier la visibilité AVANT le slug
      if (noteData?.share_settings?.visibility === 'private') {
        toast.error('Cette note est privée. Changez sa visibilité pour la prévisualiser.');
        return;
      }
      
      if (!noteData?.slug) {
        toast.error('Cette note n\'a pas de slug. Publiez-la d\'abord.');
        return;
      }

      // 🎯 SIMPLE : Construire l'URL publique avec le username actuel
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Vous devez être connecté.');
        return;
      }

      // 🎯 SIMPLE : Récupérer le username
      const { data: userData } = await supabase
        .from('users')
        .select('username')
        .eq('id', user.id)
        .single();

      if (!userData?.username) {
        toast.error('Username non trouvé.');
        return;
      }

      // 🎯 SIMPLE : Construire et ouvrir l'URL
      const url = `${window.location.origin}/@${userData.username}/${noteData.slug}`;
      logger.debug(LogCategory.EDITOR, 'Ouverture de l\'URL publique:', url);
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
      <div className="editor-toc-fixed">
        <PublicTableOfContents headings={headings} containerRef={editorContainerRef} />
      </div>
      <EditorLayout
        layoutClassName={headerImageUrl ? (titleInImage ? 'noteLayout imageWithTitle' : 'noteLayout imageOnly') : 'noteLayout noImage'}
        header={(
          <>
            <EditorHeader
              headerImageUrl={null}
              rightSlot={(
                <>
                  <button
                    className={`editor-header-preview${previewMode ? ' active' : ''}`}
                    aria-label="Aperçu"
                    title="Aperçu"
                    onClick={handlePreviewClick}
                  >
                    <FiEye size={16} />
                  </button>
                  <button ref={kebabBtnRef} className="editor-header-kebab" aria-label="Options" title="Options" onClick={() => setKebabOpen(v => !v)}>
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
              <EditorToolbar 
                editor={isReadonly ? null : editor} 
                setImageMenuOpen={setImageMenuOpen} 
                onFontChange={handleFontChange}
                currentFont={note?.font_family || 'Noto Sans'}
                onTranscriptionComplete={handleTranscriptionComplete}
              />
            </EditorHeader>
            {/* Add header image CTA when no image is set */}
            {!headerImageUrl && (
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
                        onClick={() => { setImageMenuTarget('header'); setImageMenuOpen(true); }}
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
              headerImageUrl={headerImageUrl}
              headerImageOffset={headerOffset}
              headerImageBlur={headerBlur}
              headerImageOverlay={headerOverlay}
              headerTitleInImage={titleInImage}
              onHeaderChange={handleHeaderChange}
              onHeaderOffsetChange={async (offset) => {
                const oldOffset = headerOffset;
                try {
                  // 1. Appeler l'API en premier
                  await v2UnifiedApi.updateNote(noteId, { header_image_offset: offset }, userId);
                  
                  // 2. Si l'API réussit, mettre à jour l'état local
                  setHeaderOffset(offset);
                  updateNote(noteId, { header_image_offset: offset });
                } catch (error) {
                  // 3. En cas d'échec, restaurer l'ancienne valeur
                  logger.error(LogCategory.EDITOR, 'Erreur lors de la sauvegarde de l\'offset d\'image', error);
                  setHeaderOffset(oldOffset);
                }
              }}
              onHeaderBlurChange={async (blur) => {
                const oldBlur = headerBlur;
                try {
                  // 1. Appeler l'API en premier
                  await v2UnifiedApi.updateNote(noteId, { header_image_blur: blur }, userId);
                  
                  // 2. Si l'API réussit, mettre à jour l'état local
                  setHeaderBlur(blur);
                  updateNote(noteId, { header_image_blur: blur });
                } catch (error) {
                  // 3. En cas d'échec, restaurer l'ancienne valeur
                  logger.error(LogCategory.EDITOR, 'Erreur lors de la sauvegarde du flou d\'image', error);
                  setHeaderBlur(oldBlur);
                }
              }}
              onHeaderOverlayChange={async (overlay) => {
                const oldOverlay = headerOverlay;
                try {
                  // 1. Appeler l'API en premier
                  await v2UnifiedApi.updateNote(noteId, { header_image_overlay: overlay }, userId);
                  
                  // 2. Si l'API réussit, mettre à jour l'état local
                  setHeaderOverlay(overlay);
                  updateNote(noteId, { header_image_overlay: overlay });
                } catch (error) {
                  // 3. En cas d'échec, restaurer l'ancienne valeur
                  logger.error(LogCategory.EDITOR, 'Erreur lors de la sauvegarde de l\'overlay d\'image', error);
                  setHeaderOverlay(oldOverlay);
                }
              }}
              onHeaderTitleInImageChange={async (v) => {
                const oldValue = titleInImage;
                try {
                  // 1. Appeler l'API en premier
                  await v2UnifiedApi.updateNote(noteId, { header_title_in_image: v }, userId);
                  
                  // 2. Si l'API réussit, mettre à jour l'état local
                  setTitleInImage(v);
                  updateNote(noteId, { header_title_in_image: v });
                } catch (error) {
                  // 3. En cas d'échec, restaurer l'ancienne valeur
                  logger.error(LogCategory.EDITOR, 'Erreur lors de la sauvegarde du titre dans l\'image', error);
                  setTitleInImage(oldValue);
                }
              }}
              imageMenuOpen={imageMenuOpen}
              onImageMenuOpen={() => setImageMenuOpen(true)}
              onImageMenuClose={() => setImageMenuOpen(false)}
              noteId={note.id}
              userId={userId}
            />
            <EditorKebabMenu
              open={kebabOpen}
              position={kebabPos}
              onClose={() => setKebabOpen(false)}
              a4Mode={a4Mode}
              setA4Mode={handleA4ModeChange}
              slashLang={slashLang}
              setSlashLang={handleSlashLangChange}
              fullWidth={fullWidth}
              setFullWidth={handleFullWidthChange}
              noteId={noteId}
              currentShareSettings={shareSettings}
              onShareSettingsChange={handleShareSettingsChange}
              publicUrl={note?.public_url || undefined}
            />
          </>
        )}
        title={<EditorTitle value={title} onChange={setTitle} onBlur={handleTitleBlur} placeholder="Titre de la note..." />}
        content={(
          <EditorContent>
            {!isReadonly && (
              <div className="tiptap-editor-container" ref={editorContainerRef}>
                <TiptapEditorContent editor={editor} />
                {/* Table controls */}
                <TableControls editor={editor} containerRef={editorContainerRef} />
                {/* Slash commands menu */}
                <EditorSlashMenu
                  ref={slashMenuRef}
                  lang={slashLang}
                  onInsert={(cmd) => {
                    console.log('🎯 [SLASH] Commande sélectionnée:', cmd);
                    console.log('🎯 [SLASH] Editor disponible:', !!editor);
                    console.log('🎯 [SLASH] Editor type:', typeof editor);
                    console.log('🎯 [SLASH] Editor methods:', Object.keys(editor || {}));
                    
                    if (!editor) {
                      console.error('❌ [SLASH] Editor non disponible');
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
                      console.error('❌ [SLASH] Erreur suppression slash:', error);
                    }
                    
                    // Execute command action
                    if (typeof cmd.action === 'function') {
                      console.log('🎯 [SLASH] Exécution de la commande:', cmd.id);
                      try {
                        const result = cmd.action(editor);
                        console.log('🎯 [SLASH] Résultat de la commande:', result);
                      } catch (error) {
                        console.error('❌ [SLASH] Erreur exécution commande:', error);
                      }
                    } else {
                      console.error('❌ [SLASH] Action non définie pour la commande:', cmd.id);
                    }
                  }}
                />
              </div>
            )}
            {isReadonly && (
              <div className="markdown-body" dangerouslySetInnerHTML={{ __html: html }} />
            )}
          </EditorContent>
        )}
      />
      {/* Global ImageMenu for both header and content insertions */}
      <ImageMenu
        open={imageMenuOpen}
        onClose={() => setImageMenuOpen(false)}
        onInsertImage={(src: string) => {
          if (imageMenuTarget === 'header') {
            return handleHeaderChange(src);
          }
          if (editor) {
            try { editor.chain().focus().setImage({ src }).run(); } catch {}
          }
        }}
        noteId={note.id}
        userId={userId}
      />
    </>
  );
};

export default Editor; 