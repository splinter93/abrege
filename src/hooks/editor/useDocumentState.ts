/**
 * useDocumentState - Hook pour l'état du document
 * 
 * Responsabilités:
 * - Gestion du titre
 * - État de chargement de la note
 * - Force update de la TOC
 */

import { useState, useCallback, useEffect } from 'react';

export interface DocumentState {
  title: string;
  noteLoaded: boolean;
  forceTOCUpdate: number;
}

export interface UseDocumentStateOptions {
  initialTitle?: string;
}

export interface UseDocumentStateReturn {
  document: DocumentState;
  setTitle: (title: string) => void;
  setNoteLoaded: (loaded: boolean) => void;
  updateTOC: () => void;
}

/**
 * Hook pour gérer l'état du document
 */
export function useDocumentState(options: UseDocumentStateOptions = {}): UseDocumentStateReturn {
  const [title, setTitle] = useState<string>(options.initialTitle || '');
  const [noteLoaded, setNoteLoaded] = useState(false);
  const [forceTOCUpdate, setForceTOCUpdate] = useState(0);

  // Sync titre quand initialTitle change (ex: switch canva)
  useEffect(() => {
    if (options.initialTitle !== undefined) {
      setTitle(options.initialTitle);
    }
  }, [options.initialTitle]);

  const updateTOC = useCallback(() => {
    setForceTOCUpdate(prev => prev + 1);
  }, []);

  return {
    document: {
      title,
      noteLoaded,
      forceTOCUpdate,
    },
    setTitle,
    setNoteLoaded,
    updateTOC,
  };
}

