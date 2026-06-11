import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ZodError } from 'zod';
import { simpleLogger as logger } from '@/utils/logger';
import { streamLifecycleService } from '@/services/chat/StreamLifecycleService';
import { streamCancelBodySchema } from './validation';
import type { StreamTimeline } from '@/types/streamTimeline';

/**
 * POST /api/chat/sessions/[sessionId]/streams/cancel
 * Cooperative cancel + optional partial assistant persist (interrupted).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const body = streamCancelBodySchema.parse(await req.json());

    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Token manquant' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });

    const { data: session, error: sessionError } = await userClient
      .from('chat_sessions')
      .select('id')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ success: false, error: 'Session non trouvée' }, { status: 404 });
    }

    const runResolution = await streamLifecycleService.resolveRunForSession(
      body.assistantOperationId,
      sessionId
    );

    if (runResolution === 'session_mismatch') {
      logger.warn('[API /streams/cancel] Stream session mismatch', {
        sessionId,
        assistantOperationId: body.assistantOperationId
      });
      return NextResponse.json({ success: false, error: 'Stream non trouvé' }, { status: 404 });
    }

    await streamLifecycleService.cancelRun({
      assistantOperationId: body.assistantOperationId,
      reason: body.reason
    });

    const partialContent = body.partial?.content?.trim() ?? '';
    if (!partialContent) {
      return NextResponse.json({ success: true });
    }

    const { historyManager } = await import('@/services/chat/HistoryManager');

    const existing = await historyManager.getMessageByOperationId(
      sessionId,
      body.assistantOperationId
    );

    if (existing) {
      return NextResponse.json({ success: true, messageId: existing.id, message: existing });
    }

    const timeline: StreamTimeline | undefined = body.partial?.streamTimeline
      ? ({
          ...body.partial.streamTimeline,
          interrupted: true,
          endTime: Date.now()
        } as StreamTimeline)
      : undefined;

    const savedMessage = await historyManager.addMessage(sessionId, {
      role: 'assistant',
      content: partialContent,
      ...(body.partial?.reasoning ? { reasoning: body.partial.reasoning } : {}),
      ...(timeline ? { stream_timeline: timeline } : {}),
      operation_id: body.assistantOperationId
    });

    logger.dev('[API /streams/cancel] Partial assistant persisted (interrupted)', {
      sessionId,
      assistantOperationId: body.assistantOperationId,
      contentLength: partialContent.length
    });

    return NextResponse.json({
      success: true,
      messageId: savedMessage.id,
      message: savedMessage
    });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation échouée', details: err.flatten().fieldErrors },
        { status: 400 }
      );
    }
    logger.error('[API /streams/cancel] Error', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Erreur serveur' },
      { status: 500 }
    );
  }
}
