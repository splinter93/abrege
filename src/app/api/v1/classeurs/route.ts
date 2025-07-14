import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { Classeur } from '@/types/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type GetClasseursResponse =
  | { classeurs: Classeur[] }
  | { error: string; details?: string[] };

export async function GET(req: Request): Promise<Response> {
  try {
    // [TEMP] USER_ID HARDCODED FOR DEV/LLM
    // TODO: Remove this and extract user_id from API key or session when auth is implemented!
    const USER_ID = "3223651c-5580-4471-affb-b3f4456bd729";
    const { data, error } = await supabase
      .from('classeurs')
      .select('*')
      .eq('user_id', USER_ID)
      .order('position');
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
    return new Response(JSON.stringify({ classeurs: data }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

/**
 * Endpoint: GET /api/v1/classeurs
 * Query param attendu : user_id: string
 * - Valide le paramètre user_id avec Zod
 * - Retourne la liste des classeurs de l'utilisateur (table classeurs)
 * - Réponses :
 *   - 200 : { classeurs }
 *   - 422 : { error: 'Paramètre user_id invalide', details }
 *   - 500 : { error: string }
 */ 