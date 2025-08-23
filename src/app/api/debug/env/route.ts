import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Seulement en mode développement
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'Endpoint disponible seulement en développement' },
      { status: 403 }
    );
  }

  return NextResponse.json({
    success: true,
    env: {
      NODE_ENV: process.env.NODE_ENV,
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Configuré' : 'Non configuré',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Configuré' : 'Non configuré',
      GROQ_API_KEY: process.env.GROQ_API_KEY ? 'Configuré' : 'Non configuré',
    }
  });
} 