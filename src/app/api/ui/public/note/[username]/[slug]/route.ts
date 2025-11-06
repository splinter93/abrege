import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { NextRequest } from 'next/server';
import { logger, LogCategory } from '@/utils/logger';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Client anonyme pour les requêtes publiques
const supabase = createClient(supabaseUrl, supabaseAnonKey);
// Client avec service role pour l'authentification
const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

/**
 * GET /api/ui/public/note/[username]/[slug]
 * Récupère une note accessible par username et slug
 * - Si visibility != 'private' : accessible à tous
 * - Si visibility = 'private' : accessible uniquement au créateur de la note
 * Réponse : { note: { source_title, html_content, header_image, created_at, updated_at } }
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ username: string; slug: string }> }): Promise<Response> {
  let username = '';
  let slug = '';
  
  try {
    const schema = z.object({
      username: z.string().min(1, 'username requis'),
      slug: z.string().min(1, 'slug requis'),
    });
    const resolvedParams = await params;
    username = resolvedParams.username;
    slug = resolvedParams.slug;
    
    logger.dev(LogCategory.API, '[PublicNote] 🚀 Début requête:', { username, slug });
    
    const parseResult = schema.safeParse({ username, slug });
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: 'Paramètres invalides', details: parseResult.error.errors.map(e => e.message) }),
        { status: 422 }
      );
    }

    // Chercher l'utilisateur par username
    logger.dev(LogCategory.API, '[PublicNote] 🔍 Recherche utilisateur:', { username });
    
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .limit(1)
      .maybeSingle();
    
    if (userError) {
      logger.error(LogCategory.API, '[PublicNote] ❌ Erreur DB users:', { 
        username, 
        error: userError.message 
      });
      return new Response(JSON.stringify({ error: 'Erreur serveur lors de la recherche utilisateur.' }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
    
    if (!user) {
      logger.warn(LogCategory.API, '[PublicNote] ⚠️ Utilisateur non trouvé:', { username });
      return new Response(JSON.stringify({ error: 'Utilisateur non trouvé.' }), { status: 404, headers: { "Content-Type": "application/json" } });
    }
    
    logger.dev(LogCategory.API, '[PublicNote] ✅ Utilisateur trouvé:', { username, userId: user.id });

    // Vérifier si l'utilisateur est connecté (pour permettre au créateur de voir sa note privée)
    let isCreator = false;
    
    // Essayer d'abord avec l'Authorization header
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        // Utiliser le client service pour l'authentification
        const { data: { user: authUser }, error: authError } = await supabaseService.auth.getUser(token);
        
        logger.dev(LogCategory.API, '[PublicNote] 🔑 Auth header check:', {
          hasAuthUser: !!authUser,
          authUserId: authUser?.id,
          noteOwnerId: user.id,
          match: authUser?.id === user.id
        });
        
        if (!authError && authUser && authUser.id === user.id) {
          isCreator = true;
          logger.info(LogCategory.API, '[PublicNote] ✅ Créateur détecté via Authorization header');
        }
      } catch (error) {
        // Ignorer les erreurs d'authentification, on continue sans être connecté
        logger.warn(LogCategory.API, '[PublicNote] Erreur auth header (non bloquante)', {
          username,
          slug,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    
    // Si pas d'Authorization header, essayer avec les cookies Supabase
    if (!isCreator) {
      try {
        logger.dev(LogCategory.API, '[PublicNote] 🍪 Tentative auth par cookie...');
        
        // Récupérer tous les cookies
        const cookies = req.headers.get('cookie');
        if (cookies) {
          logger.dev(LogCategory.API, '[PublicNote] 🍪 Cookies trouvés');
          
          // Chercher le token d'accès Supabase dans les cookies
          const accessTokenMatch = cookies.match(/sb-[^-]+-auth-token=([^;]+)/);
          if (accessTokenMatch) {
            logger.dev(LogCategory.API, '[PublicNote] 🍪 Token Supabase trouvé dans cookie');
            
            try {
              const cookieValue = decodeURIComponent(accessTokenMatch[1]);
              const cookieData = JSON.parse(cookieValue);
              const token = cookieData.access_token;
              
              if (token) {
                logger.dev(LogCategory.API, '[PublicNote] 🍪 access_token extrait du cookie');
                const { data: { user: authUser }, error: authError } = await supabaseService.auth.getUser(token);
                if (!authError && authUser && authUser.id === user.id) {
                  isCreator = true;
                  logger.info(LogCategory.API, '[PublicNote] ✅ Créateur détecté via cookie');
                }
              }
            } catch (parseError) {
              logger.warn(LogCategory.API, '[PublicNote] ⚠️ Erreur parsing cookie JSON', {
                error: parseError instanceof Error ? parseError.message : String(parseError)
              });
            }
          } else {
            logger.dev(LogCategory.API, '[PublicNote] 🍪 Pas de token Supabase dans cookies');
          }
        } else {
          logger.dev(LogCategory.API, '[PublicNote] 🍪 Pas de cookies');
        }
      } catch (error) {
        // Ignorer les erreurs d'authentification, on continue sans être connecté
        logger.warn(LogCategory.API, '[PublicNote] Erreur auth cookie (non bloquante)', {
          username,
          slug,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });
      }
    }

    // ✅ Détecter si [slug] est un UUID (URL permanente) ou un slug (URL SEO)
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
    
    logger.dev(LogCategory.API, '[PublicNote] 🔍 Type de slug détecté:', {
      slug,
      isUUID,
      username
    });

    // Chercher la note par slug ou id selon le format
    // Utiliser supabaseService pour contourner les RLS (notes publiques doivent être accessibles)
    let noteQuery = supabaseService
      .from('articles')
      .select('id, source_title, markdown_content, html_content, header_image, header_image_offset, header_image_blur, header_image_overlay, header_title_in_image, wide_mode, font_family, a4_mode, slash_lang, created_at, updated_at, share_settings')
      .eq('user_id', user.id)
      .is('trashed_at', null); // Exclure les notes supprimées
    
    // Chercher par ID si UUID, sinon par slug
    if (isUUID) {
      noteQuery = noteQuery.eq('id', slug);
    } else {
      noteQuery = noteQuery.eq('slug', slug);
    }

    // Si ce n'est pas le créateur, exclure les notes privées
    if (!isCreator) {
      noteQuery = noteQuery.not('share_settings->>visibility', 'eq', 'private');
      logger.dev(LogCategory.API, '[PublicNote] 🔒 Non-créateur : filtre notes privées');
    } else {
      logger.info(LogCategory.API, '[PublicNote] ✅ Créateur : accès complet (y compris privées)');
    }

    logger.dev(LogCategory.API, '[PublicNote] 🔄 Exécution query DB...');
    
    let note, noteError;
    try {
      const result = await noteQuery.limit(1).maybeSingle();
      note = result.data;
      noteError = result.error;
      
      logger.dev(LogCategory.API, '[PublicNote] ✅ Query DB terminée:', {
        hasData: !!note,
        hasError: !!noteError
      });
    } catch (dbErr) {
      logger.error(LogCategory.API, '[PublicNote] ❌ Exception durant query DB:', {
        error: dbErr instanceof Error ? dbErr.message : String(dbErr),
        stack: dbErr instanceof Error ? dbErr.stack : undefined
      });
      throw dbErr; // Re-throw pour le catch global
    }
    
    logger.dev(LogCategory.API, '[PublicNote] 📥 Résultat query:', {
      found: !!note,
      visibility: note?.share_settings?.visibility,
      isCreator,
      hasError: !!noteError
    });
    
    if (noteError) {
      logger.error(LogCategory.API, '[PublicNote] ❌ Erreur DB articles:', {
        username,
        slug,
        isUUID,
        isCreator,
        error: noteError.message,
        code: noteError.code,
        details: noteError.details
      });
      return new Response(JSON.stringify({ error: 'Erreur serveur lors de la recherche de la note.' }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
    
    if (!note) {
      logger.warn(LogCategory.API, '[PublicNote] ⚠️ Note non trouvée', {
        username,
        slug,
        isUUID,
        isCreator
      });
      return new Response(JSON.stringify({ error: 'Note non trouvée ou non publiée.' }), { status: 404, headers: { "Content-Type": "application/json" } });
    }

    logger.info(LogCategory.API, '[PublicNote] ✅ Note trouvée et retournée', {
      username,
      slug,
      noteId: note.id,
      visibility: note.share_settings?.visibility
    });

    return new Response(JSON.stringify({ note }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (err: unknown) {
    const error = err as Error;
    
    logger.error(LogCategory.API, '[PublicNote] ❌ ERREUR FATALE (catch global):', {
      username,
      slug,
      error: error.message,
      stack: error.stack,
      name: error.name
    });
    
    // Log dans console aussi pour Vercel
    console.error('[PublicNote] ERREUR 500:', {
      username,
      slug,
      message: error.message,
      stack: error.stack
    });
    
    return new Response(
      JSON.stringify({ 
        error: 'Erreur interne du serveur',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }), 
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
} 