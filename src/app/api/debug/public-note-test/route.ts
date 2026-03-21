import { createClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';
import { logApi } from '@/utils/logger';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Endpoint de test pour diagnostiquer le problème de notes publiques
 * GET /api/debug/public-note-test?username=Splinter&slug=291e579d-...
 */
export async function GET(req: NextRequest): Promise<Response> {
  const logs: string[] = [];
  const log = (msg: string) => {
    logApi.debug(msg);
    logs.push(msg);
  };

  try {
    const url = new URL(req.url);
    const username = url.searchParams.get('username');
    const slug = url.searchParams.get('slug');

    log(`🔍 [DEBUG] Params: username=${username}, slug=${slug}`);

    if (!username || !slug) {
      return new Response(JSON.stringify({ error: 'Missing username or slug', logs }), { 
        status: 400, 
        headers: { "Content-Type": "application/json" } 
      });
    }

    // 1. Chercher l'utilisateur
    log(`🔍 [DEBUG] Recherche utilisateur '${username}'...`);
    const { data: user, error: userError } = await supabaseService
      .from('users')
      .select('id, username')
      .eq('username', username)
      .limit(1)
      .maybeSingle();

    if (userError) {
      log(`❌ [DEBUG] Erreur DB users: ${userError.message}`);
      return new Response(JSON.stringify({ error: 'User DB error', userError, logs }), { 
        status: 500, 
        headers: { "Content-Type": "application/json" } 
      });
    }

    if (!user) {
      log(`❌ [DEBUG] Utilisateur non trouvé`);
      return new Response(JSON.stringify({ error: 'User not found', logs }), { 
        status: 404, 
        headers: { "Content-Type": "application/json" } 
      });
    }

    log(`✅ [DEBUG] Utilisateur trouvé: ${user.id}`);

    // 2. Détecter UUID vs slug
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
    log(`🔍 [DEBUG] Type slug: ${isUUID ? 'UUID' : 'Slug SEO'}`);

    // 3. Chercher la note
    log(`🔍 [DEBUG] Recherche note avec user_id=${user.id}...`);
    let noteQuery = supabaseService
      .from('articles')
      .select('id, source_title, slug, share_settings, trashed_at')
      .eq('user_id', user.id)
      .is('trashed_at', null);

    if (isUUID) {
      noteQuery = noteQuery.eq('id', slug);
    } else {
      noteQuery = noteQuery.eq('slug', slug);
    }

    log(`🔍 [DEBUG] Exécution query DB...`);
    const { data: note, error: noteError } = await noteQuery
      .limit(1)
      .maybeSingle();

    if (noteError) {
      log(`❌ [DEBUG] Erreur DB articles: ${noteError.message}`);
      log(`❌ [DEBUG] Code: ${noteError.code}`);
      log(`❌ [DEBUG] Details: ${noteError.details}`);
      return new Response(JSON.stringify({ 
        error: 'Note DB error', 
        noteError: {
          message: noteError.message,
          code: noteError.code,
          details: noteError.details
        },
        logs 
      }), { 
        status: 500, 
        headers: { "Content-Type": "application/json" } 
      });
    }

    if (!note) {
      log(`❌ [DEBUG] Note non trouvée`);
      return new Response(JSON.stringify({ error: 'Note not found', logs }), { 
        status: 404, 
        headers: { "Content-Type": "application/json" } 
      });
    }

    log(`✅ [DEBUG] Note trouvée: ${note.id}`);
    log(`✅ [DEBUG] Visibility: ${note.share_settings?.visibility || 'NULL'}`);
    log(`✅ [DEBUG] Trashed: ${note.trashed_at}`);

    return new Response(JSON.stringify({ 
      success: true,
      note: {
        id: note.id,
        title: note.source_title,
        slug: note.slug,
        visibility: note.share_settings?.visibility,
        share_settings: note.share_settings,
        trashed_at: note.trashed_at
      },
      logs 
    }), { 
      status: 200, 
      headers: { "Content-Type": "application/json" } 
    });

  } catch (err) {
    const error = err as Error;
    log(`❌ [DEBUG] EXCEPTION: ${error.message}`);
    log(`❌ [DEBUG] Stack: ${error.stack}`);
    
    return new Response(JSON.stringify({ 
      error: 'Fatal error',
      message: error.message,
      stack: error.stack,
      logs 
    }), { 
      status: 500, 
      headers: { "Content-Type": "application/json" } 
    });
  }
}

