import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { NextRequest } from 'next/server';
import { resolveFolderRef } from '@/middleware/resourceResolver';
import { SlugGenerator } from '@/utils/slugGenerator';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Récupère le token d'authentification et crée un client Supabase authentifié
 */
async function getAuthenticatedClient(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  let userId: string;
  let userToken: string;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    userToken = authHeader.substring(7);
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${userToken}`
        }
      }
    });
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error('Token invalide ou expiré');
    }
    
    userId = user.id;
    return { supabase, userId };
  } else {
    throw new Error('Authentification requise');
  }
}

/**
 * PATCH /api/v1/dossier/{ref}/meta
 * Met à jour le nom d'un dossier (folder).
 * Body JSON : { name: string }
 * Réponse : { id, name, parent_id, classeur_id }
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ ref: string }> }): Promise<Response> {
  try {
    const { ref } = await params;
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
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Body JSON invalide' }), { status: 400 });
    }
    const bodySchema = z.object({
      name: z.string().min(1, 'Le nom du dossier est requis'),
    });
    const bodyResult = bodySchema.safeParse(body as Record<string, unknown>);
    if (!bodyResult.success) {
      return new Response(
        JSON.stringify({ error: 'Body invalide', details: bodyResult.error.errors.map(e => e.message) }),
        { status: 422 }
      );
    }
    
    const { supabase, userId } = await getAuthenticatedClient(req);
    const folderId = await resolveFolderRef(ref, userId);
    
    // Vérifier que le dossier existe
    const { data: folder, error: folderError } = await supabase
      .from('folders')
      .select('id, name, parent_id, classeur_id')
      .eq('id', folderId)
      .single();
    if (folderError || !folder) {
      return new Response(JSON.stringify({ error: folderError?.message || 'Dossier non trouvé.' }), { status: 404 });
    }
    // Mettre à jour le nom et le slug si besoin
    // Récupérer l'ancien nom pour comparer
    const { data: oldFolder, error: oldFolderError } = await supabase
      .from('folders')
      .select('name')
      .eq('id', folderId)
      .single();
    const updates: Record<string, unknown> = { name: bodyResult.data.name };
    if (!oldFolderError && oldFolder && oldFolder.name !== bodyResult.data.name) {
      const newSlug = await SlugGenerator.generateSlug(bodyResult.data.name, 'folder', userId, folderId);
      updates.slug = newSlug;
    }
    const { data: updated, error: updateError } = await supabase
      .from('folders')
      .update(updates)
      .eq('id', folderId)
      .select('id, name, parent_id, classeur_id')
      .single();
    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), { status: 500 });
    }
    return new Response(JSON.stringify(updated), { status: 200 });
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === 'Token invalide ou expiré' || error.message === 'Authentification requise') {
      return new Response(JSON.stringify({ error: error.message }), { status: 401 });
    }
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
} 