import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
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

export async function GET(req: NextRequest, { params }: { params: Promise<{ ref: string }> }): Promise<Response> {
  const { ref } = await params;
  try {
    // Validation de la ref
    const schema = z.object({ ref: z.string().min(1, 'classeur_ref requis') });
    const parseResult = schema.safeParse({ ref });
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: 'Paramètre classeur_ref invalide', details: parseResult.error.errors.map(e => e.message) }),
        { status: 422 }
      );
    }
    
    // ✅ Authentification implémentée
    const { supabase, userId } = await getAuthenticatedClient(req);
    const classeurId = await resolveClasseurRef(ref, userId);
    
    // Récupérer le classeur
    const { data: classeur, error: classeurError } = await supabase
      .from('classeurs')
      .select('id, name, emoji')
      .eq('id', classeurId)
      .single();
    if (classeurError || !classeur) {
      return new Response(JSON.stringify({ error: classeurError?.message || 'Classeur non trouvé.' }), { status: 404, headers: { "Content-Type": "application/json" } });
    }
    // Récupérer tous les dossiers du classeur
    const { data: folders, error: foldersError } = await supabase
      .from('folders')
      .select('id, name, parent_id, classeur_id')
      .eq('classeur_id', classeurId);
    if (foldersError) {
      return new Response(JSON.stringify({ error: foldersError.message }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
    // Récupérer toutes les notes du classeur (racine + dossiers)
    const folderIds = (folders || []).map(f => f.id);
    let notes: Note[] = [];
    let notesError = null;

    // Notes à la racine
    const { data: rootNotes, error: rootNotesError } = await supabase
      .from('articles')
      .select('id, source_title, header_image, created_at, folder_id, classeur_id')
      .eq('classeur_id', classeurId)
      .is('folder_id', null);
    if (rootNotesError) notesError = rootNotesError;
    else if (rootNotes) notes = notes.concat(rootNotes);

    // Notes dans les dossiers
    if (folderIds.length > 0) {
      const { data: folderNotes, error: folderNotesError } = await supabase
        .from('articles')
        .select('id, source_title, header_image, created_at, folder_id, classeur_id')
        .eq('classeur_id', classeurId)
        .in('folder_id', folderIds);
      if (folderNotesError) notesError = folderNotesError;
      else if (folderNotes) notes = notes.concat(folderNotes);
    }
    if (notesError) {
      return new Response(JSON.stringify({ error: notesError.message }), { status: 500, headers: { "Content-Type": "application/json" } });
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
  } catch (err: unknown) {
    const error = err as Error;
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}

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
  children: ReturnType<typeof buildFolderTree>;
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