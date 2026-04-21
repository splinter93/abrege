import { NextRequest, NextResponse } from 'next/server';
import { simpleLogger as logger } from '@/utils/logger';
import { callableService } from '@/services/llm/callableService';

// Force Node.js runtime
export const runtime = 'nodejs';

/**
 * GET /api/synesia/callables
 * Proxy vers Synesia API pour lister les callables
 * Synchronise automatiquement avec la DB
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    logger.info('[SynesiaCallables] 🔄 Fetch callables depuis Synesia API');

    // Option 1 : Sync depuis API puis retourner depuis DB
    // (Plus robuste : cache + DB = source de vérité)
    const callables = await callableService.syncCallablesFromSynesia();

    return NextResponse.json({
      success: true,
      callables,
    });

  } catch (error) {
    logger.error('[SynesiaCallables] ❌ Erreur:', error);

    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';

    // Si erreur API, essayer de retourner depuis DB
    if (errorMessage.includes('Synesia API error')) {
      logger.warn('[SynesiaCallables] ⚠️ Erreur API, fallback vers DB');
      
      try {
        const callablesFromDb = await callableService.getAvailableCallables();
        
        if (callablesFromDb.length > 0) {
          return NextResponse.json({
            success: true,
            callables: callablesFromDb,
            warning: 'Données depuis cache (API indisponible)',
          });
        }
      } catch (dbError) {
        logger.error('[SynesiaCallables] ❌ Erreur fallback DB:', dbError);
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}






