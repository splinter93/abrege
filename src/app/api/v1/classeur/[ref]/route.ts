import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { NextRequest } from 'next/server';
import { resolveClasseurRef } from '@/middleware/resourceResolver';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * DELETE /api/v1/classeur/{ref}
 * Supprime un classeur par son id ou slug.
 * Réponse : { success: true } ou { error }
 */
export async function DELETE(req: NextRequest, { params }: any): Promise<Response> {
  const { ref } = params;
  const refSchema = z.string().min(1, 'classeur_ref requis');
  const refResult = refSchema.safeParse(ref);
  if (!refResult.success) {
    return new Response(
      JSON.stringify({ error: 'Paramètre classeur_ref invalide', details: refResult.error.errors.map(e => e.message) }),
      { status: 422 }
    );
  }
  
  // [TEMP] USER_ID HARDCODED FOR DEV/LLM
  const USER_ID = "3223651c-5580-4471-affb-b3f4456bd729";
  const classeurId = await resolveClasseurRef(ref, USER_ID);
  
  // Vérifier que le classeur existe
  const { data: classeur, error: fetchError } = await supabase
    .from('classeurs')
    .select('id')
    .eq('id', classeurId)
    .single();
  if (fetchError || !classeur) {
    return new Response(JSON.stringify({ error: 'Classeur non trouvé.' }), { status: 404 });
  }
  // Supprimer le classeur
  const { error: deleteError } = await supabase
    .from('classeurs')
    .delete()
    .eq('id', classeurId);
  if (deleteError) {
    return new Response(JSON.stringify({ error: deleteError.message }), { status: 500 });
  }
  return new Response(JSON.stringify({ success: true }), { status: 200 });
} 