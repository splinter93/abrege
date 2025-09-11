import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { NextRequest } from 'next/server';
import { extractTOCWithSlugs } from '@/utils/markdownTOC';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Client anonyme pour les requêtes publiques
const supabase = createClient(supabaseUrl, supabaseAnonKey);
// Client avec service role pour l'authentification
const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

/**
 * GET /api/ui/public/note/[username]/[slug]/table-of-contents
 * Récupère la table des matières d'une note publique
 * - Si visibility != 'private' : accessible à tous
 * - Si visibility = 'private' : accessible uniquement au créateur de la note
 * Réponse : { toc: [{ slug, title, level }] }
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ username: string; slug: string }> }): Promise<Response> {
  try {
    const schema = z.object({
      username: z.string().min(1, 'username requis'),
      slug: z.string().min(1, 'slug requis'),
    });
    const { username, slug } = await params;
    const parseResult = schema.safeParse({ username, slug });
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: 'Paramètres invalides', details: parseResult.error.errors.map(e => e.message) }),
        { status: 422 }
      );
    }

    // Chercher l'utilisateur par username
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .limit(1)
      .maybeSingle();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Utilisateur non trouvé.' }), { status: 404, headers: { "Content-Type": "application/json" } });
    }

    // Vérifier si l'utilisateur est connecté (pour permettre au créateur de voir sa note privée)
    let isCreator = false;
    
    // Essayer d'abord avec l'Authorization header
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        // Utiliser le client service pour l'authentification
        const { data: { user: authUser }, error: authError } = await supabaseService.auth.getUser(token);
        if (!authError && authUser && authUser.id === user.id) {
          isCreator = true;
        }
      } catch (error) {
        // Ignorer les erreurs d'authentification, on continue sans être connecté
      }
    }
    
    // Si pas d'Authorization header, essayer avec les cookies Supabase
    if (!isCreator) {
      try {
        // Récupérer tous les cookies
        const cookies = req.headers.get('cookie');
        if (cookies) {
          // Chercher le token d'accès Supabase dans les cookies
          const accessTokenMatch = cookies.match(/sb-[^-]+-auth-token=([^;]+)/);
          if (accessTokenMatch) {
            const cookieValue = decodeURIComponent(accessTokenMatch[1]);
            const cookieData = JSON.parse(cookieValue);
            const token = cookieData.access_token;
            
            if (token) {
              const { data: { user: authUser }, error: authError } = await supabaseService.auth.getUser(token);
              if (!authError && authUser && authUser.id === user.id) {
                isCreator = true;
              }
            }
          }
        }
      } catch (error) {
        // Ignorer les erreurs d'authentification, on continue sans être connecté
      }
    }

    // Récupérer la note avec le client service pour contourner RLS
    const { data: note, error: noteError } = await supabaseService
      .from('articles')
      .select('id, source_title, markdown_content, share_settings, user_id')
      .eq('slug', slug)
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();

    if (noteError || !note) {
      return new Response(JSON.stringify({ error: 'Note non trouvée.' }), { status: 404, headers: { "Content-Type": "application/json" } });
    }

    // Vérifier les permissions d'accès
    const visibility = note.share_settings?.visibility || 'private';
    
    // Seules les notes privées nécessitent une authentification
    if (visibility === 'private') {
      if (!isCreator) {
        return new Response(JSON.stringify({ error: 'Note privée.' }), { status: 403, headers: { "Content-Type": "application/json" } });
      }
    }
    // Pour toutes les autres visibilités (link-public, link-private, scrivia, limited), on autorise l'accès

    // Extraire la table des matières si le contenu existe
    let toc: Array<{ slug: string; title: string; level: number }> = [];
    if (note.markdown_content) {
      try {
        toc = extractTOCWithSlugs(note.markdown_content);
      } catch (error) {
        // En cas d'erreur d'extraction, retourner un tableau vide
        console.warn('Erreur extraction TOC:', error);
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      toc,
      note: {
        id: note.id,
        title: note.source_title,
        has_content: !!note.markdown_content
      }
    }), { 
      status: 200, 
      headers: { "Content-Type": "application/json" } 
    });

  } catch (error) {
    console.error('Erreur API TOC publique:', error);
    return new Response(JSON.stringify({ error: 'Erreur serveur' }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}