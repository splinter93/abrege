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
 * Body: FormData avec champ "file". Query: result_type, split_by_page, preset, include_tables.
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
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid file field' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
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

    const provider = getPdfParserProvider();
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
