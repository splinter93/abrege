import { redirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default async function Page(props: { params: Promise<{ username: string; noteId: string }> }) {
  const { username, noteId: noteId } = await props.params;

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
        <h1>Utilisateur non trouvé</h1>
        <p>Vérifiez l&apos;URL ou contactez l&apos;auteur.</p>
      </div>
    );
  }

  // Chercher la note par ID et user_id, ispublished = true
  const { data: note, error: noteError } = await supabase
    .from('articles')
    .select('slug')
    .eq('id', noteId)
    .eq('user_id', user.id)
    .eq('ispublished', true)
    .single();

  if (noteError || !note) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h1>Note non trouvée ou non publiée</h1>
        <p>Vérifiez l&apos;URL ou contactez l&apos;auteur.</p>
      </div>
    );
  }

  // Redirige vers l'URL avec le slug actuel (SEO-friendly)
  redirect(`/@${decodedUsername}/${note.slug}`);
} 