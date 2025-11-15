import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/utils/authUtils';
import { validatePayload, createValidationErrorResponse } from '@/utils/v2ValidationSchemas';
import { createCanvaSchema } from '@/utils/canvaValidationSchemas';
import { CanvaNoteService } from '@/services/canvaNoteService';
import { logger, LogCategory } from '@/utils/logger';
import { createSupabaseClient } from '@/utils/supabaseClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/v2/canva/create
 * 
 * Creer un nouveau canva lie a une session chat
 * Architecture V2: Note DB (is_canva_draft) + canva_sessions
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

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

    // Validation
    const body = await request.json();
    const validation = validatePayload(createCanvaSchema, body);
    if (!validation.success) {
      return createValidationErrorResponse(validation);
    }

    logger.info(LogCategory.EDITOR, '[API Canva Create] Creating canva', {
      userId,
      chatSessionId: validation.data.chat_session_id,
      title: validation.data.title
    });

    // Créer canva via nouvelle méthode unifiée
    const supabaseClient = createSupabaseClient();
    const session = await CanvaNoteService.openSession(
      {
        chatSessionId: validation.data.chat_session_id,
        userId,
        createIfMissing: true,
        title: validation.data.title,
        initialContent: validation.data.initial_content ?? ''
      },
      supabaseClient
    );

    const apiTime = Date.now() - startTime;
    logger.info(LogCategory.EDITOR, `[API Canva Create] ✅ Canva created in ${apiTime}ms`, {
      canvaId: session.id,
      noteId: session.note_id
    });

    return NextResponse.json({
      success: true,
      canva_id: session.id,
      note_id: session.note_id,
      canva_session: session,
      message: 'Canva created successfully'
    });

  } catch (error) {
    logger.error(LogCategory.EDITOR, '[API Canva Create] ❌ Error', error);
    
    // Log detaille pour debug
    const errorDetails = {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : 'No stack trace',
      type: error?.constructor?.name || 'Unknown'
    };
    
    console.error('[API Canva Create] Full error details:', errorDetails);
    
    return NextResponse.json(
      { 
        error: 'Failed to create canva', 
        details: errorDetails.message,
        type: errorDetails.type
      },
      { status: 500 }
    );
  }
}

