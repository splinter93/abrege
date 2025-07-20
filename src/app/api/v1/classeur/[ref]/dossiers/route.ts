import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { Folder } from '@/types/supabase';
import type { NextRequest } from 'next/server';
import { resolveClasseurRef } from '@/middleware/resourceResolver';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type GetClasseurDossiersResponse =
  | { dossiers: Folder[] }
  | { error: string; details?: string[] };

export async function GET(req: NextRequest, { params }: any): Promise<Response> {
  try {
    const { ref } = params;
    const schema = z.object({ ref: z.string().min(1, 'classeur_ref requis') });
    const parseResult = schema.safeParse({ ref });
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: 'Paramètre classeur_ref invalide', details: parseResult.error.errors.map(e => e.message) }),
        { status: 422 }
      );
    }
    
    // [TEMP] USER_ID HARDCODED FOR DEV/LLM
    const USER_ID = "3223651c-5580-4471-affb-b3f4456bd729";
    const classeurId = await resolveClasseurRef(ref, USER_ID);
    
    const { data, error } = await supabase
      .from('folders')
      .select('*')
      .eq('classeur_id', classeurId)
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