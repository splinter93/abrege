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
    operation: 'v2_classeurs_list',
    component: 'API_V2',
    clientType
  };

  logApi.info('🚀 Début récupération liste classeurs v2', context);

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
  
  // Créer un client Supabase standard (l'authentification est déjà validée)
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    // Récupérer tous les classeurs de l'utilisateur
    const { data: classeurs, error: fetchError } = await supabase
      .from('classeurs')
      .select('id, name, description, emoji, position, slug, created_at, updated_at')
      .eq('user_id', userId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: false });

    if (fetchError) {
      logApi.info(`❌ Erreur récupération classeurs: ${fetchError.message}`, context);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des classeurs' },
        { status: 500 }
      );
    }

    const apiTime = Date.now() - startTime;
    logApi.info(`✅ ${classeurs?.length || 0} classeurs récupérés en ${apiTime}ms`, context);

    return NextResponse.json({
      success: true,
      classeurs: classeurs || []
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