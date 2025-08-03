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
 * GET /api/v1/folder/{ref}
 * Récupère un dossier par ID ou slug
 * Réponse : { folder: { id, name, classeur_id, parent_id, ... } }
 */
export async function GET(req: NextRequest, { params }: ApiContext): Promise<Response> {
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
    
    const { supabase, userId } = await getAuthenticatedClient(req);
    const folderId = await resolveFolderRef(ref, userId);
    
    const { data: folder, error } = await supabase
      .from('folders')
      .select('*')
      .eq('id', folderId)
      .single();
    if (error || !folder) {
      return new Response(JSON.stringify({ error: error?.message || 'Dossier non trouvé.' }), { status: 404 });
    }
    return new Response(JSON.stringify({ folder }), { status: 200 });
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === 'Token invalide ou expiré' || error.message === 'Authentification requise') {
      return new Response(JSON.stringify({ error: error.message }), { status: 401 });
    }
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

/**
 * PUT /api/v1/folder/{ref}
 * Met à jour un dossier par ID ou slug
 * Réponse : { folder: { id, name, ... } }
 */
export async function PUT(req: NextRequest, { params }: ApiContext): Promise<Response> {
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
    
    const { supabase, userId } = await getAuthenticatedClient(req);
    const folderId = await resolveFolderRef(ref, userId);
    
    // Vérifier que le dossier existe
    const { data: existingFolder, error: fetchError } = await supabase
      .from('folders')
      .select('id')
      .eq('id', folderId)
      .eq('user_id', userId)
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
      // Générer un nouveau slug
      const newSlug = await SlugGenerator.generateSlug(name, 'folder', userId, folderId);
      updates.slug = newSlug;
    }
    
    const { data: updatedFolder, error } = await supabase
      .from('folders')
      .update(updates)
      .eq('id', folderId)
      .select()
      .single();
    
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
    
    return new Response(JSON.stringify({ folder: updatedFolder }), { status: 200 });
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === 'Token invalide ou expiré' || error.message === 'Authentification requise') {
      return new Response(JSON.stringify({ error: error.message }), { status: 401 });
    }
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

/**
 * DELETE /api/v1/folder/{ref}
 * Supprime un dossier par ID ou slug
 * Réponse : { success: true }
 */
export async function DELETE(req: NextRequest, { params }: ApiContext): Promise<Response> {
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
    
    const { supabase, userId } = await getAuthenticatedClient(req);
    const folderId = await resolveFolderRef(ref, userId);
    
    // Vérifier que le dossier existe et appartient à l'utilisateur
    const { data: existingFolder, error: fetchError } = await supabase
      .from('folders')
      .select('id')
      .eq('id', folderId)
      .eq('user_id', userId)
      .single();
    
    if (fetchError || !existingFolder) {
      return new Response(JSON.stringify({ error: 'Dossier non trouvé.' }), { status: 404 });
    }
    
    // Supprimer le dossier
    const { error } = await supabase
      .from('folders')
      .delete()
      .eq('id', folderId);
    
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
    
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === 'Token invalide ou expiré' || error.message === 'Authentification requise') {
      return new Response(JSON.stringify({ error: error.message }), { status: 401 });
    }
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
} 