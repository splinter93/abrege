import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { NextRequest } from 'next/server';
import { resolveClasseurRef } from '@/middleware/resourceResolver';
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
 * GET /api/v1/notebook/{ref}
 * Récupère un classeur par ID ou slug
 * Réponse : { notebook: { id, name, emoji, ... } }
 */
export async function GET(req: NextRequest, { params }: any): Promise<Response> {
  try {
    const { ref } = await params;
    const schema = z.object({ ref: z.string().min(1, 'notebook_ref requis') });
    const parseResult = schema.safeParse({ ref });
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: 'Paramètre notebook_ref invalide', details: parseResult.error.errors.map(e => e.message) }),
        { status: 422 }
      );
    }
    
    const { supabase, userId } = await getAuthenticatedClient(req);
    const classeurId = await resolveClasseurRef(ref, userId);
    
    const { data: notebook, error } = await supabase
      .from('classeurs')
      .select('*')
      .eq('id', classeurId)
      .single();
    if (error || !notebook) {
      return new Response(JSON.stringify({ error: error?.message || 'Classeur non trouvé.' }), { status: 404 });
    }
    return new Response(JSON.stringify({ notebook }), { status: 200 });
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === 'Token invalide ou expiré' || error.message === 'Authentification requise') {
      return new Response(JSON.stringify({ error: error.message }), { status: 401 });
    }
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

/**
 * PUT /api/v1/notebook/{ref}
 * Met à jour un classeur par ID ou slug
 * Réponse : { notebook: { id, name, emoji, ... } }
 */
export async function PUT(req: NextRequest, { params }: any): Promise<Response> {
  try {
    const { ref } = await params;
    const body = await req.json();
    
    const schema = z.object({
      ref: z.string().min(1, 'notebook_ref requis'),
      name: z.string().min(1, 'name requis'),
      emoji: z.string().optional()
    });
    
    const parseResult = schema.safeParse({ ref, ...body });
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: 'Payload invalide', details: parseResult.error.errors.map(e => e.message) }),
        { status: 422 }
      );
    }
    
    const { name, emoji } = parseResult.data;
    
    const { supabase, userId } = await getAuthenticatedClient(req);
    const classeurId = await resolveClasseurRef(ref, userId);
    
    // Vérifier que le classeur existe
    const { data: existingNotebook, error: fetchError } = await supabase
      .from('classeurs')
      .select('id, name')
      .eq('id', classeurId)
      .eq('user_id', userId)
      .single();
    
    if (fetchError || !existingNotebook) {
      return new Response(JSON.stringify({ error: 'Classeur non trouvé.' }), { status: 404 });
    }
    // Générer un nouveau slug si le nom change
    const updates: Record<string, unknown> = { name, emoji: emoji || null, updated_at: new Date().toISOString() };
    if (existingNotebook.name !== name) {
      const newSlug = await SlugGenerator.generateSlug(name, 'classeur', userId, classeurId);
      updates.slug = newSlug;
    }
    // Mettre à jour le classeur
    const { data: notebook, error } = await supabase
      .from('classeurs')
      .update(updates)
      .eq('id', classeurId)
      .select()
      .single();
    
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
    
    return new Response(JSON.stringify({ notebook }), { status: 200 });
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === 'Token invalide ou expiré' || error.message === 'Authentification requise') {
      return new Response(JSON.stringify({ error: error.message }), { status: 401 });
    }
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

/**
 * DELETE /api/v1/notebook/{ref}
 * Supprime un classeur par ID ou slug
 * Réponse : { success: true }
 */
export async function DELETE(req: NextRequest, { params }: any): Promise<Response> {
  try {
    const { ref } = await params;
    const refSchema = z.string().min(1, 'notebook_ref requis');
    const refResult = refSchema.safeParse(ref);
    if (!refResult.success) {
      return new Response(
        JSON.stringify({ error: 'Paramètre notebook_ref invalide', details: refResult.error.errors.map(e => e.message) }),
        { status: 422 }
      );
    }
    
    const { supabase, userId } = await getAuthenticatedClient(req);
    const classeurId = await resolveClasseurRef(ref, userId);
    
    // Vérifier que le classeur existe
    const { data: notebook, error: fetchError } = await supabase
      .from('classeurs')
      .select('id')
      .eq('id', classeurId)
      .eq('user_id', userId)
      .single();
    if (fetchError || !notebook) {
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
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === 'Token invalide ou expiré' || error.message === 'Authentification requise') {
      return new Response(JSON.stringify({ error: error.message }), { status: 401 });
    }
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
} 