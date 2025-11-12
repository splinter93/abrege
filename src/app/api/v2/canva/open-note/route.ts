/**
 * 📂 POST /api/v2/canva/open-note
 * 
 * Ouvrir une note existante en canva
 * Crée une session canva pour une note déjà existante
 * 
 * @module API_V2_Canva_OpenNote
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/utils/authUtils';
import { validatePayload } from '@/utils/apiHelpers';
import { CanvaNoteService } from '@/services/canvaNoteService';
import { logger, LogCategory } from '@/utils/logger';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Schema validation
 */
const openNoteSchema = z.object({
  note_id: z.string().uuid('note_id doit être UUID'),
  chat_session_id: z.string().uuid('chat_session_id doit être UUID')
});

/**
 * POST /api/v2/canva/open-note
 * Ouvre une note existante en canva
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
    const validation = validatePayload(openNoteSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error, details: validation.details },
        { status: 400 }
      );
    }

    logger.info(LogCategory.EDITOR, '[API Canva OpenNote] Opening existing note as canva', {
      userId,
      noteId: validation.data.note_id,
      chatSessionId: validation.data.chat_session_id
    });

    // Ouvrir note en canva
    const { canvaId, noteId } = await CanvaNoteService.openExistingNoteAsCanva(
      validation.data.note_id,
      validation.data.chat_session_id,
      userId
    );

    const apiTime = Date.now() - startTime;
    logger.info(LogCategory.EDITOR, `[API Canva OpenNote] ✅ Note opened as canva in ${apiTime}ms`, {
      canvaId,
      noteId
    });

    return NextResponse.json({
      success: true,
      canva_id: canvaId,
      note_id: noteId,
      message: 'Note opened as canva successfully'
    });

  } catch (error) {
    logger.error(LogCategory.EDITOR, '[API Canva OpenNote] ❌ Error', error);
    
    const errorDetails = {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : 'No stack trace'
    };
    
    console.error('[API Canva OpenNote] Full error details:', errorDetails);
    
    return NextResponse.json(
      { 
        error: 'Failed to open note as canva', 
        details: errorDetails.message
      },
      { status: 500 }
    );
  }
}

