/**
 * GET /api/v2/canvas/{ref}/ops-listen
 * 
 * Endpoint SSE pour écouter les événements de streaming canvas
 * ALTERNATIVE à ops:listen (sans : pour éviter problèmes de routing Next.js)
 */

import { NextRequest, NextResponse } from 'next/server';
import { logApi, LogCategory } from '@/utils/logger';
import { getAuthenticatedUser } from '@/utils/authUtils';
import { V2ResourceResolver } from '@/utils/v2ResourceResolver';
import { streamBroadcastService, StreamEvent } from '@/services/streamBroadcastService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ref: string }> }
): Promise<Response> {
  const startTime = Date.now();
  const { ref } = await params;
  
  // ✅ LOG FORCÉ au début pour diagnostiquer
  console.error('🔍🔍🔍 [ops-listen] GET HANDLER CALLED', { 
    ref, 
    url: request.url, 
    method: request.method,
    timestamp: Date.now(),
    hasToken: !!request.nextUrl.searchParams.get('token')
  });
  logApi.info(`🎧 Canvas ops-listen pour ${ref}`, {
    operation: 'v2_canvas_ops_listen',
    component: 'API_V2_STREAM',
    ref
  });
  
  const context = {
    operation: 'v2_canvas_ops_listen',
    component: 'API_V2_STREAM',
    ref
  };

  try {
    // 🔐 Authentification
    let authResult;
    const tokenParam = request.nextUrl.searchParams.get('token');

    if (tokenParam) {
      // Pour EventSource, token passé en query param
      // Créer un NextRequest avec le token dans les headers
      const modifiedRequest = new NextRequest(request.url, {
        headers: new Headers({
          ...Object.fromEntries(request.headers.entries()),
          'Authorization': `Bearer ${tokenParam}`
        })
      });
      authResult = await getAuthenticatedUser(modifiedRequest);
    } else {
      authResult = await getAuthenticatedUser(request);
    }

    if (!authResult.success) {
      console.error('❌ [ops-listen] Auth failed', {
        ref,
        error: authResult.error,
        status: authResult.status,
        timestamp: Date.now()
      });
      logApi.warn(`❌ Auth failed: ${authResult.error}`, context);
      return new Response(
        JSON.stringify({ error: authResult.error }),
        {
          status: authResult.status || 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const userId = authResult.userId!;

    // 🔍 Résoudre la référence (UUID ou slug)
    const resolveResult = await V2ResourceResolver.resolveRef(
      ref,
      'note',
      userId,
      context
    );

    if (!resolveResult.success) {
      console.error('❌ [ops-listen] Note resolution failed', {
        ref,
        error: resolveResult.error,
        status: resolveResult.status,
        timestamp: Date.now()
      });
      logApi.warn(`❌ Note resolution failed: ${resolveResult.error}`, context);
      return new Response(
        JSON.stringify({ error: resolveResult.error }),
        {
          status: resolveResult.status,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const noteId = resolveResult.id;

    logApi.info(`✅ Canvas ops-listen initialisé`, {
      ...context,
      noteId,
      userId,
      duration: Date.now() - startTime
    });

    // 🌊 Créer le stream SSE
    const encoder = new TextEncoder();
    
    // ✅ CRITIQUE: Queue pour stocker les événements avant que le stream démarre
    const eventQueue: StreamEvent[] = [];
    let controller: ReadableStreamDefaultController<Uint8Array> | null = null;
    let isControllerReady = false;
    let isControllerClosed = false;
    
    // ✅ Fonction pour envoyer un événement SSE
    const sendSSE = (event: StreamEvent) => {
      if (isControllerClosed) return;

      // Si le controller n'est pas prêt, mettre en queue
      if (!isControllerReady || !controller) {
        eventQueue.push(event);
        return;
      }

      try {
        // Format SSE pour les événements canvas
        let eventData: string;

        if (event.type === 'chunk' && typeof event.data === 'string') {
          // Pour les chunks de editNoteContent, data est déjà une string (texte brut)
          eventData = `event: chunk\ndata: ${JSON.stringify({
            type: 'chunk',
            data: event.data, // String brute
            position: event.position,
            metadata: event.metadata
          })}\n\n`;
        } else {
          // Autres types d'événements (start, end, error, etc.) ou data non-string
          eventData = `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
        }

        controller.enqueue(encoder.encode(eventData));
      } catch (error) {
        logApi.error(`[ops-listen] Failed to send SSE`, {
          noteId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        isControllerClosed = true;
      }
    };
    
    // ✅ ENREGISTRER LE LISTENER MAINTENANT (AVANT le stream)
    console.error('🔍🔍🔍 [ops-listen] REGISTERING LISTENER BEFORE STREAM', { 
      noteId, 
      userId, 
      timestamp: Date.now() 
    });
    
    try {
      await streamBroadcastService.registerListener(noteId, sendSSE, userId);
      console.error('✅✅✅ [ops-listen] LISTENER REGISTERED BEFORE STREAM', { 
        noteId, 
        userId, 
        timestamp: Date.now() 
      });
      logApi.info(`[ops-listen] ✅ Listener registered BEFORE stream`, { noteId, userId });
    } catch (error) {
      console.error('❌ [ops-listen] Failed to register listener BEFORE stream', {
        noteId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now()
      });
      logApi.error(`[ops-listen] ❌ Failed to register listener BEFORE stream`, {
        noteId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
    
    const stream = new ReadableStream({
      async start(streamController) {
        // ✅ LOG FORCÉ au début du stream
        console.error('🔍🔍🔍 [ops-listen] STREAM START CALLBACK EXECUTED', { 
          noteId, 
          userId, 
          timestamp: Date.now() 
        });
        console.log('🔍 [ops-listen] Stream started', { noteId, userId, timestamp: Date.now() });
        logApi.info(`[ops-listen] Stream started`, { noteId, userId });

        // ✅ STOCKER LE CONTROLLER
        controller = streamController;
        isControllerReady = true;
        
        // ✅ ENVOYER IMMÉDIATEMENT un événement initial pour forcer le démarrage
        try {
          streamController.enqueue(encoder.encode(`event: start\ndata: ${JSON.stringify({ type: 'start', timestamp: Date.now() })}\n\n`));
        } catch (error) {
          console.error('❌ [ops-listen] Failed to send initial event', error);
        }
        
        // ✅ ENVOYER LES ÉVÉNEMENTS EN QUEUE
        while (eventQueue.length > 0) {
          const queuedEvent = eventQueue.shift();
          if (queuedEvent) {
            sendSSE(queuedEvent);
          }
        }

        let heartbeatInterval: NodeJS.Timeout | null = null;

        // ✅ CRITIQUE: Enregistrer le listener AVANT tout (await pour garantir l'enregistrement)
        try {
          console.log('🔍 [ops-listen] Registering listener', { noteId, userId, timestamp: Date.now() });
          await streamBroadcastService.registerListener(noteId, sendSSE, userId);
          console.log('✅ [ops-listen] Listener registered successfully', { noteId, userId, timestamp: Date.now() });
          logApi.info(`[ops-listen] ✅ Listener registered`, { noteId, userId });
          
          sendSSE({
            type: 'start',
            metadata: { timestamp: Date.now() }
          });
        } catch (error) {
          console.error('❌ [ops-listen] Failed to register listener', {
            noteId,
            userId,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: Date.now()
          });
          logApi.error(`[ops-listen] ❌ Failed to register listener`, {
            noteId,
            userId,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          isControllerClosed = true;
          try {
            controller.close();
          } catch {
            // Controller déjà fermé
          }
          return;
        }

        // 💓 Heartbeat pour garder la connexion vivante (toutes les 30s)
        heartbeatInterval = setInterval(() => {
          if (!isControllerClosed) {
            try {
              controller.enqueue(encoder.encode(': ping\n\n'));
            } catch {
              isControllerClosed = true;
              if (heartbeatInterval) {
                clearInterval(heartbeatInterval);
              }
            }
          }
        }, 30000);

        // 🧹 Cleanup quand la connexion se ferme
        request.signal.addEventListener('abort', () => {
          console.error('🔍🔍🔍 [ops-listen] Connection ABORTED by client', {
            noteId,
            userId,
            timestamp: Date.now()
          });
          logApi.info(`[ops-listen] Connection closed by client`, {
            noteId,
            userId
          });

          isControllerClosed = true;

          if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
            heartbeatInterval = null;
          }

          console.log('🔍 [ops-listen] Unregistering listener on abort', { noteId, userId, timestamp: Date.now() });
          streamBroadcastService.unregisterListener(noteId, sendSSE);

          try {
            controller.close();
          } catch {
            // Controller déjà fermé
          }
        });
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Désactiver buffering nginx
        'Access-Control-Allow-Origin': '*', // CORS pour SSE
        'Access-Control-Allow-Headers': 'Cache-Control'
      }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logApi.error(`❌ Canvas ops-listen error: ${errorMessage}`, {
      ...context,
      error: error instanceof Error ? error.stack : undefined
    });

    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

