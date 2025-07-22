'use client';
import React, { useEffect, useState } from 'react';

export default function Page(props: any) {
  const { username, slug } = props.params;
  const [note, setNote] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`https://abrege93.vercel.app/api/v1/public/note/${encodeURIComponent(username)}/${encodeURIComponent(slug)}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        setNote(data?.note || null);
        setLoading(false);
      });
  }, [username, slug]);

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Chargement…</div>;
  }
  if (!note) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h1>Note non trouvée ou non publiée</h1>
        <p>Vérifiez l'URL ou contactez l'auteur.</p>
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: '800px',
      margin: '0 auto',
      padding: '2rem',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      lineHeight: 1.6,
      color: '#333',
    }}>
      {/* Header Image */}
      {note.header_image && (
        <img
          src={note.header_image}
          alt="Header"
          style={{
            width: '100%',
            height: '300px',
            objectFit: 'cover',
            borderRadius: '12px',
            marginBottom: '2rem',
          }}
        />
      )}

      {/* Titre */}
      <h1
        style={{
          fontSize: '2.5rem',
          fontWeight: '700',
          marginBottom: '1rem',
          color: '#1a1a1a',
        }}
      >
        {note.source_title}
      </h1>

      {/* Métadonnées */}
      <div
        style={{
          color: '#666',
          fontSize: '0.9rem',
          marginBottom: '2rem',
          borderBottom: '1px solid #eee',
          paddingBottom: '1rem',
        }}
      >
        <span>Créé le {new Date(note.created_at).toLocaleDateString('fr-FR')}</span>
        {note.updated_at !== note.created_at && (
          <span style={{ marginLeft: '1rem' }}>
            • Modifié le {new Date(note.updated_at).toLocaleDateString('fr-FR')}
          </span>
        )}
      </div>

      {/* Contenu HTML */}
      <div
        className="markdown-body"
        dangerouslySetInnerHTML={{ __html: note.html_content || '' }}
        style={{ fontSize: '1.1rem', lineHeight: 1.7 }}
      />

      {/* Footer */}
      <div
        style={{
          marginTop: '3rem',
          paddingTop: '2rem',
          borderTop: '1px solid #eee',
          textAlign: 'center',
          color: '#666',
          fontSize: '0.9rem',
        }}
      >
        <p>Partagé via <a href={`https://abrege93.vercel.app/@${username}`} style={{ color: '#1a1a1a', textDecoration: 'underline' }}>@{username}</a></p>
      </div>
    </div>
  );
} 