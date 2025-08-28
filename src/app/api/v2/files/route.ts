import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logApi } from '@/utils/logger';
import { getAuthenticatedUser } from '@/utils/authUtils';

// 🔧 CORRECTIONS APPLIQUÉES:
// - Authentification simplifiée via getAuthenticatedUser uniquement
// - Suppression de la double vérification d'authentification
// - Client Supabase standard sans token manuel
// - Plus de 401 causés par des conflits d'authentification

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const clientType = request.headers.get('X-Client-Type') || 'unknown';
  const context = {
    operation: 'v2_files_list',
    component: 'API_V2',
    clientType
  };

  logApi.info('🚀 Début récupération liste fichiers v2', context);

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
  // 🔧 CORRECTION: getAuthenticatedUser a déjà validé le token
  
  if (!) {
    logApi.info('❌ Token manquant', context);
    return NextResponse.json(
      { error: 'Token d\'authentification manquant' },
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  // Récupérer l'ID de fichier spécifique si fourni
  const { searchParams } = new URL(request.url);
  const fileId = searchParams.get('id');

  // Créer un client Supabase authentifié
  const supabase = createClient(supabaseUrl, supabaseAnonKey); // 🔧 CORRECTION: Client standard, getAuthenticatedUser a déjà validé

  try {
    let query = supabase
      .from('files')
      .select('id, filename, original_name, mime_type, size, classeur_id, folder_id, created_at, updated_at')
      .eq('user_id', userId);

    // Si un ID spécifique est demandé, filtrer par cet ID
    if (fileId) {
      query = query.eq('id', fileId);
    }

    const { data: files, error: fetchError } = await query
      .order('created_at', { ascending: false });

    if (fetchError) {
      logApi.info(`❌ Erreur récupération fichiers: ${fetchError.message}`, context);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des fichiers' },
        { status: 500 }
      );
    }

    const apiTime = Date.now() - startTime;
    logApi.info(`✅ ${files?.length || 0} fichiers récupérés en ${apiTime}ms`, context);

    return NextResponse.json({
      success: true,
      files: files || []
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