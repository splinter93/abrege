import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, createAuthenticatedSupabaseClient } from '@/utils/authUtils';
import { logApi } from '@/utils/logger';

/**
 * Endpoint de test pour diagnostiquer les problèmes d'authentification
 * GET /api/v2/debug/auth-test
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const context = {
    operation: 'v2_debug_auth_test',
    component: 'API_V2_DEBUG'
  };

  logApi.info('🔍 Début test authentification', context);

  try {
    // 🔐 Authentification
    const authResult = await getAuthenticatedUser(request);
    
    if (!authResult.success) {
      logApi.info(`❌ Authentification échouée: ${authResult.error}`, context);
      return NextResponse.json(
        { 
          success: false,
          error: authResult.error,
          status: authResult.status || 401,
          debug: {
            headers: Object.fromEntries(request.headers.entries()),
            authType: 'none'
          }
        },
        { status: authResult.status || 401 }
      );
    }

    // ✅ Authentification réussie
    logApi.info(`✅ Authentification réussie: ${authResult.authType}`, context);

    // Tester l'accès à la base de données
    try {
      const supabase = createAuthenticatedSupabaseClient(authResult);
      
      // Test simple : récupérer le profil utilisateur
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('id, email, username')
        .eq('id', authResult.userId)
        .single();

      if (profileError) {
        logApi.info(`⚠️ Erreur accès profil: ${profileError.message}`, context);
        return NextResponse.json({
          success: true,
          auth: {
            type: authResult.authType,
            userId: authResult.userId,
            scopes: authResult.scopes
          },
          database: {
            status: 'error',
            error: profileError.message,
            code: profileError.code
          },
          debug: {
            headers: Object.fromEntries(request.headers.entries()),
            message: 'Authentification OK mais erreur base de données'
          }
        });
      }

      // Test réussi
      logApi.info(`✅ Test base de données réussi`, context);
      return NextResponse.json({
        success: true,
        auth: {
          type: authResult.authType,
          userId: authResult.userId,
          scopes: authResult.scopes
        },
        database: {
          status: 'success',
          userProfile: {
            id: userProfile.id,
            email: userProfile.email,
            username: userProfile.username
          }
        },
        debug: {
          headers: Object.fromEntries(request.headers.entries()),
          message: 'Tout fonctionne correctement'
        }
      });

    } catch (dbError) {
      logApi.info(`❌ Erreur création client Supabase: ${dbError}`, context);
      return NextResponse.json({
        success: false,
        auth: {
          type: authResult.authType,
          userId: authResult.userId,
          scopes: authResult.scopes
        },
        database: {
          status: 'error',
          error: dbError instanceof Error ? dbError.message : String(dbError)
        },
        debug: {
          headers: Object.fromEntries(request.headers.entries()),
          message: 'Erreur lors de la création du client Supabase'
        }
      }, { status: 500 });
    }

  } catch (error) {
    logApi.error(`❌ Erreur inattendue: ${error}`, context);
    return NextResponse.json({
      success: false,
      error: 'Erreur inattendue lors du test d\'authentification',
      debug: {
        headers: Object.fromEntries(request.headers.entries()),
        stack: error instanceof Error ? error.stack : 'Pas de stack trace'
      }
    }, { status: 500 });
  }
}

/**
 * POST - Test avec données
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const context = {
    operation: 'v2_debug_auth_test_post',
    component: 'API_V2_DEBUG'
  };

  try {
    const body = await request.json();
    const { test_operation } = body;

    // 🔐 Authentification
    const authResult = await getAuthenticatedUser(request);
    
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status || 401 }
      );
    }

    // Tester différentes opérations selon le paramètre
    const supabase = createAuthenticatedSupabaseClient(authResult);
    
    switch (test_operation) {
      case 'test_notes':
        // Test récupération des notes
        const { data: notes, error: notesError } = await supabase
          .from('articles')
          .select('id, source_title')
          .eq('user_id', authResult.userId)
          .limit(5);

        if (notesError) {
          return NextResponse.json({
            success: false,
            operation: 'test_notes',
            error: notesError.message,
            code: notesError.code
          });
        }

        return NextResponse.json({
          success: true,
          operation: 'test_notes',
          count: notes?.length || 0,
          notes: notes || []
        });

      case 'test_classeurs':
        // Test récupération des classeurs
        const { data: classeurs, error: classeursError } = await supabase
          .from('classeurs')
          .select('id, name')
          .eq('user_id', authResult.userId)
          .limit(5);

        if (classeursError) {
          return NextResponse.json({
            success: false,
            operation: 'test_classeurs',
            error: classeursError.message,
            code: classeursError.code
          });
        }

        return NextResponse.json({
          success: true,
          operation: 'test_classeurs',
          count: classeurs?.length || 0,
          classeurs: classeurs || []
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Opération de test non reconnue',
          supported_operations: ['test_notes', 'test_classeurs']
        }, { status: 400 });
    }

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Erreur lors du test POST',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

