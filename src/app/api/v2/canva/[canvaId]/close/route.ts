import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/utils/authUtils';
import { CanvaNoteService } from '@/services/canvaNoteService';
import { logger, LogCategory } from '@/utils/logger';
import { createSupabaseClient } from '@/utils/supabaseClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/v2/canva/:canvaId/close
 * 
 * Fermer un canva (status open -> closed)
 * Note reste en DB pour recovery
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

    logger.info(LogCategory.EDITOR, '[API Canva Close] Closing canva', { canvaId });

    // Update status
    const supabaseClient = createSupabaseClient();

    await CanvaNoteService.updateCanvaStatus(canvaId, 'closed', userId, supabaseClient);

    logger.info(LogCategory.EDITOR, '[API Canva Close] ✅ Canva closed', { canvaId });

    return NextResponse.json({
      success: true,
      message: 'Canva closed successfully'
    });

  } catch (error) {
    logger.error(LogCategory.EDITOR, '[API Canva Close] ❌ Error', error);
    return NextResponse.json(
      { error: 'Failed to close canva', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

