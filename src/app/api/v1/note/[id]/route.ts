import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { Article } from '@/types/supabase';
import type { NextRequest } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types explicites pour la réponse
export type GetNoteResponse =
  | { note: Article }
  | { error: string; details?: string[] };

export async function GET(req: NextRequest, context: { params: { id: string } }): Promise<Response> {
  try {
    const { id } = context.params;
    const schema = z.object({ id: z.string().min(1, 'note_id requis') });
    const parseResult = schema.safeParse({ id });
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: 'Paramètre note_id invalide', details: parseResult.error.errors.map(e => e.message) }),
        { status: 422 }
      );
    }
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .eq('id', id)
      .single();
    if (error || !data) {
      return new Response(JSON.stringify({ error: error?.message || 'Note non trouvée.' }), { status: 404 });
    }
    return new Response(JSON.stringify({ note: data }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

/**
 * Endpoint: GET /api/v1/note/[id]
 * Paramètre attendu : { id: string }
 * - Valide le paramètre id avec Zod
 * - Retourne la note correspondante depuis Supabase
 * - Réponses :
 *   - 200 : { note }
 *   - 404 : { error: 'Note non trouvée.' }
 *   - 422 : { error: 'Paramètre note_id invalide', details }
 *   - 500 : { error: string }
 */ 