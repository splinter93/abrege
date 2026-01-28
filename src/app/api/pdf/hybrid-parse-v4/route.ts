/**
 * Proxy vers l'API Hybrid PDF Parser (Railway microservice)
 * Évite le CORS en appelant le service depuis le serveur.
 * GET = health check (/health), POST = parse PDF (/parse).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/utils/authUtils';
import { logger, LogCategory } from '@/utils/logger';

const UPSTREAM_BASE =
  process.env.HYBRID_PARSER_URL ||
  process.env.NEXT_PUBLIC_HYBRID_PARSER_URL ||
  'https://hybrid-parser.up.railway.app';
const UPSTREAM_HEALTH = `${UPSTREAM_BASE.replace(/\/$/, '')}/health`;
const PROXY_TIMEOUT_MS = 90_000;

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function buildParseUrl(request: NextRequest): string {
  const { searchParams } = new URL(request.url);
  const query = searchParams.toString();
  const base = UPSTREAM_BASE.replace(/\/$/, '');
  return query ? `${base}/parse?${query}` : `${base}/parse`;
}

/**
 * GET /api/pdf/hybrid-parse-v4 — health check (proxy vers Railway /health)
 * Réponse normalisée au format attendu par le client (upstream).
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const authResult = await getAuthenticatedUser(request);
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status ?? 401 });
  }

  try {
    const res = await fetch(UPSTREAM_HEALTH, {
      method: 'GET',
      signal: AbortSignal.timeout(PROXY_TIMEOUT_MS),
      headers: { 'Content-Type': 'application/json' },
    });
    const data = (await res.json()) as {
      status?: string;
      services?: { pdfParse?: boolean; pdfPlumber?: boolean };
      version?: string;
    };
    const normalized = {
      service: 'Hybrid PDF Parser V4',
      upstream: {
        status: data.status ?? 'down',
        services: data.services ?? { pdfParse: false, pdfPlumber: false },
        version: data.version ?? '1.0.0',
      },
    };
    return NextResponse.json(normalized, { status: res.status });
  } catch (err) {
    logger.error(LogCategory.API, '[hybrid-parse-v4] GET proxy error', {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { service: 'Hybrid PDF Parser V4', status: 'degraded', error: 'Service unavailable' },
      { status: 502 }
    );
  }
}

/**
 * POST /api/pdf/hybrid-parse-v4 — parse PDF (proxy multipart vers Railway /parse)
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const authResult = await getAuthenticatedUser(request);
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status ?? 401 });
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

    const upstreamUrl = buildParseUrl(request);
    const body = new FormData();
    body.append('file', file);

    const res = await fetch(upstreamUrl, {
      method: 'POST',
      body,
      signal: AbortSignal.timeout(PROXY_TIMEOUT_MS),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    logger.error(LogCategory.API, '[hybrid-parse-v4] POST proxy error', {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Service unavailable' },
      { status: 502 }
    );
  }
}
