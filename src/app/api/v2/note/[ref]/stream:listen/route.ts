/**
 * 🎧 GET /api/v2/note/{ref}/stream:listen
 * 
 * Endpoint d'écoute SSE pour streaming LLM
 * Les clients se connectent via EventSource pour recevoir les chunks en temps réel
 * 
 * Flow:
 * 1. Client ouvre EventSource('/api/v2/note/{ref}/stream:listen')
 * 2. Serveur enregistre le listener dans StreamBroadcastService
 * 3. Quand un agent écrit via /stream:write, chunks diffusés ici
 * 4. Client reçoit events SSE et affiche dans TipTap
 */

import { NextRequest } from 'next/server';
import { logApi } from '@/utils/logger';
import { V2ResourceResolver } from '@/utils/v2ResourceResolver';
import { getAuthenticatedUser } from '@/utils/authUtils';
import { streamBroadcastService, type StreamEvent } from '@/services/streamBroadcastService';

// Force Node.js runtime pour SSE
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET endpoint - Connexion SSE pour écouter les updates d'une note
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ref: string }> }
) {
  const startTime = Date.now();
  const { ref } = await params;
  
  const context = {
    operation: 'v2_note_stream_listen',
    component: 'API_V2_STREAM',
    ref
  };

  logApi.info(`🎧 Début écoute stream note ${ref}`, context);

  try {
    // 🔐 Authentification - Accepter token en query param pour SSE (EventSource ne peut pas envoyer headers)
    const url = new URL(request.url);
    const tokenParam = url.searchParams.get('token');
    
    let authResult;
    if (tokenParam) {
      // Créer une requête avec le token dans le header pour la validation
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

    logApi.info(`✅ Stream listener initialized for note ${noteId}`, {
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
         * Envoyer un event SSE
         */
        const sendSSE = (event: StreamEvent) => {
          if (isControllerClosed) return;

          try {
            const data = `data: ${JSON.stringify(event)}\n\n`;
            controller.enqueue(encoder.encode(data));
          } catch (error) {
            logApi.error(`[StreamListen] Failed to send SSE`, {
              noteId,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
            // Marquer comme fermé pour éviter de futures tentatives
            isControllerClosed = true;
          }
        };

        // 📡 Enregistrer le listener dans le service
        streamBroadcastService.registerListener(noteId, sendSSE, userId).then(() => {
          logApi.info(`✅ Listener registered for note ${noteId}`, {
            noteId,
            userId
          });
        });

        // 💓 Heartbeat pour garder la connexion vivante (toutes les 30s)
        heartbeatInterval = setInterval(() => {
          if (!isControllerClosed) {
            try {
              controller.enqueue(encoder.encode(': ping\n\n'));
            } catch {
              // Connexion fermée, on nettoie
              isControllerClosed = true;
              if (heartbeatInterval) {
                clearInterval(heartbeatInterval);
              }
            }
          }
        }, 30000);

        // 🧹 Cleanup quand la connexion se ferme
        request.signal.addEventListener('abort', () => {
          logApi.info(`[StreamListen] Connection closed by client`, {
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

        // Envoyer un event initial de connexion
        sendSSE({
          type: 'start',
          metadata: {
            timestamp: Date.now()
          }
        });
      }
    });

    // Retourner le stream avec headers SSE
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no' // Désactiver buffering nginx
      }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logApi.error(`❌ Stream listen error: ${errorMessage}`, {
      ...context,
      error: error instanceof Error ? error.stack : undefined
    });

    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

