import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { NextRequest } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * PATCH /api/v1/classeur/{id}/meta
 * Met à jour le nom, l'emoji ou la couleur d'un classeur.
 * Body JSON : { name?: string, emoji?: string, color?: string }
 * Réponse : { id, name, emoji, color }
 */
export async function PATCH(req: NextRequest, { params }: any): Promise<Response> {
  const { id } = params;
  // Validation de l'id
  const idSchema = z.string().min(1, 'classeur_id requis');
  const idResult = idSchema.safeParse(id);
  if (!idResult.success) {
    return new Response(
      JSON.stringify({ error: 'Paramètre classeur_id invalide', details: idResult.error.errors.map(e => e.message) }),
      { status: 422 }
    );
  }
  // Validation du body
  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Body JSON invalide' }), { status: 400 });
  }
  const bodySchema = z.object({
    name: z.string().min(1).optional(),
    emoji: z.string().min(1).optional(),
    color: z.string().min(1).optional(),
  }).refine(obj => Object.keys(obj).length > 0, { message: 'Au moins un champ à mettre à jour est requis.' });
  const bodyResult = bodySchema.safeParse(body);
  if (!bodyResult.success) {
    return new Response(
      JSON.stringify({ error: 'Body invalide', details: bodyResult.error.errors.map(e => e.message) }),
      { status: 422 }
    );
  }
  // Vérifier que le classeur existe
  const { data: classeur, error: classeurError } = await supabase
    .from('classeurs')
    .select('id, name, emoji, color')
    .eq('id', id)
    .single();
  if (classeurError || !classeur) {
    return new Response(JSON.stringify({ error: classeurError?.message || 'Classeur non trouvé.' }), { status: 404 });
  }
  // Mettre à jour le classeur
  const { data: updated, error: updateError } = await supabase
    .from('classeurs')
    .update(bodyResult.data)
    .eq('id', id)
    .select('id, name, emoji, color')
    .single();
  if (updateError || !updated) {
    return new Response(JSON.stringify({ error: updateError?.message || 'Erreur lors de la mise à jour.' }), { status: 500 });
  }
  return new Response(JSON.stringify(updated), { status: 200 });
} 