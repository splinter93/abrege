import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { NextRequest } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * GET /api/v1/public/note/[username]/[slug]
 * Récupère une note publique par username et slug, si isPublished = true
 * Réponse : { note: { source_title, html_content, header_image, created_at, updated_at } }
 */
export async function GET(req: NextRequest, { params }: any): Promise<Response> {
  try {
    const schema = z.object({
      username: z.string().min(1, 'username requis'),
      slug: z.string().min(1, 'slug requis'),
    });
    const { username, slug } = params;
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
      .single();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Utilisateur non trouvé.' }), { status: 404 });
    }

    // Chercher la note par slug et user_id, isPublished = true
    const { data: note, error: noteError } = await supabase
      .from('articles')
      .select('source_title, html_content, header_image, created_at, updated_at')
      .eq('slug', slug)
      .eq('user_id', user.id)
      .eq('isPublished', true)
      .single();
    if (noteError || !note) {
      return new Response(JSON.stringify({ error: 'Note non trouvée ou non publiée.' }), { status: 404 });
    }

    return new Response(JSON.stringify({ note }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
} 