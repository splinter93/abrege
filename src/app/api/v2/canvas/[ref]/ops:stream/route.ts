/**
 * POST /api/v2/canvas/{ref}/ops:stream
 * 
 * Endpoint de streaming pour l'édition collaborative du canvas
 * 
 * Fonctionnement :
 * - Le client envoie 1-3 opérations atomiques
 * - Le serveur valide, applique en mémoire, retourne ACK/CONFLICT
 * - Persistance différée via checkpoint (10s / 50 ops / fermeture)
 * 
 * Utilisé par :
 * - Humains (éditeur canvas UI)
 * - LLM (agents d'écriture)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logApi, LogCategory } from '@/utils/logger';
import { getAuthenticatedUser, createAuthenticatedSupabaseClient } from '@/utils/authUtils';
import { V2ResourceResolver } from '@/utils/v2ResourceResolver';
import { canvasStateManager, StreamOperation, OpResult } from '@/services/canvasStateManager';
import { calculateETag } from '@/utils/contentApplyUtils';
import { streamBroadcastService } from '@/services/streamBroadcastService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const streamOperationSchema = z.object({
  op_id: z.string().uuid(),
  client_version: z.string(),
  timestamp: z.number(),
  
  // Champs de ContentOperation
  id: z.string(),
  action: z.enum(['insert', 'replace', 'delete', 'upsert_section']),
  target: z.object({
    type: z.enum(['heading', 'regex', 'position', 'anchor']),
    heading: z.object({
      path: z.array(z.string()).optional(),
      level: z.number().optional(),
      heading_id: z.string().optional()
    }).optional(),
    regex: z.object({
      pattern: z.string(),
      flags: z.string().optional(),
      nth: z.number().optional()
    }).optional(),
    position: z.object({
      mode: z.enum(['offset', 'start', 'end']),
      offset: z.number().optional()
    }).optional(),
    anchor: z.object({
      name: z.enum(['doc_start', 'doc_end', 'after_toc', 'before_first_heading'])
    }).optional()
  }),
  where: z.enum(['before', 'after', 'inside_start', 'inside_end', 'at', 'replace_match']),
  content: z.string().optional(),
  options: z.object({
    ensure_heading: z.boolean().optional(),
    surround_with_blank_lines: z.number().optional(),
    dedent: z.boolean().optional()
  }).optional()
});

const payloadSchema = z.object({
  ops: z.array(streamOperationSchema).min(1).max(3), // 1-3 ops max
  canvas_id: z.string().uuid().optional() // Pour le canvas, si fourni
});

// ============================================================================
// ENDPOINT
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ ref: string }> }
): Promise<NextResponse> {
  const startTime = Date.now();
  const { ref } = await params;
  
  const context = {
    operation: 'v2_canvas_ops_stream',
    component: 'API_V2_STREAM',
    ref
  };

  logApi.info(`🚀 Canvas ops:stream pour ${ref}`, context);

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

    // 📋 Valider le payload
    const body = await request.json();
    const validation = payloadSchema.safeParse(body);

    if (!validation.success) {
      logApi.warn('❌ Validation failed', {
        ...context,
        errors: validation.error.errors
      });
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.errors
        },
        { status: 400 }
      );
    }

    const { ops, canvas_id } = validation.data;

    // 🔍 Résoudre la référence (canvas_id ou ref)
    let canvasId: string;
    let noteId: string;

    if (canvas_id) {
      // Utiliser le canvas_id fourni
      canvasId = canvas_id;
      
      // Récupérer le noteId associé
      const supabase = createAuthenticatedSupabaseClient(authResult);
      const { data: canvaSession, error: fetchError } = await supabase
        .from('canva_sessions')
        .select('note_id')
        .eq('id', canvasId)
        .eq('user_id', userId)
        .single();

      if (fetchError || !canvaSession) {
        logApi.warn(`❌ Canvas session non trouvée: ${canvasId}`, context);
        return NextResponse.json(
          { error: 'Canvas session non trouvée ou accès refusé' },
          { status: 404 }
        );
      }

      noteId = canvaSession.note_id;
    } else {
      // Résoudre ref → noteId
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

      noteId = resolveResult.id;
      canvasId = noteId; // Utiliser noteId comme canvasId si pas de canvas spécifique
    }

    // 🔄 Initialiser l'état si nécessaire
    let state = canvasStateManager.getState(canvasId);

    if (!state) {
      // Charger le contenu initial depuis la DB
      const supabase = createAuthenticatedSupabaseClient(authResult);
      const { data: note, error: fetchError } = await supabase
        .from('articles')
        .select('markdown_content')
        .eq('id', noteId)
        .eq('user_id', userId)
        .single();

      if (fetchError || !note) {
        logApi.warn(`❌ Note non trouvée: ${noteId}`, context);
        return NextResponse.json(
          { error: 'Note non trouvée ou accès refusé' },
          { status: 404 }
        );
      }

      const initialContent = note.markdown_content || '';
      const initialEtag = calculateETag(initialContent);

      await canvasStateManager.initializeState(
        canvasId,
        noteId,
        userId,
        initialContent,
        initialEtag
      );

      state = canvasStateManager.getState(canvasId)!;
    }

    // 🔧 Appliquer les opérations
    // ⚠️ IMPORTANT : Les opérations d'un batch sont traitées SÉQUENTIELLEMENT
    // Si l'une échoue avec CONFLICT, les suivantes sont ignorées
    // Le client doit renvoyer avec la bonne version
    const results: OpResult[] = [];
    let shouldStop = false;

    for (const op of ops) {
      if (shouldStop) {
        // Si une op précédente a échoué, skip les suivantes
        results.push({
          op_id: (op as StreamOperation).op_id,
          status: 'error',
          error: 'Opération précédente a échoué, batch interrompu'
        });
        continue;
      }

      const result = await canvasStateManager.applyOperation(canvasId, op as StreamOperation);
      results.push(result);

      // Si CONFLICT ou ERROR, arrêter le batch
      if (result.status === 'conflict' || result.status === 'error') {
        shouldStop = true;
      }

      // Broadcaster l'événement aux autres clients (SSE)
      if (result.status === 'ack') {
        streamBroadcastService.broadcast(noteId, {
          type: 'chunk',
          data: JSON.stringify({
            event: 'ack',
            op_id: result.op_id,
            status: 'applied',
            server_version: result.server_version
          }),
          metadata: {
            source: 'canvas_ops_stream',
            timestamp: Date.now()
          }
        });
      } else if (result.status === 'conflict') {
        streamBroadcastService.broadcast(noteId, {
          type: 'chunk',
          data: JSON.stringify({
            event: 'conflict',
            op_id: result.op_id,
            reason: result.reason,
            expected_version: result.expected_version
          }),
          metadata: {
            source: 'canvas_ops_stream',
            timestamp: Date.now()
          }
        });
      }
    }

    const duration = Date.now() - startTime;
    logApi.info(`✅ Canvas ops:stream traité en ${duration}ms`, {
      ...context,
      canvasId,
      noteId,
      opsCount: ops.length,
      results: results.map(r => ({ op_id: r.op_id, status: r.status }))
    });

    // ✅ IMPORTANT : Le POST retourne un accusé technique uniquement (202 Accepted)
    // Les résultats métier (ACK/CONFLICT) sont émis via SSE pour TOUS les clients
    // Ceci garantit une source de vérité unique : le canal SSE
    return NextResponse.json(
      {
        accepted: true,
        ops_count: ops.length,
        duration
      },
      { status: 202 }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logApi.error(LogCategory.API, `❌ Canvas ops:stream error: ${errorMessage}`, {
      ...context,
      error: error instanceof Error ? error.stack : undefined
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

