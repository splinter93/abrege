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
    const { searchParams } = new URL(req.url);
    const user_id = searchParams.get('user_id');
    const schema = z.object({ user_id: z.string().min(1, 'user_id requis') });
    const parseResult = schema.safeParse({ user_id });
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: 'Paramètre user_id invalide', details: parseResult.error.errors.map(e => e.message) }),
        { status: 422 }
      );
    }
    const { data, error } = await supabase
      .from('classeurs')
      .select('*')
      .eq('user_id', user_id)
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