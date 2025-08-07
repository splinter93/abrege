import { NextResponse } from 'next/server';

export async function GET() {
  // Retourner les variables d'environnement (sans les valeurs complètes pour la sécurité)
  const envVars = {
    GROQ_API_KEY: process.env.GROQ_API_KEY ? `${process.env.GROQ_API_KEY.substring(0, 10)}...` : 'Non défini',
    TOGETHER_API_KEY: process.env.TOGETHER_API_KEY ? `${process.env.TOGETHER_API_KEY.substring(0, 10)}...` : 'Non défini',
    DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY ? `${process.env.DEEPSEEK_API_KEY.substring(0, 10)}...` : 'Non défini',
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? `${process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 20)}...` : 'Non défini',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? `${process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 10)}...` : 'Non défini',
    NODE_ENV: process.env.NODE_ENV,
    // Vérifier si les variables sont définies
    GROQ_API_KEY_DEFINED: !!process.env.GROQ_API_KEY,
    TOGETHER_API_KEY_DEFINED: !!process.env.TOGETHER_API_KEY,
    DEEPSEEK_API_KEY_DEFINED: !!process.env.DEEPSEEK_API_KEY,
  };

  return NextResponse.json(envVars);
} 