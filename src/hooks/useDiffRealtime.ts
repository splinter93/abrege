import { useEffect, useState } from 'react';
import { useRealtime } from './useRealtime';
import { Change } from 'diff';

interface DiffState {
  isVisible: boolean;
  changes: Change[];
  addedLines: number;
  removedLines: number;
  modifiedSections: string[];
  lastChangeTime: number | null;
  // Nouveau: support collaboratif
  collaboratorInfo?: {
    id: string;
    name: string;
    avatar?: string;
  };
  changeSource?: 'local' | 'remote' | 'collaborative';
}

export function useDiffRealtime(noteId: string, userId: string) {
  const [diffState, setDiffState] = useState<DiffState>({
    isVisible: false,
    changes: [],
    addedLines: 0,
    removedLines: 0,
    modifiedSections: [],
    lastChangeTime: null
  });

  const { subscribe, unsubscribe } = useRealtime({
    userId,
    type: 'polling'
  });

  useEffect(() => {
    const handleNoteChange = (event: any) => {
      if (event.table === 'articles' && event.eventType === 'UPDATE' && event.diff) {
        console.log('🎯 Diff détecté:', event.diff);
        
        setDiffState({
          isVisible: true,
          changes: event.diff.changes,
          addedLines: event.diff.addedLines,
          removedLines: event.diff.removedLines,
          modifiedSections: event.diff.modifiedSections,
          lastChangeTime: Date.now()
        });

        // Masquer automatiquement après 5 secondes
        setTimeout(() => {
          setDiffState(prev => ({ ...prev, isVisible: false }));
        }, 5000);
      }
    };

    // S'abonner aux changements d'articles
    subscribe('articles', handleNoteChange);

    return () => {
      unsubscribe('articles');
    };
  }, [noteId, subscribe, unsubscribe]);

  const hideDiff = () => {
    setDiffState(prev => ({ ...prev, isVisible: false }));
  };

  const showDiff = () => {
    setDiffState(prev => ({ ...prev, isVisible: true }));
  };

  return {
    ...diffState,
    hideDiff,
    showDiff
  };
} 