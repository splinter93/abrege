import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { Article } from '@/types/supabase';
import type { NextRequest } from 'next/server';
import { resolveFolderRef } from '@/middleware/resourceResolver';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type GetDossierNotesResponse =
  | { notes: Article[] }
  | { error: string; details?: string[] };

export async function GET(req: NextRequest, { params }: any): Promise<Response> {
  try {
    const { ref } = await params;
    const schema = z.object({ ref: z.string().min(1, 'dossier_ref requis') });
    const parseResult = schema.safeParse({ ref });
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: 'Paramètre dossier_ref invalide', details: parseResult.error.errors.map(e => e.message) }),
        { status: 422 }
      );
    }
    
    // 🚧 Temp: Authentification non implémentée
    // TODO: Remplacer USER_ID par l'authentification Supabase
    // 🚧 Temp: Authentification non implémentée
    // TODO: Remplacer USER_ID par l'authentification Supabase
    const USER_ID = "3223651c-5580-4471-affb-b3f4456bd729";
    const folderId = await resolveFolderRef(ref, USER_ID);
    
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .eq('folder_id', folderId)
      .order('position');
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
    return new Response(JSON.stringify({ notes: data }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

/**
 * Endpoint: GET /api/v1/dossier/[id]/notes
 * Paramètre attendu : { id: string }
 * - Valide le paramètre id avec Zod
 * - Retourne la liste des notes du dossier (table articles)
 * - Réponses :
 *   - 200 : { notes }
 *   - 422 : { error: 'Paramètre dossier_id invalide', details }
 *   - 500 : { error: string }
 */ 