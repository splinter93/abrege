/**
 * Hook centralisé pour gérer l'état de l'éditeur
 * Remplace les 30+ useState dispersés dans Editor.tsx
 */

import { useState, useCallback, useEffect, useLayoutEffect, useRef, useMemo } from 'react';
import React from 'react';
import { logger, LogCategory } from '@/utils/logger';
import type { ShareSettings } from '@/types/sharing';
import { getDefaultShareSettings } from '@/types/sharing';
import { DEFAULT_HEADER_IMAGE_CONFIG } from '@/utils/editorConstants';

/**
 * État du document
 */
export interface DocumentState {
  title: string;
  noteLoaded: boolean;
  forceTOCUpdate: number;
}

/**
 * État de l'image d'en-tête
 */
export interface HeaderImageState {
  url: string | null;
  offset: number;
  blur: number;
  overlay: number;
  titleInImage: boolean;
}

/**
 * État des menus
 */
export interface MenusState {
  imageMenuOpen: boolean;
  imageMenuTarget: 'header' | 'content';
  kebabOpen: boolean;
  kebabPos: { top: number; left: number };
}

/**
 * État de l'interface utilisateur
 */
export interface UIState {
  previewMode: boolean;
  a4Mode: boolean;
  fullWidth: boolean;
  slashLang: 'fr' | 'en';
  showToolbar: boolean; // Toggle toolbar (future user preference)
}

/**
 * État du menu contextuel
 */
export interface ContextMenuState {
  isOpen: boolean;
  position: { x: number; y: number };
  nodeType: string;
  hasSelection: boolean;
  nodePosition: number;
}

/**
 * État interne de synchronisation
 */
export interface InternalState {
  isUpdatingFromStore: boolean;
}

/**
 * État complet de l'éditeur
 */
export interface EditorState {
  // États
  document: DocumentState;
  headerImage: HeaderImageState;
  menus: MenusState;
  ui: UIState;
  contextMenu: ContextMenuState;
  shareSettings: ShareSettings;
  internal: InternalState;
  
  // Actions - Document
  setTitle: (title: string) => void;
  setNoteLoaded: (loaded: boolean) => void;
  updateTOC: () => void;
  
  // Actions - Header Image
  setHeaderImageUrl: (url: string | null) => void;
  setHeaderImageOffset: (offset: number) => void;
  setHeaderImageBlur: (blur: number) => void;
  setHeaderImageOverlay: (overlay: number) => void;
  setHeaderTitleInImage: (titleInImage: boolean) => void;
  
  // Actions - Menus
  setImageMenuOpen: (open: boolean) => void;
  setImageMenuTarget: (target: 'header' | 'content') => void;
  setKebabOpen: (open: boolean) => void;
  setKebabPos: (pos: { top: number; left: number }) => void;
  toggleKebabMenu: () => void;
  
  // Actions - UI
  setPreviewMode: (preview: boolean) => void;
  togglePreviewMode: () => void;
  setA4Mode: (a4: boolean) => void;
  setFullWidth: (fullWidth: boolean) => void;
  setSlashLang: (lang: 'fr' | 'en') => void;
  setShowToolbar: (show: boolean) => void;
  toggleToolbar: () => void;
  
  // Actions - Context Menu
  openContextMenu: (position: { x: number; y: number }, nodeType: string, hasSelection: boolean, nodePosition: number) => void;
  closeContextMenu: () => void;
  
  // Actions - Share Settings
  setShareSettings: (settings: ShareSettings) => void;
  
  // Actions - Internal
  setIsUpdatingFromStore: (updating: boolean) => void;
}

/**
 * Options d'initialisation du hook
 */
