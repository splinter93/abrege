import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/utils/authUtils';
import { logApi } from '@/utils/logger';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    logApi.debug('🔍 Debug Auth - Variables d\'environnement', {
      hasScriviaApiKeys: !!process.env.SCRIVIA_API_KEYS,
      hasDefaultUserId: !!process.env.SCRIVIA_DEFAULT_USER_ID,
    });
    
    // Test avec clé d'API
    const apiKey = request.headers.get('X-API-Key');
    logApi.debug('🔍 Debug Auth - X-API-Key header', {
      hasApiKey: !!apiKey,
      apiKeyLength: apiKey?.length || 0,
    });
    
    if (apiKey) {
      logApi.debug('🔍 Test de getAuthenticatedUser avec clé d\'API');
      const result = await getAuthenticatedUser(request);
      
      logApi.debug('📊 Résultat getAuthenticatedUser', {
        success: result.success,
        hasUserId: !!result.userId,
        hasScopes: !!result.scopes,
      });
      
      return NextResponse.json({
        success: true,
        environment: {
          SCRIVIA_API_KEYS: process.env.SCRIVIA_API_KEYS,
          SCRIVIA_DEFAULT_USER_ID: process.env.SCRIVIA_DEFAULT_USER_ID
        },
        request: {
          apiKey: apiKey,
          headers: Object.fromEntries(request.headers.entries())
        },
        authResult: result
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'X-API-Key header manquant',
        environment: {
          SCRIVIA_API_KEYS: process.env.SCRIVIA_API_KEYS,
          SCRIVIA_DEFAULT_USER_ID: process.env.SCRIVIA_DEFAULT_USER_ID
        }
      });
    }
    
  } catch (error) {
    logApi.error('❌ Erreur debug auth', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
