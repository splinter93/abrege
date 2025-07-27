import { useMemo } from 'react';
import { Folder, FileArticle } from '../components/types';

interface UseFolderFilterProps {
  folders?: Folder[];
  notes?: FileArticle[];
}

interface UseFolderFilterReturn {
  safeFolders: Folder[];
  safeFiles: FileArticle[];
}

/**
 * Hook pour valider et filtrer les données des dossiers et fichiers
 * Extrait la logique de validation et filtrage du FolderManager
 */
export const useFolderFilter = ({
  folders,
  notes
}: UseFolderFilterProps): UseFolderFilterReturn => {
  // Robustesse : toujours un tableau pour éviter les erreurs React #310
  const safeFolders = useMemo(() => Array.isArray(folders) ? folders : [], [folders]);
  const safeFiles = useMemo(() => Array.isArray(notes) ? notes : [], [notes]);

  return {
    safeFolders,
    safeFiles
  };
}; 