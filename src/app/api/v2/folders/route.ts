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
    operation: 'v2_folders_list',
    component: 'API_V2',
    clientType
  };

  logApi.info('🚀 Début récupération liste dossiers v2', context);

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
  
  // Récupérer l'ID de dossier spécifique si fourni
  const { searchParams } = new URL(request.url);
  const folderId = searchParams.get('id');

  // Créer un client Supabase standard (l'authentification est déjà validée)
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    let query = supabase
      .from('folders')
      .select('id, name, description, parent_id, classeur_id, created_at, updated_at')
      .eq('user_id', userId);

    // Si un ID spécifique est demandé, filtrer par cet ID
    if (folderId) {
      query = query.eq('id', folderId);
    }

    const { data: folders, error: fetchError } = await query
      .order('name', { ascending: true });

    if (fetchError) {
      logApi.info(`❌ Erreur récupération dossiers: ${fetchError.message}`, context);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des dossiers' },
        { status: 500 }
      );
    }

    const apiTime = Date.now() - startTime;
    logApi.info(`✅ ${folders?.length || 0} dossiers récupérés en ${apiTime}ms`, context);

    return NextResponse.json({
      success: true,
      folders: folders || []
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