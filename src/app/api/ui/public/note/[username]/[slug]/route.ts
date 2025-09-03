import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { NextRequest } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * GET /api/ui/public/note/[username]/[slug]
 * Récupère une note accessible par username et slug, si visibility != 'private'
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

    // Chercher la note par slug et user_id, share_settings.visibility != 'private'
    const { data: note, error: noteError } = await supabase
      .from('articles')
      .select('id, source_title, html_content, header_image, header_image_offset, header_image_blur, header_image_overlay, header_title_in_image, wide_mode, font_family, created_at, updated_at, share_settings')
      .eq('slug', slug)
      .eq('user_id', user.id)
      .not('share_settings->>visibility', 'eq', 'private')
      .is('trashed_at', null) // 🔧 CORRECTION: Exclure les notes supprimées
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