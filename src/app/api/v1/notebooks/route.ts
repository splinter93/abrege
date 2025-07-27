import { createClient } from '@supabase/supabase-js';

import type { Classeur } from '@/types/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type GetNotebooksResponse =
  | { notebooks: Classeur[] }
  | { error: string; details?: string[] };

/**
 * GET /api/v1/notebooks
 * Récupère la liste des notebooks (classeurs) de l'utilisateur
 * Réponse : { notebooks: [{ id, name, emoji, slug, ... }] }
 */
export async function GET(): Promise<Response> {
  try {
    // [TEMP] USER_ID HARDCODED FOR DEV/LLM
    // TODO: Extract user_id from API key when auth is implemented!
    // 🚧 Temp: Authentification non implémentée
    // TODO: Remplacer USER_ID par l'authentification Supabase
    const USER_ID = "3223651c-5580-4471-affb-b3f4456bd729";
    
    const { data, error } = await supabase
      .from('classeurs')
      .select('*')
      .eq('user_id', USER_ID)
      .order('position');
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
    return new Response(JSON.stringify({ notebooks: data }), { status: 200 });
  } catch (err: unknown) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Erreur inconnue' }), { status: 500 });
  }
}

/**
 * Endpoint: GET /api/v1/notebooks
 * Retourne la liste des notebooks (classeurs) de l'utilisateur authentifié
 * - En phase de test : utilise le USER_ID hardcodé
 * - En production : extrait l'user_id de l'API key
 * Réponses :
 *   - 200 : { notebooks: [{ id, name, emoji, slug, position, created_at, updated_at }] }
 *   - 500 : { error: string }
 */ 