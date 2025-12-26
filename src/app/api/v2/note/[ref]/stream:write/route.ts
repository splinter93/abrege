/**
 * ✍️ POST /api/v2/note/{ref}/stream:write
 * 
 * Endpoint pour agents LLM : écrire des chunks en streaming dans une note
 * Les chunks sont diffusés en temps réel aux clients écoutant via /stream:listen
 * 
 * Flow:
 * 1. Agent LLM appelle POST avec { chunk: "contenu..." }
 * 2. Serveur valide + sanitize
 * 3. Broadcast via StreamBroadcastService
 * 4. Clients reçoivent via SSE et affichent dans TipTap
 * 
 * OpenAPI Tool pour agents externes
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logApi } from '@/utils/logger';
import { V2ResourceResolver } from '@/utils/v2ResourceResolver';
import { getAuthenticatedUser } from '@/utils/authUtils';
import { streamBroadcastService } from '@/services/streamBroadcastService';
import { sanitizeMarkdownContent } from '@/utils/markdownSanitizer.server';
import { chatRateLimiter } from '@/services/rateLimiter';

// Force Node.js runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Schéma de validation Zod pour le payload
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
 * POST endpoint - Écrire un chunk en streaming
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ ref: string }> }
) {
  const startTime = Date.now();
  const { ref } = await params;
  
  const context = {
    operation: 'v2_note_stream_write',
    component: 'API_V2_STREAM',
    ref
  };

  logApi.info(`✍️ Début stream write note ${ref}`, context);

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

    // 🔍 Résoudre la référence (UUID ou slug)
    const resolveResult = await V2ResourceResolver.resolveRef(
      ref,
      'note',
      userId,
      context
    );

    if (!resolveResult.success) {
      logApi.warn(`❌ Note resolution failed: ${resolveResult.error}`, context);
      return NextResponse.json(
        { error: resolveResult.error },
        { status: resolveResult.status }
      );
    }

    const noteId = resolveResult.id;

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

    // 📊 Vérifier qu'il y a des listeners (sinon warning)
    const listenerCount = streamBroadcastService.getListenerCount(noteId);
    if (listenerCount === 0 && !end) {
      logApi.warn(`⚠️ No listeners for note ${noteId}`, {
        ...context,
        noteId,
        userId
      });
      // Ne pas bloquer, l'agent peut streamer avant que le client n'écoute
    }

    // 📡 Broadcast le chunk
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

      logApi.info(`📡 Chunk broadcasted`, {
        ...context,
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

      logApi.info(`🏁 Stream ended`, {
        ...context,
        noteId,
        userId,
        duration: Date.now() - startTime
      });
    }

    return NextResponse.json({
      success: true,
      note_id: noteId,
      listeners_reached: streamBroadcastService.getListenerCount(noteId),
      chunk_length: sanitizedChunk?.length || 0
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logApi.error(`❌ Stream write error: ${errorMessage}`, {
      ...context,
      error: error instanceof Error ? error.stack : undefined
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

