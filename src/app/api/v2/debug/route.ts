import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logApi } from '@/utils/logger';
import { getAuthenticatedUser } from '@/utils/authUtils';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

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
  
  // Récupérer le token d'authentification
  const authHeader = request.headers.get('Authorization');
  const userToken = authHeader?.substring(7);
  
  if (!userToken) {
    logApi.info('❌ Token manquant', context);
    return NextResponse.json(
      { error: 'Token d\'authentification manquant' },
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  // Créer un client Supabase authentifié
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${userToken}`
      }
    }
  });

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
        sample: classeurs || []
      };
    } catch (e) {
      debugInfo.classeurs = { error: e.message };
    }

    // Vérifier la table folders
    try {
      const { data: folders, error: foldersError } = await supabase
        .from('folders')
        .select('id, name, classeur_id, user_id')
        .eq('user_id', userId)
        .limit(5);
      
      debugInfo.folders = {
        count: folders?.length || 0,
        error: foldersError?.message || null,
        sample: folders || []
      };
    } catch (e) {
      debugInfo.folders = { error: e.message };
    }

    // Vérifier la table articles
    try {
      const { data: articles, error: articlesError } = await supabase
        .from('articles')
        .select('id, source_title, classeur_id, folder_id, user_id')
        .eq('user_id', userId)
        .limit(5);
      
      debugInfo.articles = {
        count: articles?.length || 0,
        error: articlesError?.message || null,
        sample: articles || []
      };
    } catch (e) {
      debugInfo.articles = { error: e.message };
    }

    const apiTime = Date.now() - startTime;
    logApi.info(`✅ Debug terminé en ${apiTime}ms`, context);

    return NextResponse.json({
      success: true,
      debug: debugInfo
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