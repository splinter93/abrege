/**
 * Service client pour l'API Hybrid PDF Parser (Railway microservice)
 * Côté client : appelle le proxy Next.js (même origine). Côté serveur : URL par défaut Railway.
 * @see .cursor/hybrid-parser doc.md
 */

import { simpleLogger as logger } from '@/utils/logger';

const DEFAULT_BASE_URL = 'https://hybrid-parser.up.railway.app';
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB
const REQUEST_TIMEOUT_MS = 90000; // 90s (aligné doc)

export interface HybridParseOptions {
  resultType?: 'markdown' | 'text' | 'json';
  splitByPage?: boolean;
  preset?: 'default' | 'insurance' | 'invoice' | 'contract' | 'scientific';
  includeTables?: boolean;
}

export interface HybridParseSuccessData {
  fullText?: string;
  fullMarkdown?: string;
  pages?: Array<{
    pageNumber: number;
    text: string;
    markdown: string;
    tables: unknown[];
    metadata: { wordCount: number; readingTime: number };
  }>;
  tables?: unknown[];
  metadata: Record<string, unknown>;
  stats: {
    totalPages: number;
    totalLength?: number;
    wordCount: number;
    tableCount: number;
    processingTime: number;
    resultType: string;
    splitByPage: boolean;
    preset: string;
    degraded?: boolean;
    degradedReason?: string;
  };
}

export interface HybridParseResult {
  requestId: string;
  success: boolean;
  data?: HybridParseSuccessData;
  error?: string;
}

export function validatePdfFile(file: File): { valid: boolean; error?: string } {
  const isPdf =
    file.type === 'application/pdf' ||
    file.name.toLowerCase().endsWith('.pdf');
  if (!isPdf) {
    return { valid: false, error: 'Seuls les fichiers PDF sont acceptés' };
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    const maxMB = MAX_FILE_SIZE_BYTES / (1024 * 1024);
    return {
      valid: false,
      error: `Fichier trop volumineux (max ${maxMB} Mo)`,
    };
  }
  return { valid: true };
}

export class HybridPdfParserService {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    if (baseUrl !== undefined) {
      this.baseUrl = baseUrl;
    } else if (typeof window !== 'undefined') {
      // Côté client : appeler notre proxy (même origine) pour éviter CORS
      this.baseUrl = '';
    } else {
      this.baseUrl =
        process.env.HYBRID_PARSER_URL ||
        process.env.NEXT_PUBLIC_HYBRID_PARSER_URL ||
        DEFAULT_BASE_URL;
    }
  }

  /**
   * Parse un PDF via l'API Hybrid Parser V4
   * @param file - Fichier PDF à parser
   * @param options - Options de parsing
   * @param token - Token JWT d'authentification (optionnel, requis pour le proxy)
   */
  async parse(
    file: File,
    options: HybridParseOptions = {},
    token?: string | null
  ): Promise<HybridParseResult> {
    const validation = validatePdfFile(file);
    if (!validation.valid) {
      return {
        requestId: '',
        success: false,
        error: validation.error,
      };
    }

    const formData = new FormData();
    formData.append('file', file);

    const params = new URLSearchParams();
    params.set('result_type', options.resultType ?? 'markdown');
    if (options.splitByPage) params.set('split_by_page', 'true');
    if (options.preset) params.set('preset', options.preset);
    if (options.includeTables === false) params.set('include_tables', 'false');

    const base = this.baseUrl.replace(/\/$/, '');
    const path = '/api/pdf/hybrid-parse-v4';
    const url = base ? `${base}${path}?${params.toString()}` : `${path}?${params.toString()}`;
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

      const body = (await response.json()) as {
        requestId?: string;
        success?: boolean;
        data?: HybridParseSuccessData;
        error?: string;
      };

      if (!response.ok) {
        logger.warn('[HybridPdfParserService] Réponse non OK', {
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

      logger.info('[HybridPdfParserService] PDF parsé', {
        requestId: body.requestId,
        wordCount: body.data.stats?.wordCount,
        pages: body.data.stats?.totalPages,
        processingTime: body.data.stats?.processingTime,
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
      logger.error('[HybridPdfParserService] Erreur', {
        message,
        isAbort,
        fileName: file.name,
      });
      return {
        requestId: '',
        success: false,
        error: isAbort ? 'Délai dépassé. Le PDF est peut-être trop volumineux.' : message,
      };
    }
  }

  /**
   * Health check du service (GET sur l'endpoint)
   * @param token - Token JWT d'authentification (optionnel, requis pour le proxy)
   */
  async healthCheck(token?: string | null): Promise<{
    status: 'healthy' | 'degraded' | 'down';
    services?: { pdfParse: boolean; pdfPlumber: boolean };
  }> {
    try {
      const base = this.baseUrl.replace(/\/$/, '');
      const path = '/api/pdf/hybrid-parse-v4';
      const url = base ? `${base}${path}` : path;
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const response = await fetch(url, { method: 'GET', headers });
      const data = (await response.json()) as {
        upstream?: { status: string; services?: { pdfParse?: boolean; pdfPlumber?: boolean } };
      };
      if (response.ok && data.upstream) {
        const services = data.upstream.services;
        return {
          status: data.upstream.status as 'healthy' | 'degraded',
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

export const hybridPdfParserService = new HybridPdfParserService();
