import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/utils/authUtils';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('🔍 Debug Auth - Variables d\'environnement:');
    console.log(`   SCRIVIA_API_KEYS: ${process.env.SCRIVIA_API_KEYS}`);
    console.log(`   SCRIVIA_DEFAULT_USER_ID: ${process.env.SCRIVIA_DEFAULT_USER_ID}`);
    
    // Test avec clé d'API
    const apiKey = request.headers.get('X-API-Key');
    console.log(`   X-API-Key: ${apiKey}`);
    
    if (apiKey) {
      console.log('🔍 Test de getAuthenticatedUser avec clé d\'API...');
      const result = await getAuthenticatedUser(request);
      
      console.log('📊 Résultat getAuthenticatedUser:');
      console.log(JSON.stringify(result, null, 2));
      
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
    console.error('❌ Erreur debug auth:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
