import { NextRequest, NextResponse } from 'next/server';
import { logApi } from '@/utils/logger';
import { getAuthenticatedUser, createAuthenticatedSupabaseClient, extractTokenFromRequest } from '@/utils/authUtils';
import { V2ResourceResolver } from '@/utils/v2ResourceResolver';

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
    operation: 'v2_note_get',
    component: 'API_V2',
    clientType,
    ref
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
  const noteRef = ref;

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
  const userToken = extractTokenFromRequest(request);
    const supabase = createAuthenticatedSupabaseClient(authResult, userToken || undefined);

    // Construire la requête selon le paramètre fields
    let selectFields: string;
    let responseNote: unknown;

    switch (fields) {
      case 'content':
        // Mode content : champs socle + contenu + rendu
        selectFields = 'id, source_title, slug, public_url, header_image, markdown_content, created_at, updated_at';
        break;
      
      case 'metadata':
        // Mode metadata : champs socle + organisation + permissions
        selectFields = 'id, source_title, slug, public_url, header_image, folder_id, classeur_id, created_at, updated_at, share_settings';
        break;
      
      case 'all':
      default:
        // Mode all : tout (champs socle inclus)
        selectFields = 'id, source_title, slug, public_url, header_image, folder_id, classeur_id, created_at, updated_at, share_settings, markdown_content';
        break;
    }

    // Récupérer la note avec les champs appropriés
    const { data: note, error: fetchError } = await supabase
      .from('articles')
      .select(selectFields)
      .eq('id', noteId)
      .eq('user_id', userId)
      .is('trashed_at', null) // 🔧 CORRECTION: Exclure les notes supprimées
      .single();

    if (fetchError || !note) {
      logApi.info(`❌ Erreur récupération note: ${fetchError?.message || 'Note non trouvée'}`, context);
      return NextResponse.json(
        { error: 'Note non trouvée' },
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Formater la réponse selon le mode
    const noteData = note as Record<string, unknown>;
    
    // Champs socle toujours présents
    const baseFields = {
      id: noteData.id,
      title: noteData.source_title,
      slug: noteData.slug,
      public_url: noteData.public_url,
      header_image: noteData.header_image
    };
    
    switch (fields) {
      case 'content':
        responseNote = {
          ...baseFields,
          markdown_content: noteData.markdown_content,
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




