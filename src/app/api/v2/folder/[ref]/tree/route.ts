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

  logApi.info(`🚀 Début récupération arborescence dossier v2 ${ref}`, context);

  // 🔐 Authentification simplifiée
  const authResult = await getAuthenticatedUser(request);
  if (!authResult.success) {
    logApi.info(`❌ Authentification échouée: ${authResult.error}`, context);
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status || 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const userId = authResult.userId!;

  // 🔧 CORRECTION: Client Supabase standard, getAuthenticatedUser a déjà validé
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
    logApi.info(`❌ Erreur vérification permissions: ${permissionResult.error}`, context);
    return NextResponse.json(
      { error: permissionResult.error },
      { status: permissionResult.status || 500, headers: { "Content-Type": "application/json" } }
    );
  }
  if (!permissionResult.hasPermission) {
    logApi.info(`❌ Permissions insuffisantes pour dossier ${folderId}`, context);
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
      logApi.info(`❌ Dossier non trouvé: ${folderId}`, context);
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
      logApi.info(`❌ Erreur récupération sous-dossiers: ${subfoldersError.message}`, context);
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
      logApi.info(`❌ Erreur récupération notes: ${notesError.message}`, context);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des notes' },
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const apiTime = Date.now() - startTime;
    logApi.info(`✅ Arborescence récupérée en ${apiTime}ms`, context);

    return NextResponse.json({
      success: true,
      message: 'Arborescence récupérée avec succès',
      tree: {
        folder: {
          id: folder.id,
          name: folder.name,
          description: folder.description,
          parent_id: folder.parent_id,
          created_at: folder.created_at,
          updated_at: folder.updated_at
        },
        subfolders: subfolders || [],
        notes: notes || []
      }
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