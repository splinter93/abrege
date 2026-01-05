import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/utils/authUtils';
import { CanvaNoteService } from '@/services/canvaNoteService';
import { logger, LogCategory } from '@/utils/logger';
import { createSupabaseClient } from '@/utils/supabaseClient';
import { V2ResourceResolver } from '@/utils/v2ResourceResolver';
import { canvaSessionsRateLimiter } from '@/services/rateLimiter';
import {
  createCanvaSessionSchema,
  listCanvaSessionsSchema,
  type CanvaStatusInput
} from '@/utils/canvaValidationSchemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/v2/canva/sessions
 * 
 * Créer ou ouvrir une session canva
 * Logique simple :
 * - Si note_id fourni → ouvre note existante dans canva
 * - Si note_id absent → crée nouveau brouillon canva (title obligatoire)
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const authResult = await getAuthenticatedUser(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status || 401 }
      );
    }

    const userId = authResult.userId!;

    // ✅ Rate limiting par utilisateur
    const rateLimit = await canvaSessionsRateLimiter.check(userId);
    if (!rateLimit.allowed) {
      logger.warn(LogCategory.API, '[Canva Sessions] ⛔ Rate limit dépassé', {
        userId: userId.substring(0, 8) + '...',
        limit: rateLimit.limit,
        resetTime: rateLimit.resetTime
      });

      const retryAfter = Math.ceil((rateLimit.resetTime - Date.now()) / 1000);
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Vous avez atteint la limite de ${rateLimit.limit} créations de sessions canva par minute. Veuillez réessayer dans ${retryAfter} secondes.`,
          retryAfter
        },
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': rateLimit.limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimit.resetTime.toString(),
            'Retry-After': retryAfter.toString()
          }
        }
      );
    }

    let body: unknown = {};

    try {
      const rawBody = await request.text();
      body = rawBody ? JSON.parse(rawBody) : {};
    } catch (parseError) {
      logger.warn(LogCategory.EDITOR, '[API Canva Sessions POST] ❌ Invalid JSON payload', {
        error: parseError instanceof Error ? parseError.message : String(parseError)
      });

      return NextResponse.json(
        { error: 'Payload invalide', details: 'JSON malformé ou vide' },
        { status: 400 }
      );
    }

    const validation = createCanvaSessionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Payload invalide', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const payload = validation.data;
    const supabaseClient = createSupabaseClient();
    let resolvedNoteId: string | undefined;

    const context = {
      operation: 'canva_session_create',
      component: 'API_V2'
    };

    // Résolution note_id (ID ou slug)
    if (payload.note_id) {
      const resolved = await V2ResourceResolver.resolveRef(
        payload.note_id,
        'note',
        userId,
        context
      );

      if (!resolved.success) {
        return NextResponse.json(
          { error: resolved.error },
          { status: resolved.status }
        );
      }

      resolvedNoteId = resolved.id;
    }

    // Logique simple : si note_id absent, on crée un nouveau canvas
    const createIfMissing = !resolvedNoteId;

    logger.info(LogCategory.EDITOR, '[API Canva Sessions POST] Creating session', {
      chatSessionId: payload.chat_session_id,
      resolvedNoteId,
      createIfMissing,
      hasTitle: !!payload.title
    });

    // Créer/ouvrir session
    const canvaSession = await CanvaNoteService.openSession(
      {
        chatSessionId: payload.chat_session_id,
        userId,
        noteId: resolvedNoteId,
        createIfMissing,
        title: payload.title,
        classeurId: payload.classeur_id ?? null,
        metadata: payload.metadata,
        initialContent: payload.initial_content
      },
      supabaseClient
    );

    return NextResponse.json({
      success: true,
      canva_session: canvaSession
    });

  } catch (error) {
    logger.error(LogCategory.EDITOR, '[API Canva Sessions POST] ❌ Error', error);
    return NextResponse.json(
      { error: 'Failed to create canva session', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

/**
 * GET /api/v2/canva/sessions?chat_session_id=X&status=open,closed
 * 
 * Lister sessions canva d'une session chat
 * Query params:
 * - chat_session_id (required): UUID session chat
 * - status (optional): Filtrer par statut (array)
 * - include_note (optional): Inclure détails note
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // ✅ DEBUG: Log de la requête
    logger.debug(LogCategory.EDITOR, '[API Canva Sessions GET] Request received', {
      url: request.url,
      hasAuthHeader: !!request.headers.get('Authorization'),
      hasCookie: !!request.headers.get('cookie')
    });

    const authResult = await getAuthenticatedUser(request);
    if (!authResult.success) {
      logger.warn(LogCategory.EDITOR, '[API Canva Sessions GET] Auth failed', {
        error: authResult.error,
        status: authResult.status,
        url: request.url
      });
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status || 401 }
      );
    }

    const userId = authResult.userId!;
    const { searchParams } = new URL(request.url);
    
    // Parse query params
    const chatSessionId = searchParams.get('chat_session_id');
    const statusParam = searchParams.get('status');
    const includeNote = searchParams.get('include_note') === 'true';

    if (!chatSessionId) {
      return NextResponse.json(
        { error: 'chat_session_id query param requis' },
        { status: 400 }
      );
    }

    // Parse status array
    let statuses: CanvaStatusInput[] | undefined;
    if (statusParam) {
      statuses = statusParam.split(',').map(s => s.trim()) as CanvaStatusInput[];
    }

    // Validate
    const validation = listCanvaSessionsSchema.safeParse({
      chat_session_id: chatSessionId,
      status: statuses,
      include_note: includeNote
    });

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Query params invalides', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    logger.debug(LogCategory.EDITOR, '[API Canva Sessions GET] Listing sessions', {
      chatSessionId,
      statuses,
      userId
    });

    // Récupérer sessions
    // ✅ Par défaut : retourner TOUS les canva (sauf deleted)
    // Le status DB ne contrôle PAS la visibilité UI (pane ouvert/fermé)
    // Status = état métier : draft, saved, deleted
    const supabaseClient = createSupabaseClient();
    const canvaSessions = await CanvaNoteService.getCanvasForSession(
      chatSessionId,
      userId,
      supabaseClient,
      { statuses: statuses || ['open', 'closed', 'saved'] } // Exclure seulement 'deleted' par défaut
    );

    logger.info(LogCategory.EDITOR, '[API Canva Sessions GET] ✅ Sessions retrieved', {
      count: canvaSessions.length,
      chatSessionId
    });

    return NextResponse.json({
      success: true,
      canva_sessions: canvaSessions,
      count: canvaSessions.length
    });

  } catch (error) {
    logger.error(LogCategory.EDITOR, '[API Canva Sessions GET] ❌ Error', error);
    return NextResponse.json(
      { error: 'Failed to list canva sessions', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

