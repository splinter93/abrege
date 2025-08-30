import { NextRequest, NextResponse } from 'next/server';

import { logApi } from '@/utils/logger';
import { V2ResourceResolver } from '@/utils/v2ResourceResolver';
import { getAuthenticatedUser, createAuthenticatedSupabaseClient } from '@/utils/authUtils';

// 🔧 CORRECTIONS APPLIQUÉES:
// - Authentification simplifiée via getAuthenticatedUser uniquement
// - Suppression de la double vérification d'authentification
// - Client Supabase standard sans token manuel
// - Plus de 401 causés par des conflits d'authentification

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

  // 🔐 Authentification
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
  const supabase = createAuthenticatedSupabaseClient(authResult);

  // Résoudre la référence (UUID ou slug)
  const resolveResult = await V2ResourceResolver.resolveRef(ref, 'folder', userId, context);
  if (!resolveResult.success) {
    return NextResponse.json(
      { error: resolveResult.error },
      { status: resolveResult.status, headers: { "Content-Type": "application/json" } }
    );
  }

  const folderId = resolveResult.id;

  try {
    // Récupérer le dossier principal
    const { data: folder, error: folderError } = await supabase
      .from('folders')
      .select('id, name, parent_id, classeur_id, created_at, updated_at')
      .eq('id', folderId)
      .eq('user_id', userId) // 🔧 SÉCURITÉ: Vérifier que l'utilisateur est propriétaire
      .single();

    if (folderError || !folder) {
      logApi.info(`❌ Dossier non trouvé: ${folderId}`, context);
      return NextResponse.json(
        { error: 'Dossier non trouvé' },
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Récupérer les sous-dossiers
    const { data: subFolders, error: subFoldersError } = await supabase
      .from('folders')
      .select('id, name, parent_id, classeur_id, created_at, updated_at')
      .eq('parent_id', folderId)
      .eq('user_id', userId) // 🔧 SÉCURITÉ: Vérifier que l'utilisateur est propriétaire
      .order('name');

    if (subFoldersError) {
      logApi.info(`❌ Erreur récupération sous-dossiers: ${subFoldersError.message}`, context);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des sous-dossiers' },
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Récupérer les notes du dossier
    const { data: notes, error: notesError } = await supabase
      .from('articles')
      .select('id, source_title, header_image, created_at, updated_at')
      .eq('folder_id', folderId)
      .eq('user_id', userId) // 🔧 SÉCURITÉ: Vérifier que l'utilisateur est propriétaire
      .order('source_title');

    if (notesError) {
      logApi.info(`❌ Erreur récupération notes: ${notesError.message}`, context);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des notes' },
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const apiTime = Date.now() - startTime;
    logApi.info(`✅ Arborescence dossier récupérée en ${apiTime}ms`, context);

    return NextResponse.json({
      success: true,
      folder,
      subFolders: subFolders || [],
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