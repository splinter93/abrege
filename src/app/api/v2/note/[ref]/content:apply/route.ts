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
import { ContentApplier, calculateETag, generateDiff } from '@/utils/contentApplyUtils';
import { updateArticleInsight } from '@/utils/insightUpdater';
import { sanitizeMarkdownContent } from '@/utils/markdownSanitizer.server';

// ✅ FIX PROD: Force Node.js runtime pour accès aux variables d'env (SUPABASE_SERVICE_ROLE_KEY)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';


// ============================================================================
// ERROR CODES
// ============================================================================

const CONTENT_APPLY_ERRORS = {
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
      logApi.info('❌ Validation échouée', context);
      return createValidationErrorResponse(validationResult);
    }

    const { ops, transaction, conflict_strategy, return: returnType, idempotency_key } = validationResult.data;
    
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
    const sanitizedOps = ops.map(op => ({
      ...op,
      content: op.content ? sanitizeMarkdownContent(op.content) : op.content
    }));
    
    // 🔧 Appliquer les opérations de contenu (avec contenu sanitizé)
    const applier = new ContentApplier(currentNote.markdown_content);
    const result = await applier.applyOperations(sanitizedOps);

    // 🛡️ Le contenu est déjà sanitizé (chaque op a été sanitizée ligne 150)
    // Pas besoin de re-sanitizer ici (causerait un double échappement)
    const safeContent = result.content;
    
    // 💾 Sauvegarder les modifications
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

    // 🎯 Le polling ciblé est maintenant géré côté client par V2UnifiedApi

    // 📊 Mettre à jour les insights si nécessaire
    try {
      await updateArticleInsight(noteId, result.content);
    } catch (insightError) {
      logApi.warn('⚠️ Erreur lors de la mise à jour des insights', insightError);
    }

    const apiTime = Date.now() - startTime;
    logApi.info(`✅ Contenu appliqué avec succès en ${apiTime}ms`, context);

    // 📤 Construire la réponse
    const response: { data: { content?: string; diff?: string; operations_applied: number; dry_run: boolean } } = {
      data: {
        note_id: noteId,
        ops_results: result.results,
        etag: calculateETag(result.content)
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

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Valide l'ETag ou la version de la note
 */
async function validateETag(
  supabase: ReturnType<typeof createClient>,
  noteId: string,
  ifMatch?: string | null,
  xNoteVersion?: string | null
): Promise<{ valid: boolean; etag?: string; message?: string }> {
  try {
    // Récupérer la version actuelle de la note
    const { data: note, error } = await supabase
      .from('articles')
      .select('updated_at, markdown_content')
      .eq('id', noteId)
      .single();

    if (error || !note) {
      return { valid: false, message: 'Note non trouvée' };
    }

    const currentETag = calculateETag(note.markdown_content);
    
    // Vérifier l'ETag
    if (ifMatch && ifMatch !== currentETag) {
      return { 
        valid: false, 
        etag: currentETag, 
        message: `ETag mismatch: expected ${ifMatch}, got ${currentETag}` 
      };
    }

    // Vérifier la version (simplifiée)
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
    logApi.error('❌ Erreur validation ETag', { error: errorMessage, noteId });
    return { valid: false, message: 'Erreur lors de la validation' };
  }
}
