import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { NextRequest } from 'next/server';
import { extractTOCWithSlugs } from '@/utils/markdownTOC';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type NoteMetadataResponse =
  | {
      id: string;
      title: string;
      header_image?: string | null;
      created_at: string;
      updated_at: string;
      word_count: number;
      char_count: number;
      section_count: number;
      toc: { title: string; slug: string; level: number }[];
    }
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
      .select('id, source_title, header_image, created_at, updated_at, markdown_content')
      .eq('id', id)
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

/**
 * Endpoint: GET /api/v1/note/[id]/metadata
 * Paramètre attendu : { id: string }
 * - Retourne les métadonnées de la note (titre, image, dates, stats, TOC)
 * - Réponses :
 *   - 200 : { id, title, header_image, created_at, updated_at, word_count, char_count, section_count, toc }
 *   - 404 : { error: 'Note non trouvée.' }
 *   - 422 : { error: 'Paramètre note_id invalide', details }
 *   - 500 : { error: string }
 */ 