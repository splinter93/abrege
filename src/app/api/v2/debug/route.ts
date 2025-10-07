import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, createAuthenticatedSupabaseClient, extractTokenFromRequest } from '@/utils/authUtils';
import { logApi } from '@/utils/logger';

export async function GET(request: NextRequest) {
  const context = {
    operation: 'v2_debug',
    component: 'API_V2_DEBUG'
  };

  try {
    logApi.info('🔍 Début debug authentification', context);

    // 1. Vérifier les variables d'environnement
    const envCheck = {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...',
      serviceRoleKeyPrefix: process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20) + '...'
    };

    logApi.info('🔧 Variables d\'environnement:', { ...context, envCheck });

    // 2. Tester l'authentification
    const authResult = await getAuthenticatedUser(request);
    logApi.info('🔐 Résultat authentification:', { ...context, authResult });

    // 3. Si authentification réussie, tester le client Supabase
    let supabaseTest = null;
    if (authResult.success) {
      try {
  const userToken = extractTokenFromRequest(request);
        const supabase = createAuthenticatedSupabaseClient(authResult, userToken || undefined);
        const { data, error } = await supabase
          .from('articles')
          .select('id')
          .limit(1);
        
        supabaseTest = {
          success: !error,
          error: error?.message || null,
          dataCount: data?.length || 0
        };
      } catch (supabaseError) {
        supabaseTest = {
          success: false,
          error: supabaseError instanceof Error ? supabaseError.message : 'Unknown error'
        };
      }
    }

    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      environment: envCheck,
      authentication: authResult,
      supabaseTest,
      headers: {
        'X-API-Key': request.headers.get('X-API-Key') ? 'Present' : 'Missing',
        'Authorization': request.headers.get('Authorization') ? 'Present' : 'Missing',
        'X-Client-Type': request.headers.get('X-Client-Type') || 'Missing'
      }
    };

    logApi.info('✅ Debug terminé', { ...context, response });

    return NextResponse.json(response);

  } catch (error) {
    logApi.error('❌ Erreur debug:', { ...context, error });
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
