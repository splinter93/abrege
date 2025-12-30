/**
 * ✏️ POST /api/v2/note/{ref}/editNoteContent
 * 
 * Applique des opérations de contenu avec streaming automatique si canva/éditeur ouvert
 * 
 * Identique à content:apply mais stream automatiquement le résultat si un canva
 * avec status='open' existe pour cette note.
 * 
 * Le LLM fait des opérations normales, le serveur gère le streaming automatiquement.
 */

import { NextRequest, NextResponse } from 'next/server';
import { type SupabaseClient } from '@supabase/supabase-js';
import { logApi } from '@/utils/logger';
import { V2ResourceResolver } from '@/utils/v2ResourceResolver';
import { getAuthenticatedUser, createAuthenticatedSupabaseClient, extractTokenFromRequest } from '@/utils/authUtils';
import { contentApplyV2Schema, validatePayload, createValidationErrorResponse } from '@/utils/v2ValidationSchemas';
import { ContentApplier, calculateETag, generateDiff } from '@/utils/contentApplyUtils';
import { updateArticleInsight } from '@/utils/insightUpdater';
import { sanitizeMarkdownContent } from '@/utils/markdownSanitizer.server';
import { contentStreamer } from '@/services/contentStreamer';
import type { ContentOperation } from '@/utils/contentApplyUtils';

// Force Node.js runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ============================================================================
// ERROR CODES
// ============================================================================

const EDIT_NOTE_CONTENT_ERRORS = {
  TARGET_NOT_FOUND: { code: 'TARGET_NOT_FOUND', status: 404 },
  AMBIGUOUS_MATCH: { code: 'AMBIGUOUS_MATCH', status: 409 },
  REGEX_COMPILE_ERROR: { code: 'REGEX_COMPILE_ERROR', status: 400 },
  REGEX_TIMEOUT: { code: 'REGEX_TIMEOUT', status: 408 },
  PRECONDITION_FAILED: { code: 'PRECONDITION_FAILED', status: 412 },
  PARTIAL_APPLY: { code: 'PARTIAL_APPLY', status: 207 },
  CONTENT_TOO_LARGE: { code: 'CONTENT_TOO_LARGE', status: 413 },
  INVALID_OPERATION: { code: 'INVALID_OPERATION', status: 400 }
} as const;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Vérifie si un canva est ouvert pour cette note
 */
