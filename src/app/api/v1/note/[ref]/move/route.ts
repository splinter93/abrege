import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { NextRequest } from 'next/server';
import type { Article } from '@/types/supabase';
import { resolveNoteRef } from '@/middleware/resourceResolver';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type MoveNotePayload = {
  target_classeur_id?: string;
  target_folder_id?: string | null;
  position?: number;
};
export type MoveNoteResponse =
  | { note: Article }
  | { error: string; details?: string[] };

export async function PATCH(req: NextRequest, { params }: any): Promise<Response> {
  const { ref } = params;
  try {
    const body: MoveNotePayload = await req.json();
    const bodySchema = z.object({
      target_classeur_id: z.string().optional(),
      target_folder_id: z.string().nullable().optional(),
      position: z.number().int().nonnegative().optional(),
    });
    const paramSchema = z.object({ ref: z.string().min(1, 'note_ref requis') });    const paramResult = paramSchema.safeParse({ ref });
    const bodyResult = bodySchema.safeParse(body);
    if (!paramResult.success) {
      return new Response(
        JSON.stringify({ error: 'Paramètre note_ref invalide', details: paramResult.error.errors.map(e => e.message) }),
        { status: 422 }
      );
    }
    if (!bodyResult.success) {
      return new Response(
        JSON.stringify({ error: 'Payload invalide', details: bodyResult.error.errors.map(e => e.message) }),
        { status: 422 }
      );
    }
    
    // [TEMP] USER_ID HARDCODED FOR DEV/LLM
    const USER_ID = "3223651c-5580-4471-affb-b3f4456bd729";
    const noteId = await resolveNoteRef(ref, USER_ID);
    
    // Mettre à jour la note
    const updates: any = {};
    if ('target_classeur_id' in body) updates.classeur_id = body.target_classeur_id;
    if ('target_folder_id' in body) updates.folder_id = body.target_folder_id || null;
    if ('position' in body) updates.position = body.position;
    updates.updated_at = new Date().toISOString();
    const { data: updated, error } = await supabase
      .from('articles')
      .update(updates)
      .eq('id', noteId)
      .select()
      .single();
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
    return new Response(JSON.stringify({ note: updated }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

/**
 * Endpoint: PATCH /api/v1/note/[ref]/move
 * Payload attendu : { target_classeur_id?: string, target_folder_id?: string | null, position?: number }
 * - Résout la référence (ID ou slug) vers l'ID réel
 * - Déplace la note dans le classeur/dossier/position cible
 * - Si target_folder_id est null ou non fourni, place à la racine du classeur
 * - Réponses :
 *   - 200 : { note }
 *   - 404 : { error: 'Note non trouvée.' }
 *   - 422 : { error: 'Paramètre note_ref invalide' | 'Payload invalide', details }
 *   - 500 : { error: string }
 */ 