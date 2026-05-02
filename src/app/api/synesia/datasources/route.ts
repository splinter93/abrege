import { NextRequest, NextResponse } from 'next/server';
import { simpleLogger as logger } from '@/utils/logger';
import { datasourceService } from '@/services/llm/datasourceService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, must-revalidate',
};

/**
 * GET /api/synesia/datasources
 * Proxy Synesia GET /datasources/available ; sync vers synesia_datasources
 */
export async function GET(_request: NextRequest): Promise<NextResponse> {
  try {
    logger.info('[SynesiaDatasources] Fetch datasources depuis Synesia API');

    const datasources = await datasourceService.syncDatasourcesFromSynesia();

    return NextResponse.json(
      {
        success: true,
        datasources,
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    logger.error('[SynesiaDatasources] Erreur:', error);

    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';

    if (errorMessage.includes('Synesia API error')) {
      logger.warn('[SynesiaDatasources] Erreur API, fallback DB');

      try {
        const fromDb = await datasourceService.getAvailableDatasources();

        if (fromDb.length > 0) {
          return NextResponse.json(
            {
              success: true,
              datasources: fromDb,
              warning: 'Données depuis cache (API indisponible)',
            },
            { headers: NO_STORE_HEADERS }
          );
        }
      } catch (dbError) {
        logger.error('[SynesiaDatasources] Erreur fallback DB:', dbError);
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
