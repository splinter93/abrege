import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { Article } from '@/types/supabase';
import type { NextRequest } from 'next/server';
import { resolveNoteRef } from '@/middleware/resourceResolver';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types explicites pour la réponse
export type GetNoteResponse =
  | { note: Article }
  | { error: string; details?: string[] };

export async function GET(req: NextRequest, { params }: any): Promise<Response> {
  try {
    const {} = params;
    const parseResult = schema.safeParse({});
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: 'Paramètre note_ref invalide', details: parseResult.error.errors.map(e => e.message) }),
        { status: 422 }
      );
    }
    
    // [TEMP] USER_ID HARDCODED FOR DEV/LLM
    const USER_ID = "3223651c-5580-4471-affb-b3f4456bd729";
    const noteId = await resolveNoteRef(ref, USER_ID);
    
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .eq('id', noteId)
      .single();
    if (error || !data) {
      return new Response(JSON.stringify({ error: error?.message || 'Note non trouvée.' }), { status: 404 });
    }
    return new Response(JSON.stringify({ note: data }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: any): Promise<Response> {
  const schema = z.object({ ref: z.string().min(1, 'note_ref requis') });
  const parseResult = schema.safeParse({});
  if (!parseResult.success) {
    return new Response(
      JSON.stringify({ error: 'Paramètre note_ref invalide', details: parseResult.error.errors.map(e => e.message) }),
      { status: 422 }
    );
  }
  
  // [TEMP] USER_ID HARDCODED FOR DEV/LLM
  const USER_ID = "3223651c-5580-4471-affb-b3f4456bd729";
  const noteId = await resolveNoteRef(ref, USER_ID);
  
  const { error } = await supabase
    .from('articles')
    .delete()
    .eq('id', noteId);
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
  return new Response(JSON.stringify({ success: true }), { status: 200 });
}

/**
 * Endpoint: GET /api/v1/note/[ref]
 * Paramètre attendu : { ref: string } (ID ou slug)
 * - Valide le paramètre ref avec Zod
 * - Résout la référence (ID ou slug) vers l'ID réel
 * - Retourne la note correspondante depuis Supabase
 * - Réponses :
 *   - 200 : { note }
 *   - 404 : { error: 'Note non trouvée.' }
 *   - 422 : { error: 'Paramètre note_ref invalide', details }
 *   - 500 : { error: string }
 */ 