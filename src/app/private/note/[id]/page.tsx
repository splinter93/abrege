'use client';

import React, { Suspense } from 'react';
import { useParams } from 'next/navigation';
import { useFileSystemStore } from '@/store/useFileSystemStore';
import { useOptimizedNoteLoader } from '@/hooks/useOptimizedNoteLoader';
import { useRealtime } from '@/hooks/useRealtime';
import { useAuth } from '@/hooks/useAuth';
import { SimpleLoadingState } from '@/components/DossierLoadingStates';

// ✅ OPTIMISATION : Lazy load composant lourd (conforme GUIDE-EXCELLENCE-CODE.md)
const Editor = React.lazy(() => import('@/components/editor/Editor'));

export default function NotePage() {
  const params = useParams();
  const noteId = params ? (params.id as string) : null;
  const { user } = useAuth();

  // ✅ Affichage instantané si la note est déjà dans le store (ex: ouverture side panel puis pleine page)
  const noteFromStore = useFileSystemStore((s) => (noteId ? s.notes[noteId] : null));

  const { note, loading, error } = useOptimizedNoteLoader({
    noteRef: noteId || '',
    autoLoad: !!noteId,
    preloadContent: true
  });

  const resolvedNoteIdForRealtime = note?.id || noteFromStore?.id || noteId;
  useRealtime({
    userId: user?.id || '',
    noteId: resolvedNoteIdForRealtime || undefined,
    debug: false
  });

  if (!noteId) {
    return <SimpleLoadingState message="Chargement" />;
  }

  // Si la note est déjà en store (ex. ouverture rapide après side panel), afficher l'éditeur tout de suite
  const resolvedNoteId = note?.id || noteFromStore?.id || noteId;
  if (noteFromStore && noteFromStore.markdown_content !== undefined) {
    return (
      <div style={{ width: '100vw', minHeight: '100vh' }}>
        <Suspense fallback={<SimpleLoadingState message="Chargement" />}>
          <Editor noteId={noteFromStore.id} />
        </Suspense>
      </div>
    );
  }

  if (loading && !note) {
    return <SimpleLoadingState message="Chargement" />;
  }

  if (error && !note) {
    return <SimpleLoadingState message="Erreur" />;
  }

  return (
    <div style={{ width: '100vw', minHeight: '100vh' }}>
      <Suspense fallback={<SimpleLoadingState message="Chargement" />}>
        <Editor noteId={resolvedNoteId} />
      </Suspense>
    </div>
  );
} 