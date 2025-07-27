import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { NextRequest } from 'next/server';
import { extractTOCWithSlugs } from '@/utils/markdownTOC';
import { resolveNoteRef } from '@/middleware/resourceResolver';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * GET /api/v1/note/{ref}/statistics
 * Récupère les statistiques détaillées d'une note
 * Réponse : { id, title, word_count, char_count, section_count, toc, ... }
 */
export async function GET(req: NextRequest, { params }: any): Promise<Response> {
  try {
    const { ref } = await params;
    const schema = z.object({ ref: z.string().min(1, 'note_ref requis') });
    const parseResult = schema.safeParse({ ref });
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: 'Paramètre note_ref invalide', details: parseResult.error.errors.map(e => e.message) }),
        { status: 422 }
      );
    }
    
    // 🚧 Temp: Authentification non implémentée
    // TODO: Remplacer USER_ID par l'authentification Supabase
    // 🚧 Temp: Authentification non implémentée
    // TODO: Remplacer USER_ID par l'authentification Supabase
    const USER_ID = "3223651c-5580-4471-affb-b3f4456bd729";
    const noteId = await resolveNoteRef(ref, USER_ID);
    
    const { data: note, error } = await supabase
      .from('articles')
      .select('id, source_title, header_image, created_at, updated_at, markdown_content')
      .eq('id', noteId)
      .single();
    if (error || !note) {
      return new Response(JSON.stringify({ error: error?.message || 'Note non trouvée.' }), { status: 404 });
    }
    const markdown = note.markdown_content || '';
    const toc = extractTOCWithSlugs(markdown);
    const word_count = markdown.split(/\s+/).filter(Boolean).length;
    const char_count = markdown.length;
    const section_count = toc.length;
    return new Response(
      JSON.stringify({
        id: note.id,
        title: note.source_title,
        header_image: note.header_image || null,
        created_at: note.created_at,
        updated_at: note.updated_at,
        word_count,
        char_count,
        section_count,
        toc: toc.map(({ title, slug, level }) => ({ title, slug, level })),
      }),
      { status: 200 }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
} 