import { NextRequest, NextResponse } from 'next/server';
import { logApi } from '@/utils/logger';

/**
 * 🔥 ENDPOINT DE FORCE LOG - Ultra simple
 * Force les logs dans la réponse pour les voir dans le navigateur
 */
export async function GET() {
  const timestamp = new Date().toISOString();
  
  // Utiliser logger structuré
  logApi.info('🔥 [FORCE-LOG] GET appelé', { timestamp });
  
  return NextResponse.json({
    success: true,
    message: 'Force log GET',
    timestamp,
    env: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      VERCEL_URL: process.env.VERCEL_URL,
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    }
  });
}

export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString();
  
  // Utiliser logger structuré
  logApi.info('🔥 [FORCE-LOG] POST appelé', { timestamp });
  
  try {
    const body = await request.json().catch(() => ({}));
    const headers = Object.fromEntries(request.headers.entries());
    
    logApi.debug('🔥 [FORCE-LOG] Headers reçus', { 
      headerKeys: Object.keys(headers),
      timestamp 
    });
    logApi.debug('🔥 [FORCE-LOG] Body reçu', { 
      bodyKeys: Object.keys(body as Record<string, unknown>),
      timestamp 
    });
    
    return NextResponse.json({
      success: true,
      message: 'Force log POST',
      timestamp,
      headers: Object.keys(headers),
      body,
      env: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL: process.env.VERCEL,
        VERCEL_URL: process.env.VERCEL_URL,
        NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
        hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      }
    });
  } catch (error) {
    logApi.error('🔥 [FORCE-LOG] Erreur', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp
    }, { status: 500 });
  }
}
