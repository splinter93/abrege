/**
 * Hook centralisé pour gérer l'état de l'éditeur
 * Orchestrateur combinant useDocumentState, useHeaderImageState, useMenusState, useUIState
 */

import { useState } from 'react';
import type { ShareSettings } from '@/types/sharing';
import { getDefaultShareSettings } from '@/types/sharing';
import { useDocumentState, type DocumentState } from './useDocumentState';
import { useHeaderImageState, type HeaderImageState } from './useHeaderImageState';
import { useMenusState, type MenusState, type ContextMenuState } from './useMenusState';
import { useUIState, type UIState } from './useUIState';

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
  toolbarContext?: 'editor' | 'canvas'; // Contexte pour séparer localStorage
  forceShowToolbar?: boolean; // Force la toolbar visible (ignore localStorage)
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
  // Utiliser les hooks spécialisés
  const documentState = useDocumentState({
    initialTitle: options.initialTitle
  });

  const headerImageState = useHeaderImageState({
    initialHeaderImage: options.initialHeaderImage,
    initialHeaderOffset: options.initialHeaderOffset,
    initialHeaderBlur: options.initialHeaderBlur,
    initialHeaderOverlay: options.initialHeaderOverlay,
    initialTitleInImage: options.initialTitleInImage
  });

  const menusState = useMenusState();

  const uiState = useUIState({
    initialA4Mode: options.initialA4Mode,
    initialFullWidth: options.initialFullWidth,
    initialSlashLang: options.initialSlashLang,
    toolbarContext: options.toolbarContext,
    forceShowToolbar: options.forceShowToolbar
  });
  
  // État des paramètres de partage
  const [shareSettings, setShareSettings] = useState<ShareSettings>(
    options.initialShareSettings || getDefaultShareSettings()
  );
  
  // État interne
  const [isUpdatingFromStore, setIsUpdatingFromStore] = useState(false);
  
  // Retourner l'état complet avec toutes les actions
  return {
    // États groupés
    document: documentState.document,
    headerImage: headerImageState.headerImage,
    menus: menusState.menus,
    ui: uiState.ui,
    contextMenu: menusState.contextMenu,
    shareSettings,
    internal: {
      isUpdatingFromStore,
    },
    
    // Actions - Document
    setTitle: documentState.setTitle,
    setNoteLoaded: documentState.setNoteLoaded,
    updateTOC: documentState.updateTOC,
    
    // Actions - Header Image
    setHeaderImageUrl: headerImageState.setHeaderImageUrl,
    setHeaderImageOffset: headerImageState.setHeaderImageOffset,
    setHeaderImageBlur: headerImageState.setHeaderImageBlur,
    setHeaderImageOverlay: headerImageState.setHeaderImageOverlay,
    setHeaderTitleInImage: headerImageState.setHeaderTitleInImage,
    
    // Actions - Menus
    setImageMenuOpen: menusState.setImageMenuOpen,
    setImageMenuTarget: menusState.setImageMenuTarget,
    setKebabOpen: menusState.setKebabOpen,
    setKebabPos: menusState.setKebabPos,
    toggleKebabMenu: menusState.toggleKebabMenu,
    
    // Actions - UI
    setPreviewMode: uiState.setPreviewMode,
    togglePreviewMode: uiState.togglePreviewMode,
    setA4Mode: uiState.setA4Mode,
    setFullWidth: uiState.setFullWidth,
    setSlashLang: uiState.setSlashLang,
    setShowToolbar: uiState.setShowToolbar,
    toggleToolbar: uiState.toggleToolbar,
    
    // Actions - Context Menu
    openContextMenu: menusState.openContextMenu,
    closeContextMenu: menusState.closeContextMenu,
    
    // Actions - Share Settings
    setShareSettings,
    
    // Actions - Internal
    setIsUpdatingFromStore,
  };
}
