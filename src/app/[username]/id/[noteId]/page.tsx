import { redirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import '@/styles/error-pages.css';
import LogoHeader from '@/components/LogoHeader';

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
    .limit(1)
    .maybeSingle();

  if (userError || !user) {
    return (
      <div className="not-found-container">
        <div className="not-found-content">
          <div className="not-found-logo">
            <LogoHeader size="medium" position="center" />
          </div>
          
          <div className="not-found-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path 
                d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" 
                stroke="currentColor" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
              <circle 
                cx="12" 
                cy="7" 
                r="4" 
                stroke="currentColor" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </svg>
          </div>
          
          <h1 className="not-found-title">Utilisateur non trouvé</h1>
          <p className="not-found-description">
            Cet utilisateur n'existe pas ou n'est pas accessible.
          </p>
          <p className="not-found-subtitle">
            Vérifiez l'URL ou contactez l'auteur.
          </p>
          
          <div className="not-found-actions">
            <a href="/" className="not-found-button primary">
              Retour à l'accueil
            </a>
            <button 
              onClick={() => window.history.back()} 
              className="not-found-button secondary"
            >
              Page précédente
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Chercher la note par ID et user_id, share_settings.visibility != 'private'
  const { data: note, error: noteError } = await supabase
    .from('articles')
    .select('slug')
    .eq('id', noteId)
    .eq('user_id', user.id)
    .not('share_settings->>visibility', 'eq', 'private')
    .single();

  if (noteError || !note) {
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
          
          <h1 className="not-found-title">Note non trouvée ou non publiée</h1>
          <p className="not-found-description">
            Cette note n'existe pas ou n'est pas accessible publiquement.
          </p>
          <p className="not-found-subtitle">
            Vérifiez l'URL ou contactez l'auteur.
          </p>
          
          <div className="not-found-actions">
            <a href="/" className="not-found-button primary">
              Retour à l'accueil
            </a>
            <button 
              onClick={() => window.history.back()} 
              className="not-found-button secondary"
            >
              Page précédente
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Redirige vers l'URL avec le slug actuel (SEO-friendly)
  redirect(`/@${decodedUsername}/${note.slug}`);
} 