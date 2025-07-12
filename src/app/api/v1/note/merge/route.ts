import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { NextRequest } from 'next/server';
import type { Article } from '@/types/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type MergeNotesPayload = {
  note_ids: string[];
  order?: string[];
};
export type MergeNotesResponse =
  | { merged_content: string; notes: { id: string; title: string }[] }
  | { error: string; details?: string[] };

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const body: MergeNotesPayload = await req.json();
    const schema = z.object({
      note_ids: z.array(z.string().min(1)).min(2, 'Au moins deux notes à fusionner'),
      order: z.array(z.string().min(1)).optional(),
    });
    const parseResult = schema.safeParse(body);
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: 'Payload invalide', details: parseResult.error.errors.map(e => e.message) }),
        { status: 422 }
      );
    }
    const { note_ids, order } = parseResult.data;
    // Récupérer toutes les notes
    const { data: notes, error } = await supabase
      .from('articles')
      .select('id, source_title, markdown_content')
      .in('id', note_ids);
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
    if (!notes || notes.length < note_ids.length) {
      return new Response(
        JSON.stringify({ error: 'Certaines notes sont introuvables.' }),
        { status: 404 }
      );
    }
    // Ordonner les notes selon order[] si fourni, sinon note_ids
    let orderedNotes = notes;
    if (order && order.length === note_ids.length) {
      orderedNotes = order.map(id => notes.find(n => n.id === id)).filter(Boolean) as typeof notes;
    } else {
      orderedNotes = note_ids.map(id => notes.find(n => n.id === id)).filter(Boolean) as typeof notes;
    }
    // Concaténer les contenus avec deux sauts de ligne
    const merged_content = orderedNotes.map(n => n.markdown_content?.trim() || '').join('\n\n');
    return new Response(
      JSON.stringify({
        merged_content,
        notes: orderedNotes.map(n => ({ id: n.id, title: n.source_title }))
      }),
      { status: 200 }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

/**
 * Endpoint: POST /api/v1/note/merge
 * Payload attendu : { note_ids: string[], order?: string[] }
 * - Récupère toutes les notes, les concatène dans l'ordre donné (ou note_ids)
 * - Retourne le markdown fusionné (pas d'écriture en base)
 * - Réponses :
 *   - 200 : { merged_content, notes }
 *   - 404 : { error: 'Certaines notes sont introuvables.' }
 *   - 422 : { error: 'Payload invalide', details }
 *   - 500 : { error: string }
 */ 