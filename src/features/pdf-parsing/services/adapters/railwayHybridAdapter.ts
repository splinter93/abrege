/**
 * Adapter pour l'API Hybrid PDF Parser (Railway microservice).
 * Implémente IPdfParserProvider en appelant GET /health et POST /parse.
 */

import { logger, LogCategory } from '@/utils/logger';
import type { IPdfParserProvider } from '../contract';
import type {
  PdfParseOptions,
  PdfParseResult,
  PdfParseSuccessData,
  PdfParserHealthResult,
  PdfParserHealthStatus,
} from '../../types';

const DEFAULT_UPSTREAM_BASE = 'https://hybrid-parser.up.railway.app';
const PROXY_TIMEOUT_MS = 90_000;

function getUpstreamBase(): string {
  const base =
    process.env.HYBRID_PARSER_URL ||
    process.env.NEXT_PUBLIC_HYBRID_PARSER_URL ||
    DEFAULT_UPSTREAM_BASE;
  return base.replace(/\/$/, '');
}

function buildParseUrl(base: string, requestQuery?: string): string {
  if (requestQuery && requestQuery.length > 0) {
    return `${base}/parse?${requestQuery}`;
  }
  return `${base}/parse`;
}

interface RailwayHealthResponse {
  status?: string;
  services?: { pdfParse?: boolean; pdfPlumber?: boolean };
  version?: string;
}

function toHealthStatus(status: string | undefined): PdfParserHealthStatus {
  if (status === 'healthy' || status === 'degraded' || status === 'down') {
    return status;
  }
  return status === 'ok' ? 'healthy' : 'down';
}

interface RailwayParseResponse {
  requestId?: string;
  success?: boolean;
  data?: PdfParseSuccessData;
  error?: string;
}

export class RailwayHybridAdapter implements IPdfParserProvider {
  async healthCheck(): Promise<PdfParserHealthResult> {
    const base = getUpstreamBase();
    const url = `${base}/health`;
    try {
      const res = await fetch(url, {
        method: 'GET',
        signal: AbortSignal.timeout(PROXY_TIMEOUT_MS),
        headers: { 'Content-Type': 'application/json' },
      });
      const data = (await res.json()) as RailwayHealthResponse;
      const status = toHealthStatus(data.status);
      const services = data.services;
      return {
        status,
        services:
          services != null
            ? {
                pdfParse: Boolean(services.pdfParse),
                pdfPlumber: Boolean(services.pdfPlumber),
              }
            : undefined,
      };
    } catch (err) {
      logger.error(LogCategory.API, '[RailwayHybridAdapter] healthCheck error', {
        error: err instanceof Error ? err.message : String(err),
        url,
      });
      return { status: 'down' };
    }
  }

  async parse(
    formData: FormData,
    options: PdfParseOptions,
    requestQuery?: string
  ): Promise<PdfParseResult> {
    const base = getUpstreamBase();
    const url = buildParseUrl(base, requestQuery);

    const body = new FormData();
    const file = formData.get('file');
    if (!file || !(file instanceof Blob)) {
      return {
        requestId: '',
        success: false,
        error: 'Missing or invalid file field',
      };
    }
    body.append('file', file);

    try {
      const res = await fetch(url, {
        method: 'POST',
        body,
        signal: AbortSignal.timeout(PROXY_TIMEOUT_MS),
      });
      const data = (await res.json()) as RailwayParseResponse;

      if (!res.ok) {
        logger.warn(LogCategory.API, '[RailwayHybridAdapter] parse non-OK', {
          status: res.status,
          requestId: data.requestId,
          error: data.error,
        });
        return {
          requestId: data.requestId ?? '',
          success: false,
          error: data.error ?? `HTTP ${res.status}`,
        };
      }

      if (!data.success || !data.data) {
        return {
          requestId: data.requestId ?? '',
          success: false,
          error: data.error ?? 'Parsing échoué',
        };
      }

      logger.info(LogCategory.API, '[RailwayHybridAdapter] PDF parsé', {
        requestId: data.requestId,
        wordCount: data.data.stats?.wordCount,
        pages: data.data.stats?.totalPages,
      });

      return {
        requestId: data.requestId ?? '',
        success: true,
        data: data.data,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(LogCategory.API, '[RailwayHybridAdapter] parse error', {
        error: message,
        url,
      });
      return {
        requestId: '',
        success: false,
        error:
          err instanceof Error && err.name === 'AbortError'
            ? 'Délai dépassé. Le PDF est peut-être trop volumineux.'
            : message,
      };
    }
  }
}
