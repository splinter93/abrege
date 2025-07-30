import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { NextRequest } from 'next/server';
import { resolveFolderRef } from '@/middleware/resourceResolver';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * GET /api/v1/folder/{ref}
 * Récupère un dossier par ID ou slug
 * Réponse : { folder: { id, name, classeur_id, parent_id, ... } }
 */
export async function GET(req: NextRequest, { params }: any): Promise<Response> {
  try {
    const { ref } = await params;
    const schema = z.object({ ref: z.string().min(1, 'folder_ref requis') });
    const parseResult = schema.safeParse({ ref });
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: 'Paramètre folder_ref invalide', details: parseResult.error.errors.map(e => e.message) }),
        { status: 422 }
      );
    }
    
    // 🚧 Temp: Authentification non implémentée
    // TODO: Remplacer USER_ID par l'authentification Supabase
    // 🚧 Temp: Authentification non implémentée
    // TODO: Remplacer USER_ID par l'authentification Supabase
    const USER_ID = "3223651c-5580-4471-affb-b3f4456bd729";
    const folderId = await resolveFolderRef(ref, USER_ID);
    
    const { data: folder, error } = await supabase
      .from('folders')
      .select('*')
      .eq('id', folderId)
      .single();
    if (error || !folder) {
      return new Response(JSON.stringify({ error: error?.message || 'Dossier non trouvé.' }), { status: 404 });
    }
    return new Response(JSON.stringify({ folder }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

/**
 * PUT /api/v1/folder/{ref}
 * Met à jour un dossier par ID ou slug
 * Réponse : { folder: { id, name, ... } }
 */
export async function PUT(req: NextRequest, { params }: any): Promise<Response> {
  try {
    const { ref } = await params;
    const body = await req.json();
    
    const schema = z.object({
      ref: z.string().min(1, 'folder_ref requis'),
      name: z.string().min(1, 'name requis')
    });
    
    const parseResult = schema.safeParse({ ref, ...body });
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: 'Payload invalide', details: parseResult.error.errors.map(e => e.message) }),
        { status: 422 }
      );
    }
    
    const { name } = parseResult.data;
    
    // 🚧 Temp: Authentification non implémentée
    // TODO: Remplacer USER_ID par l'authentification Supabase
    // 🚧 Temp: Authentification non implémentée
    // TODO: Remplacer USER_ID par l'authentification Supabase
    const USER_ID = "3223651c-5580-4471-affb-b3f4456bd729";
    const folderId = await resolveFolderRef(ref, USER_ID);
    
    // Vérifier que le dossier existe
    const { data: existingFolder, error: fetchError } = await supabase
      .from('folders')
      .select('id')
      .eq('id', folderId)
      .eq('user_id', USER_ID)
      .single();
    
    if (fetchError || !existingFolder) {
      return new Response(JSON.stringify({ error: 'Dossier non trouvé.' }), { status: 404 });
    }
    
    // Mettre à jour le dossier (pas d'updated_at dans la table folders)
    // Générer un nouveau slug si le nom change
    const { data: oldFolder, error: oldFolderError } = await supabase
      .from('folders')
      .select('name')
      .eq('id', folderId)
      .single();
    const updates: Record<string, unknown> = { name };
    if (!oldFolderError && oldFolder && oldFolder.name !== name) {
      // Générer le nouveau slug
      const { SlugGenerator } = await import('@/utils/slugGenerator');
      const newSlug = await SlugGenerator.generateSlug(name, 'folder', USER_ID, folderId);
      updates.slug = newSlug;
    }
    const { data: folder, error } = await supabase
      .from('folders')
      .update(updates)
      .eq('id', folderId)
      .select()
      .single();
    
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
    
    // 🚫 POLLING DÉCLENCHÉ PAR L'API CLIENT OPTIMISÉE
    // Plus besoin de déclencher le polling côté serveur
    
    return new Response(JSON.stringify({ folder }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

/**
 * DELETE /api/v1/folder/{ref}
 * Supprime un dossier par ID ou slug
 * Réponse : { success: true }
 */
export async function DELETE(req: NextRequest, { params }: any): Promise<Response> {
  const { ref } = await params;
  const refSchema = z.string().min(1, 'folder_ref requis');
  const refResult = refSchema.safeParse(ref);
  if (!refResult.success) {
    return new Response(
      JSON.stringify({ error: 'Paramètre folder_ref invalide', details: refResult.error.errors.map(e => e.message) }),
      { status: 422 }
    );
  }
  
  // 🚧 Temp: Authentification non implémentée
    // TODO: Remplacer USER_ID par l'authentification Supabase
    // 🚧 Temp: Authentification non implémentée
    // TODO: Remplacer USER_ID par l'authentification Supabase
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
  const { data: deletedFolder, error: deleteError } = await supabase
    .from('folders')
    .delete()
    .eq('id', folderId)
    .select()
    .single();
  if (deleteError) {
    return new Response(JSON.stringify({ error: deleteError.message }), { status: 500 });
  }
  
  // 🚫 POLLING DÉCLENCHÉ PAR L'API CLIENT OPTIMISÉE
  // Plus besoin de déclencher le polling côté serveur
  
  return new Response(JSON.stringify({ success: true, folder: deletedFolder }), { status: 200 });
} 