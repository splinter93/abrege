import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

import { logApi } from '@/utils/logger';
import { V2ResourceResolver } from '@/utils/v2ResourceResolver';
import { getAuthenticatedUser } from '@/utils/authUtils';

function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// ✅ FIX PROD: Force Node.js runtime pour accès aux variables d'env (SUPABASE_SERVICE_ROLE_KEY)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ref: string }> }
): Promise<NextResponse> {
  const startTime = Date.now();
  const { ref } = await params;
  const clientType = request.headers.get('X-Client-Type') || 'unknown';
  const context = {
    operation: 'v2_classeur_tree',
    component: 'API_V2',
    ref,
    clientType
  };

  logApi.info(`🚀 Début récupération arborescence classeur v2 ${ref}`, context);

  // 🔐 Authentification simplifiée - une seule vérification
  const authResult = await getAuthenticatedUser(request);
  if (!authResult.success) {
    logApi.info(`❌ Authentification échouée: ${authResult.error}`, context);
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status || 401 }
    );
  }

  const userId = authResult.userId!;
  const service = createServiceClient();
  if (!service) {
    return NextResponse.json({ error: 'Service non configuré' }, { status: 500 });
  }

  // Résoudre la référence (UUID ou slug) — propriétaire ou partage actif
  const resolveResult = await V2ResourceResolver.resolveRef(ref, 'classeur', userId, context);
  if (!resolveResult.success) {
    return NextResponse.json(
      { error: resolveResult.error },
      { status: resolveResult.status }
    );
  }

  const classeurId = resolveResult.id;

  try {
    const { data: classeurRow, error: classeurMetaErr } = await service
      .from('classeurs')
      .select('id, name, description, emoji, position, slug, created_at, updated_at, user_id')
      .eq('id', classeurId)
      .eq('is_in_trash', false)
      .maybeSingle();

    if (classeurMetaErr || !classeurRow) {
      logApi.info(`❌ Classeur non trouvé: ${classeurId}`, context);
      return NextResponse.json(
        { error: 'Classeur non trouvé' },
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const ownerId = classeurRow.user_id as string;
    const isOwner = ownerId === userId;
    if (!isOwner) {
      const { data: shareRow } = await service
        .from('classeur_shares')
        .select('id')
        .eq('classeur_id', classeurId)
        .eq('shared_with', userId)
        .maybeSingle();
      if (!shareRow) {
        return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
      }
    }

    const classeur = {
      id: classeurRow.id,
      name: classeurRow.name,
      description: classeurRow.description,
      emoji: classeurRow.emoji,
      position: classeurRow.position,
      slug: classeurRow.slug,
      created_at: classeurRow.created_at,
      updated_at: classeurRow.updated_at,
    };

    logApi.info(`🚀 Requêtes parallèles: dossiers, notes (owner=${ownerId})`, context);

    const [foldersResult, notesResult] = await Promise.all([
      service
        .from('folders')
        .select('id, name, parent_id, created_at, position, slug, classeur_id')
        .eq('classeur_id', classeurId)
        .eq('user_id', ownerId)
        .is('trashed_at', null)
        .order('name'),
      service
        .from('articles')
        .select('id, source_title, header_image, created_at, updated_at, folder_id, classeur_id, slug, position')
        .eq('classeur_id', classeurId)
        .eq('user_id', ownerId)
        .is('trashed_at', null)
        .order('source_title'),
    ]);

    // Vérifier les dossiers
    const { data: folders, error: foldersError } = foldersResult;
    if (foldersError) {
      logApi.info(`❌ Erreur récupération dossiers: ${foldersError.message}`, context);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des dossiers' },
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Vérifier les notes
    const { data: notes, error: notesError } = notesResult;
    if (notesError) {
      logApi.info(`❌ Erreur récupération notes: ${notesError.message}`, context);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des notes' },
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    logApi.info(`✅ Classeur: ${classeur.name}, Dossiers: ${folders?.length || 0}, Notes: ${notes?.length || 0}`, context);

    const safeNotes: NoteData[] = (notes || []).map(note => ({
      ...note,
      position: (note as { position?: number }).position ?? 0
    }));

    // Construire l'arborescence
    const tree = buildTree(folders || [], safeNotes);

    const apiTime = Date.now() - startTime;
    logApi.info(`✅ Arborescence classeur v2 récupérée en ${apiTime}ms`, context);

    return NextResponse.json({
      success: true,
      classeur,
      tree,
      folders: folders || [],
      notes: notes || [],
      generated_at: new Date().toISOString()
    }, { headers: { "Content-Type": "application/json" } });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    logApi.error(`❌ Erreur inattendue: ${errorMessage}`, context);
    
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

// Types pour l'arborescence
interface FolderData {
  id: string;
  name: string;
  parent_id?: string | null;
  position: number;
  slug: string;
  [key: string]: unknown;
}

interface NoteData {
  id: string;
  source_title: string;
  folder_id?: string | null;
  position: number;
  slug: string;
  [key: string]: unknown;
}

interface TreeFolder extends FolderData {
  children: TreeFolder[];
  notes: NoteData[];
}

// Fonction utilitaire pour construire l'arborescence
function buildTree(folders: FolderData[], notes: NoteData[]) {
  const folderMap = new Map<string, TreeFolder>();
  const rootFolders: TreeFolder[] = [];
  const rootNotes: NoteData[] = [];

  // Créer un map des dossiers
  folders.forEach(folder => {
    folderMap.set(folder.id, {
      ...folder,
      children: [],
      notes: []
    });
  });

  // Organiser les dossiers en arbre
  folders.forEach(folder => {
    if (folder.parent_id && folderMap.has(folder.parent_id)) {
      folderMap.get(folder.parent_id)!.children.push(folderMap.get(folder.id)!);
    } else {
      rootFolders.push(folderMap.get(folder.id)!);
    }
  });

  // Organiser les notes
  notes.forEach(note => {
    if (note.folder_id && folderMap.has(note.folder_id)) {
      folderMap.get(note.folder_id)!.notes.push(note);
    } else {
      rootNotes.push(note);
    }
  });

  return {
    folders: rootFolders,
    notes: rootNotes
  };
} 