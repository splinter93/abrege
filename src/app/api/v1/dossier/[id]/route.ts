import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { NextRequest } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * DELETE /api/v1/dossier/{id}
 * Supprime un dossier (folder) par son id.
 * Réponse : { success: true } ou { error }
 */
export async function DELETE(req: NextRequest, { params }: any): Promise<Response> {
  const { id } = params;
  const idSchema = z.string().min(1, 'dossier_id requis');
  const idResult = idSchema.safeParse(id);
  if (!idResult.success) {
    return new Response(
      JSON.stringify({ error: 'Paramètre dossier_id invalide', details: idResult.error.errors.map(e => e.message) }),
      { status: 422 }
    );
  }
  // Vérifier que le dossier existe
  const { data: folder, error: fetchError } = await supabase
    .from('folders')
    .select('id')
    .eq('id', id)
    .single();
  if (fetchError || !folder) {
    return new Response(JSON.stringify({ error: 'Dossier non trouvé.' }), { status: 404 });
  }
  // Supprimer le dossier
  const { error: deleteError } = await supabase
    .from('folders')
    .delete()
    .eq('id', id);
  if (deleteError) {
    return new Response(JSON.stringify({ error: deleteError.message }), { status: 500 });
  }
  return new Response(JSON.stringify({ success: true }), { status: 200 });
} 