import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/utils/authUtils';
import { CanvaNoteService } from '@/services/canvaNoteService';
import { logger, LogCategory } from '@/utils/logger';
import { createSupabaseClient } from '@/utils/supabaseClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * DELETE /api/v2/canva/:canvaId
 * 
 * Supprimer un canva (CASCADE: canva_session + note)
 */
export async function DELETE(
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

    logger.info(LogCategory.EDITOR, '[API Canva Delete] Deleting canva', { canvaId });

    // Supprimer canva (CASCADE delete note)
    const supabaseClient = createSupabaseClient();
    await CanvaNoteService.deleteCanva(canvaId, userId, supabaseClient);

    logger.info(LogCategory.EDITOR, '[API Canva Delete] ✅ Canva deleted', { canvaId });

    return NextResponse.json({
      success: true,
      message: 'Canva deleted successfully'
    });

  } catch (error) {
    logger.error(LogCategory.EDITOR, '[API Canva Delete] ❌ Error', error);
    return NextResponse.json(
      { error: 'Failed to delete canva', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

