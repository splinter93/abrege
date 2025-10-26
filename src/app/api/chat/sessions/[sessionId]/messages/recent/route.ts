import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

/**
 * 🎯 API: GET /api/chat/sessions/[sessionId]/messages/recent
 * Récupère les N derniers messages d'une session (pour lazy loading)
 * 
 * Query params:
 * - limit: number (default: 15) - Nombre de messages à récupérer
 * 
 * @returns {ChatMessage[]} - Les N derniers messages triés par ordre chronologique
 */

const querySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(15)
});

export async function GET(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params;
    
    // Validation query params
    const searchParams = Object.fromEntries(req.nextUrl.searchParams);
    const { limit } = querySchema.parse(searchParams);

    // Init Supabase avec le token d'auth
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Token manquant' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    );

    // 🎯 Récupérer la session avec le thread complet
    const { data: session, error: sessionError } = await supabase
      .from('chat_sessions')
      .select('thread')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { success: false, error: 'Session introuvable' },
        { status: 404 }
      );
    }

    const thread = session.thread || [];
    
    // 🎯 Récupérer les N derniers messages
    const recentMessages = thread.slice(-limit);

    return NextResponse.json({
      success: true,
      data: {
        messages: recentMessages,
        hasMore: thread.length > limit,
        totalCount: thread.length
      }
    });

  } catch (error) {
    console.error('[API] Erreur GET /messages/recent:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Paramètres invalides', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

