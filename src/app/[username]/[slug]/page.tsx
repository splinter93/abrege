import { createClient } from '@supabase/supabase-js';
import '@/styles/error-pages.css'; // Uniquement pour les pages d'erreur
import ErrorPage from '@/components/ErrorPage';
import PublicNoteAuthWrapper from '@/components/PublicNoteAuthWrapper';
import type { Metadata } from 'next';

// Note: Les styles de l'éditeur (typography, markdown, etc.) sont gérés par le composant Editor via editor-bundle.css

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

  // ✅ Détecter si [slug] est un UUID ou un slug
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);

  // Chercher la note par slug ou id selon le format
  let noteQuery = supabaseService
    .from('articles')
    .select('source_title, markdown_content, header_image')
    .eq('user_id', user.id)
    .limit(1);

  if (isUUID) {
    noteQuery = noteQuery.eq('id', slug);
  } else {
    noteQuery = noteQuery.eq('slug', slug);
  }

  const { data: note } = await noteQuery.maybeSingle();
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
      <ErrorPage
        icon="warning"
        title="Page introuvable"
        description="Cette page n'existe pas ou a été supprimée."
        showActions={true}
        showBackButton={false}
      />
    );
  }

  // ✅ NOUVEAU : Détecter si [slug] est un UUID (URL permanente) ou un slug (URL SEO)
  // UUID format: 8-4-4-4-12 caractères hexadécimaux
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);

  // Récupérer la note (minimaliste - l'Editor chargera les détails via le store)
  // Utiliser le client service pour contourner RLS
  let noteQuery = supabaseService
    .from('articles')
    .select('id, user_id, share_settings, slug')
    .eq('user_id', owner.id)
    .limit(1);

  // Chercher par ID si UUID, sinon par slug
  if (isUUID) {
    noteQuery = noteQuery.eq('id', slug);
  } else {
    noteQuery = noteQuery.eq('slug', slug);
  }

  const { data: note, error: noteError } = await noteQuery.maybeSingle();

  if (noteError || !note) {
    return (
      <ErrorPage
        icon="document"
        title="Note introuvable"
        description="Cette note est privée ou a été supprimée."
        showActions={true}
        showBackButton={false}
      />
    );
  }

  // ✅ SÉCURITÉ : Vérification supplémentaire
  // Si recherche par slug, vérifier que le slug correspond
  if (!isUUID && note.slug !== slug) {
    return (
      <ErrorPage
        icon="warning"
        title="Note introuvable"
        description="Cette note est privée ou a été supprimée."
        showActions={true}
        showBackButton={false}
      />
    );
  }

  // Utiliser le composant client pour gérer l'authentification
  return <PublicNoteAuthWrapper note={note} slug={slug} ownerId={owner.id} username={decodedUsername} />;
} 