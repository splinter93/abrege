import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    message: 'Test des variables d\'environnement',
    groqKey: process.env.GROQ_API_KEY ? 'Défini' : 'Non défini',
    togetherKey: process.env.TOGETHER_API_KEY ? 'Défini' : 'Non défini',
    deepseekKey: process.env.DEEPSEEK_API_KEY ? 'Défini' : 'Non défini',
    nodeEnv: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
} 