import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest): Promise<NextResponse> {
  return NextResponse.json({
    success: true,
    message: 'Endpoint chat - utilisez POST pour les conversations',
    endpoints: {
      '/api/chat/llm': 'Chat avec LLM',
      '/api/v1/chat-sessions': 'Gestion des sessions de chat',
    }
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return NextResponse.json({
    error: 'Utilisez /api/chat/llm pour les conversations avec l\'IA',
    redirectTo: '/api/chat/llm'
  }, { status: 400 });
} 