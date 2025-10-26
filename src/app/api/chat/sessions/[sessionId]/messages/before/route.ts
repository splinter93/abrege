import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { ChatMessage } from '@/types/chat';

/**
 * 🎯 API: GET /api/chat/sessions/[sessionId]/messages/before
 * Récupère les messages avant un timestamp donné (pour infinite scroll vers le haut)
 * 
 * Query params:
 * - before: string (ISO timestamp) - Charger les messages avant ce timestamp
 * - limit: number (default: 20) - Nombre de messages à récupérer
 * 
 * @returns {ChatMessage[]} - Les messages triés par ordre chronologique
 */

const querySchema = z.object({
  before: z.string().datetime(),
  limit: z.coerce.number().min(1).max(100).default(20)
});

export async function GET(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params;
    
    // Validation query params
    const searchParams = Object.fromEntries(req.nextUrl.searchParams);
    const { before, limit } = querySchema.parse(searchParams);

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

    const thread = (session.thread || []) as ChatMessage[];
    
    // 🎯 Filtrer les messages avant le timestamp donné
    const messagesBeforeTimestamp = thread.filter(msg => {
      const msgTimestamp = msg.timestamp || msg.id;
      return msgTimestamp < before;
    });

    // 🎯 Récupérer les N derniers parmi ceux qui sont avant le timestamp
    const olderMessages = messagesBeforeTimestamp.slice(-limit);

    return NextResponse.json({
      success: true,
      data: {
        messages: olderMessages,
        hasMore: messagesBeforeTimestamp.length > limit,
        totalBefore: messagesBeforeTimestamp.length
      }
    });

  } catch (error) {
    console.error('[API] Erreur GET /messages/before:', error);
    
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

