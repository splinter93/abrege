import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { NextRequest } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * PATCH /api/v1/dossier/{id}/meta
 * Met à jour le nom d'un dossier (folder).
 * Body JSON : { name: string }
 * Réponse : { id, name, parent_id, classeur_id }
 */
export async function PATCH(req: NextRequest, { params }: any): Promise<Response> {
  const { id } = params;
  // Validation de l'id
  const idSchema = z.string().min(1, 'dossier_id requis');
  const idResult = idSchema.safeParse(id);
  if (!idResult.success) {
    return new Response(
      JSON.stringify({ error: 'Paramètre dossier_id invalide', details: idResult.error.errors.map(e => e.message) }),
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
    name: z.string().min(1, 'Le nom du dossier est requis'),
  });
  const bodyResult = bodySchema.safeParse(body);
  if (!bodyResult.success) {
    return new Response(
      JSON.stringify({ error: 'Body invalide', details: bodyResult.error.errors.map(e => e.message) }),
      { status: 422 }
    );
  }
  // Vérifier que le dossier existe
  const { data: folder, error: folderError } = await supabase
    .from('folders')
    .select('id, name, parent_id, classeur_id')
    .eq('id', id)
    .single();
  if (folderError || !folder) {
    return new Response(JSON.stringify({ error: folderError?.message || 'Dossier non trouvé.' }), { status: 404 });
  }
  // Mettre à jour le dossier
  const { data: updated, error: updateError } = await supabase
    .from('folders')
    .update({ name: bodyResult.data.name })
    .eq('id', id)
    .select('id, name, parent_id, classeur_id')
    .single();
  if (updateError || !updated) {
    return new Response(JSON.stringify({ error: updateError?.message || 'Erreur lors de la mise à jour.' }), { status: 500 });
  }
  return new Response(JSON.stringify(updated), { status: 200 });
} 