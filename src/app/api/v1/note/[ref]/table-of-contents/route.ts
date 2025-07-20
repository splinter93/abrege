import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { NextRequest } from 'next/server';
import { extractTOCWithSlugs } from '@/utils/markdownTOC';
import { resolveNoteRef } from '@/middleware/resourceResolver';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * GET /api/v1/note/{ref}/table-of-contents
 * Récupère la table des matières d'une note
 * Réponse : { toc: [{ level, title, slug, line, start }] }
 */
export async function GET(req: NextRequest, { params }: any): Promise<Response> {
  try {
    const { ref } = params;
    const parseResult = schema.safeParse({ ref });
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
    const toc = extractTOCWithSlugs(note.markdown_content || '');
    return new Response(JSON.stringify({ toc }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
} 