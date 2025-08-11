import { NextRequest, NextResponse } from 'next/server';
import { simpleLogger as logger } from '@/utils/logger';

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();
    
    logger.dev("[Test Streaming] 🚀 Début test DeepSeek");
    
    const payload = {
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system' as const,
          content: 'Tu es un assistant IA utile et bienveillant.'
        },
        {
          role: 'user' as const,
          content: message
        }
      ],
      stream: true,
      temperature: 0.7,
      max_tokens: 100
    };

    logger.dev("[Test Streaming] 📤 Appel DeepSeek avec streaming");

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`DeepSeek API error: ${response.status} - ${errorText}`);
    }

    // Retourner le stream directement
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    logger.error("[Test Streaming] ❌ Erreur:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
} 