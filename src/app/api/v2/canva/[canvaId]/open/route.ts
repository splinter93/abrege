import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/utils/authUtils';
import { CanvaNoteService } from '@/services/canvaNoteService';
import { logger, LogCategory } from '@/utils/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/v2/canva/:canvaId/open
 * 
 * Rouvrir un canva ferme (status closed → open)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ canvaId: string }> }
): Promise<NextResponse> {
  try {
    // Auth
    const authResult = await getAuthenticatedUser(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status || 401 }
      );
    }

    const userId = authResult.userId!;
    const { canvaId } = await params; // ✅ FIX: await params

    logger.info(LogCategory.EDITOR, '[API Canva Open] Opening canva', { canvaId });

    // Update status closed → open
    await CanvaNoteService.updateCanvaStatus(canvaId, 'open', userId);

    logger.info(LogCategory.EDITOR, '[API Canva Open] ✅ Canva opened', { canvaId });

    return NextResponse.json({
      success: true,
      message: 'Canva reopened successfully'
    });

  } catch (error) {
    logger.error(LogCategory.EDITOR, '[API Canva Open] ❌ Error', error);
    return NextResponse.json(
      { error: 'Failed to open canva', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

