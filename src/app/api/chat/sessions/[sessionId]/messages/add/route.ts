import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { simpleLogger as logger } from '@/utils/logger';
import { createClient } from '@supabase/supabase-js';

/**
 * ✅ API: POST /api/chat/sessions/[sessionId]/messages/add
 * Ajoute un message atomiquement via HistoryManager
 * 
 * Sécurité:
 * - Vérifie auth token
 * - Vérifie ownership session
 * - Validation Zod
 * - Appel HistoryManager (SERVICE_ROLE, atomique)
 * 
 * @returns {ChatMessage} - Message sauvegardé avec sequence_number
 */

const messageSchema = z.object({
  role: z.enum(['user', 'assistant', 'tool', 'system']),
  content: z.string(),
  tool_calls: z.array(z.object({
    id: z.string(),
    type: z.literal('function'),
    function: z.object({
      name: z.string(),
      arguments: z.string()
    })
  })).optional(),
  tool_call_id: z.string().optional(),
  name: z.string().optional(),
  reasoning: z.string().optional(),
  stream_timeline: z.any().optional(), // ✅ CRITIQUE: Accepter la timeline (JSONB complexe)
  tool_results: z.array(z.any()).optional() // ✅ Tool results aussi
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    
    // 1. Validation body
    const body = await req.json();
    const message = messageSchema.parse(body);
    
    logger.dev('[API /messages/add] 📥 Message reçu:', {
      role: message.role,
      hasStreamTimeline: 'stream_timeline' in message,
      streamTimelineType: typeof (message as any).stream_timeline
    });

    // 2. Vérifier authentification
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Token manquant' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    // 3. Vérifier ownership session
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    const userClient = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });

    const { data: session, error: sessionError } = await userClient
      .from('chat_sessions')
      .select('id')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      logger.error('[API /messages/add] ❌ Session non trouvée ou accès refusé:', sessionError);
      return NextResponse.json(
        { success: false, error: 'Session non trouvée' },
        { status: 404 }
      );
    }

    // 4. Import dynamique HistoryManager (côté serveur uniquement)
    const { historyManager } = await import('@/services/chat/HistoryManager');

    // 5. Ajouter message atomiquement
    const savedMessage = await historyManager.addMessage(sessionId, message);

    logger.dev('[API /messages/add] ✅ Message ajouté:', {
      sessionId,
      sequenceNumber: savedMessage.sequence_number,
      role: savedMessage.role
    });

    return NextResponse.json({
      success: true,
      data: {
        message: savedMessage
      }
    });

  } catch (error) {
    logger.error('[API /messages/add] ❌ Erreur:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Données invalides', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
