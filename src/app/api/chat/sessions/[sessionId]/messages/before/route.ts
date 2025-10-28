import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { simpleLogger as logger } from '@/utils/logger';

/**
 * ✅ API: GET /api/chat/sessions/[sessionId]/messages/before
 * Récupère les messages avant un sequence_number (pour infinite scroll vers le haut)
 * 
 * REFACTOR: Utilise HistoryManager avec sequence_number au lieu de timestamp
 * 
 * Avantages:
 * - Pagination optimale (index sur sequence_number)
 * - Performance constante (pas de scan complet)
 * - Ordre garanti (sequence_number strict)
 * 
 * Query params:
 * - before: string (timestamp OU sequence_number) - Charger les messages avant
 * - limit: number (default: 20) - Nombre de messages à récupérer
 * 
 * @returns {PaginatedMessages} - Messages + hasMore
 */

const querySchema = z.object({
  before: z.string(),  // Accepte timestamp OU sequence_number
  limit: z.coerce.number().min(1).max(100).default(20)
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    
    // Validation query params
    const searchParams = Object.fromEntries(req.nextUrl.searchParams);
    const { before, limit } = querySchema.parse(searchParams);

    // Vérifier authentification
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Token manquant' },
        { status: 401 }
      );
    }

    // ✅ NOUVEAU: Import dynamique HistoryManager
    const { historyManager } = await import('@/services/chat/HistoryManager');

    // ✅ Convertir before en sequence_number
    // Si c'est un nombre, on l'utilise directement
    // Sinon, on suppose que c'est un timestamp et on cherche le message correspondant
    let beforeSequence: number;
    
    if (/^\d+$/.test(before)) {
      // C'est un sequence_number
      beforeSequence = parseInt(before, 10);
    } else {
      // C'est un timestamp, on charge d'abord tous les messages pour trouver le bon
      // (Fallback pour compatibilité avec ancien code)
      const { messages: allMessages } = await historyManager.getRecentMessages(sessionId, 1000);
      const matchingMessage = allMessages.find(m => m.timestamp === before || m.id === before);
      
      if (!matchingMessage) {
        return NextResponse.json(
          { success: false, error: 'Message de référence introuvable' },
          { status: 404 }
        );
      }
      
      beforeSequence = matchingMessage.sequence_number || 0;
    }

    // ✅ Utiliser HistoryManager (vraie pagination DB)
    const result = await historyManager.getMessagesBefore(sessionId, beforeSequence, limit);

    logger.dev('[API /messages/before] ✅ Messages chargés:', {
      sessionId,
      beforeSequence,
      count: result.messages.length,
      hasMore: result.hasMore
    });

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('[API /messages/before] ❌ Erreur:', error);
    
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

