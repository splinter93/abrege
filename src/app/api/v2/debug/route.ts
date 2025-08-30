import { NextRequest, NextResponse } from 'next/server';

import { logApi } from '@/utils/logger';
import { getAuthenticatedUser, createAuthenticatedSupabaseClient } from '@/utils/authUtils';

// 🔧 CORRECTIONS APPLIQUÉES:
// - Authentification simplifiée via getAuthenticatedUser uniquement
// - Suppression de la double vérification d'authentification
// - Client Supabase standard sans token manuel
// - Plus de 401 causés par des conflits d'authentification

export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const clientType = request.headers.get('X-Client-Type') || 'unknown';
  const context = {
    operation: 'v2_debug',
    component: 'API_V2',
    clientType
  };

  logApi.info('🚀 Début debug base de données', context);

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

  try {
    // Vérifier la structure des tables
    const debugInfo: any = {};

    // Vérifier la table classeurs
    try {
      const { data: classeurs, error: classeursError } = await supabase
        .from('classeurs')
        .select('id, name, user_id')
        .eq('user_id', userId)
        .limit(5);
      
      debugInfo.classeurs = {
        count: classeurs?.length || 0,
        error: classeursError?.message || null,
        sample: classeurs?.slice(0, 3) || []
      };
    } catch (error) {
      debugInfo.classeurs = { error: 'Erreur lors de la vérification' };
    }

    // Vérifier la table dossiers
    try {
      const { data: folders, error: foldersError } = await supabase
        .from('folders')
        .select('id, name, user_id, classeur_id')
        .eq('user_id', userId)
        .limit(5);
      
      debugInfo.folders = {
        count: folders?.length || 0,
        error: foldersError?.message || null,
        sample: folders?.slice(0, 3) || []
      };
    } catch (error) {
      debugInfo.folders = { error: 'Erreur lors de la vérification' };
    }

    // Vérifier la table articles
    try {
      const { data: articles, error: articlesError } = await supabase
        .from('articles')
        .select('id, source_title, user_id, classeur_id')
        .eq('user_id', userId)
        .limit(5);
      
      debugInfo.articles = {
        count: articles?.length || 0,
        error: articlesError?.message || null,
        sample: articles?.slice(0, 3) || []
      };
    } catch (error) {
      debugInfo.articles = { error: 'Erreur lors de la vérification' };
    }

    // Vérifier la table users
    try {
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, username, email')
        .eq('id', userId)
        .single();
      
      debugInfo.user = {
        found: !!user,
        error: userError?.message || null,
        data: user || null
      };
    } catch (error) {
      debugInfo.user = { error: 'Erreur lors de la vérification' };
    }

    const apiTime = Date.now() - startTime;
    logApi.info(`✅ Debug terminé en ${apiTime}ms`, context);

    return NextResponse.json({
      success: true,
      debug: debugInfo,
      timestamp: new Date().toISOString()
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