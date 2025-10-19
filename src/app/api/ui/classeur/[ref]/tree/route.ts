import { createClient, type PostgrestError } from '@supabase/supabase-js';
import { z } from 'zod';
import type { NextRequest } from 'next/server';
import { resolveClasseurRef } from '@/middleware-utils/resourceResolver';

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

    // Paramètres depth
    const url = new URL(req.url);
    const depthParam = url.searchParams.get('depth') || 'full';
    const depth = depthParam === '0' ? 0 : depthParam === '1' ? 1 : 'full';
    
    // ✅ Authentification implémentée
    const { supabase, userId } = await getAuthenticatedClient(req);
    const classeurId = await resolveClasseurRef(ref, userId);
    
    // Récupérer le classeur
    const { data: classeur, error: classeurError } = await supabase
      .from('classeurs')
      .select('id, slug, name, emoji')
      .eq('id', classeurId)
      .single();
    if (classeurError || !classeur) {
      return new Response(JSON.stringify({ error: classeurError?.message || 'Classeur non trouvé.' }), { status: 404, headers: { "Content-Type": "application/json" } });
    }

    // Récupérer tous les dossiers du classeur (selon depth)
    const { data: allFolders, error: foldersError } = await supabase
      .from('folders')
      .select('id, name, parent_id, classeur_id, updated_at')
      .eq('classeur_id', classeurId)
      .is('trashed_at', null); // 🔧 CORRECTION: Exclure les dossiers supprimés
    if (foldersError) {
      return new Response(JSON.stringify({ error: foldersError.message }), { status: 500, headers: { "Content-Type": "application/json" } });
    }

    // Récupérer toutes les notes du classeur (selon depth)
    const folderIds = (allFolders || []).map(f => f.id);
    let notes: Note[] = [];
    let notesError: PostgrestError | null = null;

    // Notes à la racine
    const { data: rootNotes, error: rootNotesError } = await supabase
      .from('articles')
      .select('id, source_title, header_image, created_at, updated_at, folder_id, classeur_id')
      .eq('classeur_id', classeurId)
      .is('folder_id', null)
      .is('trashed_at', null); // 🔧 CORRECTION: Exclure les notes supprimées
    if (rootNotesError) notesError = rootNotesError; else if (rootNotes) notes = notes.concat(rootNotes as unknown as Note[]);

    // Notes dans les dossiers (profondeur complète uniquement)
    if (depth === 'full' && folderIds.length > 0) {
      const { data: folderNotes, error: folderNotesError } = await supabase
        .from('articles')
        .select('id, source_title, header_image, created_at, updated_at, folder_id, classeur_id')
        .eq('classeur_id', classeurId)
        .in('folder_id', folderIds)
        .is('trashed_at', null); // 🔧 CORRECTION: Exclure les notes supprimées
      if (folderNotesError) notesError = folderNotesError; else if (folderNotes) notes = notes.concat(folderNotes as unknown as Note[]);
    }
    if (notesError) {
      return new Response(JSON.stringify({ error: notesError.message }), { status: 500, headers: { "Content-Type": "application/json" } });
    }

    // Tri stable et ETAG simple
    const sortedFolders = (allFolders || []).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    const sortedNotes = (notes || []).sort((a, b) => (a.source_title || '').localeCompare(b.source_title || ''));
    const etagBase = JSON.stringify({
      classeurId,
      depth,
      f: sortedFolders.map(f => {
        const folder = f as { id: string; updated_at?: string };
        return `${folder.id}:${folder.updated_at || ''}`;
      }).join(','),
      n: sortedNotes.map(n => `${n.id}:${n.updated_at || ''}`).join(',')
    });
    const etag = `W/"${Buffer.from(etagBase).toString('base64').slice(0, 16)}"`;

    // 304 If-None-Match
    const ifNoneMatch = req.headers.get('if-none-match');
    if (ifNoneMatch && ifNoneMatch === etag) {
      return new Response(null, { status: 304, headers: { ETag: etag } });
    }

    // Notes à la racine (folder_id null) résumé
    const notes_at_root = (sortedNotes || [])
      .filter(note => !note.folder_id)
      .map(note => ({ id: note.id, title: note.source_title, header_image: note.header_image, created_at: note.created_at }));

    // Arbre selon depth
    const foldersTree = depth === 0
      ? []
      : depth === 1
        ? buildFolderTree(sortedFolders as unknown as Folder[], [], null)
        : buildFolderTree(sortedFolders as unknown as Folder[], sortedNotes as unknown as Note[], null);

    return new Response(
      JSON.stringify({
        success: true,
        classeur,
        tree: foldersTree,
        notes_at_root,
        etag,
        generated_at: new Date().toISOString()
      }),
      { status: 200, headers: { 'Cache-Control': 'private, max-age=0, must-revalidate', ETag: etag, 'Content-Type': 'application/json' } }
    );
  } catch (err: unknown) {
    const error = err as Error;
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}

type Folder = {
  id: string;
  name: string;
  parent_id: string | null;
  classeur_id: string;
  updated_at?: string;
};

type Note = {
  id: string;
  source_title: string;
  header_image: string | null;
  created_at: string;
  updated_at?: string;
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