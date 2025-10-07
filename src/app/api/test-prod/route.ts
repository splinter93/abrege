import { NextRequest, NextResponse } from 'next/server';

/**
 * Endpoint de test ultra simple pour diagnostiquer Vercel
 */
export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  
  console.log('🔍 [TEST-PROD] Endpoint appelé à', timestamp);
  
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
    
    console.log('🔍 [TEST-PROD] POST appelé à', timestamp);
    console.log('🔍 [TEST-PROD] Headers:', headers);
    console.log('🔍 [TEST-PROD] Body:', body);
    
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
    console.error('🔍 [TEST-PROD] Erreur:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
      timestamp
    }, { status: 500 });
  }
}