async function isCanvaOpen(
  supabase: SupabaseClient,
  noteId: string,
  userId: string
): Promise<boolean> {
  try {
    const { data: openCanva, error } = await supabase
      .from('canva_sessions')
      .select('id, status')
      .eq('note_id', noteId)
      .eq('status', 'open')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      logApi.warn('[editNoteContent] Error checking canva status', {
        noteId,
        error: error.message
      });
      return false;
    }

    return !!openCanva;
  } catch (error) {
    logApi.warn('[editNoteContent] Exception checking canva status', {
      noteId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return false;
  }
}

/**
 * Valide l'ETag ou la version de la note
 */
async function validateETag(
  supabase: SupabaseClient,
  noteId: string,
  ifMatch?: string | null,
  xNoteVersion?: string | null
): Promise<{ valid: boolean; etag?: string; message?: string }> {
  try {
    const { data: note, error } = await supabase
      .from('articles')
      .select('updated_at, markdown_content')
      .eq('id', noteId)
      .single();

    if (error || !note) {
      return { valid: false, message: 'Note non trouvée' };
    }

    const currentETag = calculateETag(note.markdown_content);

    if (ifMatch && ifMatch !== currentETag) {
      return {
        valid: false,
        etag: currentETag,
        message: `ETag mismatch: expected ${ifMatch}, got ${currentETag}`
      };
    }

    if (xNoteVersion) {
      const version = parseInt(xNoteVersion);
      if (isNaN(version)) {
        return { valid: false, message: 'Version invalide' };
      }
      const currentVersion = new Date(note.updated_at).getTime();
      if (version !== currentVersion) {
        return {
          valid: false,
          etag: currentETag,
          message: `Version mismatch: expected ${version}, got ${currentVersion}`
        };
      }
    }

    return { valid: true, etag: currentETag };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    logApi.error('[editNoteContent] Error validating ETag', { error: errorMessage, noteId });
    return { valid: false, message: 'Erreur lors de la validation' };
  }
}

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
    operation: 'v2_note_edit_note_content',
    component: 'API_V2',
    ref,
    clientType
  };

  const startTime = Date.now();
  logApi.info(`🚀 Début editNoteContent note V2 ${ref}`, context);

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
      logApi.info('❌ Validation échouée', context);
      return createValidationErrorResponse(validationResult);
    }

    const { ops, transaction, conflict_strategy, return: returnType, idempotency_key } = validationResult.data;

    // 🔒 Vérifier l'ETag si fourni
    const ifMatch = request.headers.get('If-Match');
    const xNoteVersion = request.headers.get('X-Note-Version');

    if (ifMatch || xNoteVersion) {
      const etagResult = await validateETag(supabase, noteId, ifMatch, xNoteVersion);
      if (!etagResult.valid) {
        return NextResponse.json(
          {
            error: 'PRECONDITION_FAILED',
            code: EDIT_NOTE_CONTENT_ERRORS.PRECONDITION_FAILED.code,
            message: etagResult.message || 'Version de la note obsolète',
            current_etag: etagResult.etag
          },
          {
            status: EDIT_NOTE_CONTENT_ERRORS.PRECONDITION_FAILED.status,
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

    // 🎯 Détecter si canva ouvert (pour streaming automatique)
    const shouldStream = await isCanvaOpen(supabase, noteId, userId);
    console.log('🔍 [editNoteContent] Canva check', { noteId, userId, shouldStream, timestamp: Date.now() });
    logApi.info(`[editNoteContent] Canva status: ${shouldStream ? 'open (streaming enabled)' : 'closed (batch mode)'}`, {
      ...context,
      noteId,
      shouldStream
    });

    // 🛡️ Sanitizer le contenu de chaque opération AVANT de les appliquer
    const sanitizedOps: ContentOperation[] = ops.map(op => {
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
    const result = await applier.applyOperations(sanitizedOps);

    const safeContent = result.content;

    // 🌊 STREAMING AUTOMATIQUE si canva ouvert
    if (shouldStream) {
      console.log('🔍 [editNoteContent] Starting stream', { noteId, oldLength: currentNote.markdown_content.length, newLength: safeContent.length, timestamp: Date.now() });
      try {
        // Stream le résultat progressivement (non bloquant)
        // ⚠️ IMPORTANT : Si canva ouvert, on stream LOCALEMENT uniquement
        // La sauvegarde DB se fera via l'auto-save du canva (toutes les 2s)
        await contentStreamer.streamContent(
          noteId,
          currentNote.markdown_content,
          safeContent,
          sanitizedOps,
          {
            chunkSize: 80,
            delayMs: 15,
            position: undefined // Détecté automatiquement depuis ops
          }
        ).catch((streamError) => {
          // Erreur de streaming non bloquante
          logApi.warn('[editNoteContent] Streaming failed (non-blocking)', {
            ...context,
            noteId,
            error: streamError instanceof Error ? streamError.message : 'Unknown error'
          });
        });

        // ✅ Canva ouvert : pas de sauvegarde DB immédiate
        // Le contenu sera sauvegardé via l'auto-save du canva (ChatCanvaPane, toutes les 2s)
        logApi.info('[editNoteContent] Streaming local activé, sauvegarde DB via auto-save', {
          ...context,
          noteId
        });
      } catch (streamError) {
        logApi.warn('[editNoteContent] Streaming exception (non-blocking)', {
          ...context,
          noteId,
          error: streamError instanceof Error ? streamError.message : 'Unknown error'
        });
      }
    } else {
      // 💾 Canva fermé : sauvegarde DB normale (comme content:apply)
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
    }

    // 📊 Mettre à jour les insights si nécessaire
    try {
      await updateArticleInsight(noteId);
    } catch (insightError) {
      logApi.warn('⚠️ Erreur lors de la mise à jour des insights', insightError);
    }

    const apiTime = Date.now() - startTime;
    logApi.info(`✅ editNoteContent terminé en ${apiTime}ms (streaming: ${shouldStream ? 'yes (local only)' : 'no (saved to DB)'})`, context);

    // 📤 Construire la réponse
    // Si canva ouvert : ETag basé sur le nouveau contenu (pas encore en DB)
    // Si canva fermé : ETag basé sur la note sauvegardée
    const response = {
      data: {
        diff: undefined as string | undefined,
        content: undefined as string | undefined,
        note_id: noteId,
        ops_results: result.results,
        etag: shouldStream 
          ? calculateETag(safeContent) // ETag du contenu streamé (local)
          : calculateETag(safeContent), // ETag du contenu sauvegardé
        streaming_enabled: shouldStream,
        saved_to_db: !shouldStream // Indique si sauvegardé en DB
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
            code: EDIT_NOTE_CONTENT_ERRORS.REGEX_COMPILE_ERROR.code,
            message: errorMessage
          },
          { status: EDIT_NOTE_CONTENT_ERRORS.REGEX_COMPILE_ERROR.status, headers: { "Content-Type": "application/json" } }
        );
      }

      if (error.message.includes('REGEX_TIMEOUT')) {
        return NextResponse.json(
          {
            error: 'Timeout regex',
            code: EDIT_NOTE_CONTENT_ERRORS.REGEX_TIMEOUT.code,
            message: errorMessage
          },
          { status: EDIT_NOTE_CONTENT_ERRORS.REGEX_TIMEOUT.status, headers: { "Content-Type": "application/json" } }
        );
      }

      if (error.message.includes('CONTENT_TOO_LARGE')) {
        return NextResponse.json(
          {
            error: 'Contenu trop volumineux',
            code: EDIT_NOTE_CONTENT_ERRORS.CONTENT_TOO_LARGE.code,
            message: errorMessage
          },
          { status: EDIT_NOTE_CONTENT_ERRORS.CONTENT_TOO_LARGE.status, headers: { "Content-Type": "application/json" } }
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

