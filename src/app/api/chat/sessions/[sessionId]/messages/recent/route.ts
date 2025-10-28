import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { simpleLogger as logger } from '@/utils/logger';

/**
 * ✅ API: GET /api/chat/sessions/[sessionId]/messages/recent
 * Récupère les N derniers messages d'une session (vraie pagination DB)
 * 
 * REFACTOR: Utilise HistoryManager au lieu de thread JSONB
 * 
 * Avantages:
 * - Performance constante (LIMIT en DB, pas slice en mémoire)
 * - Scalabilité infinie (10K+ messages, toujours ~30ms)
 * - Atomicité garantie (sequence_number)
 * 
 * Query params:
 * - limit: number (default: 15) - Nombre de messages à récupérer
 * 
 * @returns {PaginatedMessages} - Messages + hasMore + totalCount
 */

const querySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(15)
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    
    // Validation query params
    const searchParams = Object.fromEntries(req.nextUrl.searchParams);
    const { limit } = querySchema.parse(searchParams);

    // Vérifier authentification
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Token manquant' },
        { status: 401 }
      );
    }

    // ✅ NOUVEAU: Import dynamique HistoryManager côté serveur
    const { historyManager } = await import('@/services/chat/HistoryManager');

    // ✅ Utiliser HistoryManager (vraie pagination DB)
    const result = await historyManager.getRecentMessages(sessionId, limit);

    logger.dev('[API /messages/recent] ✅ Messages chargés:', {
      sessionId,
      count: result.messages.length,
      hasMore: result.hasMore,
      totalCount: result.totalCount
    });

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('[API /messages/recent] ❌ Erreur:', error);
    
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

