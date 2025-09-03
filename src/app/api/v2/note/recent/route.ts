import { NextRequest, NextResponse } from 'next/server';
import { logApi } from '@/utils/logger';
import { getAuthenticatedUser } from '@/utils/authUtils';
import { createSupabaseClient } from '@/utils/supabaseClient';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const clientType = request.headers.get('X-Client-Type') || 'unknown';
  const context = {
    operation: 'v2_notes_recent',
    component: 'API_V2',
    clientType
  };

  logApi.info('🚀 Début récupération notes récentes V2', context);

  // 🔐 Authentification V2
  const authResult = await getAuthenticatedUser(request);
  if (!authResult.success) {
    logApi.info(`❌ Authentification échouée: ${authResult.error}`, context);
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status || 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const userId = authResult.userId!;
  const supabase = createSupabaseClient();

  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') || '50';
    const limitNum = parseInt(limit, 10);

    // ✅ Récupération sécurisée des notes de l'utilisateur uniquement
    const { data: notes, error } = await supabase
      .from('articles')
      .select(`
        id,
        source_title,
        slug,
        public_url,
        header_image,
        created_at,
        updated_at,
        share_settings,
        user_id,
        classeur_id,
        folder_id,
        markdown_content
      `)
      .eq('user_id', userId)
      .is('trashed_at', null) // 🔧 CORRECTION: Exclure les notes supprimées
      .order('updated_at', { ascending: false })
      .limit(limitNum);

    if (error) {
      logApi.info(`❌ Erreur Supabase: ${error.message}`, context);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des notes', details: error.message },
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // ✅ Format compatible avec Zustand
    const formattedNotes = notes?.map(note => ({
      id: note.id,
      source_title: note.source_title || 'Sans titre',
      slug: note.slug,
      public_url: note.public_url,
      header_image: note.header_image,
      created_at: note.created_at,
      updated_at: note.updated_at,
      share_settings: note.share_settings || { visibility: 'private' },
      user_id: note.user_id,
      classeur_id: note.classeur_id,
      folder_id: note.folder_id,
      markdown_content: note.markdown_content
    })) || [];

    const apiTime = Date.now() - startTime;
    logApi.info(`✅ ${formattedNotes.length} notes récupérées en ${apiTime}ms`, context);

    return NextResponse.json({
      success: true,
      notes: formattedNotes
    });

  } catch (err: unknown) {
    const error = err as Error;
    logApi.info(`❌ Erreur serveur: ${error}`, context);
    return NextResponse.json(
      { error: 'Erreur interne du serveur', details: error.message },
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

/**
 * GET - Informations sur l'endpoint
 */
export async function HEAD() {
  return new Response(
    JSON.stringify({
      endpoint: '/api/v2/note/recent',
      method: 'GET',
      description: 'Récupère les notes récentes triées par updated_at (API v2)',
      api_version: 'v2',
      parameters: {
        limit: 'Nombre maximum de notes à récupérer (défaut: 10)',
        username: 'Filtrer par nom d\'utilisateur (optionnel)'
      },
      response_format: {
        success: 'boolean',
        notes: 'array de notes récentes',
        total: 'nombre total de notes retournées',
        metadata: 'informations sur la requête'
      },
      llm_compatible: true, // Endpoint compatible LLM
      notes: 'Cet endpoint peut être utilisé dans les tools OpenAPI pour les LLM'
    }),
    { 
      status: 200, 
      headers: { "Content-Type": "application/json" } 
    }
  );
} 