import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { NextRequest } from 'next/server';
import { resolveNoteRef } from '@/middleware/resourceResolver';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type GetNoteContentResponse =
  | { content: string }
  | { error: string; details?: string[] };

export async function GET(req: NextRequest, { params }: any): Promise<Response> {
  try {
    const schema = z.object({ ref: z.string().min(1, 'note_ref requis') });    const { ref } = params;
    const parseResult = schema.safeParse({ ref });
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: 'Paramètre note_ref invalide', details: parseResult.error.errors.map(e => e.message) }),
        { status: 422 }
      );
    }
    
    // [TEMP] USER_ID HARDCODED FOR DEV/LLM
    const USER_ID = "3223651c-5580-4471-affb-b3f4456bd729";
    const noteId = await resolveNoteRef(ref, USER_ID);
    
    const { data: note, error } = await supabase
      .from('articles')
      .select('markdown_content')
      .eq('id', noteId)
      .single();
    if (error || !note) {
      return new Response(JSON.stringify({ error: error?.message || 'Note non trouvée.' }), { status: 404 });
    }
    return new Response(JSON.stringify({ content: note.markdown_content || '' }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

/**
 * Endpoint: GET /api/v1/note/[ref]/content
 * Paramètre attendu : { ref: string } (ID ou slug)
 * - Résout la référence (ID ou slug) vers l'ID réel
 * - Retourne le markdown brut de la note
 * - Réponses :
 *   - 200 : { content }
 *   - 404 : { error: 'Note non trouvée.' }
 *   - 422 : { error: 'Paramètre note_ref invalide', details }
 *   - 500 : { error: string }
 */ 