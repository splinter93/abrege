import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { NextRequest } from 'next/server';

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
        console.log('Erreur auth header:', error);
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
        console.log('Erreur auth cookie:', error);
      }
    }

    // Chercher la note par slug et user_id
    let noteQuery = supabase
      .from('articles')
      .select('id, source_title, html_content, header_image, header_image_offset, header_image_blur, header_image_overlay, header_title_in_image, wide_mode, font_family, created_at, updated_at, share_settings')
      .eq('slug', slug)
      .eq('user_id', user.id)
      .is('trashed_at', null); // Exclure les notes supprimées

    // Si ce n'est pas le créateur, exclure les notes privées
    if (!isCreator) {
      noteQuery = noteQuery.not('share_settings->>visibility', 'eq', 'private');
    }

    const { data: note, error: noteError } = await noteQuery
      .limit(1)
      .maybeSingle();
    
    if (noteError || !note) {
      return new Response(JSON.stringify({ error: 'Note non trouvée ou non publiée.' }), { status: 404, headers: { "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ note }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (err: unknown) {
    const error = err as Error;
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
} 