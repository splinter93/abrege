/**
 * 📝 POST /api/v2/note/{ref}/content:apply
 * 
 * Applique des opérations de contenu sur une note
 * 
 * Opérations supportées :
 * - insert : Insérer du contenu
 * - replace : Remplacer du contenu
 * - delete : Supprimer du contenu
 * - upsert_section : Créer ou mettre à jour une section
 * 
 * Types de cibles :
 * - heading : Cibler par titre (chemin, niveau, ID)
 * - regex : Cibler par expression régulière
 * - position : Cibler par position (début, fin, offset)
 * - anchor : Cibler par ancre sémantique
 */

import { NextRequest, NextResponse } from 'next/server';
import { logApi } from '@/utils/logger';
import { V2ResourceResolver } from '@/utils/v2ResourceResolver';
import { getAuthenticatedUser, createAuthenticatedSupabaseClient, extractTokenFromRequest } from '@/utils/authUtils';
import { contentApplyV2Schema, validatePayload, createValidationErrorResponse } from '@/utils/v2ValidationSchemas';
import {
  ContentApplier,
  calculateETag,
  generateDiff,
  validateETag,
  isCanvaOpen,
  CONTENT_APPLY_ERRORS
} from '@/utils/contentApplyUtils';
import { updateArticleInsight } from '@/utils/insightUpdater';
import { sanitizeMarkdownContent } from '@/utils/markdownSanitizer.server';
import { sendStreamEvent } from '@/services/supabaseRealtimeBroadcast';
import { contentStreamer } from '@/services/contentStreamer';
import type { ContentOperation } from '@/utils/contentApplyUtils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ============================================================================
// MAIN ENDPOINT
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ ref: string }> }
): Promise<NextResponse> {
  
  const { ref } = await params;
  const clientType = request.headers.get('X-Client-Type') || 'unknown';
  const context = {
    operation: 'v2_note_content_apply',
    component: 'API_V2',
    ref,
    clientType
  };

  const startTime = Date.now();
  logApi.info(`🚀 Début application contenu note V2 ${ref}`, context);

  try {
    // 🔐 Authentification
    const authResult = await getAuthenticatedUser(request);
    if (!authResult.success) {
      logApi.info(`❌ Authentification échouée: ${authResult.error}`, context);
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status || 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const userId = authResult.userId!;
    const userToken = extractTokenFromRequest(request);
    const supabase = createAuthenticatedSupabaseClient(authResult, userToken || undefined);

    // 🔍 Résoudre la référence (UUID ou slug)
    const resolveResult = await V2ResourceResolver.resolveRef(ref, 'note', userId, context);
    if (!resolveResult.success) {
      return NextResponse.json(
        { error: resolveResult.error },
        { status: resolveResult.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const noteId = resolveResult.id;

    // 📋 Récupérer et valider le body
    const body = await request.json();
    const validationResult = validatePayload(contentApplyV2Schema, body);
    
    if (!validationResult.success) {
      return createValidationErrorResponse(validationResult, context);
    }

    const { ops, return: returnType, transaction } = validationResult.data;
    
    // ✅ SIMPLIFICATION: dry_run supprimé (inutile et confus)
    // Si besoin de preview: utiliser return: "diff" et annuler manuellement

    // 🔒 Vérifier l'ETag si fourni
    const ifMatch = request.headers.get('If-Match');
    const xNoteVersion = request.headers.get('X-Note-Version');
    
    if (ifMatch || xNoteVersion) {
      const etagResult = await validateETag(supabase, noteId, ifMatch, xNoteVersion);
      if (!etagResult.valid) {
        return NextResponse.json(
          { 
            error: 'PRECONDITION_FAILED',
            code: CONTENT_APPLY_ERRORS.PRECONDITION_FAILED.code,
            message: etagResult.message || 'Version de la note obsolète',
            current_etag: etagResult.etag
          },
          { 
            status: CONTENT_APPLY_ERRORS.PRECONDITION_FAILED.status,
            headers: { 
              "Content-Type": "application/json",
              ...(etagResult.etag && { "ETag": etagResult.etag })
            }
          }
        );
      }
    }

    // 📄 Récupérer le contenu actuel de la note
    const { data: currentNote, error: fetchError } = await supabase
      .from('articles')
      .select('id, markdown_content, updated_at')
      .eq('id', noteId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !currentNote) {
      logApi.info(`❌ Note non trouvée ou accès refusé: ${noteId}`, context);
      return NextResponse.json(
        { error: 'Note non trouvée' },
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // 🛡️ Sanitizer le contenu de chaque opération AVANT de les appliquer
    const sanitizedOps = ops.map(op => {
      const heading = op.target.heading
        ? {
            ...op.target.heading,
            path: op.target.heading.path ?? []
          }
        : undefined;

      return {
        ...op,
        target: {
          ...op.target,
          heading
        },
        content: op.content ? sanitizeMarkdownContent(op.content) : op.content
      };
    });
    
    // 🔧 Appliquer les opérations de contenu (avec contenu sanitizé)
    const applier = new ContentApplier(currentNote.markdown_content);
    const result = await applier.applyOperations(sanitizedOps, { transaction });

    const safeContent = result.content;

    // 🌊 Détecter si canva ouvert → streaming automatique vers le client
    const shouldStream = await isCanvaOpen(supabase, noteId, userId);
    logApi.info(`[content:apply] Canva status: ${shouldStream ? 'open (streaming enabled)' : 'closed'}`, {
      ...context,
      noteId,
      shouldStream
    });

    if (shouldStream) {
      try {
        await contentStreamer.streamContent(
          noteId,
          currentNote.markdown_content,
          safeContent,
          sanitizedOps,
          { chunkSize: 80, delayMs: 15 },
          result.results
        );
        logApi.info('[content:apply] Streaming completed', { ...context, noteId });
      } catch (streamError) {
        logApi.warn('[content:apply] Stream failed, continuing with DB save', {
          ...context,
          noteId,
          error: streamError instanceof Error ? streamError.message : 'Unknown error'
        });
      }
    }

    // 💾 Toujours sauvegarder en DB (garantit fraîcheur pour appels LLM enchaînés)
    const { data: updatedNote, error: updateError } = await supabase
      .from('articles')
      .update({
        markdown_content: safeContent,
        updated_at: new Date().toISOString()
      })
      .eq('id', noteId)
      .eq('user_id', userId)
      .select('id, markdown_content, updated_at')
      .single();

    if (updateError || !updatedNote) {
      logApi.error(`❌ Erreur mise à jour note: ${updateError?.message}`, context);
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour' },
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // 📊 Mettre à jour les insights si nécessaire
    try {
      await updateArticleInsight(noteId);
    } catch (insightError) {
      logApi.warn('⚠️ Erreur lors de la mise à jour des insights', insightError);
    }

    const apiTime = Date.now() - startTime;
    logApi.info(`✅ Contenu appliqué avec succès en ${apiTime}ms`, context);

    // 📤 Construire la réponse
    const response = {
      data: {
        diff: undefined as string | undefined,
        content: undefined as string | undefined,
        note_id: noteId,
        ops_results: result.results,
        etag: calculateETag(result.content),
        streaming_enabled: shouldStream,
        saved_to_db: true
      },
      meta: {
        char_diff: result.charDiff,
        execution_time: apiTime
      }
    };

    // Ajouter le diff ou le contenu selon le type de retour demandé
    if (returnType === 'diff') {
      response.data.diff = generateDiff(currentNote.markdown_content, result.content);
    } else if (returnType === 'content') {
      response.data.content = result.content;
    }

    // 🔔 NOTIFICATION : Notifier les clients que le contenu a été mis à jour via Supabase Realtime
    // useEditorStreamListener écoute cet événement et recharge le contenu depuis l'API
    const notifySent = await sendStreamEvent(noteId, 'content_updated', {
      note_id: noteId,
      etag: response.data.etag,
      ops_count: ops.length,
      char_diff: result.charDiff,
      metadata: {
        source: 'content:apply',
        timestamp: Date.now()
      }
    });
    if (notifySent) {
      logApi.info(`📡 Notification content_updated envoyée pour note ${noteId}`, {
        ...context,
        opsCount: ops.length
      });
    } else {
      logApi.warn('⚠️ Notification content_updated non envoyée (Supabase indisponible)', context);
    }

    // Ajouter les headers de réponse
    const headers = {
      "Content-Type": "application/json",
      "ETag": response.data.etag
    };

    return NextResponse.json(response, { status: 200, headers });

  } catch (error) {
    const apiTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    logApi.error(`❌ Erreur serveur: ${errorMessage}`, { ...context, apiTime });
    
    // Gérer les erreurs spécifiques
    if (error instanceof Error) {
      if (error.message.includes('REGEX_COMPILE_ERROR')) {
        return NextResponse.json(
          { 
            error: 'Erreur de compilation regex',
            code: CONTENT_APPLY_ERRORS.REGEX_COMPILE_ERROR.code,
            message: errorMessage
          },
          { status: CONTENT_APPLY_ERRORS.REGEX_COMPILE_ERROR.status, headers: { "Content-Type": "application/json" } }
        );
      }
      
      if (error.message.includes('REGEX_TIMEOUT')) {
        return NextResponse.json(
          { 
            error: 'Timeout regex',
            code: CONTENT_APPLY_ERRORS.REGEX_TIMEOUT.code,
            message: errorMessage
          },
          { status: CONTENT_APPLY_ERRORS.REGEX_TIMEOUT.status, headers: { "Content-Type": "application/json" } }
        );
      }

      if (error.message.includes('CONTENT_TOO_LARGE')) {
        return NextResponse.json(
          { 
            error: 'Contenu trop volumineux',
            code: CONTENT_APPLY_ERRORS.CONTENT_TOO_LARGE.code,
            message: errorMessage
          },
          { status: CONTENT_APPLY_ERRORS.CONTENT_TOO_LARGE.status, headers: { "Content-Type": "application/json" } }
        );
      }
    }
    
    return NextResponse.json(
      { 
        error: 'Erreur interne du serveur',
        code: 'INTERNAL_SERVER_ERROR',
        message: errorMessage
      },
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
