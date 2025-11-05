import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import '@/styles/error-pages.css';
import LogoHeader from '@/components/LogoHeader';
import ErrorPageActions from '@/components/ErrorPageActions';
import { logger, LogCategory } from '@/utils/logger';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

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
            Cet utilisateur n&apos;existe pas ou n&apos;est pas accessible.
          </p>
          <p className="not-found-subtitle">
            Vérifiez l&apos;URL ou contactez l&apos;auteur.
          </p>
          
          <ErrorPageActions />
        </div>
      </div>
    );
  }

  // Vérifier si l'utilisateur est connecté (pour permettre au créateur de voir sa note privée)
  let isCreator = false;
  
  try {
    const headersList = await headers();
    const cookies = headersList.get('cookie');
    
    if (cookies) {
      // Chercher le token d'accès Supabase dans les cookies
      const accessTokenMatch = cookies.match(/sb-[^-]+-auth-token=([^;]+)/);
      if (accessTokenMatch) {
        const cookieValue = decodeURIComponent(accessTokenMatch[1]);
        const cookieData = JSON.parse(cookieValue);
        const token = cookieData.access_token;
        
        if (token) {
          const { data: { user: authUser }, error: authError } = await supabaseService.auth.getUser(token);
          
          logger.dev(LogCategory.API, '[PublicNoteId] 🔑 Auth cookie check:', {
            hasAuthUser: !!authUser,
            authUserId: authUser?.id,
            noteOwnerId: user.id,
            match: authUser?.id === user.id
          });
          
          if (!authError && authUser && authUser.id === user.id) {
            isCreator = true;
            logger.info(LogCategory.API, '[PublicNoteId] ✅ Créateur détecté via cookie');
          }
        }
      }
    }
  } catch (error) {
    // Ignorer les erreurs d'authentification, on continue sans être connecté
    logger.warn(LogCategory.API, '[PublicNoteId] Erreur auth cookie (non bloquante)', {
      username: decodedUsername,
      noteId,
      error: error instanceof Error ? error.message : String(error)
    });
  }

  // Chercher la note par ID et user_id
  // Utiliser supabaseService pour contourner les RLS (notes publiques doivent être accessibles)
  let noteQuery = supabaseService
    .from('articles')
    .select('slug')
    .eq('id', noteId)
    .eq('user_id', user.id)
    .is('trashed_at', null); // Exclure les notes supprimées

  // Si ce n'est pas le créateur, exclure les notes privées
  if (!isCreator) {
    noteQuery = noteQuery.not('share_settings->>visibility', 'eq', 'private');
    logger.dev(LogCategory.API, '[PublicNoteId] 🔒 Non-créateur : filtre notes privées');
  } else {
    logger.info(LogCategory.API, '[PublicNoteId] ✅ Créateur : accès complet (y compris privées)');
  }

  const { data: note, error: noteError } = await noteQuery.single();
  
  logger.dev(LogCategory.API, '[PublicNoteId] 📥 Résultat query:', {
    found: !!note,
    visibility: note?.share_settings?.visibility,
    isCreator
  });

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
            Cette note n&apos;existe pas ou n&apos;est pas accessible publiquement.
          </p>
          <p className="not-found-subtitle">
            Vérifiez l&apos;URL ou contactez l&apos;auteur.
          </p>
          
          <ErrorPageActions />
        </div>
      </div>
    );
  }

  // Redirige vers l'URL avec le slug actuel (SEO-friendly)
  redirect(`/@${decodedUsername}/${note.slug}`);
} 