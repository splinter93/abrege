import { NextRequest, NextResponse } from 'next/server';
import { logApi } from '@/utils/logger';
import { getAuthenticatedUser, createAuthenticatedSupabaseClient } from '@/utils/authUtils';

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
    // Créer le bon client Supabase selon le type d'authentification
    const supabase = createAuthenticatedSupabaseClient(authResult);

    // Construire la requête - le ref peut être un ID UUID ou un slug
    let query = supabase
      .from('folders')
      .select('id, name, description, slug, classeur_id, parent_id, created_at, updated_at, is_published')
      .eq('user_id', userId);

    // Essayer d'abord comme UUID, puis comme slug
    const { data: folder, error: fetchError } = await query
      .or(`id.eq.${folderRef},slug.eq.${folderRef}`)
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
    const { name, description, classeur_id, parent_id, is_published } = body;

    // Créer le bon client Supabase selon le type d'authentification
    const supabase = createAuthenticatedSupabaseClient(authResult);

    // Vérifier que le dossier existe et appartient à l'utilisateur
    let query = supabase
      .from('folders')
      .select('id')
      .eq('user_id', userId);

    const { data: existingFolder, error: fetchError } = await query
      .or(`id.eq.${folderRef},slug.eq.${folderRef}`)
      .single();

    if (fetchError) {
      logApi.info(`❌ Dossier non trouvé: ${fetchError.message}`, context);
      return NextResponse.json(
        { error: 'Dossier non trouvé' },
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Préparer les données de mise à jour
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (classeur_id !== undefined) updateData.classeur_id = classeur_id;
    if (parent_id !== undefined) updateData.parent_id = parent_id;
    if (is_published !== undefined) updateData.is_published = is_published;

    // Mettre à jour le dossier
    const { data: updatedFolder, error: updateError } = await supabase
      .from('folders')
      .update(updateData)
      .eq('id', existingFolder.id)
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { ref: string } }
): Promise<NextResponse> {
  const startTime = Date.now();
  const clientType = request.headers.get('X-Client-Type') || 'unknown';
  const context = {
    operation: 'v2_folder_delete',
    component: 'API_V2',
    clientType,
    ref: params.ref
  };

  logApi.info('🚀 Début suppression dossier v2', context);

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
    // Créer le bon client Supabase selon le type d'authentification
    const supabase = createAuthenticatedSupabaseClient(authResult);

    // Vérifier que le dossier existe et appartient à l'utilisateur
    let query = supabase
      .from('folders')
      .select('id')
      .eq('user_id', userId);

    const { data: existingFolder, error: fetchError } = await query
      .or(`id.eq.${folderRef},slug.eq.${folderRef}`)
      .single();

    if (fetchError) {
      logApi.info(`❌ Dossier non trouvé: ${fetchError.message}`, context);
      return NextResponse.json(
        { error: 'Dossier non trouvé' },
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Supprimer le dossier
    const { error: deleteError } = await supabase
      .from('folders')
      .delete()
      .eq('id', existingFolder.id);

    if (deleteError) {
      logApi.info(`❌ Erreur suppression: ${deleteError.message}`, context);
      return NextResponse.json(
        { error: 'Erreur lors de la suppression' },
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const apiTime = Date.now() - startTime;
    logApi.info(`✅ Dossier supprimé avec succès en ${apiTime}ms`, context);

    return NextResponse.json({
      success: true,
      message: 'Dossier supprimé avec succès'
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
