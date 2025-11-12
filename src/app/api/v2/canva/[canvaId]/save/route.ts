import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/utils/authUtils';
import { validatePayload, createValidationErrorResponse } from '@/utils/v2ValidationSchemas';
import { saveCanvaSchema } from '@/utils/canvaValidationSchemas';
import { CanvaNoteService } from '@/services/canvaNoteService';
import { logger, LogCategory } from '@/utils/logger';
import { createSupabaseClient } from '@/utils/supabaseClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/v2/canva/:canvaId/save
 * 
 * Sauvegarder un canva (attacher a classeur + status saved)
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

    // Validation
    const body = await request.json();
    const validation = validatePayload(saveCanvaSchema, body);
    if (!validation.success) {
      return createValidationErrorResponse(validation);
    }

    logger.info(LogCategory.EDITOR, '[API Canva Save] Saving canva', {
      canvaId,
      classeurId: validation.data.classeur_id
    });

    // Sauvegarder canva
    const supabaseClient = createSupabaseClient();

    await CanvaNoteService.saveCanva(
      canvaId,
      validation.data.classeur_id,
      validation.data.folder_id,
      userId,
      supabaseClient
    );

    logger.info(LogCategory.EDITOR, '[API Canva Save] ✅ Canva saved', { canvaId });

    return NextResponse.json({
      success: true,
      message: 'Canva saved successfully'
    });

  } catch (error) {
    logger.error(LogCategory.EDITOR, '[API Canva Save] ❌ Error', error);
    return NextResponse.json(
      { error: 'Failed to save canva', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

