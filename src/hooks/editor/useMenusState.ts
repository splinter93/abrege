/**
 * useMenusState - Hook pour l'état des menus
 * 
 * Responsabilités:
 * - Menu d'insertion d'images
 * - Menu kebab
 * - Menu contextuel
 */

import { useState, useCallback } from 'react';

export interface MenusState {
  imageMenuOpen: boolean;
  imageMenuTarget: 'header' | 'content';
  kebabOpen: boolean;
  kebabPos: { top: number; left: number };
}

export interface ContextMenuState {
  isOpen: boolean;
  position: { x: number; y: number };
  nodeType: string;
  hasSelection: boolean;
  nodePosition: number;
}

export interface UseMenusStateReturn {
  menus: MenusState;
  contextMenu: ContextMenuState;
  setImageMenuOpen: (open: boolean) => void;
  setImageMenuTarget: (target: 'header' | 'content') => void;
  setKebabOpen: (open: boolean) => void;
  setKebabPos: (pos: { top: number; left: number }) => void;
  toggleKebabMenu: () => void;
  openContextMenu: (position: { x: number; y: number }, nodeType: string, hasSelection: boolean, nodePosition: number) => void;
  closeContextMenu: () => void;
}

/**
 * Hook pour gérer l'état des menus
 */
export function useMenusState(): UseMenusStateReturn {
  // État des menus
  const [imageMenuOpen, setImageMenuOpen] = useState(false);
  const [imageMenuTarget, setImageMenuTarget] = useState<'header' | 'content'>('header');
  const [kebabOpen, setKebabOpen] = useState(false);
  const [kebabPos, setKebabPos] = useState({ top: 0, left: 0 });
  
  // État du menu contextuel
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    isOpen: false,
    position: { x: 0, y: 0 },
    nodeType: 'paragraph',
    hasSelection: false,
    nodePosition: 0,
  });
  
  // Actions - Menus
  const toggleKebabMenu = useCallback(() => {
    setKebabOpen(prev => !prev);
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

  return {
    menus: {
      imageMenuOpen,
      imageMenuTarget,
      kebabOpen,
      kebabPos,
    },
    contextMenu,
    setImageMenuOpen,
    setImageMenuTarget,
    setKebabOpen,
    setKebabPos,
    toggleKebabMenu,
    openContextMenu,
    closeContextMenu,
  };
}