export interface UseEditorStateOptions {
  noteId?: string;
  initialTitle?: string;
  initialHeaderImage?: string | null;
  initialHeaderOffset?: number;
  initialHeaderBlur?: number;
  initialHeaderOverlay?: number;
  initialTitleInImage?: boolean;
  initialA4Mode?: boolean;
  initialFullWidth?: boolean;
  initialSlashLang?: 'fr' | 'en';
  initialShareSettings?: ShareSettings;
  toolbarContext?: 'editor' | 'canvas'; // ✅ Contexte pour séparer localStorage
  forceShowToolbar?: boolean; // ✅ Force la toolbar visible (ignore localStorage)
}

/**
 * Hook principal pour gérer l'état de l'éditeur
 * 
 * @param options - Options d'initialisation
 * @returns État complet et actions
 * 
 * @example
 * ```typescript
 * const editorState = useEditorState({
 *   initialTitle: note?.source_title,
 *   initialHeaderImage: note?.header_image,
 *   initialFullWidth: note?.wide_mode
 * });
 * 
 * // Utilisation
 * editorState.setTitle('Nouveau titre');
 * editorState.togglePreviewMode();
 * ```
 */
export function useEditorState(options: UseEditorStateOptions = {}): EditorState {
  // État du document
  const [title, setTitle] = useState<string>(options.initialTitle || '');
  const [noteLoaded, setNoteLoaded] = useState(false);
  const [forceTOCUpdate, setForceTOCUpdate] = useState(0);

  // ✅ Sync titre quand initialTitle change (ex: switch canva)
  useEffect(() => {
    if (options.initialTitle !== undefined) {
      setTitle(options.initialTitle);
    }
  }, [options.initialTitle]);
  
  // État de l'image d'en-tête
  const [headerImageUrl, setHeaderImageUrl] = useState<string | null>(
    options.initialHeaderImage || null
  );
  const setHeaderImageUrlTracked = useCallback((value: string | null, meta?: { source?: string }) => {
    if (process.env.NODE_ENV === 'development') {
      logger.debug(LogCategory.EDITOR, '[useEditorState] setHeaderImageUrl', {
        previous: headerImageUrl,
        next: value,
        source: meta?.source ?? 'unknown'
      });
    }
    setHeaderImageUrl(value);
  }, [headerImageUrl]);
  
  // ✅ Ref pour tracker la dernière valeur reçue (évite re-set inutiles)
  const prevHeaderImageRef = useRef<string | null>(options.initialHeaderImage || null);
  
  // ✅ Sync headerImageUrl quand initialHeaderImage change (ex: auto-save, switch canva)
  // IMPORTANT : Compare avec ref pour éviter flicker si valeur identique
  useEffect(() => {
    const newValue = options.initialHeaderImage ?? null;
    if (newValue !== prevHeaderImageRef.current) {
      prevHeaderImageRef.current = newValue;
      setHeaderImageUrlTracked(newValue, { source: 'initialHeaderImageEffect' });
    }
  }, [options.initialHeaderImage, setHeaderImageUrlTracked]);
  const [headerOffset, setHeaderOffset] = useState(
    options.initialHeaderOffset ?? DEFAULT_HEADER_IMAGE_CONFIG.offset
  );
  const [headerBlur, setHeaderBlur] = useState(
    options.initialHeaderBlur ?? DEFAULT_HEADER_IMAGE_CONFIG.blur
  );
  const [headerOverlay, setHeaderOverlay] = useState(
    options.initialHeaderOverlay ?? DEFAULT_HEADER_IMAGE_CONFIG.overlay
  );
  const [titleInImage, setTitleInImage] = useState(
    options.initialTitleInImage ?? DEFAULT_HEADER_IMAGE_CONFIG.titleInImage
  );
  
  // État des menus
  const [imageMenuOpen, setImageMenuOpen] = useState(false);
  const [imageMenuTarget, setImageMenuTarget] = useState<'header' | 'content'>('header');
  const [kebabOpen, setKebabOpen] = useState(false);
  const [kebabPos, setKebabPos] = useState({ top: 0, left: 0 });
  
  // État UI
  const [previewMode, setPreviewMode] = useState(false);
  const [a4Mode, setA4Mode] = useState(options.initialA4Mode || false);
  const [fullWidth, setFullWidth] = useState(options.initialFullWidth || false);
  const [slashLang, setSlashLang] = useState<'fr' | 'en'>(options.initialSlashLang || 'en');
  // ✅ FIX: Séparer localStorage par contexte (editor vs canvas)
  const toolbarContext = options.toolbarContext || 'editor';
  
  // ✅ FIX: Toujours prioriser forceShowToolbar, même si localStorage dit autre chose
  const [showToolbar, setShowToolbar] = useState(() => {
    // Si forceShowToolbar est défini, l'utiliser directement (priorité absolue)
    if (options.forceShowToolbar !== undefined) {
      logger.debug(LogCategory.EDITOR, '[useEditorState] Initial showToolbar depuis forceShowToolbar', {
        forceShowToolbar: options.forceShowToolbar,
        toolbarContext
      });
      return options.forceShowToolbar;
    }
    // LocalStorage temporaire - sera remplacé par user_preferences
    // ✅ Clé différente selon le contexte pour éviter les conflits
    if (typeof window !== 'undefined') {
      const storageKey = `editor-show-toolbar-${toolbarContext}`;
      const stored = localStorage.getItem(storageKey);
      const value = stored !== null ? stored === 'true' : true; // true par défaut
      logger.debug(LogCategory.EDITOR, '[useEditorState] Initial showToolbar depuis localStorage', {
        storageKey,
        stored,
        value,
        toolbarContext
      });
      return value;
    }
    logger.debug(LogCategory.EDITOR, '[useEditorState] Initial showToolbar par défaut (SSR)', {
      toolbarContext
    });
    return true;
  });
  
  // ✅ FIX: Synchroniser showToolbar si forceShowToolbar change (avec priorité absolue)
  // IMPORTANT: Utiliser useLayoutEffect pour garantir la synchronisation AVANT le render
  // Cela évite le flash de toolbar manquante lors du refresh
  useLayoutEffect(() => {
    // Si forceShowToolbar est défini, il a toujours la priorité absolue
    if (options.forceShowToolbar !== undefined) {
      // ✅ FIX: TOUJOURS forcer la valeur, même si identique
      // Cela garantit la cohérence et évite les problèmes de timing
      const targetValue = options.forceShowToolbar;
      setShowToolbar(prev => {
        if (prev !== targetValue) {
          logger.info(LogCategory.EDITOR, '[useEditorState] 🔧 Force showToolbar update (useLayoutEffect)', {
            prev,
            targetValue,
            toolbarContext,
            timestamp: Date.now()
          });
        } else {
          // Même si identique, on force quand même pour garantir la cohérence
          logger.debug(LogCategory.EDITOR, '[useEditorState] Force showToolbar (identique mais forcé)', {
            prev,
            targetValue,
            toolbarContext,
            timestamp: Date.now()
          });
        }
        // ✅ TOUJOURS retourner targetValue, même si identique
        return targetValue;
      });
    } else {
      logger.debug(LogCategory.EDITOR, '[useEditorState] forceShowToolbar undefined, pas de synchronisation', {
        toolbarContext
      });
    }
  }, [options.forceShowToolbar, toolbarContext]);
  
  // ✅ FIX: Utiliser useMemo pour garantir que showToolbar est toujours true si forceShowToolbar === true
  // Cela évite les problèmes de timing où useLayoutEffect ne se déclenche pas assez tôt
  const finalShowToolbar = React.useMemo(() => {
    if (options.forceShowToolbar !== undefined) {
      logger.debug(LogCategory.EDITOR, '[useEditorState] finalShowToolbar depuis forceShowToolbar', {
        forceShowToolbar: options.forceShowToolbar,
        toolbarContext,
        timestamp: Date.now()
      });
      return options.forceShowToolbar;
    }
    logger.debug(LogCategory.EDITOR, '[useEditorState] finalShowToolbar depuis showToolbar state', {
      showToolbar,
      toolbarContext
    });
    return showToolbar;
  }, [options.forceShowToolbar, showToolbar, toolbarContext]);
  
  // État du menu contextuel
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    isOpen: false,
    position: { x: 0, y: 0 },
    nodeType: 'paragraph',
    hasSelection: false,
    nodePosition: 0,
  });
  
  // État des paramètres de partage
  const [shareSettings, setShareSettings] = useState<ShareSettings>(
    options.initialShareSettings || getDefaultShareSettings()
  );
  
  // État interne
  const [isUpdatingFromStore, setIsUpdatingFromStore] = useState(false);
  
  // Actions - Document
  const updateTOC = useCallback(() => {
    setForceTOCUpdate(prev => prev + 1);
  }, []);
  
  // Actions - Menus
  const toggleKebabMenu = useCallback(() => {
    setKebabOpen(prev => !prev);
  }, []);
  
  // Actions - UI
  const togglePreviewMode = useCallback(() => {
    setPreviewMode(prev => !prev);
  }, []);
  
  const toggleToolbar = useCallback(() => {
    // ✅ Si forceShowToolbar est défini, ne pas permettre le toggle
    if (options.forceShowToolbar !== undefined) {
      return; // Toolbar forcée, pas de toggle possible
    }
    setShowToolbar(prev => {
      const newValue = !prev;
      // ✅ Persister dans localStorage avec clé contextuelle
      if (typeof window !== 'undefined') {
        const storageKey = `editor-show-toolbar-${toolbarContext}`;
        localStorage.setItem(storageKey, String(newValue));
      }
      return newValue;
    });
  }, [toolbarContext, options.forceShowToolbar]);
  
  // Actions - Context Menu
  const openContextMenu = useCallback((
    position: { x: number; y: number },
    nodeType: string,
    hasSelection: boolean,
    nodePosition: number
  ) => {
    setContextMenu({
      isOpen: true,
      position,
      nodeType,
      hasSelection,
      nodePosition,
    });
  }, []);
  
  const closeContextMenu = useCallback(() => {
    setContextMenu(prev => ({ ...prev, isOpen: false }));
  }, []);
  
  // Retourner l'état complet avec toutes les actions
  return {
    // États groupés
    document: {
      title,
      noteLoaded,
      forceTOCUpdate,
    },
    headerImage: {
      url: headerImageUrl,
      offset: headerOffset,
      blur: headerBlur,
      overlay: headerOverlay,
      titleInImage,
    },
    menus: {
      imageMenuOpen,
      imageMenuTarget,
      kebabOpen,
      kebabPos,
    },
    ui: {
      previewMode,
      a4Mode,
      fullWidth,
      slashLang,
      showToolbar: finalShowToolbar, // ✅ Utiliser finalShowToolbar qui priorise forceShowToolbar
    },
    contextMenu,
    shareSettings,
    internal: {
      isUpdatingFromStore,
    },
    
    // Actions - Document
    setTitle,
    setNoteLoaded,
    updateTOC,
    
    // Actions - Header Image
    setHeaderImageUrl: setHeaderImageUrlTracked,
    setHeaderImageOffset: setHeaderOffset,
    setHeaderImageBlur: setHeaderBlur,
    setHeaderImageOverlay: setHeaderOverlay,
    setHeaderTitleInImage: setTitleInImage,
    
    // Actions - Menus
    setImageMenuOpen,
    setImageMenuTarget,
    setKebabOpen,
    setKebabPos,
    toggleKebabMenu,
    
    // Actions - UI
    setPreviewMode,
    togglePreviewMode,
    setA4Mode,
    setFullWidth,
    setSlashLang,
    setShowToolbar,
    toggleToolbar,
    
    // Actions - Context Menu
    openContextMenu,
    closeContextMenu,
    
    // Actions - Share Settings
    setShareSettings,
    
    // Actions - Internal
    setIsUpdatingFromStore,
  };
}

