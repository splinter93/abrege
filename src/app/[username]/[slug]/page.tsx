import { createClient } from '@supabase/supabase-js';
import '@/styles/markdown.css';
import LogoScrivia from '@/components/LogoScrivia';


import type { Metadata } from 'next';
import PublicNoteContent from '@/app/[username]/[slug]/PublicNoteContent';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function generateMetadata({ params }: { params: Promise<{ username: string; slug: string }> }): Promise<Metadata> {
  const { username, slug } = await params;
  const decodedUsername = decodeURIComponent(username).replace(/^@/, '');
  // Chercher l'utilisateur par username
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('username', decodedUsername)
    .single();
  if (!user) return { title: 'Note introuvable – Scrivia' };
  // Chercher la note par slug et user_id, ispublished = true
  const { data: note } = await supabase
    .from('articles')
    .select('source_title, summary, header_image')
    .eq('slug', slug)
    .eq('user_id', user.id)
    .eq('ispublished', true)
    .single();
  if (!note) return { title: 'Note introuvable – Scrivia' };
  
  const title = note.source_title + ' – Scrivia';
  const description = note.summary || 'Note partagée via Scrivia';
  const image = note.header_image || undefined;
  
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: image ? [{ url: image, width: 1200, height: 630 }] : [],
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: image ? [image] : [],
    },
  };
}

export default async function Page(props: { params: Promise<{ username: string; slug: string }> }) {
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
        <div style={{ marginLeft: '4px', display: 'inline-block' }}>
          <LogoScrivia />
        </div>
        <h1>Utilisateur non trouvé</h1>
        <p>Vérifiez l&apos;URL ou contactez l&apos;auteur.</p>
        <p>Debug: error = {userError?.message}</p>
      </div>
    );
  }

  // Chercher la note par slug et user_id, ispublished = true
  const { data: note, error: noteError } = await supabase
    .from('articles')
    .select('source_title, html_content, markdown_content, header_image, header_image_offset, header_image_blur, header_image_overlay, header_title_in_image, wide_mode, font_family, created_at, updated_at')
    .eq('slug', slug)
    .eq('user_id', user.id)
    .eq('ispublished', true)
    .single();

  if (noteError || !note) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div style={{ marginLeft: '4px', display: 'inline-block' }}>
          <LogoScrivia />
        </div>
        <h1>Note non trouvée ou non publiée</h1>
        <p>Vérifiez l&apos;URL ou contactez l&apos;auteur.</p>
      </div>
    );
  }

  return <PublicNoteContent note={note} slug={slug} />;
} 