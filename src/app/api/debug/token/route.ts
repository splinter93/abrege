import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { simpleLogger as logger } from '@/utils/logger';

/**
 * 🔍 ENDPOINT DE DIAGNOSTIC TOKEN
 * 
 * Permet de diagnostiquer les problèmes d'authentification entre local et prod
 * Vérifie le token, la session Supabase, et les variables d'environnement
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const diagnostics: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    platform: process.env.VERCEL ? 'Vercel' : 'Local',
  };

  try {
    // 1. Récupérer le token depuis les headers
    const authHeader = request.headers.get('Authorization');
    diagnostics.authHeader = {
      present: !!authHeader,
      startsWithBearer: authHeader?.startsWith('Bearer '),
      tokenLength: authHeader ? authHeader.replace('Bearer ', '').length : 0,
      tokenStart: authHeader ? authHeader.substring(0, 30) + '...' : null,
    };

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      diagnostics.error = 'Header Authorization manquant ou invalide';
      return NextResponse.json({ diagnostics }, { status: 400 });
    }

    const token = authHeader.replace('Bearer ', '');

    // 2. Vérifier les variables d'environnement
    diagnostics.envVars = {
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      VERCEL_URL: process.env.VERCEL_URL || null,
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || null,
    };

    // 3. Tester le token avec Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    diagnostics.supabaseValidation = {
      success: !!user,
      error: authError?.message || null,
      userId: user?.id || null,
      userEmail: user?.email || null,
      userCreatedAt: user?.created_at || null,
    };

    // 4. Vérifier si c'est un UUID (impersonation d'agent)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    diagnostics.tokenType = {
      isUUID: uuidRegex.test(token),
      isJWT: token.split('.').length === 3,
      length: token.length,
    };

    // 5. Tester la connectivité aux endpoints V2
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    
    diagnostics.apiEndpoints = {
      baseUrl,
      testEndpoint: `${baseUrl}/api/v2/classeurs`,
    };

    // 6. Durée d'exécution
    diagnostics.executionTime = `${Date.now() - startTime}ms`;

    // 7. Log complet pour Vercel
    logger.info('[DEBUG] Diagnostic token complet:', diagnostics);

    return NextResponse.json({
      success: true,
      diagnostics,
      message: 'Diagnostic terminé avec succès',
    });

  } catch (error) {
    diagnostics.fatalError = {
      message: error instanceof Error ? error.message : 'Erreur inconnue',
      stack: error instanceof Error ? error.stack : null,
    };

    logger.error('[DEBUG] Erreur lors du diagnostic:', error);

    return NextResponse.json({
      success: false,
      diagnostics,
      error: 'Erreur lors du diagnostic',
    }, { status: 500 });
  }
}

