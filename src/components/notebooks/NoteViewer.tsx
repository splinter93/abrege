'use client';

import React, { Suspense } from 'react';
import { useOptimizedNoteLoader } from '@/hooks/useOptimizedNoteLoader';
import { useRealtime } from '@/hooks/useRealtime';
import { useAuth } from '@/hooks/useAuth';
import { SimpleLoadingState } from '@/components/DossierLoadingStates';

const Editor = React.lazy(() =>
  import('@/components/editor/Editor').then((m) => ({ default: m.default }))
);

interface NoteViewerProps {
  noteRef: string;
  onClose?: () => void;
}

/**
 * Wrapper réutilisable : charge la note et affiche l'éditeur.
 * Utilisé par NoteSidePanel, NoteModal et la page note classique.
 */
export default function NoteViewer({ noteRef, onClose }: NoteViewerProps) {
  const { user } = useAuth();
  const { note, loading, error } = useOptimizedNoteLoader({
    noteRef,
    autoLoad: !!noteRef,
    preloadContent: true,
  });

  const resolvedNoteId = note?.id || noteRef;
  useRealtime({
    userId: user?.id || '',
    noteId: resolvedNoteId || undefined,
    debug: false,
  });

  if (!noteRef) {
    return <SimpleLoadingState message="Chargement" />;
  }

  if (loading && !note) {
    return <SimpleLoadingState message="Chargement" />;
  }

  if (error && !note) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-sm text-zinc-400">Impossible de charger la note.</p>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-600 bg-zinc-800/80 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-700"
          >
            Fermer
          </button>
        )}
      </div>
    );
  }

  return (
    <Suspense fallback={<SimpleLoadingState message="Chargement" />}>
      <Editor noteId={resolvedNoteId} onClose={onClose} />
    </Suspense>
  );
}
