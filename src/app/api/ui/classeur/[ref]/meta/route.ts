import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { NextRequest } from 'next/server';
import type { Classeur } from '@/types/supabase';
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

export type UpdateClasseurMetaPayload = {
  name?: string;
  emoji?: string;
};
export type UpdateClasseurMetaResponse =
  | { classeur: Classeur }
  | { error: string; details?: string[] };

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ ref: string }> }): Promise<Response> {
  const { ref } = await params;
  try {
    const paramSchema = z.object({ ref: z.string().min(1, 'classeur_ref requis') });
    const body: UpdateClasseurMetaPayload = await req.json();
    const bodySchema = z.object({
      name: z.string().optional(),
      emoji: z.string().optional(),
    });
    const paramResult = paramSchema.safeParse({ ref });
    const bodyResult = bodySchema.safeParse(body);
    if (!paramResult.success) {
      return new Response(
        JSON.stringify({ error: 'Paramètre classeur_ref invalide', details: paramResult.error.errors.map(e => e.message) }),
        { status: 422 }
      );
    }
    if (!bodyResult.success) {
      return new Response(
        JSON.stringify({ error: 'Payload invalide', details: bodyResult.error.errors.map(e => e.message) }),
        { status: 422 }
      );
    }
    if (!body.name && !body.emoji) {
      return new Response(
        JSON.stringify({ error: 'Aucun champ à mettre à jour.' }),
        { status: 422 }
      );
    }
    
    const { supabase, userId } = await getAuthenticatedClient(req);
    const classeurId = await resolveClasseurRef(ref, userId);
    
    const updates: Record<string, unknown> = {};
    if (body.name) updates.name = body.name;
    if (body.emoji) updates.emoji = body.emoji;

    // Récupérer l'ancien nom pour comparer
    const { data: oldClasseur, error: oldClasseurError } = await supabase
      .from('classeurs')
      .select('name')
      .eq('id', classeurId)
      .single();
    if (body.name && !oldClasseurError && oldClasseur && oldClasseur.name !== body.name) {
      const newSlug = await SlugGenerator.generateSlug(body.name, 'classeur', userId, classeurId);
      updates.slug = newSlug;
    }

    updates.updated_at = new Date().toISOString();
    const { data: updated, error } = await supabase
      .from('classeurs')
      .update(updates)
      .eq('id', classeurId)
      .select()
      .single();
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ classeur: updated }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === 'Token invalide ou expiré' || error.message === 'Authentification requise') {
      return new Response(JSON.stringify({ error: error.message }), { status: 401, headers: { "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}

/**
 * Endpoint: PATCH /api/ui/classeur/[ref]/meta
 * Payload attendu : { name?: string, emoji?: string }
 * - Résout la référence (ID ou slug) vers l'ID réel
 * - Met à jour uniquement le nom ou l'emoji du classeur
 * - Tous les champs sont optionnels, au moins un doit être fourni
 * - Réponses :
 *   - 200 : { classeur }
 *   - 401 : { error: 'Token invalide ou expiré' | 'Authentification requise' }
 *   - 404 : { error: 'Classeur non trouvé.' }
 *   - 422 : { error: 'Paramètre classeur_ref invalide' | 'Payload invalide' | 'Aucun champ à mettre à jour.', details }
 *   - 500 : { error: string }
 */ 