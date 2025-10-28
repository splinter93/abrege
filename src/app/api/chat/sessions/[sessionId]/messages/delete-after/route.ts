import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { simpleLogger as logger } from '@/utils/logger';
import { createClient } from '@supabase/supabase-js';

/**
 * ✅ API: DELETE /api/chat/sessions/[sessionId]/messages/delete-after
 * Supprime tous les messages après un sequence_number (pour édition)
 * 
 * Sécurité:
 * - Vérifie auth token
 * - Vérifie ownership session
 * - Validation Zod
 * - Appel HistoryManager (SERVICE_ROLE, atomique)
 * 
 * Use case:
 * - User édite message N
 * - Supprimer messages N+1, N+2, ... (cascade)
 * - Régénérer réponse assistant
 * 
 * @returns {number} - Nombre de messages supprimés
 */

const deleteAfterSchema = z.object({
  afterSequence: z.number().int().min(0)
});

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    
    // 1. Validation body
    const body = await req.json();
    const { afterSequence } = deleteAfterSchema.parse(body);

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
      logger.error('[API /messages/delete-after] ❌ Session non trouvée:', sessionError);
      return NextResponse.json(
        { success: false, error: 'Session non trouvée' },
        { status: 404 }
      );
    }

    // 4. Import dynamique HistoryManager (côté serveur uniquement)
    const { historyManager } = await import('@/services/chat/HistoryManager');

    // 5. Supprimer messages atomiquement
    const deletedCount = await historyManager.deleteMessagesAfter(sessionId, afterSequence);

    logger.dev('[API /messages/delete-after] ✅ Messages supprimés:', {
      sessionId,
      afterSequence,
      deletedCount
    });

    return NextResponse.json({
      success: true,
      data: {
        deletedCount
      }
    });

  } catch (error) {
    logger.error('[API /messages/delete-after] ❌ Erreur:', error);
    
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

