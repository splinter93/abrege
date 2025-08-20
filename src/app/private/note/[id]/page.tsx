'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { useFileSystemStore } from '@/store/useFileSystemStore';
import Editor from '@/components/editor/Editor';
import { useOptimizedNoteLoader } from '@/hooks/useOptimizedNoteLoader';

export default function NotePage() {
  const params = useParams();
  const noteId = params ? (params.id as string) : null;

  // 🔧 OPTIMISATION : Utiliser le hook optimisé
  const { note, loading, error } = useOptimizedNoteLoader({
    noteRef: noteId || '',
    autoLoad: !!noteId,
    preloadContent: true
  });

  if (!noteId) {
    return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>ID de note non valide.</div>;
  }

  if (loading && !note) {
    return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Chargement de la note…</div>;
  }
  
  if (error && !note) {
    return (
      <div style={{ padding: 24 }}>
        <h2>Impossible d'ouvrir la note</h2>
        <p style={{ color: 'var(--chat-text-tertiary)' }}>{error}</p>
      </div>
    );
  }

  // Render only the real Editor (which includes its own header/toolbar/kebab/TOC)
  return (
    <div style={{ width: '100vw', minHeight: '100vh' }}>
      <Editor noteId={noteId} />
    </div>
  );
} 