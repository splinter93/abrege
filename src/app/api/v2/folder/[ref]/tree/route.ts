import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logApi } from '@/utils/logger';
import { V2ResourceResolver } from '@/utils/v2ResourceResolver';
import { getAuthenticatedUser, checkUserPermission } from '@/utils/authUtils';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ref: string }> }
): Promise<NextResponse> {
  const startTime = Date.now();
  const { ref } = await params;
  const clientType = request.headers.get('X-Client-Type') || 'unknown';
  const context = {
    operation: 'v2_folder_tree',
    component: 'API_V2',
    ref,
    clientType
  };

  logApi('v2_folder_tree', `🚀 Début récupération arborescence dossier v2 ${ref}`, context);

  // 🔐 Authentification
  const authResult = await getAuthenticatedUser(request);
  if (!authResult.success) {
    logApi('v2_folder_tree', `❌ Authentification échouée: ${authResult.error}`, context);
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status || 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const userId = authResult.userId!;
  
  // Récupérer le token d'authentification
  const authHeader = request.headers.get('Authorization');
  const userToken = authHeader?.substring(7);
  
  if (!userToken) {
    logApi('v2_tree', '❌ Token manquant', context);
    return NextResponse.json(
      { error: 'Token d\'authentification manquant' },
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  // Créer un client Supabase authentifié
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${userToken}`
      }
    }
  });

  // Résoudre la référence (UUID ou slug)
  const resolveResult = await V2ResourceResolver.resolveRef(ref, 'folder', userId, context);
  if (!resolveResult.success) {
    return NextResponse.json(
      { error: resolveResult.error },
      { status: resolveResult.status, headers: { "Content-Type": "application/json" } }
    );
  }

  const folderId = resolveResult.id;

  // 🔐 Vérification des permissions
  const permissionResult = await checkUserPermission(folderId, 'folder', 'viewer', userId, context);
  if (!permissionResult.success) {
    logApi('v2_folder_tree', `❌ Erreur vérification permissions: ${permissionResult.error}`, context);
    return NextResponse.json(
      { error: permissionResult.error },
      { status: permissionResult.status || 500, headers: { "Content-Type": "application/json" } }
    );
  }
  if (!permissionResult.hasPermission) {
    logApi('v2_folder_tree', `❌ Permissions insuffisantes pour dossier ${folderId}`, context);
    return NextResponse.json(
      { error: 'Permissions insuffisantes pour accéder à ce dossier' },
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    // Récupérer le dossier principal
    const { data: folder, error: folderError } = await supabase
      .from('folders')
      .select('id, name, description, parent_id, created_at, updated_at')
      .eq('id', folderId)
      .single();

    if (folderError || !folder) {
      logApi('v2_folder_tree', `❌ Dossier non trouvé: ${folderId}`, context);
      return NextResponse.json(
        { error: 'Dossier non trouvé' },
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Récupérer les sous-dossiers
    const { data: subfolders, error: subfoldersError } = await supabase
      .from('folders')
      .select('id, name, description, parent_id, created_at, updated_at')
      .eq('parent_id', folderId)
      .order('name');

    if (subfoldersError) {
      logApi('v2_folder_tree', `❌ Erreur récupération sous-dossiers: ${subfoldersError.message}`, context);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des sous-dossiers' },
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Récupérer les notes du dossier
    const { data: notes, error: notesError } = await supabase
      .from('articles')
      .select('id, source_title, description, header_image, created_at, updated_at')
      .eq('folder_id', folderId)
      .order('source_title');

    if (notesError) {
      logApi('v2_folder_tree', `❌ Erreur récupération notes: ${notesError.message}`, context);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des notes' },
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const apiTime = Date.now() - startTime;
    logApi('v2_folder_tree', `✅ Arborescence récupérée en ${apiTime}ms`, context);

    return NextResponse.json({
      success: true,
      message: 'Arborescence récupérée avec succès',
      tree: {
        folder: {
          id: folder.id,
          name: folder.name,
          description: folder.description,
          parentId: folder.parent_id,
          createdAt: folder.created_at,
          updatedAt: folder.updated_at
        },
        subfolders: subfolders?.map(sub => ({
          id: sub.id,
          name: sub.name,
          description: sub.description,
          parentId: sub.parent_id,
          createdAt: sub.created_at,
          updatedAt: sub.updated_at
        })) || [],
        notes: notes?.map(note => ({
          id: note.id,
          title: note.source_title,
          description: note.description,
          headerImage: note.header_image,
          createdAt: note.created_at,
          updatedAt: note.updated_at
        })) || []
      }
    }, { headers: { "Content-Type": "application/json" } });

  } catch (err: unknown) {
    const error = err as Error;
    logApi('v2_folder_tree', `❌ Erreur serveur: ${error}`, context);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
} 