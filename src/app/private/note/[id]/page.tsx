'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { useFileSystemStore } from '@/store/useFileSystemStore';
import Editor from '@/components/editor/Editor';
import { useOptimizedNoteLoader } from '@/hooks/useOptimizedNoteLoader';
import UnifiedRealtimeManager from '@/components/UnifiedRealtimeManager';

export default function NotePage() {
  const params = useParams();
  const noteId = params ? (params.id as string) : null;

  // 🔧 OPTIMISATION : Utiliser le hook optimisé
  const { note, loading, error } = useOptimizedNoteLoader({
    noteRef: noteId || '',
    autoLoad: !!noteId,
    preloadContent: true
  });

  // 🔍 DEBUG : Vérifier le contenu de la note
  React.useEffect(() => {
    if (note) {
      console.log('[NotePage] 📝 Note chargée:', {
        id: note.id,
        title: note.source_title,
        hasMarkdown: !!note.markdown_content,
        markdownLength: note.markdown_content?.length || 0,
        hasContent: !!note.content,
        contentLength: note.content?.length || 0,
        hasHtml: !!note.html_content,
        htmlLength: note.html_content?.length || 0
      });
    }
  }, [note]);

  // 🔍 DEBUG : Surveiller les changements du store
  const noteFromStore = useFileSystemStore(s => s.notes[noteId || '']);
  React.useEffect(() => {
    if (noteFromStore) {
      console.log('[NotePage] 🔄 Note mise à jour dans le store:', {
        id: noteFromStore.id,
        title: noteFromStore.source_title,
        hasMarkdown: !!noteFromStore.markdown_content,
        markdownLength: noteFromStore.markdown_content?.length || 0,
        hasContent: !!noteFromStore.content,
        contentLength: noteFromStore.content?.length || 0
      });
    }
  }, [noteFromStore]);

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
      <UnifiedRealtimeManager />
      <Editor noteId={noteId} />
    </div>
  );
} 