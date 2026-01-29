/**
 * Client de parsing PDF côté navigateur.
 * Appelle toujours /api/pdf/parse (même origine). API publique inchangée.
 */

import { simpleLogger as logger } from '@/utils/logger';
import type {
  PdfParseOptions,
  PdfParseResult,
  PdfParserHealthResult,
  PdfParserHealthStatus,
} from '../types';

const PARSE_PATH = '/api/pdf/parse';
const REQUEST_TIMEOUT_MS = 90_000;
const PDF_PARSER_PREFERENCE_KEY = 'chat-pdf-parser-preference';

/** Préférence parseur PDF depuis les settings chat (General). */
function getPdfParserPreference(): 'railway' | 'mistral' | null {
  if (typeof window === 'undefined') return null;
  const v = window.localStorage.getItem(PDF_PARSER_PREFERENCE_KEY);
  if (v === 'railway' || v === 'mistral') return v;
  return null;
}

interface HealthResponse {
  status?: string;
  services?: { pdfParse?: boolean; pdfPlumber?: boolean };
  error?: string;
}

function toHealthStatus(s: string | undefined): PdfParserHealthStatus {
  if (s === 'healthy' || s === 'degraded' || s === 'down') return s;
  return 'down';
}

export class PdfParserClient {
  /**
   * Parse un PDF via l'API /api/pdf/parse.
   */
  async parse(
    file: File,
    options: PdfParseOptions = {},
    token?: string | null
  ): Promise<PdfParseResult> {
    const formData = new FormData();
    formData.append('file', file);

    const params = new URLSearchParams();
    params.set('result_type', options.resultType ?? 'markdown');
    if (options.splitByPage) params.set('split_by_page', 'true');
    if (options.preset) params.set('preset', options.preset);
    if (options.includeTables === false) params.set('include_tables', 'false');
    const pdfParserPref = getPdfParserPreference();
    if (pdfParserPref) params.set('pdf_parser', pdfParserPref);

    const url = `${PARSE_PATH}?${params.toString()}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const body = (await response.json()) as PdfParseResult;

      if (!response.ok) {
        logger.warn('[PdfParserClient] Réponse non OK', {
          status: response.status,
          requestId: body.requestId,
          error: body.error,
        });
        return {
          requestId: body.requestId ?? '',
          success: false,
          error: body.error ?? `HTTP ${response.status}`,
        };
      }

      if (!body.success || !body.data) {
        return {
          requestId: body.requestId ?? '',
          success: false,
          error: body.error ?? 'Parsing échoué',
        };
      }

      logger.info('[PdfParserClient] PDF parsé', {
        requestId: body.requestId,
        wordCount: body.data.stats?.wordCount,
        pages: body.data.stats?.totalPages,
      });

      return {
        requestId: body.requestId ?? '',
        success: true,
        data: body.data,
      };
    } catch (err) {
      clearTimeout(timeoutId);
      const message = err instanceof Error ? err.message : String(err);
      const isAbort = err instanceof Error && err.name === 'AbortError';
      logger.error('[PdfParserClient] Erreur', {
        message,
        isAbort,
        fileName: file.name,
      });
      return {
        requestId: '',
        success: false,
        error: isAbort
          ? 'Délai dépassé. Le PDF est peut-être trop volumineux.'
          : message,
      };
    }
  }

  /**
   * Parse un PDF à partir d'une URL publique (Mistral OCR uniquement).
   * Ignoré par le provider Railway ; avec PDF_PARSER_PROVIDER=mistral, appelle l'API OCR avec document_url.
   */
  async parseFromUrl(
    documentUrl: string,
    options: PdfParseOptions = {},
    token?: string | null
  ): Promise<PdfParseResult> {
    const params = new URLSearchParams();
    params.set('document_url', documentUrl.trim());
    params.set('result_type', options.resultType ?? 'markdown');
    if (options.splitByPage) params.set('split_by_page', 'true');
    if (options.preset) params.set('preset', options.preset);
    if (options.includeTables === false) params.set('include_tables', 'false');
    const pdfParserPref = getPdfParserPreference();
    if (pdfParserPref) params.set('pdf_parser', pdfParserPref);

    const url = `${PARSE_PATH}?${params.toString()}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const headers: HeadersInit = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: new FormData(),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const body = (await response.json()) as PdfParseResult;

      if (!response.ok) {
        logger.warn('[PdfParserClient] parseFromUrl non OK', {
          status: response.status,
          requestId: body.requestId,
          error: body.error,
        });
        return {
          requestId: body.requestId ?? '',
          success: false,
          error: body.error ?? `HTTP ${response.status}`,
        };
      }
      if (!body.success || !body.data) {
        return {
          requestId: body.requestId ?? '',
          success: false,
          error: body.error ?? 'Parsing échoué',
        };
      }
      return {
        requestId: body.requestId ?? '',
        success: true,
        data: body.data,
      };
    } catch (err) {
      clearTimeout(timeoutId);
      const message = err instanceof Error ? err.message : String(err);
      const isAbort = err instanceof Error && err.name === 'AbortError';
      logger.error('[PdfParserClient] parseFromUrl erreur', { message, isAbort });
      return {
        requestId: '',
        success: false,
        error: isAbort ? 'Délai dépassé.' : message,
      };
    }
  }

  /**
   * Health check du service (GET /api/pdf/parse).
   */
  async healthCheck(token?: string | null): Promise<PdfParserHealthResult> {
    try {
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const response = await fetch(PARSE_PATH, {
        method: 'GET',
        headers,
      });
      const data = (await response.json()) as HealthResponse;
      if (response.ok) {
        const services = data.services;
        return {
          status: toHealthStatus(data.status),
          services:
            services != null
              ? {
                  pdfParse: Boolean(services.pdfParse),
                  pdfPlumber: Boolean(services.pdfPlumber),
                }
              : undefined,
        };
      }
      return { status: 'down' };
    } catch {
      return { status: 'down' };
    }
  }
}

export const pdfParserService = new PdfParserClient();
