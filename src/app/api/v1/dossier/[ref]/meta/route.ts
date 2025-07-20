import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { NextRequest } from 'next/server';
import type { Folder } from '@/types/supabase';
import { resolveFolderRef } from '@/middleware/resourceResolver';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * PATCH /api/v1/dossier/{ref}/meta
 * Met à jour le nom d'un dossier (folder).
 * Body JSON : { name: string }
 * Réponse : { id, name, parent_id, classeur_id }
 */
export async function PATCH(req: NextRequest, { params }: any): Promise<Response> {
  const { ref } = params;
  // Validation de la ref
  const refSchema = z.string().min(1, 'dossier_ref requis');
  const refResult = refSchema.safeParse(ref);
  if (!refResult.success) {
    return new Response(
      JSON.stringify({ error: 'Paramètre dossier_ref invalide', details: refResult.error.errors.map(e => e.message) }),
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
  
  // [TEMP] USER_ID HARDCODED FOR DEV/LLM
  const USER_ID = "3223651c-5580-4471-affb-b3f4456bd729";
  const folderId = await resolveFolderRef(ref, USER_ID);
  
  // Vérifier que le dossier existe
  const { data: folder, error: folderError } = await supabase
    .from('folders')
    .select('id, name, parent_id, classeur_id')
    .eq('id', folderId)
    .single();
  if (folderError || !folder) {
    return new Response(JSON.stringify({ error: folderError?.message || 'Dossier non trouvé.' }), { status: 404 });
  }
  // Mettre à jour le nom
  const { data: updated, error: updateError } = await supabase
    .from('folders')
    .update({ name: body.name })
    .eq('id', folderId)
    .select('id, name, parent_id, classeur_id')
    .single();
  if (updateError) {
    return new Response(JSON.stringify({ error: updateError.message }), { status: 500 });
  }
  return new Response(JSON.stringify(updated), { status: 200 });
} 