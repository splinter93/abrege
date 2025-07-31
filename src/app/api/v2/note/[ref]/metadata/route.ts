import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logApi } from '@/utils/logger';
import { metadataResponseV2Schema } from '@/utils/v2ValidationSchemas';
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
    operation: 'v2_note_metadata_get',
    component: 'API_V2',
    ref,
    clientType
  };

  logApi('v2_note_metadata_get', `🚀 Début récupération métadonnées note v2 ${ref}`, context);

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
  const resolveResult = await V2ResourceResolver.resolveRef(ref, 'note', userId, context);
  if (!resolveResult.success) {
    return NextResponse.json(
      { error: resolveResult.error },
      { status: resolveResult.status }
    );
  }

  const noteId = resolveResult.id;

  try {
    const { data, error } = await supabase
      .from('articles')
      .select('id, source_title, created_at, updated_at, folder_id, description, visibility, view_count')
      .eq('id', noteId)
      .single();

    if (error) {
      logApi('v2_note_metadata_get', `❌ Erreur DB: ${error.message}`, context);
      return NextResponse.json(
        { error: 'Note non trouvée' },
        { status: 404 }
      );
    }

    if (!data) {
      logApi('v2_note_metadata_get', `❌ Note non trouvée: ${noteId}`, context);
      return NextResponse.json(
        { error: 'Note non trouvée' },
        { status: 404 }
      );
    }

    const response = {
      success: true,
      metadata: {
        source_title: data.source_title,
        created_at: data.created_at,
        updated_at: data.updated_at,
        folder_id: data.folder_id,
        description: data.description,
        visibility: data.visibility || 'private',
        view_count: data.view_count || 0
      }
    };

    // Validation de la réponse
    const validationResult = metadataResponseV2Schema.safeParse(response);
    if (!validationResult.success) {
      logApi('v2_note_metadata_get', `❌ Réponse invalide: ${validationResult.error}`, context);
      return NextResponse.json(
        { error: 'Erreur de validation de la réponse' },
        { status: 500 }
      );
    }

    const apiTime = Date.now() - startTime;
    logApi('v2_note_metadata_get', `✅ Métadonnées récupérées en ${apiTime}ms`, context);

    return NextResponse.json(response);

  } catch (error) {
    logApi('v2_note_metadata_get', `❌ Erreur serveur: ${error}`, context);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
} 