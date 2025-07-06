import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { Folder } from '@/types/supabase';
import type { NextRequest } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type GetClasseurDossiersResponse =
  | { dossiers: Folder[] }
  | { error: string; details?: string[] };

export async function GET(req: NextRequest, context: { params: { id: string } }): Promise<Response> {
  try {
    const { id } = context.params;
    const schema = z.object({ id: z.string().min(1, 'classeur_id requis') });
    const parseResult = schema.safeParse({ id });
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: 'Paramètre classeur_id invalide', details: parseResult.error.errors.map(e => e.message) }),
        { status: 422 }
      );
    }
    const { data, error } = await supabase
      .from('folders')
      .select('*')
      .eq('classeur_id', id)
      .order('position');
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
    return new Response(JSON.stringify({ dossiers: data }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

/**
 * Endpoint: GET /api/v1/classeur/[id]/dossiers
 * Paramètre attendu : { id: string }
 * - Valide le paramètre id avec Zod
 * - Retourne la liste des dossiers du classeur (table folders)
 * - Réponses :
 *   - 200 : { dossiers }
 *   - 422 : { error: 'Paramètre classeur_id invalide', details }
 *   - 500 : { error: string }
 */ 