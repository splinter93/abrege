import { useState, useCallback } from 'react';
import type { Classeur } from '@/store/useFileSystemStore';

interface ClasseurTab {
  id: string;
  name: string;
  emoji?: string;
  color?: string;
  slug?: string;
}

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  item: ClasseurTab | null;
}

interface UseClasseurContextMenuProps {
  onRenameClasseur: (id: string, newName: string) => void;
  onDeleteClasseur: (id: string) => void;
  onUpdateClasseur: (id: string, data: Partial<Classeur>) => void;
}

interface UseClasseurContextMenuReturn {
  contextMenuState: ContextMenuState;
  handleContextMenuClasseur: (e: React.MouseEvent, classeur: Classeur) => void;
  handleRename: () => void;
  handleDelete: () => void;
  closeContextMenu: () => void;
}

/**
 * Hook pour gérer le menu contextuel des classeurs
 * Similaire au menu contextuel des dossiers mais adapté aux classeurs
 */
export const useClasseurContextMenu = ({
  onRenameClasseur,
  onDeleteClasseur,
  onUpdateClasseur
}: UseClasseurContextMenuProps): UseClasseurContextMenuReturn => {
  const [contextMenuState, setContextMenuState] = useState<ContextMenuState>({ 
    visible: false, 
    x: 0, 
    y: 0, 
    item: null 
  });

  // Handler pour clic droit sur classeur
  const handleContextMenuClasseur = useCallback((e: React.MouseEvent, classeur: ClasseurTab) => {
    e.preventDefault();
    setContextMenuState({ visible: true, x: e.clientX, y: e.clientY, item: classeur });
  }, []);

  // Handler pour renommer le classeur
  const handleRename = useCallback(() => {
    if (!contextMenuState.item) return;
    
    const newName = prompt('Nouveau nom du classeur :', contextMenuState.item.name);
    if (newName && newName.trim() && newName.trim() !== contextMenuState.item.name) {
      onRenameClasseur(contextMenuState.item.id, newName.trim());
    }
    closeContextMenu();
  }, [contextMenuState.item, onRenameClasseur]);

  // Handler pour supprimer le classeur
  const handleDelete = useCallback(() => {
    if (!contextMenuState.item) return;
    
    const classeurName = contextMenuState.item.name;
    if (window.confirm(`Supprimer définitivement le classeur « ${classeurName} » ?\n\nCette action supprimera également tous les dossiers et notes qu'il contient.`)) {
      onDeleteClasseur(contextMenuState.item.id);
    }
    closeContextMenu();
  }, [contextMenuState.item, onDeleteClasseur]);

  // Handler pour fermer le menu contextuel
  const closeContextMenu = useCallback(() => {
    setContextMenuState({ visible: false, x: 0, y: 0, item: null });
  }, []);

  return {
    contextMenuState,
    handleContextMenuClasseur,
    handleRename,
    handleDelete,
    closeContextMenu
  };
};
