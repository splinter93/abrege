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
  
  // Récupérer l'ID de fichier spécifique si fourni
  const { searchParams } = new URL(request.url);
  const fileId = searchParams.get('id');

  // 🔧 CORRECTION: Client Supabase standard, getAuthenticatedUser a déjà validé
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    let query = supabase
      .from('files')
      .select('id, name, size, mime_type, created_at, updated_at, classeur_id, folder_id')
      .eq('user_id', userId);

    // Filtrer par ID si spécifié
    if (fileId) {
      query = query.eq('id', fileId);
    }

    const { data: files, error: fetchError } = await query.order('created_at', { ascending: false });

    if (fetchError) {
      logApi.info(`❌ Erreur récupération fichiers: ${fetchError.message}`, context);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des fichiers' },
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const apiTime = Date.now() - startTime;
    logApi.info(`✅ ${files?.length || 0} fichiers récupérés en ${apiTime}ms`, context);

    return NextResponse.json({
      success: true,
      files: files || [],
      count: files?.length || 0
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