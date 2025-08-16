import { createClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import '@/styles/markdown.css';
import LogoHeader from '@/components/LogoHeader';
import type { Metadata } from 'next';
import PublicNoteContent from './PublicNoteContent';

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
    .limit(1)
    .maybeSingle();
  if (!user) return { title: 'Note introuvable – Scrivia' };
  // Chercher la note par slug et user_id (toutes les notes, même privées)
  const { data: note } = await supabase
    .from('articles')
    .select('source_title, summary, header_image')
    .eq('slug', slug)
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();
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
    .select('id, username')
    .eq('username', decodedUsername)
    .limit(1)
    .maybeSingle();

  if (userError || !user) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div style={{ marginLeft: '4px', display: 'inline-block' }}>
          <LogoHeader size="medium" position="center" />
        </div>
        <h1>Utilisateur non trouvé</h1>
        <p>Vérifiez l&apos;URL ou contactez l&apos;auteur.</p>
        <p>Debug: error = {userError?.message}</p>
      </div>
    );
  }

  // Chercher la note par slug et user_id (toutes les notes, même privées)
  const { data: noteBySlug } = await supabase
    .from('articles')
    .select('id, slug, source_title, html_content, markdown_content, header_image, header_image_offset, header_image_blur, header_image_overlay, header_title_in_image, wide_mode, font_family, created_at, updated_at, visibility, user_id')
    .eq('slug', slug)
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();

  if (!noteBySlug) {
    // Slug peut avoir changé: essayer par public_url/id => récupérer la note accessible la plus récente et rediriger si trouvée
    const { data: latestNote } = await supabase
      .from('articles')
      .select('id, slug')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestNote?.slug) {
      // Redirection 301 vers le slug courant le plus probable (fallback simple)
      const url = `/@${user.username}/${latestNote.slug}`;
      return redirect(url);
    }

    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div style={{ marginLeft: '4px', display: 'inline-block' }}>
          <LogoHeader size="medium" position="center" />
        </div>
        <h1>Note non trouvée ou non publiée</h1>
        <p>Vérifiez l&apos;URL ou contactez l&apos;auteur.</p>
      </div>
    );
  }

  // Canonical: si le slug en DB ne correspond pas à l'URL, rediriger 301 vers le bon slug
  if (noteBySlug.slug !== slug) {
    const url = `/@${user.username}/${noteBySlug.slug}`;
    return redirect(url);
  }

  // Vérifier l'authentification et les permissions
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  
  // Si la note est privée, vérifier que l'utilisateur actuel est le propriétaire
  if (noteBySlug.visibility === 'private') {
    if (!currentUser || currentUser.id !== noteBySlug.user_id) {
      return (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <div style={{ marginLeft: '4px', display: 'inline-block' }}>
            <LogoHeader size="medium" position="center" />
          </div>
          <h1>Note privée</h1>
          <p>Cette note est privée et n'est accessible qu'à son propriétaire.</p>
          <p>Connectez-vous pour y accéder si vous en êtes le propriétaire.</p>
        </div>
      );
    }
  }

  return <PublicNoteContent note={noteBySlug} slug={slug} />;
} 