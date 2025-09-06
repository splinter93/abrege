import { NextRequest, NextResponse } from 'next/server';
import { logApi } from '@/utils/logger';
import { getAuthenticatedUser, createAuthenticatedSupabaseClient } from '@/utils/authUtils';
import { V2ResourceResolver } from '@/utils/v2ResourceResolver';

export async function GET(
  request: NextRequest,
  { params }: { params: { ref: string } }
): Promise<NextResponse> {
  const startTime = Date.now();
  const clientType = request.headers.get('X-Client-Type') || 'unknown';
  const context = {
    operation: 'v2_folder_get',
    component: 'API_V2',
    clientType,
    ref: params.ref
  };

  logApi.info('🚀 Début récupération dossier v2', context);

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
  const folderRef = params.ref;

  try {
    // 🔧 CORRECTION: Utiliser V2ResourceResolver pour résoudre la référence
    const resolveResult = await V2ResourceResolver.resolveRef(folderRef, 'folder', userId, context);
    if (!resolveResult.success) {
      return NextResponse.json(
        { error: resolveResult.error },
        { status: resolveResult.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const folderId = resolveResult.id;
    const supabase = createAuthenticatedSupabaseClient(authResult);

    // Récupérer le dossier par son ID résolu
    const { data: folder, error: fetchError } = await supabase
      .from('folders')
      .select('id, name, description, slug, classeur_id, parent_id, created_at, updated_at')
      .eq('id', folderId)
      .eq('user_id', userId)
      .single();

    if (fetchError) {
      logApi.info(`❌ Erreur récupération dossier: ${fetchError.message}`, context);
      return NextResponse.json(
        { error: 'Dossier non trouvé' },
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const apiTime = Date.now() - startTime;
    logApi.info(`✅ Dossier récupéré avec succès en ${apiTime}ms`, context);

    return NextResponse.json({
      success: true,
      folder
    });

  } catch (err: unknown) {
    const error = err as Error;
    logApi.info(`❌ Erreur serveur: ${error}`, context);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { ref: string } }
): Promise<NextResponse> {
  const startTime = Date.now();
  const clientType = request.headers.get('X-Client-Type') || 'unknown';
  const context = {
    operation: 'v2_folder_update',
    component: 'API_V2',
    clientType,
    ref: params.ref
  };

  logApi.info('🚀 Début modification dossier v2', context);

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
  const folderRef = params.ref;

  try {
    // Récupérer le corps de la requête
    const body = await request.json();
    const { name, description, classeur_id, parent_id } = body;

    // Créer le bon client Supabase selon le type d'authentification
    const supabase = createAuthenticatedSupabaseClient(authResult);

    // 🔧 CORRECTION: Utiliser V2ResourceResolver pour résoudre la référence
    const resolveResult = await V2ResourceResolver.resolveRef(folderRef, 'folder', userId, context);
    if (!resolveResult.success) {
      return NextResponse.json(
        { error: resolveResult.error },
        { status: resolveResult.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const folderId = resolveResult.id;

    // Préparer les données de mise à jour
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (classeur_id !== undefined) updateData.classeur_id = classeur_id;
    if (parent_id !== undefined) updateData.parent_id = parent_id;


    // Mettre à jour le dossier
    const { data: updatedFolder, error: updateError } = await supabase
      .from('folders')
      .update(updateData)
      .eq('id', folderId)
      .select()
      .single();

    if (updateError) {
      logApi.info(`❌ Erreur mise à jour: ${updateError.message}`, context);
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour' },
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const apiTime = Date.now() - startTime;
    logApi.info(`✅ Dossier mis à jour avec succès en ${apiTime}ms`, context);

    return NextResponse.json({
      success: true,
      folder: updatedFolder
    });

  } catch (err: unknown) {
    const error = err as Error;
    logApi.info(`❌ Erreur serveur: ${error}`, context);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}


