import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { NextRequest } from 'next/server';
import { resolveFolderRef } from '@/middleware/resourceResolver';

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

function buildFolderTree(folders: Folder[], notes: Note[], parentId: string): Array<{
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
  const { ref } = await params;
  try {
    // Validation de la ref
    const schema = z.object({ ref: z.string().min(1, 'dossier_ref requis') });
    const parseResult = schema.safeParse({ ref });
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: 'Paramètre dossier_ref invalide', details: parseResult.error.errors.map(e => e.message) }),
        { status: 422 }
      );
    }
    
    const { supabase, userId } = await getAuthenticatedClient(req);
    const folderId = await resolveFolderRef(ref, userId);
    
    // Récupérer le dossier racine
    const { data: rootFolder, error: folderError } = await supabase
      .from('folders')
      .select('id, name, parent_id, classeur_id')
      .eq('id', folderId)
      .single();
    if (folderError || !rootFolder) {
      return new Response(JSON.stringify({ error: folderError?.message || 'Dossier non trouvé.' }), { status: 404 });
    }
    // Récupérer tous les dossiers du même classeur
    const { data: folders, error: foldersError } = await supabase
      .from('folders')
      .select('id, name, parent_id, classeur_id')
      .eq('classeur_id', rootFolder.classeur_id);
    if (foldersError) {
      return new Response(JSON.stringify({ error: foldersError.message }), { status: 500 });
    }
    // Récupérer toutes les notes du même classeur
    const folderIds = (folders || []).map(f => f.id);
    const { data: notes, error: notesError } = await supabase
      .from('articles')
      .select('id, source_title, header_image, created_at, folder_id, classeur_id')
      .or([
        folderIds.length > 0 ? `folder_id.in.(${folderIds.join(',')})` : '',
      ].filter(Boolean).join(','));
    if (notesError) {
      return new Response(JSON.stringify({ error: notesError.message }), { status: 500 });
    }
    // Arbre de dossiers imbriqués à partir du dossier racine
    const foldersTree = buildFolderTree(folders || [], notes || [], folderId);
    // Notes à la racine du dossier demandé
    const notes_at_root = (notes || [])
      .filter(note => note.folder_id === folderId)
      .map(note => ({
        id: note.id,
        title: note.source_title,
        header_image: note.header_image,
        created_at: note.created_at,
      }));
    return new Response(
      JSON.stringify({
        folder: rootFolder,
        notes_at_root,
        folders: foldersTree,
      }),
      { status: 200 }
    );
  } catch (err: any) {
    if (err.message === 'Token invalide ou expiré' || err.message === 'Authentification requise') {
      return new Response(JSON.stringify({ error: err.message }), { status: 401 });
    }
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

/**
 * Endpoint: GET /api/v1/dossier/[id]/tree
 * Retourne l'arbre imbriqué du dossier (folders récursifs, notes à chaque niveau)
 * Schéma :
 * {
 *   folder: { id, name, parent_id, classeur_id },
 *   notes_at_root: [ { id, title, header_image, created_at } ],
 *   folders: [ { id, name, parent_id, notes: [...], children: [...] } ]
 * }
 */ 