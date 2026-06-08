/**
 * Route unique pour le parsing PDF.
 * GET = health check du provider configuré, POST = parse PDF.
 * Délègue au provider (env PDF_PARSER_PROVIDER).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/utils/authUtils';
import { logger, LogCategory } from '@/utils/logger';
import { getPdfParserProvider } from '@/features/pdf-parsing/services/getPdfParserProvider';
import {
  parseOptionsQuerySchema,
  queryToPdfParseOptions,
} from '@/features/pdf-parsing/validation/parseOptionsSchema';
import {
  resolveChatPdfS3Key,
  ResolveChatPdfS3KeyError,
} from '@/features/pdf-parsing/utils/resolveChatPdfS3Key';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * GET /api/pdf/parse — health check du provider configuré.
 */
export async function GET(_request: NextRequest): Promise<NextResponse> {
  const authResult = await getAuthenticatedUser(_request);
  if (!authResult.success) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status ?? 401 }
    );
  }

  try {
    const provider = getPdfParserProvider();
    const result = await provider.healthCheck();
    return NextResponse.json(result);
  } catch (err) {
    logger.error(LogCategory.API, '[api/pdf/parse] GET error', {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { status: 'down', error: 'Service unavailable' },
      { status: 502 }
    );
  }
}

/**
 * POST /api/pdf/parse — parse PDF via le provider configuré.
 * Entrées (par priorité) : s3_key, document_url, file (FormData).
 * s3_key → presigned GET S3 → Mistral OCR (provider forcé mistral).
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const authResult = await getAuthenticatedUser(request);
  if (!authResult.success || !authResult.userId) {
    return NextResponse.json(
      { error: authResult.error ?? 'Authentification requise' },
      { status: authResult.status ?? 401 }
    );
  }

  const userId = authResult.userId;

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const { searchParams } = new URL(request.url);

    const s3KeyRaw =
      searchParams.get('s3_key') ?? (formData.get('s3_key') as string | null);
    const s3Key =
      typeof s3KeyRaw === 'string' && s3KeyRaw.trim().length > 0
        ? s3KeyRaw.trim()
        : null;

    let documentUrl =
      searchParams.get('document_url') ?? (formData.get('document_url') as string | null);
    let forceMistral = false;
    let resolvedS3Key: string | undefined;

    if (s3Key) {
      try {
        const resolved = await resolveChatPdfS3Key(userId, s3Key);
        documentUrl = resolved.presignedGetUrl;
        resolvedS3Key = resolved.key;
        forceMistral = true;
        logger.info(LogCategory.API, '[api/pdf/parse] s3_key résolu', {
          userId,
          s3Key: resolved.key,
        });
      } catch (err) {
        if (err instanceof ResolveChatPdfS3KeyError) {
          return NextResponse.json(
            { success: false, requestId: '', error: err.message },
            { status: err.httpStatus }
          );
        }
        throw err;
      }
    }

    const hasFile = file && file instanceof Blob;
    const hasUrl =
      typeof documentUrl === 'string' && documentUrl.trim().length > 0;

    if (!hasFile && !hasUrl) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Missing input. Provide s3_key, document_url, or a PDF file.',
        },
        { status: 400 }
      );
    }
    if (file && !(file instanceof Blob)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file field' },
        { status: 400 }
      );
    }

    const queryRaw = {
      result_type: searchParams.get('result_type') ?? undefined,
      split_by_page: searchParams.get('split_by_page') ?? undefined,
      preset: searchParams.get('preset') ?? undefined,
      include_tables: searchParams.get('include_tables') ?? undefined,
    };
    const parsed = parseOptionsQuerySchema.safeParse(queryRaw);
    const options = parsed.success
      ? { ...queryToPdfParseOptions(parsed.data), userId }
      : { resultType: 'markdown' as const, userId };

    const outboundParams = new URLSearchParams();
    for (const [key, value] of searchParams.entries()) {
      if (key === 's3_key' || key === 'document_url' || key === 'pdf_parser') continue;
      outboundParams.set(key, value);
    }
    if (hasUrl && documentUrl) {
      outboundParams.set('document_url', documentUrl.trim());
    }

    let pdfParserOverride = searchParams.get('pdf_parser')?.trim().toLowerCase();
    if (forceMistral) {
      if (pdfParserOverride === 'railway') {
        logger.warn(LogCategory.API, '[api/pdf/parse] pdf_parser=railway ignoré pour s3_key', {
          s3Key: resolvedS3Key,
        });
      }
      pdfParserOverride = 'mistral';
    }
    if (pdfParserOverride === 'railway' || pdfParserOverride === 'mistral') {
      outboundParams.set('pdf_parser', pdfParserOverride);
    }
    const requestQuery = outboundParams.toString();

    const provider = getPdfParserProvider(
      pdfParserOverride === 'railway' || pdfParserOverride === 'mistral'
        ? pdfParserOverride
        : undefined
    );

    const providerFormData = new FormData();
    if (hasUrl && documentUrl) {
      providerFormData.set('document_url', documentUrl.trim());
    }
    if (hasFile && file instanceof Blob) {
      providerFormData.set('file', file);
    }

    const result = await provider.parse(providerFormData, options, requestQuery);
    return NextResponse.json(result, {
      status: result.success ? 200 : 400,
    });
  } catch (err) {
    logger.error(LogCategory.API, '[api/pdf/parse] POST error', {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      {
        success: false,
        requestId: '',
        error: err instanceof Error ? err.message : 'Service unavailable',
      },
      { status: 502 }
    );
  }
}
