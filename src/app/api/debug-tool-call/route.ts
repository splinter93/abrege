import { NextRequest, NextResponse } from 'next/server';

/**
 * 🔍 ENDPOINT DE DEBUG BRUTAL - Force les logs
 * Envoie aussi les logs dans la réponse pour les voir dans le navigateur
 */
export async function POST(request: NextRequest) {
  const logs: string[] = [];
  const log = (msg: string) => {
    console.log(msg);
    console.error(msg); // Force aussi en stderr
    logs.push(msg);
  };

  try {
    log('🔍 [DEBUG] ==================== DÉBUT DEBUG ====================');
    log(`🔍 [DEBUG] Timestamp: ${new Date().toISOString()}`);
    log(`🔍 [DEBUG] NODE_ENV: ${process.env.NODE_ENV}`);
    log(`🔍 [DEBUG] VERCEL: ${process.env.VERCEL}`);

    // 1. Headers
    const headers = Object.fromEntries(request.headers.entries());
    log(`🔍 [DEBUG] Headers reçus: ${JSON.stringify(Object.keys(headers))}`);
    log(`🔍 [DEBUG] Authorization: ${headers.authorization ? 'PRÉSENT' : 'ABSENT'}`);

    // 2. Variables d'environnement critiques
    const envCheck = {
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      serviceRoleKeyStart: process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 30) || 'ABSENT'
    };
    log(`🔍 [DEBUG] Env check: ${JSON.stringify(envCheck)}`);

    // 3. Body
    let body: any = {};
    try {
      body = await request.json();
      log(`🔍 [DEBUG] Body reçu: ${JSON.stringify(Object.keys(body))}`);
    } catch (e) {
      log(`🔍 [DEBUG] Pas de body JSON`);
    }

    // 4. Test d'authentification simulé
    const authHeader = headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      log(`🔍 [DEBUG] Token présent, longueur: ${token.length}`);
      log(`🔍 [DEBUG] Token début: ${token.substring(0, 30)}...`);
      
      // Est-ce un UUID ?
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token);
      log(`🔍 [DEBUG] Token est UUID: ${isUUID}`);
      
      if (isUUID) {
        log(`🔍 [DEBUG] ✅ Token est un UUID, impersonation possible`);
      } else {
        log(`🔍 [DEBUG] ⚠️ Token est un JWT, validation nécessaire`);
      }
    } else {
      log(`🔍 [DEBUG] ❌ Pas de token Authorization`);
    }

    // 5. Test appel API V2 simulé
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      log(`🔍 [DEBUG] ✅ SERVICE_ROLE_KEY disponible`);
      log(`🔍 [DEBUG] Simulation appel avec SERVICE_ROLE...`);
      
      const testHeaders = {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'X-User-Id': 'test-user-id',
        'X-Service-Role': 'true'
      };
      
      log(`🔍 [DEBUG] Headers de test préparés: ${JSON.stringify(Object.keys(testHeaders))}`);
    } else {
      log(`🔍 [DEBUG] ❌ SERVICE_ROLE_KEY MANQUANTE !`);
    }

    log('🔍 [DEBUG] ==================== FIN DEBUG ====================');

    return NextResponse.json({
      success: true,
      message: 'Debug terminé - Vérifiez les logs',
      logs,
      timestamp: new Date().toISOString(),
      env: envCheck
    });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log(`🔍 [DEBUG] ❌ ERREUR: ${errorMsg}`);
    log(`🔍 [DEBUG] Stack: ${error instanceof Error ? error.stack : 'N/A'}`);

    return NextResponse.json({
      success: false,
      error: errorMsg,
      logs,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

