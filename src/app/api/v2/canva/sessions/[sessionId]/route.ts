import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/utils/authUtils';
import { CanvaNoteService } from '@/services/canvaNoteService';
import { logger, LogCategory } from '@/utils/logger';
import { createSupabaseClient } from '@/utils/supabaseClient';
import { updateCanvaSessionSchema } from '@/utils/canvaValidationSchemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/v2/canva/sessions/:sessionId
 * 
 * Récupérer détails d'une session canva
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
): Promise<NextResponse> {
  try {
    const authResult = await getAuthenticatedUser(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status || 401 }
      );
    }

    const userId = authResult.userId!;
    const { sessionId } = await params;
    const supabaseClient = createSupabaseClient();

    logger.debug(LogCategory.EDITOR, '[API Canva Sessions GET Detail] Fetching session', {
      sessionId,
      userId
    });

    // Récupérer session avec note
    const session = await CanvaNoteService.getSessionById(sessionId, userId, supabaseClient);

    if (!session) {
      return NextResponse.json(
        { error: 'Canva session introuvable' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      canva_session: session
    });

  } catch (error) {
    logger.error(LogCategory.EDITOR, '[API Canva Sessions GET Detail] ❌ Error', error);
    return NextResponse.json(
      { error: 'Failed to get canva session', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/v2/canva/sessions/:sessionId
 * 
 * Update statut ou metadata d'une session canva
 * Body: { status?: 'open'|'closed'|'saved', metadata?: {}, reason?: string }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
): Promise<NextResponse> {
  try {
    const authResult = await getAuthenticatedUser(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status || 401 }
      );
    }

    const userId = authResult.userId!;
    const { sessionId } = await params;
    const body = await request.json();
    const validation = updateCanvaSessionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Payload invalide', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const payload = validation.data;
    const supabaseClient = createSupabaseClient();

    logger.info(LogCategory.EDITOR, '[API Canva Sessions PATCH] Updating session', {
      sessionId,
      status: payload.status,
      reason: payload.reason
    });

    // Update session
    const updatedSession = await CanvaNoteService.updateSession(
      sessionId,
      userId,
      supabaseClient,
      {
        status: payload.status,
        metadata: payload.metadata
      }
    );

    return NextResponse.json({
      success: true,
      canva_session: updatedSession
    });

  } catch (error) {
    logger.error(LogCategory.EDITOR, '[API Canva Sessions PATCH] ❌ Error', error);
    return NextResponse.json(
      { error: 'Failed to update canva session', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/v2/canva/sessions/:sessionId
 * 
 * Supprimer une session canva (dissocier note <-> chat)
 * ⚠️ Si note est draft canva, elle est aussi supprimée
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
): Promise<NextResponse> {
  try {
    const authResult = await getAuthenticatedUser(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status || 401 }
      );
    }

    const userId = authResult.userId!;
    const { sessionId } = await params;
    const supabaseClient = createSupabaseClient();

    logger.info(LogCategory.EDITOR, '[API Canva Sessions DELETE] Deleting session', {
      sessionId,
      userId
    });

    // Supprimer session
    await CanvaNoteService.deleteSession(sessionId, userId, supabaseClient);

    return NextResponse.json({
      success: true,
      deleted_session_id: sessionId
    });

  } catch (error) {
    logger.error(LogCategory.EDITOR, '[API Canva Sessions DELETE] ❌ Error', error);
    return NextResponse.json(
      { error: 'Failed to delete canva session', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

