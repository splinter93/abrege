import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { NextRequest } from 'next/server';
import type { Article } from '@/types/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type UpdateNoteMetaPayload = {
  title?: string;
  header_image?: string;
};
export type UpdateNoteMetaResponse =
  | { note: Article }
  | { error: string; details?: string[] };

export async function PATCH(req: NextRequest, { params }: any): Promise<Response> {
  const { id } = params;
  try {
    const paramSchema = z.object({ id: z.string().min(1, 'note_id requis') });
    const body: UpdateNoteMetaPayload = await req.json();
    const bodySchema = z.object({
      title: z.string().optional(),
      header_image: z.string().url('header_image doit être une URL valide').optional(),
    });
    const paramResult = paramSchema.safeParse({ id });
    const bodyResult = bodySchema.safeParse(body);
    if (!paramResult.success) {
      return new Response(
        JSON.stringify({ error: 'Paramètre note_id invalide', details: paramResult.error.errors.map(e => e.message) }),
        { status: 422 }
      );
    }
    if (!bodyResult.success) {
      return new Response(
        JSON.stringify({ error: 'Payload invalide', details: bodyResult.error.errors.map(e => e.message) }),
        { status: 422 }
      );
    }
    if (!body.title && !body.header_image) {
      return new Response(
        JSON.stringify({ error: 'Aucun champ à mettre à jour.' }),
        { status: 422 }
      );
    }
    const updates: any = {};
    if (body.title) updates.source_title = body.title;
    if (body.header_image) updates.header_image = body.header_image;
    updates.updated_at = new Date().toISOString();
    const { data: updated, error } = await supabase
      .from('articles')
      .update(updates)
      .eq('id', id)
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
 * Endpoint: PATCH /api/v1/note/[id]/meta
 * Payload attendu : { title?: string, header_image?: string }
 * - Met à jour uniquement le titre et/ou l'image de couverture
 * - Tous les champs sont optionnels, au moins un doit être fourni
 * - Réponses :
 *   - 200 : { note }
 *   - 404 : { error: 'Note non trouvée.' }
 *   - 422 : { error: 'Paramètre note_id invalide' | 'Payload invalide' | 'Aucun champ à mettre à jour.', details }
 *   - 500 : { error: string }
 */ 