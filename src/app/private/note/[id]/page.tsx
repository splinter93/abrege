'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/supabaseClient';
import { useFileSystemStore } from '@/store/useFileSystemStore';
import Editor from '@/components/editor/Editor';

export default function NotePage() {
  const params = useParams();
  const noteId = params ? (params.id as string) : null;

  const addNote = useFileSystemStore(s => s.addNote);
  const note = noteId ? useFileSystemStore(s => s.notes[noteId]) : null;
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError(null);

        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (!token) throw new Error('Authentication required');

        const res = await fetch(`/api/v2/note/${encodeURIComponent(noteId || '')}/content`, {
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
            header_image: content.headerImage || null,
            header_image_offset: content.headerImageOffset ?? 50,
            header_image_blur: content.headerImageBlur ?? 0,
            header_image_overlay: content.headerImageOverlay ?? 0,
            header_title_in_image: content.headerTitleInImage ?? false,
            wide_mode: content.wideMode ?? false,
            font_family: content.fontFamily || null,
            updated_at: content.updatedAt,
            created_at: content.createdAt,
            slug: content.slug,
            public_url: content.publicUrl,
            visibility: content.visibility
          } as any);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Unknown error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (noteId) {
    load();
    }
    return () => { cancelled = true; };
  }, [noteId, addNote]);

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