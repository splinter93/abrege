import { createClient } from '@supabase/supabase-js';
import '@/styles/markdown.css';
import '@/styles/error-pages.css';
import LogoHeader from '@/components/LogoHeader';
import ErrorPageActions from '@/components/ErrorPageActions';
import PublicNoteAuthWrapper from '@/components/PublicNoteAuthWrapper';
import type { Metadata } from 'next';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);
const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

export async function generateMetadata({ params }: { params: Promise<{ username: string; slug: string }> }): Promise<Metadata> {
  const { username, slug } = await params;
  const decodedUsername = decodeURIComponent(username).replace(/^@/, '');
  
  // Chercher l'utilisateur par username
  const { data: user } = await supabaseAnon
    .from('users')
    .select('id')
    .eq('username', decodedUsername)
    .limit(1)
    .maybeSingle();
  if (!user) return { title: 'Note introuvable – Scrivia' };

  // Chercher la note par slug et user_id (même si privée - pour le titre de la page)
  const { data: note } = await supabaseService
    .from('articles')
    .select('source_title, markdown_content, header_image')
    .eq('slug', slug)
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();
  if (!note) return { title: 'Note introuvable – Scrivia' };
  
  const title = note.source_title + ' – Scrivia';
  const description = note.markdown_content || 'Note partagée via Scrivia';
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

  // Chercher l'utilisateur (propriétaire de la note) par username avec le client anonyme
  const { data: owner, error: userError } = await supabaseAnon
    .from('users')
    .select('id, username')
    .eq('username', decodedUsername)
    .limit(1)
    .maybeSingle();

  if (userError || !owner) {
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


  // Récupérer la note (même si elle est privée - le composant client gérera l'authentification)
  // Utiliser le client service pour contourner RLS
  console.log('🔍 [DEBUG] Server: Looking for note with slug:', slug, 'and user_id:', owner.id);
  
  const { data: noteBySlug, error: noteError } = await supabaseService
    .from('articles')
    .select(
      'id, source_title, html_content, markdown_content, header_image, header_image_offset, header_image_blur, header_image_overlay, header_title_in_image, wide_mode, font_family, created_at, updated_at, share_settings, slug, user_id'
    )
    .eq('slug', slug)
    .eq('user_id', owner.id)
    .limit(1)
    .maybeSingle();

  console.log('🔍 [DEBUG] Server: Note found:', !!noteBySlug);
  console.log('🔍 [DEBUG] Server: Note error:', noteError);
  if (noteBySlug) {
    console.log('🔍 [DEBUG] Server: Note visibility:', noteBySlug.share_settings?.visibility);
  }

  if (noteError || !noteBySlug) {
    // Note non trouvée - afficher une erreur au lieu de rediriger
    return (
      <div className="not-found-container">
        <div className="not-found-content">
          <div className="not-found-logo">
            <LogoHeader size="medium" position="center" />
          </div>
          
          <div className="not-found-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path 
                d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.89 22 5.99 22H18C19.1 22 20 21.1 20 20V8L14 2Z" 
                stroke="currentColor" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
              <path 
                d="M14 2V8H20" 
                stroke="currentColor" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
              <path 
                d="M16 13H8" 
                stroke="currentColor" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
              <path 
                d="M16 17H8" 
                stroke="currentColor" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
              <path 
                d="M10 9H8" 
                stroke="currentColor" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </svg>
          </div>
          
          <h1 className="not-found-title">Note non trouvée</h1>
          <p className="not-found-description">
            Cette note n'existe pas ou n'est pas accessible.
          </p>
          <p className="not-found-subtitle">
            Vérifiez l'URL ou contactez l'auteur.
          </p>
          
          <ErrorPageActions />
        </div>
      </div>
    );
  }

  // ✅ SÉCURITÉ : Vérification supplémentaire du slug
  if (noteBySlug.slug !== slug) {
    console.warn(`Slug mismatch: URL=${slug}, DB=${noteBySlug.slug}`);
  }


  // Utiliser le composant client pour gérer l'authentification
  return <PublicNoteAuthWrapper note={noteBySlug} slug={slug} ownerId={owner.id} />;
} 