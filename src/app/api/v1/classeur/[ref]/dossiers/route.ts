import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { Folder } from '@/types/supabase';
import type { NextRequest } from 'next/server';
import { resolveClasseurRef } from '@/middleware/resourceResolver';

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

export type GetClasseurDossiersResponse =
  | { dossiers: Folder[] }
  | { error: string; details?: string[] };

export async function GET(req: NextRequest, { params }: { params: Promise<{ ref: string }> }): Promise<Response> {
  try {
    const { ref } = await params;
    const schema = z.object({ ref: z.string().min(1, 'classeur_ref requis') });
    const parseResult = schema.safeParse({ ref });
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: 'Paramètre classeur_ref invalide', details: parseResult.error.errors.map(e => e.message) }),
        { status: 422 }
      );
    }
    
    const { supabase, userId } = await getAuthenticatedClient(req);
    const classeurId = await resolveClasseurRef(ref, userId);
    
    const { data, error } = await supabase
      .from('folders')
      .select('*')
      .eq('classeur_id', classeurId)
      .order('position');
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
    return new Response(JSON.stringify({ dossiers: data }), { status: 200 });
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === 'Token invalide ou expiré' || error.message === 'Authentification requise') {
      return new Response(JSON.stringify({ error: error.message }), { status: 401 });
    }
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

/**
 * Endpoint: GET /api/v1/classeur/[id]/dossiers
 * Paramètre attendu : { id: string }
 * - Valide le paramètre id avec Zod
 * - Retourne la liste des dossiers du classeur (table folders)
 * - Réponses :
 *   - 200 : { dossiers }
 *   - 401 : { error: 'Token invalide ou expiré' | 'Authentification requise' }
 *   - 422 : { error: 'Paramètre classeur_id invalide', details }
 *   - 500 : { error: string }
 */ 