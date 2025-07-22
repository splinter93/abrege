import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { NextRequest } from 'next/server';
import type { Classeur } from '@/types/supabase';
import { resolveClasseurRef } from '@/middleware/resourceResolver';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type UpdateClasseurMetaPayload = {
  name?: string;
  emoji?: string;
};
export type UpdateClasseurMetaResponse =
  | { classeur: Classeur }
  | { error: string; details?: string[] };

export async function PATCH(req: NextRequest, { params }: any): Promise<Response> {
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
    
    // [TEMP] USER_ID HARDCODED FOR DEV/LLM
    const USER_ID = "3223651c-5580-4471-affb-b3f4456bd729";
    const classeurId = await resolveClasseurRef(ref, USER_ID);
    
    const updates: any = {};
    if (body.name) updates.name = body.name;
    if (body.emoji) updates.emoji = body.emoji;

    // Récupérer l'ancien nom pour comparer
    const { data: oldClasseur, error: oldClasseurError } = await supabase
      .from('classeurs')
      .select('name')
      .eq('id', classeurId)
      .single();
    if (body.name && !oldClasseurError && oldClasseur && oldClasseur.name !== body.name) {
      const { SlugGenerator } = await import('@/utils/slugGenerator');
      const newSlug = await SlugGenerator.generateSlug(body.name, 'classeur', USER_ID, classeurId);
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
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
    return new Response(JSON.stringify({ classeur: updated }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

/**
 * Endpoint: PATCH /api/v1/classeur/[ref]/meta
 * Payload attendu : { name?: string, emoji?: string }
 * - Résout la référence (ID ou slug) vers l'ID réel
 * - Met à jour uniquement le nom ou l'emoji du classeur
 * - Tous les champs sont optionnels, au moins un doit être fourni
 * - Réponses :
 *   - 200 : { classeur }
 *   - 404 : { error: 'Classeur non trouvé.' }
 *   - 422 : { error: 'Paramètre classeur_ref invalide' | 'Payload invalide' | 'Aucun champ à mettre à jour.', details }
 *   - 500 : { error: string }
 */ 