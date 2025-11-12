/**
 * Hook centralisé pour gérer l'état de l'éditeur
 * Remplace les 30+ useState dispersés dans Editor.tsx
 */

import { useState, useCallback, useEffect } from 'react';
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
    console.log('[useEditorState] 🔍 Title sync check:', {
      'options.initialTitle': options.initialTitle,
      'current title state': title,
      'options.noteId': options.noteId,
      'will update': options.initialTitle !== undefined
    });
    
    if (options.initialTitle !== undefined) {
      console.log('[useEditorState] ✅ Updating title to:', options.initialTitle);
      setTitle(options.initialTitle);
    }
  }, [options.initialTitle]);
  
  // État de l'image d'en-tête
  const [headerImageUrl, setHeaderImageUrl] = useState<string | null>(
    options.initialHeaderImage || null
  );
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
  const [showToolbar, setShowToolbar] = useState(() => {
    // LocalStorage temporaire - sera remplacé par user_preferences
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('editor-show-toolbar');
      return stored !== null ? stored === 'true' : true; // true par défaut
    }
    return true;
  });
  
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
    setShowToolbar(prev => {
      const newValue = !prev;
      // Persister dans localStorage (temporaire avant user_preferences)
      if (typeof window !== 'undefined') {
        localStorage.setItem('editor-show-toolbar', String(newValue));
      }
      return newValue;
    });
  }, []);
  
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
      showToolbar,
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
    setHeaderImageUrl,
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

