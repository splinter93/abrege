import { useState, useCallback } from 'react';
import { Folder, FileArticle } from './FolderManager';

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  item: Folder | FileArticle | null;
}

export function useContextMenu() {
  const [state, setState] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    item: null,
  });

  const openContextMenu = useCallback((e: React.MouseEvent, item: Folder | FileArticle) => {
    e.preventDefault();
    setState({ visible: true, x: e.clientX, y: e.clientY, item });
  }, []);

  const closeContextMenu = useCallback(() => {
    setState((prev) => ({ ...prev, visible: false }));
  }, []);

  return {
    ...state,
    openContextMenu,
    closeContextMenu,
  };
} 