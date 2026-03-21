import { NextRequest, NextResponse } from 'next/server';
import { logApi } from '@/utils/logger';

/**
 * Endpoint de test ultra simple pour diagnostiquer Vercel
 */
export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  
  logApi.debug('🔍 [TEST-PROD] GET appelé', { timestamp });
  
  return NextResponse.json({
    success: true,
    message: 'Endpoint de test fonctionnel',
    timestamp,
    env: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    }
  });
}

export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString();
  
  try {
    const body = await request.json().catch(() => ({}));
    const headers = Object.fromEntries(request.headers.entries());
    
    logApi.debug('🔍 [TEST-PROD] POST appelé', {
      timestamp,
      headerKeys: Object.keys(headers),
      bodyKeys: body && typeof body === 'object' && !Array.isArray(body) ? Object.keys(body as object) : [],
    });
    
    return NextResponse.json({
      success: true,
      message: 'POST reçu avec succès',
      timestamp,
      receivedHeaders: Object.keys(headers),
      receivedBody: body,
      env: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL: process.env.VERCEL,
        hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        serviceRoleKeyStart: process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20) || 'ABSENT'
      }
    });
  } catch (error) {
    logApi.error('🔍 [TEST-PROD] Erreur', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
      timestamp
    }, { status: 500 });
  }
}

