import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { NextRequest } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

type Folder = {
  id: string;
  name: string;
  parent_id: string | null;
  classeur_id: string;
};
type Note = {
  id: string;
  source_title: string;
  header_image: string | null;
  created_at: string;
  folder_id: string | null;
  classeur_id: string;
};

function buildFolderTree(folders: Folder[], notes: Note[], parentId: string | null = null): Array<{
  id: string;
  name: string;
  parent_id: string | null;
  notes: Array<{ id: string; title: string; header_image: string | null; created_at: string }>;
  children: any[];
}> {
  return folders
    .filter((folder: Folder) => folder.parent_id === parentId)
    .map((folder: Folder) => ({
      id: folder.id,
      name: folder.name,
      parent_id: folder.parent_id,
      notes: notes.filter((note: Note) => note.folder_id === folder.id).map((note: Note) => ({
        id: note.id,
        title: note.source_title,
        header_image: note.header_image,
        created_at: note.created_at,
      })),
      children: buildFolderTree(folders, notes, folder.id),
    }));
}

export async function GET(req: NextRequest, { params }: any): Promise<Response> {
  const { id } = params;
  try {
    // Validation de l'id
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
      .select('id, name, emoji, color')
      .eq('id', id)
      .single();
    if (classeurError || !classeur) {
      return new Response(JSON.stringify({ error: classeurError?.message || 'Classeur non trouvé.' }), { status: 404 });
    }
    // Récupérer tous les dossiers du classeur
    const { data: folders, error: foldersError } = await supabase
      .from('folders')
      .select('id, name, parent_id, classeur_id')
      .eq('classeur_id', id);
    if (foldersError) {
      return new Response(JSON.stringify({ error: foldersError.message }), { status: 500 });
    }
    // Récupérer toutes les notes du classeur
    const folderIds = (folders || []).map(f => f.id);
    const { data: notes, error: notesError } = await supabase
      .from('articles')
      .select('id, source_title, header_image, created_at, folder_id, classeur_id')
      .or([
        `classeur_id.eq.${id},folder_id.is.null`,
        folderIds.length > 0 ? `folder_id.in.(${folderIds.join(',')})` : '',
      ].filter(Boolean).join(','));
    if (notesError) {
      return new Response(JSON.stringify({ error: notesError.message }), { status: 500 });
    }
    // Notes à la racine (folder_id null)
    const notes_at_root = (notes || [])
      .filter(note => !note.folder_id)
      .map(note => ({
        id: note.id,
        title: note.source_title,
        header_image: note.header_image,
        created_at: note.created_at,
      }));
    // Arbre de dossiers imbriqués
    const foldersTree = buildFolderTree(folders || [], notes || []);
    return new Response(
      JSON.stringify({
        classeur,
        notes_at_root,
        folders: foldersTree,
      }),
      { status: 200 }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

/**
 * Endpoint: GET /api/v1/classeur/[id]/tree
 * Retourne l'arbre imbriqué du classeur (folders récursifs, notes à la racine, etc.)
 * Schéma :
 * {
 *   classeur: { id, name, emoji, color },
 *   notes_at_root: [ { id, title, header_image, created_at } ],
 *   folders: [ { id, name, parent_id, notes: [...], children: [...] } ]
 * }
 */ 