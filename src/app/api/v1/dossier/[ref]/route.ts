import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { NextRequest } from 'next/server';
import { resolveFolderRef } from '@/middleware/resourceResolver';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * DELETE /api/v1/dossier/{ref}
 * Supprime un dossier (folder) par son id ou slug.
 * Réponse : { success: true } ou { error }
 */
export async function DELETE(req: NextRequest, { params }: any): Promise<Response> {
  const { ref } = params;
  const refSchema = z.string().min(1, 'dossier_ref requis');
  const refResult = refSchema.safeParse(ref);
  if (!refResult.success) {
    return new Response(
      JSON.stringify({ error: 'Paramètre dossier_ref invalide', details: refResult.error.errors.map(e => e.message) }),
      { status: 422 }
    );
  }
  
  // [TEMP] USER_ID HARDCODED FOR DEV/LLM
  const USER_ID = "3223651c-5580-4471-affb-b3f4456bd729";
  const folderId = await resolveFolderRef(ref, USER_ID);
  
  // Vérifier que le dossier existe
  const { data: folder, error: fetchError } = await supabase
    .from('folders')
    .select('id')
    .eq('id', folderId)
    .single();
  if (fetchError || !folder) {
    return new Response(JSON.stringify({ error: 'Dossier non trouvé.' }), { status: 404 });
  }
  // Supprimer le dossier
  const { error: deleteError } = await supabase
    .from('folders')
    .delete()
    .eq('id', folderId);
  if (deleteError) {
    return new Response(JSON.stringify({ error: deleteError.message }), { status: 500 });
  }
  return new Response(JSON.stringify({ success: true }), { status: 200 });
} 