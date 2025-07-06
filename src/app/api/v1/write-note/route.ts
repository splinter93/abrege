import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { markdownContentSchema } from '@/utils/markdownValidation';
import type { Article } from '@/types/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types explicites pour le payload et la réponse
export type WriteNotePayload = {
  noteId: string;
  title: string;
  content: string;
  titleAlign?: string;
};

export type WriteNoteResponse =
  | { success: true; note: Article }
  | { error: string; details?: string[] };

export async function POST(req: Request): Promise<Response> {
  try {
    const body: WriteNotePayload = await req.json();
    // Validation stricte avec Zod (factorisée)
    const schema = z.object({
      noteId: z.string().min(1, 'noteId requis'),
      title: z.string().min(1, 'title requis'),
      content: z.string().min(1, 'content requis'),
      titleAlign: z.string().optional(),
    });
    const parseResult = schema.safeParse(body);
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: 'Payload invalide', details: parseResult.error.errors.map(e => e.message) }),
        { status: 422 }
      );
    }
    const { noteId, title, content, titleAlign } = parseResult.data;

    // Validation markdown LLM-ready
    try {
      markdownContentSchema.parse(content);
    } catch (e: any) {
      const msg = (e && typeof e === 'object' && 'errors' in e && Array.isArray(e.errors)) ? e.errors[0]?.message : (e && typeof e === 'object' && 'message' in e ? e.message : String(e));
      console.warn('Tentative d\'injection markdown rejetée:', msg);
      return new Response(
        JSON.stringify({ error: 'content non autorisé', details: [msg] }),
        { status: 422 }
      );
    }

    // Vérifier que la note existe
    const { data: note, error: fetchError } = await supabase
      .from('articles')
      .select('*')
      .eq('id', noteId)
      .single();
    if (fetchError || !note) {
      return new Response(JSON.stringify({ error: 'Note non trouvée.' }), { status: 404 });
    }

    // Mettre à jour la note
    const updates = {
      source_title: title,
      content,
      title_align: titleAlign || 'left',
      updated_at: new Date().toISOString(),
    };
    const { data: updated, error: updateError } = await supabase
      .from('articles')
      .update(updates)
      .eq('id', noteId)
      .select()
      .single();
    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), { status: 500 });
    }
    return new Response(JSON.stringify({ success: true, note: updated }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

/**
 * Endpoint: POST /api/v1/write-note
 * Payload attendu : { noteId: string, title: string, content: string, titleAlign?: string }
 * - Valide le payload avec Zod (noteId, title, content obligatoires)
 * - Valide le markdown avec markdownContentSchema (LLM-Ready)
 * - Met à jour la note dans Supabase
 * - Réponses :
 *   - 200 : { success: true, note }
 *   - 404 : { error: 'Note non trouvée.' }
 *   - 422 : { error: 'Payload invalide' | 'content non autorisé', details }
 *   - 500 : { error: string }
 */ 