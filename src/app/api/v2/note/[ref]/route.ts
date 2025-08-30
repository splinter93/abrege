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

  // Récupérer le paramètre fields pour déterminer ce qui doit être retourné
  const { searchParams } = new URL(request.url);
  const fields = searchParams.get('fields') || 'all'; // all, content, metadata

  try {
    // 🔧 CORRECTION: Utiliser V2ResourceResolver comme l'endpoint content
    const resolveResult = await V2ResourceResolver.resolveRef(noteRef, 'note', userId, context);
    if (!resolveResult.success) {
      return NextResponse.json(
        { error: resolveResult.error },
        { status: resolveResult.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const noteId = resolveResult.id;
    const supabase = createAuthenticatedSupabaseClient(authResult);

    // Construire la requête selon le paramètre fields
    let selectFields: string;
    let responseNote: any;

    switch (fields) {
      case 'content':
        // Mode content : champs socle + contenu + rendu
        selectFields = 'id, source_title, slug, header_image, markdown_content, html_content, created_at, updated_at';
        break;
      
      case 'metadata':
        // Mode metadata : champs socle + organisation + permissions
        selectFields = 'id, source_title, slug, header_image, folder_id, classeur_id, created_at, updated_at, share_settings';
        break;
      
      case 'all':
      default:
        // Mode all : tout (champs socle inclus)
        selectFields = 'id, source_title, slug, header_image, folder_id, classeur_id, created_at, updated_at, share_settings, markdown_content';
        break;
    }

    // Récupérer la note avec les champs appropriés
    const { data: note, error: fetchError } = await supabase
      .from('articles')
      .select(selectFields)
      .eq('id', noteId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !note) {
      logApi.info(`❌ Erreur récupération note: ${fetchError?.message || 'Note non trouvée'}`, context);
      return NextResponse.json(
        { error: 'Note non trouvée' },
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Formater la réponse selon le mode
    const noteData = note as any; // Type assertion pour éviter les erreurs TypeScript
    
    // Champs socle toujours présents
    const baseFields = {
      id: noteData.id,
      title: noteData.source_title,
      slug: noteData.slug,
      header_image: noteData.header_image
    };
    
    switch (fields) {
      case 'content':
        responseNote = {
          ...baseFields,
          markdown_content: noteData.markdown_content,
          html_content: noteData.html_content,
          created_at: noteData.created_at,
          updated_at: noteData.updated_at
        };
        break;
      
      case 'metadata':
        responseNote = {
          ...baseFields,
          folder_id: noteData.folder_id,
          classeur_id: noteData.classeur_id,
          created_at: noteData.created_at,
          updated_at: noteData.updated_at,
          share_settings: noteData.share_settings
        };
        break;
      
      case 'all':
      default:
        responseNote = {
          ...baseFields,
          folder_id: noteData.folder_id,
          classeur_id: noteData.classeur_id,
          created_at: noteData.created_at,
          updated_at: noteData.updated_at,
          share_settings: noteData.share_settings,
          markdown_content: noteData.markdown_content
        };
        break;
    }

    const apiTime = Date.now() - startTime;
    logApi.info(`✅ Note récupérée avec succès en ${apiTime}ms (mode: ${fields})`, context);

    return NextResponse.json({
      success: true,
      note: responseNote,
      mode: fields
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
    const { source_title, markdown_content, folder_id, classeur_id, share_settings } = body;

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

    // Préparer les données de mise à jour
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (source_title !== undefined) updateData.source_title = source_title;
    if (markdown_content !== undefined) updateData.markdown_content = markdown_content;
    if (folder_id !== undefined) updateData.folder_id = folder_id;
    if (classeur_id !== undefined) updateData.classeur_id = classeur_id;
    if (share_settings !== undefined) updateData.share_settings = share_settings;

    // Mettre à jour la note
    const { data: updatedNote, error: updateError } = await supabase
      .from('articles')
      .update(updateData)
      .eq('id', existingNote.id)
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
    logApi.info(`✅ Note mise à jour avec succès en ${apiTime}ms`, context);

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
      logApi.info(`❌ Erreur suppression: ${deleteError.message}`, context);
      return NextResponse.json(
        { error: 'Erreur lors de la suppression' },
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
