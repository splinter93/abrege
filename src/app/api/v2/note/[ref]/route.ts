import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logApi } from '@/utils/logger';
import { getAuthenticatedUser, createAuthenticatedSupabaseClient } from '@/utils/authUtils';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(
  request: NextRequest,
  { params }: { params: { ref: string } }
): Promise<NextResponse> {
  const startTime = Date.now();
  const clientType = request.headers.get('X-Client-Type') || 'unknown';
  const context = {
    operation: 'v2_note_get',
    component: 'API_V2',
    clientType,
    ref: params.ref
  };

  logApi.info('🚀 Début récupération note v2', context);

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
  const noteRef = params.ref;

  try {
    // Créer un client Supabase standard
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Construire la requête - le ref peut être un ID UUID ou un slug
    let query = supabase
      .from('articles')
      .select('id, source_title, slug, folder_id, classeur_id, created_at, updated_at, is_published, markdown_content')
      .eq('user_id', userId);

    // Essayer d'abord comme UUID, puis comme slug
    const { data: note, error: fetchError } = await query
      .or(`id.eq.${noteRef},slug.eq.${noteRef}`)
      .single();

    if (fetchError) {
      logApi.info(`❌ Erreur récupération note: ${fetchError.message}`, context);
      return NextResponse.json(
        { error: 'Note non trouvée' },
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const apiTime = Date.now() - startTime;
    logApi.info(`✅ Note récupérée avec succès en ${apiTime}ms`, context);

    return NextResponse.json({
      success: true,
      note
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
    operation: 'v2_note_update',
    component: 'API_V2',
    clientType,
    ref: params.ref
  };

  logApi.info('🚀 Début modification note v2', context);

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
  const noteRef = params.ref;

  try {
    // Récupérer le corps de la requête
    const body = await request.json();
    const { source_title, markdown_content, folder_id, classeur_id, is_published } = body;

    // Créer un client Supabase standard
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Vérifier que la note existe et appartient à l'utilisateur
    let query = supabase
      .from('articles')
      .select('id')
      .eq('user_id', userId);

    const { data: existingNote, error: fetchError } = await query
      .or(`id.eq.${noteRef},slug.eq.${noteRef}`)
      .single();

    if (fetchError) {
      logApi.info(`❌ Note non trouvée: ${fetchError.message}`, context);
      return NextResponse.json(
        { error: 'Note non trouvée' },
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Préparer les données de mise à jour
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (source_title !== undefined) updateData.source_title = source_title;
    if (markdown_content !== undefined) updateData.markdown_content = markdown_content;
    if (folder_id !== undefined) updateData.folder_id = folder_id;
    if (classeur_id !== undefined) updateData.classeur_id = classeur_id;
    if (is_published !== undefined) updateData.is_published = is_published;

    // Mettre à jour la note
    const { data: updatedNote, error: updateError } = await supabase
      .from('articles')
      .update(updateData)
      .eq('id', existingNote.id)
      .select()
      .single();

    if (updateError) {
      logApi.info(`❌ Erreur mise à jour note: ${updateError.message}`, context);
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour de la note' },
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const apiTime = Date.now() - startTime;
    logApi.info(`✅ Note modifiée avec succès en ${apiTime}ms`, context);

    return NextResponse.json({
      success: true,
      note: updatedNote
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
    operation: 'v2_note_delete',
    component: 'API_V2',
    clientType,
    ref: params.ref
  };

  logApi.info('🚀 Début suppression note v2', context);

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
  const noteRef = params.ref;

  try {
    // Créer le bon client Supabase selon le type d'authentification
    const supabase = createAuthenticatedSupabaseClient(authResult);

    // Vérifier que la note existe et appartient à l'utilisateur
    let query = supabase
      .from('articles')
      .select('id')
      .eq('user_id', userId);

    const { data: existingNote, error: fetchError } = await query
      .or(`id.eq.${noteRef},slug.eq.${noteRef}`)
      .single();

    if (fetchError) {
      logApi.info(`❌ Note non trouvée: ${fetchError.message}`, context);
      return NextResponse.json(
        { error: 'Note non trouvée' },
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Supprimer la note
    const { error: deleteError } = await supabase
      .from('articles')
      .delete()
      .eq('id', existingNote.id);

    if (deleteError) {
      logApi.info(`❌ Erreur suppression note: ${deleteError.message}`, context);
      return NextResponse.json(
        { error: 'Erreur lors de la suppression de la note' },
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const apiTime = Date.now() - startTime;
    logApi.info(`✅ Note supprimée avec succès en ${apiTime}ms`, context);

    return NextResponse.json({
      success: true,
      message: 'Note supprimée avec succès'
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
