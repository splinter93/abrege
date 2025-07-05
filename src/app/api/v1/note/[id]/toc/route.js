import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { extractTOCWithSlugs } from '../../../utils/markdownTOC';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function GET(req, { params }) {
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
      .select('markdown_content')
      .eq('id', id)
      .single();
    if (error || !note) {
      return new Response(JSON.stringify({ error: error?.message || 'Note non trouvée.' }), { status: 404 });
    }
    const toc = extractTOCWithSlugs(note.markdown_content || '');
    return new Response(JSON.stringify({ toc }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
} 