import { createClient } from '@supabase/supabase-js';
import '@/styles/shared-note.css';
import LogoScrivia from '@/components/LogoScrivia';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import type { Heading } from '@/types/editor';
import PublicTOCClient from '@/components/PublicTOCClient';
import { FiFeather } from 'react-icons/fi';
import CraftedBadge from '@/components/CraftedBadge';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default async function Page(props: any) {
  const { username, slug } = await props.params;

  // Décoder l'username (retirer le @ et décoder l'URL)
  const decodedUsername = decodeURIComponent(username).replace(/^@/, '');

  // Chercher l'utilisateur par username
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('username', decodedUsername)
    .single();

  if (userError || !user) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <LogoScrivia />
        <h1>Utilisateur non trouvé</h1>
        <p>Vérifiez l'URL ou contactez l'auteur.</p>
        <p>Debug: error = {userError?.message}</p>
      </div>
    );
  }

  // Chercher la note par slug et user_id, ispublished = true
  const { data: note, error: noteError } = await supabase
    .from('articles')
    .select('source_title, html_content, markdown_content, header_image, created_at, updated_at')
    .eq('slug', slug)
    .eq('user_id', user.id)
    .eq('ispublished', true)
    .single();

  if (noteError || !note) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <LogoScrivia />
        <h1>Note non trouvée ou non publiée</h1>
        <p>Vérifiez l'URL ou contactez l'auteur.</p>
      </div>
    );
  }

  // Afficher directement le contenu avec le même design que la preview de l'éditeur
  return (
    <div style={{ width: '100vw', minHeight: '100vh', background: '#121217', color: '#D4D4D4', paddingBottom: 64 }}>
      <div style={{ width: '100%', background: '#323236', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        {/* Le Header est déjà injecté par AppMainContent, donc rien à ajouter ici */}
      </div>
      {note.header_image && (
        <div style={{ width: '100%', maxHeight: 300, overflow: 'hidden', marginBottom: 32 }}>
          <img
            src={note.header_image}
            alt="Header"
            style={{ width: '100%', objectFit: 'cover', maxHeight: 300, borderRadius: 0 }}
            draggable={false}
          />
        </div>
      )}
      <div style={{ width: '100%', display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-start', margin: '0 auto', marginBottom: 32, gap: 32, position: 'relative' }}>
        <div data-main-content style={{ maxWidth: 750, width: 750 }}>
          {/* Titre principal */}
          <h1 style={{
            fontSize: '2.25rem',
            fontWeight: 700,
            color: '#D4D4D4',
            margin: 0,
            padding: 0,
            textAlign: 'left',
            maxWidth: 750,
            width: 750,
            lineHeight: 1.1,
            fontFamily: 'Noto Sans, Inter, Arial, sans-serif',
          }}>{note.source_title}</h1>
          <div style={{ height: 18 }} />
          <div
            className="markdown-body"
            style={{
              maxWidth: 750,
              width: 750,
              margin: '0 auto',
              background: 'none',
              padding: '0 0 64px 0',
              fontSize: '1.13rem',
              color: 'var(--text-primary)',
              minHeight: '60vh',
              pointerEvents: 'auto',
              userSelect: 'text',
            }}
            dangerouslySetInnerHTML={{ __html: note.html_content || '' }}
          />
        </div>
        {/* TOC sticky tout à droite */}
        <div style={{ position: 'fixed', top: 380, right: 0, paddingRight: 0, minWidth: 220, maxWidth: 320, zIndex: 20 }}>
          <PublicTOCClient slug={slug} />
        </div>
      </div>
      {/* Footer discret */}
      <CraftedBadge />
    </div>
  );
} 