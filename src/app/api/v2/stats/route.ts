import { NextRequest, NextResponse } from 'next/server';

import { logApi } from '@/utils/logger';
import { getAuthenticatedUser, createAuthenticatedSupabaseClient } from '@/utils/authUtils';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const clientType = request.headers.get('X-Client-Type') || 'unknown';
  const context = {
    operation: 'v2_user_stats',
    component: 'API_V2',
    clientType
  };

  logApi.info('🚀 Début récupération statistiques v2', context);

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

  try {
    // Créer un client Supabase standard
    const supabase = createAuthenticatedSupabaseClient(authResult);

    // Récupérer les statistiques en parallèle
    const [
      notesCount,
      publishedNotesCount,
      classeursCount,
      foldersCount,
      contentSize
    ] = await Promise.all([
      // Nombre total de notes
      supabase
        .from('articles')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId),
      
      // Nombre de notes publiées
      supabase
        .from('articles')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('share_settings->>visibility', 'public'),
      
      // Nombre total de classeurs
      supabase
        .from('classeurs')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId),
      
      // Nombre total de dossiers
      supabase
        .from('folders')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId),
      
      // Taille totale du contenu (approximative)
      supabase
        .from('articles')
        .select('markdown_content')
        .eq('user_id', userId)
    ]);

    // Calculer la taille totale du contenu
    let totalContentSize = 0;
    if (contentSize.data) {
      totalContentSize = contentSize.data.reduce((total, article) => {
        return total + (article.markdown_content?.length || 0);
      }, 0);
    }

    const stats = {
      total_notes: notesCount.count || 0,
      published_notes: publishedNotesCount.count || 0,
      total_classeurs: classeursCount.count || 0,
      total_folders: foldersCount.count || 0,
      total_content_size: totalContentSize
    };

    const apiTime = Date.now() - startTime;
    logApi.info(`✅ Statistiques récupérées en ${apiTime}ms`, context);

    return NextResponse.json({
      success: true,
      stats
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
