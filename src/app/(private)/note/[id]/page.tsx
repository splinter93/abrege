'use client';

import React from 'react';
import { supabase } from '@/supabaseClient';
import { useFileSystemStore } from '@/store/useFileSystemStore';
import Editor from '@/components/editor/Editor';
import TableOfContents from '@/components/editor/TableOfContents';
import { extractTOCWithSlugs } from '@/utils/markdownTOC';

export default function NotePage({ params }: { params: { id: string } }) {
  const noteId = params.id;
  const addNote = useFileSystemStore(s => s.addNote);
  const note = useFileSystemStore(s => s.notes[noteId]);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const [toc, setToc] = React.useState<Array<{ id: string; text: string; level: number }>>([]);

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError(null);

        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (!token) throw new Error('Authentication required');

        const res = await fetch(`/api/v2/note/${encodeURIComponent(noteId)}/content`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'X-Client-Type': 'web'
          }
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || `Failed to load note (${res.status})`);

        const content = json?.content;
        if (!content?.id) throw new Error('Invalid content payload');

        if (!cancelled) {
          addNote({
            id: content.id,
            source_title: content.title || 'Untitled',
            markdown_content: content.markdown || '',
            content: content.markdown || '',
            html_content: content.html || '',
            updated_at: content.updatedAt,
            created_at: content.createdAt,
          });
          const tocItems = extractTOCWithSlugs(content.markdown || '').map(h => ({ id: h.slug, text: h.title, level: h.level }));
          setToc(tocItems);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Unknown error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [noteId, addNote]);

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

  // Full layout: header image, sticky TOC, toolbar slot, editor content
  return (
    <div style={{ width: '100vw', minHeight: '100vh', background: 'var(--bg-main)', paddingBottom: 64, overflowY: 'auto', height: '100vh' }}>
      {/* Header image */}
      { (note as any)?.header_image && (
        <div style={{ width: '100%', maxHeight: 300, overflow: 'hidden', marginBottom: 24 }}>
          <img src={(note as any).header_image} alt="Header" style={{ width: '100%', objectFit: 'cover', maxHeight: 300 }} draggable={false} />
        </div>
      )}

      {/* Sticky TOC on the right */}
      <div style={{ position: 'fixed', top: (((note as any)?.header_image ? 300 : 0) + 32), right: 0, zIndex: 100, minWidth: 32, maxWidth: 300, padding: '24px 18px 24px 0', boxSizing: 'border-box' }}>
        <TableOfContents items={toc} />
      </div>

      {/* Editor content with toolbar placeholder (Editor component will host toolbar soon) */}
      <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: 'min(900px, 100%)', padding: '0 24px' }}>
          {/* Toolbar slot */}
          <div className="editor-header editor-sticky-top editor-z-100 editor-bg-surface-2 editor-border-bottom" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', marginBottom: 12 }}>
            <div style={{ fontWeight: 600, color: 'var(--chat-text-primary)' }}>Barre d'outils</div>
            <div />
          </div>
          <Editor noteId={noteId} />
        </div>
      </div>
    </div>
  );
} 