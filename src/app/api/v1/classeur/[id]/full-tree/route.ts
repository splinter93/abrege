import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { NextRequest } from 'next/server';
import type { Classeur, Folder, Article } from '@/types/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type FullTreeResponse =
  | {
      classeur: Classeur;
      folders: Folder[];
      notes: Article[];
    }
  | { error: string; details?: string[] };

export async function GET(req: NextRequest, { params }: any): Promise<Response> {
  try {
    const { id } = params;
    const schema = z.object({ id: z.string().min(1, 'classeur_id requis') });
    const parseResult = schema.safeParse({ id });
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: 'Paramètre classeur_id invalide', details: parseResult.error.errors.map(e => e.message) }),
        { status: 422 }
      );
    }
    // Récupérer le classeur
    const { data: classeur, error: classeurError } = await supabase
      .from('classeurs')
      .select('*')
      .eq('id', id)
      .single();
    if (classeurError || !classeur) {
      return new Response(JSON.stringify({ error: classeurError?.message || 'Classeur non trouvé.' }), { status: 404 });
    }
    // Récupérer les dossiers
    const { data: folders, error: foldersError } = await supabase
      .from('folders')
      .select('*')
      .eq('classeur_id', id);
    if (foldersError) {
      return new Response(JSON.stringify({ error: foldersError.message }), { status: 500 });
    }
    // Récupérer toutes les notes du classeur (via les dossiers)
    const folderIds = (folders || []).map(f => f.id);
    let notes: Article[] = [];
    if (folderIds.length > 0) {
      const { data: notesData, error: notesError } = await supabase
        .from('articles')
        .select('*')
        .in('folder_id', folderIds);
      if (notesError) {
        return new Response(JSON.stringify({ error: notesError.message }), { status: 500 });
      }
      notes = notesData || [];
    }
    return new Response(
      JSON.stringify({ classeur, folders: folders || [], notes }),
      { status: 200 }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

/**
 * Endpoint: GET /api/v1/classeur/[id]/full-tree
 * Paramètre attendu : { id: string }
 * - Retourne le classeur, tous ses dossiers et toutes les notes de ces dossiers
 * - Réponses :
 *   - 200 : { classeur, folders, notes }
 *   - 404 : { error: 'Classeur non trouvé.' }
 *   - 422 : { error: 'Paramètre classeur_id invalide', details }
 *   - 500 : { error: string }
 */ 