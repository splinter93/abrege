'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { useFileSystemStore } from '@/store/useFileSystemStore';
import Editor from '@/components/editor/Editor';
import { useOptimizedNoteLoader } from '@/hooks/useOptimizedNoteLoader';
import { useRealtime } from '@/hooks/useRealtime';
import { useAuth } from '@/hooks/useAuth';
import { SimpleLoadingState } from '@/components/DossierLoadingStates';

export default function NotePage() {
  const params = useParams();
  const noteId = params ? (params.id as string) : null;
  const { user } = useAuth();

  // 🔧 OPTIMISATION : Utiliser le hook optimisé
  const { note, loading, error } = useOptimizedNoteLoader({
    noteRef: noteId || '',
    autoLoad: !!noteId,
    preloadContent: true
  });

  // 🔄 Realtime Service - Initialisation pour les mises à jour en temps réel des articles
  const realtime = useRealtime({
    userId: user?.id || '',
    noteId: noteId || undefined,
    debug: false
  });




  if (!noteId) {
    return <SimpleLoadingState message="Chargement" />;
  }

  if (loading && !note) {
    return <SimpleLoadingState message="Chargement" />;
  }
  
  if (error && !note) {
    return <SimpleLoadingState message="Erreur" />;
  }

  // Render only the real Editor (which includes its own header/toolbar/kebab/TOC)
  return (
    <div style={{ width: '100vw', minHeight: '100vh' }}>
      <Editor noteId={noteId} />
    </div>
  );
} 