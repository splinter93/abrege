import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/utils/authUtils';
import { CanvaNoteService } from '@/services/canvaNoteService';
import { logger, LogCategory } from '@/utils/logger';
import { createSupabaseClient } from '@/utils/supabaseClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/v2/canva/session/:sessionId
 * 
 * Lister tous les canvases d'une session chat
 * Utilise par LLM context + recovery modal
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
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
    const { sessionId } = await params; // ✅ FIX: await params (Next.js 15)

    logger.debug(LogCategory.EDITOR, '[API Canva List] Listing canvases', {
      sessionId,
      userId
    });

    // Recuperer canvases
    const supabaseClient = createSupabaseClient();
    const canvaSessions = await CanvaNoteService.getCanvasForSession(sessionId, userId, supabaseClient);

    logger.info(LogCategory.EDITOR, '[API Canva List] ✅ Canvases retrieved', {
      count: canvaSessions.length,
      sessionId
    });

    return NextResponse.json({
      success: true,
      canva_sessions: canvaSessions,
      count: canvaSessions.length
    });

  } catch (error) {
    logger.error(LogCategory.EDITOR, '[API Canva List] ❌ Error', error);
    return NextResponse.json(
      { error: 'Failed to list canvases', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

