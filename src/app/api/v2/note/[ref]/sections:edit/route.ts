/**
 * POST /api/v2/note/{ref}/sections:edit
 * Édition TOC-first (slug retourné par getNoteTOC).
 */

import { NextRequest, NextResponse } from 'next/server';
import { logApi } from '@/utils/logger';
import { V2ResourceResolver } from '@/utils/v2ResourceResolver';
import { getAuthenticatedUser, createAuthenticatedSupabaseClient, extractTokenFromRequest } from '@/utils/authUtils';
import {
  sectionEditV2Schema,
  validatePayload,
  createValidationErrorResponse
} from '@/utils/v2ValidationSchemas';
import { calculateETag, generateDiff, validateETag, isCanvaOpen, CONTENT_APPLY_ERRORS } from '@/utils/contentApplyUtils';
import { updateArticleInsight } from '@/utils/insightUpdater';
import { sanitizeMarkdownContent } from '@/utils/markdownSanitizer.server';
import { sendStreamEvent } from '@/services/supabaseRealtimeBroadcast';
import { contentStreamer } from '@/services/contentStreamer';
import {
  applySectionEdit,
  tocSummaryForResponse,
  type SectionEditPayload
} from '@/utils/sectionEditApply';
import { extractTOCWithSlugs, slugify } from '@/utils/markdownTOC';
import type { ContentOperation } from '@/utils/contentApplyUtils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ ref: string }> }
): Promise<NextResponse> {
  const { ref } = await params;
  const clientType = request.headers.get('X-Client-Type') || 'unknown';
  const context = {
    operation: 'v2_note_sections_edit',
    component: 'API_V2',
    ref,
    clientType
  };
  const startTime = Date.now();
  logApi.info(`🚀 sections:edit ${ref}`, context);

  try {
    const authResult = await getAuthenticatedUser(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status || 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const userId = authResult.userId!;
    const userToken = extractTokenFromRequest(request);
    const supabase = createAuthenticatedSupabaseClient(authResult, userToken || undefined);

    const resolveResult = await V2ResourceResolver.resolveRef(ref, 'note', userId, context);
    if (!resolveResult.success) {
      return NextResponse.json(
        { error: resolveResult.error },
        { status: resolveResult.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const noteId = resolveResult.id;
    const body = await request.json();
    const validationResult = validatePayload(sectionEditV2Schema, body);
    if (!validationResult.success) {
      return createValidationErrorResponse(validationResult, context);
    }

    const validated = validationResult.data;
    const returnType = validated.return;

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
              'Content-Type': 'application/json',
              ...(etagResult.etag && { ETag: etagResult.etag })
            }
          }
        );
      }
    }

    const { data: currentNote, error: fetchError } = await supabase
      .from('articles')
      .select('id, markdown_content, updated_at')
      .eq('id', noteId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !currentNote) {
      return NextResponse.json(
        { error: 'Note non trouvée' },
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const payload: SectionEditPayload = {
      action: validated.action,
      section_slug: validated.section_slug,
      content: validated.content !== undefined ? sanitizeMarkdownContent(validated.content) : undefined,
      new_heading_title: validated.new_heading_title,
      heading_level: validated.heading_level,
      heading_title: validated.heading_title,
      create_placement: validated.create_placement,
      after_slug: validated.after_slug
    };

    const applied = applySectionEdit(currentNote.markdown_content, payload);
    if (!applied.ok) {
      const tocHint = extractTOCWithSlugs(currentNote.markdown_content)
        .slice(0, 25)
        .map(t => ({ slug: t.slug, title: t.title, level: t.level }));
      const status = applied.code === 'SECTION_NOT_FOUND' ? 404 : 400;
      return NextResponse.json(
        {
          error: applied.error,
          code: applied.code ?? 'SECTION_EDIT_FAILED',
          available_sections: applied.code === 'SECTION_NOT_FOUND' ? tocHint : undefined
        },
        { status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const safeContent = applied.markdown;
    const charDiff = {
      added: Math.max(0, safeContent.length - currentNote.markdown_content.length),
      removed: Math.max(0, currentNote.markdown_content.length - safeContent.length)
    };

    const shouldStream = await isCanvaOpen(supabase, noteId, userId);
    const streamOps: ContentOperation[] = [];

    if (shouldStream) {
      try {
        await contentStreamer.streamContent(
          noteId,
          currentNote.markdown_content,
          safeContent,
          streamOps,
          { chunkSize: 80, delayMs: 15 },
          []
        );
      } catch (streamError) {
        logApi.warn('[sections:edit] Stream failed, continuing with DB save', {
          ...context,
          noteId,
          error: streamError instanceof Error ? streamError.message : 'Unknown error'
        });
      }
    }

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
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    try {
      await updateArticleInsight(noteId);
    } catch (insightError) {
      logApi.warn('⚠️ Erreur lors de la mise à jour des insights', insightError);
    }

    const etag = calculateETag(safeContent);
    const tocAfter = tocSummaryForResponse(safeContent);

    const responseSectionSlug =
      validated.action === 'create_section' && validated.heading_title?.trim()
        ? slugify(validated.heading_title.trim())
        : validated.section_slug;

    const responseData: {
      section_slug?: string;
      action_applied: string;
      toc_after: typeof tocAfter;
      etag: string;
      diff?: string;
      content?: string;
      streaming_enabled: boolean;
      saved_to_db: boolean;
      note_id: string;
    } = {
      section_slug: responseSectionSlug,
      action_applied: validated.action,
      toc_after: tocAfter,
      etag,
      streaming_enabled: shouldStream,
      saved_to_db: true,
      note_id: noteId
    };

    if (returnType === 'diff') {
      responseData.diff = generateDiff(currentNote.markdown_content, safeContent);
    } else if (returnType === 'content') {
      responseData.content = safeContent;
    }

    await sendStreamEvent(noteId, 'content_updated', {
      note_id: noteId,
      etag,
      ops_count: 1,
      char_diff: charDiff,
      metadata: {
        source: 'sections:edit',
        action: validated.action,
        timestamp: Date.now()
      }
    });

    const apiTime = Date.now() - startTime;
    logApi.info(`✅ sections:edit OK en ${apiTime}ms`, context);

    return NextResponse.json(
      {
        data: responseData,
        meta: { char_diff: charDiff, execution_time: apiTime }
      },
      { status: 200, headers: { 'Content-Type': 'application/json', ETag: etag } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    logApi.error(`❌ sections:edit: ${errorMessage}`, context);
    return NextResponse.json(
      { error: 'Erreur interne du serveur', code: 'INTERNAL_SERVER_ERROR', message: errorMessage },
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
