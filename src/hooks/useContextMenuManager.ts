import { useState, useCallback } from 'react';
import { Folder, FileArticle, ContextMenuState } from '../components/types';

interface UseContextMenuManagerProps {
  onFolderOpen: (folder: Folder) => void;
  onFileOpen: (file: FileArticle) => void;
  startRename: (id: string, type: 'folder' | 'file') => void;
  deleteFolder: (id: string) => Promise<void>;
  deleteFile: (id: string) => Promise<void>;
}

interface UseContextMenuManagerReturn {
  contextMenuState: ContextMenuState;
  handleContextMenuItem: (e: React.MouseEvent, item: Folder | FileArticle) => void;
  handleOpen: () => void;
  handleRename: () => void;
  handleDelete: () => void;
  handleCopyId: () => void;
  closeContextMenu: () => void;
}

/**
 * Hook pour gérer le menu contextuel des dossiers et fichiers
 * Extrait toute la logique du menu contextuel du FolderManager
 */
export const useContextMenuManager = ({
  onFolderOpen,
  onFileOpen,
  startRename,
  deleteFolder,
  deleteFile
}: UseContextMenuManagerProps): UseContextMenuManagerReturn => {
  const [contextMenuState, setContextMenuState] = useState<ContextMenuState>({ 
    visible: false, 
    x: 0, 
    y: 0, 
    item: null 
  });

  // Handler pour clic droit sur dossier/fichier
  const handleContextMenuItem = useCallback((e: React.MouseEvent, item: Folder | FileArticle) => {
    e.preventDefault();
    setContextMenuState({ visible: true, x: e.clientX, y: e.clientY, item });
  }, []);

  // Handler pour ouvrir l'élément
  const handleOpen = useCallback(() => {
    if (!contextMenuState.item) return;
    
    if ('name' in contextMenuState.item) {
      onFolderOpen(contextMenuState.item);
    } else {
      onFileOpen(contextMenuState.item);
    }
    closeContextMenu();
  }, [contextMenuState.item, onFolderOpen, onFileOpen]);

  // Handler pour renommer l'élément
  const handleRename = useCallback(() => {
    if (contextMenuState.item) {
      if ('name' in contextMenuState.item) {
        startRename(contextMenuState.item.id, 'folder');
      } else {
        startRename(contextMenuState.item.id, 'file');
      }
    }
    closeContextMenu();
  }, [contextMenuState.item, startRename]);

  // Handler pour supprimer l'élément
  const handleDelete = useCallback(() => {
    if (!contextMenuState.item) return;
    
    const itemName = 'name' in contextMenuState.item 
      ? contextMenuState.item.name 
      : contextMenuState.item.source_title;
    
    if (window.confirm(`Supprimer définitivement « ${itemName} » ?`)) {
      if ('name' in contextMenuState.item) {
        deleteFolder(contextMenuState.item.id);
      } else {
        deleteFile(contextMenuState.item.id);
      }
    }
    closeContextMenu();
  }, [contextMenuState.item, deleteFolder, deleteFile]);

  // Handler pour copier l'ID de l'élément
  const handleCopyId = useCallback(async () => {
    if (!contextMenuState.item) return;
    
    try {
      await navigator.clipboard.writeText(contextMenuState.item.id);
      // Optionnel : afficher un toast de confirmation
      console.log('✅ ID copié:', contextMenuState.item.id);
    } catch (err) {
      console.error('❌ Erreur lors de la copie de l\'ID:', err);
    }
    closeContextMenu();
  }, [contextMenuState.item]);

  // Handler pour fermer le menu contextuel
  const closeContextMenu = useCallback(() => {
    setContextMenuState(cm => ({ ...cm, visible: false }));
  }, []);

  return {
    contextMenuState,
    handleContextMenuItem,
    handleOpen,
    handleRename,
    handleDelete,
    handleCopyId,
    closeContextMenu
  };
}; 