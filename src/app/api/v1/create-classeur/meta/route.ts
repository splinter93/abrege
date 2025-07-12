import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { NextRequest } from 'next/server';
import type { Classeur } from '@/types/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type UpdateClasseurMetaPayload = {
  name?: string;
  emoji?: string;
  color?: string;
};
export type UpdateClasseurMetaResponse =
  | { classeur: Classeur }
  | { error: string; details?: string[] };

export async function PATCH(req: NextRequest, { params }: any): Promise<Response> {
  const { id } = params;
  try {
    const paramSchema = z.object({ id: z.string().min(1, 'classeur_id requis') });
    const body: UpdateClasseurMetaPayload = await req.json();
    const bodySchema = z.object({
      name: z.string().optional(),
      emoji: z.string().optional(),
      color: z.string().optional(),
    });
    const paramResult = paramSchema.safeParse({ id });
    const bodyResult = bodySchema.safeParse(body);
    if (!paramResult.success) {
      return new Response(
        JSON.stringify({ error: 'Paramètre classeur_id invalide', details: paramResult.error.errors.map(e => e.message) }),
        { status: 422 }
      );
    }
    if (!bodyResult.success) {
      return new Response(
        JSON.stringify({ error: 'Payload invalide', details: bodyResult.error.errors.map(e => e.message) }),
        { status: 422 }
      );
    }
    if (!body.name && !body.emoji && !body.color) {
      return new Response(
        JSON.stringify({ error: 'Aucun champ à mettre à jour.' }),
        { status: 422 }
      );
    }
    const updates: any = {};
    if (body.name) updates.name = body.name;
    if (body.emoji) updates.emoji = body.emoji;
    if (body.color) updates.color = body.color;
    updates.updated_at = new Date().toISOString();
    const { data: updated, error } = await supabase
      .from('classeurs')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
    return new Response(JSON.stringify({ classeur: updated }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

/**
 * Endpoint: PATCH /api/v1/create-classeur/[id]/meta
 * Payload attendu : { name?: string, emoji?: string, color?: string }
 * - Met à jour uniquement le nom, l’emoji ou la couleur du classeur
 * - Tous les champs sont optionnels, au moins un doit être fourni
 * - Réponses :
 *   - 200 : { classeur }
 *   - 404 : { error: 'Classeur non trouvé.' }
 *   - 422 : { error: 'Paramètre classeur_id invalide' | 'Payload invalide' | 'Aucun champ à mettre à jour.', details }
 *   - 500 : { error: string }
 */ 