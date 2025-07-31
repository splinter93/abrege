import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logApi } from '@/utils/logger';
import { treeResponseV2Schema } from '@/utils/v2ValidationSchemas';
import { V2ResourceResolver } from '@/utils/v2ResourceResolver';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function GET(
  request: NextRequest,
  { params }: { params: { ref: string } }
) {
  const startTime = Date.now();
  const ref = params.ref;
  const clientType = request.headers.get('X-Client-Type') || 'unknown';
  const context = {
    operation: 'v2_folder_tree_get',
    component: 'API_V2',
    ref,
    clientType
  };

  logApi('v2_folder_tree_get', `🚀 Début récupération arborescence dossier v2 ${ref}`, context);

  // 🚧 Temp: Authentification non implémentée
  // TODO: Remplacer USER_ID par l'authentification Supabase
  const authResult = await getAuthenticatedUser(request);
  if (!authResult.success) {
    logApi(context.operation, `❌ Authentification échouée: ${authResult.error}`, context);
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status || 401 }
    );
  }

  const userId = authResult.userId!;

  // Résoudre la référence (UUID ou slug)
  const resolveResult = await V2ResourceResolver.resolveRef(ref, 'folder', userId, context);
  if (!resolveResult.success) {
    return NextResponse.json(
      { error: resolveResult.error },
      { status: resolveResult.status }
    );
  }

  const folderId = resolveResult.id;

  try {
    // Vérifier que le dossier existe
    const { data: folder, error: folderError } = await supabase
      .from('folders')
      .select('id, name, user_id')
      .eq('id', folderId)
      .single();

    if (folderError || !folder) {
      logApi('v2_folder_tree_get', `❌ Dossier non trouvé: ${folderId}`, context);
      return NextResponse.json(
        { error: 'Dossier non trouvé' },
        { status: 404 }
      );
    }

    // Récupérer les sous-dossiers
    const { data: subFolders, error: subFoldersError } = await supabase
      .from('folders')
      .select('id, name, parent_id, created_at, updated_at')
      .eq('parent_id', folderId)
      .order('position', { ascending: true });

    if (subFoldersError) {
      logApi('v2_folder_tree_get', `❌ Erreur récupération sous-dossiers: ${subFoldersError.message}`, context);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des sous-dossiers' },
        { status: 500 }
      );
    }

    // Récupérer les notes du dossier
    const { data: notes, error: notesError } = await supabase
      .from('articles')
      .select('id, source_title, created_at, updated_at, position')
      .eq('folder_id', folderId)
      .order('position', { ascending: true });

    if (notesError) {
      logApi('v2_folder_tree_get', `❌ Erreur récupération notes: ${notesError.message}`, context);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des notes' },
        { status: 500 }
      );
    }

    const response = {
      success: true,
      tree: {
        id: folder.id,
        name: folder.name,
        folders: subFolders || [],
        notes: notes || []
      }
    };

    // Validation de la réponse
    const validationResult = treeResponseV2Schema.safeParse(response);
    if (!validationResult.success) {
      logApi('v2_folder_tree_get', `❌ Réponse invalide: ${validationResult.error}`, context);
      return NextResponse.json(
        { error: 'Erreur de validation de la réponse' },
        { status: 500 }
      );
    }

    const apiTime = Date.now() - startTime;
    logApi('v2_folder_tree_get', `✅ Arborescence récupérée en ${apiTime}ms`, context);

    return NextResponse.json(response);

  } catch (error) {
    logApi('v2_folder_tree_get', `❌ Erreur serveur: ${error}`, context);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
} 