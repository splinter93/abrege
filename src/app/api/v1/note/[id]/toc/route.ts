import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { extractTOCWithSlugs, TOCItemWithSlug } from '@/utils/markdownTOC';
import type { NextRequest } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type GetNoteTOCResponse =
  | { toc: TOCItemWithSlug[] }
  | { error: string; details?: string[] };

export async function GET(req: NextRequest, { params }: any): Promise<Response> {
  try {
    const { id } = params;
    const schema = z.object({ id: z.string().min(1, 'note_id requis') });
    const parseResult = schema.safeParse({ id });
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: 'Paramètre note_id invalide', details: parseResult.error.errors.map(e => e.message) }),
        { status: 422 }
      );
    }
    const { data: note, error } = await supabase
      .from('articles')
      .select('content')
      .eq('id', id)
      .single();
    if (error || !note) {
      return new Response(JSON.stringify({ error: error?.message || 'Note non trouvée.' }), { status: 404 });
    }
    const toc = extractTOCWithSlugs(note.content || '');
    return new Response(JSON.stringify({ toc }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

/**
 * Endpoint: GET /api/v1/note/[id]/toc
 * Paramètre attendu : { id: string }
 * - Valide le paramètre id avec Zod
 * - Retourne la table des matières (TOC) extraite du markdown (champ content)
 * - Réponses :
 *   - 200 : { toc }
 *   - 404 : { error: 'Note non trouvée.' }
 *   - 422 : { error: 'Paramètre note_id invalide', details }
 *   - 500 : { error: string }
 */ 