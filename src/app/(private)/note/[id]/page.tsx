// PAGE DE TEST LIVE DES MUTATIONS LLM/WEBSOCKET
'use client';
import React from 'react';
import { useParams } from 'next/navigation';
import { useFileSystemStore } from '@/store/useFileSystemStore';
import type { FileSystemState } from '@/store/useFileSystemStore';
import Editor from '@/components/editor/Editor';
import AppRealtimeBridge from '@/components/AppRealtimeBridge';

/**
 * NoteEditorLivePage
 *
 * Page Next.js minimaliste pour tester le rendu en direct des mutations LLM/WebSocket sur une note.
 * - Synchronisation automatique via AppRealtimeBridge (WebSocket)
 * - Affichage du titre et du contenu en live via Zustand
 * - Prépare un mode édition active (editable/canEdit)
 */
export default function NoteEditorLivePage() {
  const params = useParams();
  const noteId = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : '';
  // À adapter selon ton backend :
  const wsUrl = 'wss://api.abrege.app/ws'; // URL WebSocket de production
  const token = 'demo-token'; // à remplacer par le vrai token utilisateur
  const debug = true;
  const note = useFileSystemStore((s: FileSystemState) => s.notes[noteId]);

  return (
    <>
      <AppRealtimeBridge wsUrl={wsUrl} token={token} debug={debug} />
      <div style={{ minHeight: '100vh', width: '100vw', background: 'var(--surface-1)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <header className="editor-header" style={{ position: 'sticky', top: 0, left: 0, width: '100vw', zIndex: 100, background: '#18181c', minHeight: 54, display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', boxSizing: 'border-box', padding: 0, justifyContent: 'space-between' }}>
          <div style={{ fontWeight: 700, fontSize: 22, color: '#fff', marginLeft: 24 }}>
            {note ? note.title : 'Chargement…'}
          </div>
        </header>
        <main style={{ flex: 1, width: '100%', maxWidth: 820, margin: '0 auto', padding: '32px 0' }}>
          <Editor noteId={noteId} readonly />
        </main>
      </div>
    </>
  );
}
// Ancienne page premium Tiptap commentée ci-dessous
// ... 