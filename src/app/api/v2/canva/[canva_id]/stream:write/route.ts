/**
 * ✍️ POST /api/v2/canva/{canva_id}/stream:write
 * 
 * Endpoint streaming pour canva (alias simplifié)
 * Résout canva_id → noteId et proxy vers /api/v2/note/[noteId]/stream:write
 * 
 * Permet aux agents LLM d'écrire directement dans un canva par son ID
 * sans avoir à connaître le noteId sous-jacent
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logApi } from '@/utils/logger';
import { getAuthenticatedUser, createAuthenticatedSupabaseClient, extractTokenFromRequest } from '@/utils/authUtils';
import { streamBroadcastService } from '@/services/streamBroadcastService';
import { sanitizeMarkdownContent } from '@/utils/markdownSanitizer.server';
import { chatRateLimiter } from '@/services/rateLimiter';

// Force Node.js runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Schéma de validation (identique à note stream:write)
 */
const streamWriteSchema = z.object({
  chunk: z.string().optional(),
  position: z.enum(['end', 'start', 'cursor']).default('end'),
  end: z.boolean().optional(),
  metadata: z.object({
    tool_call_id: z.string().optional(),
    agent_id: z.string().optional()
  }).optional()
});

type StreamWritePayload = z.infer<typeof streamWriteSchema>;

/**
 * POST endpoint - Écrire un chunk dans un canva
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ canva_id: string }> }
) {
  const startTime = Date.now();
  const { canva_id } = await params;
  
  const context = {
    operation: 'v2_canva_stream_write',
    component: 'API_V2_STREAM',
    canva_id
  };

  logApi.info(`✍️ Début stream write canva ${canva_id}`, context);

  try {
    // 🔐 Authentification
    const authResult = await getAuthenticatedUser(request);
    if (!authResult.success) {
      logApi.warn(`❌ Auth failed: ${authResult.error}`, context);
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status || 401 }
      );
    }

    const userId = authResult.userId!;
    const userToken = extractTokenFromRequest(request);
    const supabase = createAuthenticatedSupabaseClient(authResult, userToken || undefined);

    // 🔍 Résoudre canva_id → noteId via table canva_sessions
    const { data: canvaSession, error: canvaError } = await supabase
      .from('canva_sessions')
      .select('id, note_id, user_id')
      .eq('id', canva_id)
      .single();

    if (canvaError || !canvaSession) {
      logApi.warn(`❌ Canva not found: ${canva_id}`, context);
      return NextResponse.json(
        { error: 'Canva session not found' },
        { status: 404 }
      );
    }

    // 🔒 Vérifier que l'utilisateur possède ce canva
    if (canvaSession.user_id !== userId) {
      logApi.warn(`❌ Unauthorized access to canva ${canva_id}`, {
        ...context,
        userId,
        canvaUserId: canvaSession.user_id
      });
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const noteId = canvaSession.note_id;

    logApi.info(`✅ Canva resolved to note`, {
      ...context,
      canvaId: canva_id,
      noteId,
      userId
    });

    // 🚦 Rate limiting (100 chunks/min par user)
    const rateLimitKey = `stream-write:${userId}`;
    const rateLimitResult = await chatRateLimiter.check(rateLimitKey);
    
    if (!rateLimitResult.allowed) {
      const resetIn = Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000);
      logApi.warn(`⚠️ Rate limit exceeded`, {
        ...context,
        userId,
        remaining: rateLimitResult.remaining
      });
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded',
          retry_after: resetIn
        },
        { status: 429 }
      );
    }

    // 📋 Valider le payload
    const body = await request.json();
    const validation = streamWriteSchema.safeParse(body);

    if (!validation.success) {
      logApi.warn(`❌ Validation failed`, {
        ...context,
        errors: validation.error.flatten().fieldErrors
      });
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: validation.error.flatten().fieldErrors
        },
        { status: 400 }
      );
    }

    const { chunk, position, end, metadata }: StreamWritePayload = validation.data;

    // 🛡️ Sanitize le contenu markdown
    const sanitizedChunk = chunk ? sanitizeMarkdownContent(chunk) : undefined;

    // 📡 Broadcast le chunk (même logique que note stream:write)
    if (sanitizedChunk) {
      const broadcastCount = await streamBroadcastService.broadcast(noteId, {
        type: 'chunk',
        data: sanitizedChunk,
        position,
        metadata: {
          ...metadata,
          timestamp: Date.now()
        }
      });

      logApi.info(`📡 Chunk broadcasted to canva`, {
        ...context,
        canvaId: canva_id,
        noteId,
        userId,
        chunkLength: sanitizedChunk.length,
        listenerCount: broadcastCount,
        position,
        toolCallId: metadata?.tool_call_id,
        agentId: metadata?.agent_id
      });
    }

    // 🏁 Signal de fin de stream
    if (end) {
      await streamBroadcastService.broadcast(noteId, {
        type: 'end',
        metadata: {
          ...metadata,
          timestamp: Date.now()
        }
      });

      logApi.info(`🏁 Canva stream ended`, {
        ...context,
        canvaId: canva_id,
        noteId,
        userId,
        duration: Date.now() - startTime
      });
    }

    return NextResponse.json({
      success: true,
      canva_id,
      note_id: noteId,
      listeners_reached: streamBroadcastService.getListenerCount(noteId),
      chunk_length: sanitizedChunk?.length || 0
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logApi.error(`❌ Canva stream write error: ${errorMessage}`, {
      ...context,
      error: error instanceof Error ? error.stack : undefined
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

