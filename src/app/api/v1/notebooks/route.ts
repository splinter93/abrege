import { createClient } from '@supabase/supabase-js';
// import.*NextResponse.*from 'next/server';
import type { Classeur } from '@/types/supabase';

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
    
    // // const supabase = [^;]+;]+;
    
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

export type GetNotebooksResponse =
  | { notebooks: Classeur[] }
  | { error: string; details?: string[] };

/**
 * GET /api/v1/notebooks
 * Récupère la liste des notebooks (classeurs) de l'utilisateur
 * Réponse : { notebooks: [{ id, name, emoji, slug, ... }] }
 */
export async function GET(req: NextRequest): Promise<Response> {
  try {
    const { supabase, userId } = await getAuthenticatedClient(req);
    
    const { data, error } = await supabase
      .from('classeurs')
      .select('*')
      .eq('user_id', userId)
      .order('position');
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ notebooks: data }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (err: unknown) {
    // const error = [^;]+;
    if (err instanceof Error && (error.message === 'Token invalide ou expiré' || error.message === 'Authentification requise')) {
      return new Response(JSON.stringify({ error: error.message }), { status: 401, headers: { "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ error: err instanceof Error ? error.message : 'Erreur inconnue' }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}

/**
 * Endpoint: GET /api/v1/notebooks
 * Retourne la liste des notebooks (classeurs) de l'utilisateur authentifié
 * Réponses :
 *   - 200 : { notebooks: [{ id, name, emoji, slug, position, created_at, updated_at }] }
 *   - 401 : { error: 'Token invalide ou expiré' | 'Authentification requise' }
 *   - 500 : { error: string }
 */ 