/**
 * GET /api/v2/canvas/{ref}/ops-listen
 * 
 * Endpoint SSE pour écouter les événements de streaming canvas
 * ALTERNATIVE à ops:listen (sans : pour éviter problèmes de routing Next.js)
 */

import { NextRequest } from 'next/server';
import { logApi } from '@/utils/logger';
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
  
  logApi.info(`🎧 Canvas ops-listen pour ${ref}`, {
    operation: 'v2_canvas_ops_listen',
    component: 'API_V2_STREAM',
    ref,
    url: request.url,
    method: request.method,
    hasToken: !!request.nextUrl.searchParams.get('token')
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
      logApi.warn(`❌ Auth failed: ${authResult.error}`, {
        ...context,
        error: authResult.error,
        status: authResult.status
      });
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
      logApi.warn(`❌ Note resolution failed: ${resolveResult.error}`, {
        ...context,
        error: resolveResult.error,
        status: resolveResult.status
      });
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
    
    // ✅ FIX: Ne PAS enregistrer le listener avant le stream
    // Le listener doit être enregistré DANS le callback start() après que controller soit défini
    // Sinon sendSSE ne peut pas fonctionner car controller = null
    
    const stream = new ReadableStream({
      async start(streamController) {
        logApi.info(`[ops-listen] Stream started`, { noteId, userId });

        // ✅ STOCKER LE CONTROLLER
        controller = streamController;
        isControllerReady = true;
        
        // ✅ CRITIQUE: Enregistrer le listener IMMÉDIATEMENT après que controller soit défini
        // AVANT d'envoyer les événements en queue pour éviter de perdre des événements
        try {
          await streamBroadcastService.registerListener(noteId, sendSSE, userId);
          
          // ✅ VÉRIFIER que le listener est bien enregistré
          const listenerCount = streamBroadcastService.getListenerCount(noteId);
          logApi.info(`[ops-listen] ✅ Listener registered`, { noteId, userId, listenerCount });
        } catch (error) {
          logApi.error(`[ops-listen] ❌ Failed to register listener`, {
            noteId,
            userId,
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
          });
          isControllerClosed = true;
          try {
            controller.close();
          } catch (closeError) {
            logApi.warn(`[ops-listen] Error closing controller after registration failure`, {
              noteId,
              userId,
              error: closeError instanceof Error ? closeError.message : 'Unknown error'
            });
          }
          return;
        }
        
        // ✅ ENVOYER IMMÉDIATEMENT un événement initial pour forcer le démarrage
        try {
          streamController.enqueue(encoder.encode(`event: start\ndata: ${JSON.stringify({ type: 'start', timestamp: Date.now() })}\n\n`));
        } catch (error) {
          logApi.warn(`[ops-listen] Failed to send initial event`, {
            noteId,
            userId,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
        
        // ✅ ENVOYER LES ÉVÉNEMENTS EN QUEUE (après l'enregistrement du listener)
        while (eventQueue.length > 0) {
          const queuedEvent = eventQueue.shift();
          if (queuedEvent) {
            sendSSE(queuedEvent);
          }
        }

        let heartbeatInterval: NodeJS.Timeout | null = null;

        // 💓 Heartbeat pour garder la connexion vivante (toutes les 30s)
        heartbeatInterval = setInterval(() => {
          if (!isControllerClosed && controller) {
            try {
              controller.enqueue(encoder.encode(': ping\n\n'));
            } catch (error) {
              isControllerClosed = true;
              if (heartbeatInterval) {
                clearInterval(heartbeatInterval);
              }
              logApi.warn(`[ops-listen] Heartbeat failed, closing connection`, {
                noteId,
                userId,
                error: error instanceof Error ? error.message : 'Unknown error'
              });
            }
          }
        }, 30000);

        // 🧹 Cleanup quand la connexion se ferme
        request.signal.addEventListener('abort', () => {
          logApi.info(`[ops-listen] Connection closed by client`, {
            noteId,
            userId
          });

          isControllerClosed = true;

          if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
            heartbeatInterval = null;
          }

          streamBroadcastService.unregisterListener(noteId, sendSSE);

          try {
            if (controller) {
              controller.close();
            }
          } catch (error) {
            logApi.warn(`[ops-listen] Error closing controller on abort`, {
              noteId,
              userId,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
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

