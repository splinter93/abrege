/**
 * GET /api/v2/canvas/{ref}/ops:listen
 * 
 * Endpoint SSE pour écouter les événements de streaming canvas
 * 
 * Événements émis :
 * - ACK : opération acceptée par un autre client
 * - CONFLICT : conflit de version détecté
 * - PATCH : correction serveur (rare)
 * 
 * Utilisé par le frontend pour synchroniser l'état local
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
  
  const context = {
    operation: 'v2_canvas_ops_listen',
    component: 'API_V2_STREAM',
    ref
  };

  logApi.info(`🎧 Canvas ops:listen pour ${ref}`, context);

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

    logApi.info(`✅ Canvas ops:listen initialisé`, {
      ...context,
      noteId,
      userId,
      duration: Date.now() - startTime
    });

    // 🌊 Créer le stream SSE
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        let heartbeatInterval: NodeJS.Timeout | null = null;
        let isControllerClosed = false;

        /**
         * Envoyer un événement SSE
         */
        const sendSSE = (event: StreamEvent) => {
          if (isControllerClosed) return;

          try {
            // Format SSE pour les événements canvas
            let eventData: string;

            if (event.type === 'chunk' && event.data) {
              // Les événements "chunk" contiennent du JSON stringifié
              // On le parse pour renvoyer un événement structuré
              try {
                const parsed = JSON.parse(event.data);
                eventData = `event: ${parsed.event}\ndata: ${JSON.stringify(parsed)}\n\n`;
              } catch {
                // Si parsing échoue, envoyer tel quel
                eventData = `data: ${event.data}\n\n`;
              }
            } else {
              // Autres types d'événements
              eventData = `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
            }

            controller.enqueue(encoder.encode(eventData));
          } catch (error) {
            logApi.error(`[ops:listen] Failed to send SSE`, {
              noteId,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
            isControllerClosed = true;
          }
        };

        // 📡 Enregistrer le listener dans le service
        streamBroadcastService.registerListener(noteId, sendSSE, userId);

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
          logApi.info(LogCategory.API, `[ops:listen] Connection closed by client`, {
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
            controller.close();
          } catch {
            // Controller déjà fermé
          }
        });

        // Envoyer un événement initial de connexion
        sendSSE({
          type: 'start',
          metadata: {
            timestamp: Date.now()
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
    logApi.error(`❌ Canvas ops:listen error: ${errorMessage}`, {
      ...context,
      error: error instanceof Error ? error.stack : undefined
    });

    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

