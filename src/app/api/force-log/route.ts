import { NextRequest, NextResponse } from 'next/server';

/**
 * 🔥 ENDPOINT DE FORCE LOG - Ultra simple
 * Force les logs dans la réponse pour les voir dans le navigateur
 */
export async function GET() {
  const timestamp = new Date().toISOString();
  
  // Force les logs partout
  console.log('🔥 [FORCE-LOG] GET appelé à', timestamp);
  console.error('🔥 [FORCE-LOG] GET appelé à', timestamp);
  process.stdout.write(`🔥 [FORCE-LOG] GET appelé à ${timestamp}\n`);
  process.stderr.write(`🔥 [FORCE-LOG] GET appelé à ${timestamp}\n`);
  
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
  
  // Force les logs partout
  console.log('🔥 [FORCE-LOG] POST appelé à', timestamp);
  console.error('🔥 [FORCE-LOG] POST appelé à', timestamp);
  process.stdout.write(`🔥 [FORCE-LOG] POST appelé à ${timestamp}\n`);
  process.stderr.write(`🔥 [FORCE-LOG] POST appelé à ${timestamp}\n`);
  
  try {
    const body = await request.json().catch(() => ({}));
    const headers = Object.fromEntries(request.headers.entries());
    
    console.log('🔥 [FORCE-LOG] Headers:', headers);
    console.log('🔥 [FORCE-LOG] Body:', body);
    
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
    console.error('🔥 [FORCE-LOG] Erreur:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp
    }, { status: 500 });
  }
}
