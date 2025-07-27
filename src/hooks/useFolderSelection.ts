import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Folder, FileArticle } from '../components/types';

interface UseFolderSelectionProps {
  onFolderOpen: (folder: Folder) => void;
}

interface UseFolderSelectionReturn {
  activeId: string | null;
  handleItemClick: (item: Folder | FileArticle) => void;
  handleItemDoubleClick: (item: Folder | FileArticle) => void;
  handleFileOpen: (file: FileArticle) => void;
}

/**
 * Hook pour gérer la sélection et navigation des dossiers et fichiers
 * Extrait la logique de sélection et navigation du FolderManager
 */
export const useFolderSelection = ({
  onFolderOpen
}: UseFolderSelectionProps): UseFolderSelectionReturn => {
  const [activeId] = useState<string | null>(null);
  const router = useRouter();

  // Handler pour ouvrir un fichier
  const handleFileOpen = useCallback((file: FileArticle) => {
    router.push(`/note/${file.id}`);
  }, [router]);

  // Handler pour clic sur un élément
  const handleItemClick = useCallback((item: Folder | FileArticle) => {
    if ('name' in item) {
      // C'est un Folder
      onFolderOpen(item);
    } else {
      // C'est un FileArticle
      handleFileOpen(item);
    }
  }, [onFolderOpen, handleFileOpen]);

  // Handler pour double-clic (même logique que clic simple)
  const handleItemDoubleClick = useCallback((item: Folder | FileArticle) => {
    handleItemClick(item);
  }, [handleItemClick]);

  return {
    activeId,
    handleItemClick,
    handleItemDoubleClick,
    handleFileOpen
  };
}; 