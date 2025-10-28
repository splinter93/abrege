import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { simpleLogger as logger } from '@/utils/logger';
import { historyManager } from '@/services/chat/HistoryManager';
import type { ChatMessage } from '@/types/chat';

/**
 * ✅ API: POST /api/chat/sessions/[sessionId]/messages/add
 * Ajoute un message atomiquement à une session
 * 
 * SÉCURITÉ:
 * - Vérifie ownership de la session AVANT d'ajouter
 * - Utilise HistoryManager avec SERVICE_ROLE (atomicité garantie)
 * 
 * Body:
 * - role: 'user' | 'assistant' | 'tool' | 'system'
 * - content: string
 * - tool_calls?: JSONB (optionnel)
 * - tool_call_id?: string (optionnel)
 * - name?: string (optionnel)
 * - reasoning?: string (optionnel)
 * 
 * @returns {ChatMessage} - Message sauvegardé avec sequence_number
 */

const bodySchema = z.object({
  role: z.enum(['user', 'assistant', 'tool', 'system']),
  content: z.string(),
  tool_calls: z.array(z.any()).optional(),
  tool_call_id: z.string().optional(),
  name: z.string().optional(),
  reasoning: z.string().optional()
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    
    // Vérifier authentification
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Token manquant' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    
    // ✅ SÉCURITÉ: Vérifier ownership de la session AVANT
    const userClient = createClient(
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
    
    const { data: sessionData, error: sessionError } = await userClient
      .from('chat_sessions')
      .select('id, user_id')
      .eq('id', sessionId)
      .single();
    
    if (sessionError || !sessionData) {
      return NextResponse.json(
        { success: false, error: 'Session introuvable ou accès refusé' },
        { status: 404 }
      );
    }

    // Parser body
    const body = await req.json();
    const message = bodySchema.parse(body);

    // ✅ Ajouter message via HistoryManager (atomique avec SERVICE_ROLE)
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
        { success: false, error: 'Paramètres invalides', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Erreur serveur', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}

