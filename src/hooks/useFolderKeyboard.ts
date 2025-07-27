import { useEffect } from 'react';

interface UseFolderKeyboardProps {
  closeContextMenu: () => void;
}

/**
 * Hook pour gérer les raccourcis clavier du Folder Manager
 * Extrait la logique des raccourcis clavier du FolderManager
 */
export const useFolderKeyboard = ({
  closeContextMenu
}: UseFolderKeyboardProps): void => {
  // Gestion des raccourcis clavier
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeContextMenu();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeContextMenu]);
}; 