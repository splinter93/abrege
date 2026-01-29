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

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
 * Body: FormData avec "file" (PDF) et/ou "document_url". Query: document_url, result_type, split_by_page, preset, include_tables.
 * Mistral OCR accepte une URL (document_url) en lieu du fichier.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const authResult = await getAuthenticatedUser(request);
  if (!authResult.success) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status ?? 401 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const { searchParams } = new URL(request.url);
    const documentUrl = searchParams.get('document_url') ?? (formData.get('document_url') as string | null);
    const hasFile = file && file instanceof Blob;
    const hasUrl = typeof documentUrl === 'string' && documentUrl.trim().length > 0;
    if (!hasFile && !hasUrl) {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid file field. Provide a PDF file or document_url (query or form).' },
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
      ? queryToPdfParseOptions(parsed.data)
      : { resultType: 'markdown' as const };
    const requestQuery = searchParams.toString();
    const pdfParserOverride = searchParams.get('pdf_parser')?.trim().toLowerCase();
    const provider = getPdfParserProvider(
      pdfParserOverride === 'railway' || pdfParserOverride === 'mistral' ? pdfParserOverride : undefined
    );
    const result = await provider.parse(formData, options, requestQuery);
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
