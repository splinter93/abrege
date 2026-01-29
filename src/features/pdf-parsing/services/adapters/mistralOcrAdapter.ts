/**
 * Adapter pour l'API Mistral OCR (https://docs.mistral.ai/api/endpoint/ocr).
 * Accepte en entrée :
 * - un fichier PDF (FormData "file") : upload via Files API → POST /v1/ocr avec file_id ;
 * - une URL (query "document_url" ou FormData "url" / "document_url") : POST /v1/ocr avec document_url (DocumentURLChunk).
 */

import { logger, LogCategory } from '@/utils/logger';
import type { IPdfParserProvider } from '../contract';
import type {
  PdfParseOptions,
  PdfParseResult,
  PdfParseSuccessData,
  PdfParsePage,
  PdfParsePageMetadata,
  PdfParseStats,
  PdfParserHealthResult,
  PdfParserHealthStatus,
} from '../../types';

const MISTRAL_FILES_URL = 'https://api.mistral.ai/v1/files';
const MISTRAL_OCR_URL = 'https://api.mistral.ai/v1/ocr';
const DEFAULT_OCR_MODEL = 'mistral-ocr-latest';
const UPLOAD_TIMEOUT_MS = 60_000;
const OCR_TIMEOUT_MS = 120_000;

function getApiKey(): string | undefined {
  return process.env.MISTRAL_API_KEY?.trim() || undefined;
}

function getOcrModel(): string {
  const model = process.env.MISTRAL_OCR_MODEL?.trim();
  return model && model.length > 0 ? model : DEFAULT_OCR_MODEL;
}

/** Réponse Mistral Files upload (POST /v1/files) */
interface MistralFileUploadResponse {
  id?: string;
  object?: string;
  filename?: string;
  error?: { message?: string };
}

/** Une page dans la réponse OCR Mistral */
interface MistralOcrPage {
  index: number;
  markdown?: string;
  tables?: unknown[];
  dimensions?: { dpi?: number; height?: number; width?: number };
}

/** Réponse Mistral OCR (POST /v1/ocr) */
interface MistralOcrResponse {
  model?: string;
  pages?: MistralOcrPage[];
  usage_info?: { pages_processed?: number; doc_size_bytes?: number };
  error?: { message?: string };
}

function toHealthStatus(ok: boolean): PdfParserHealthStatus {
  return ok ? 'healthy' : 'down';
}

function wordCountFromText(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function readingTimeMinutes(wordCount: number): number {
  return Math.max(0.1, wordCount / 200);
}

const HTTP_URL_PREFIX = /^https?:\/\//i;

function isHttpUrl(s: string): boolean {
  return HTTP_URL_PREFIX.test(s.trim());
}

/**
 * Récupère l’URL document depuis requestQuery ou FormData (document_url, url).
 */
function getDocumentUrl(formData: FormData, requestQuery?: string): string | null {
  const fromForm =
    (formData.get('document_url') as string | null) ?? (formData.get('url') as string | null);
  if (fromForm && typeof fromForm === 'string' && isHttpUrl(fromForm)) return fromForm.trim();
  if (requestQuery) {
    const docUrl = new URLSearchParams(requestQuery).get('document_url');
    if (docUrl && isHttpUrl(docUrl)) return docUrl.trim();
  }
  return null;
}

/**
 * Convertit la réponse Mistral OCR vers notre format canonique PdfParseSuccessData.
 */
function mapOcrResponseToSuccessData(
  ocr: MistralOcrResponse,
  options: PdfParseOptions
): PdfParseSuccessData {
  const pagesRaw = ocr.pages ?? [];
  const totalPages = pagesRaw.length;

  const pages: PdfParsePage[] = pagesRaw.map((p) => {
    const markdown = p.markdown ?? '';
    const text = markdown.replace(/#+\s/g, '').replace(/\*\*?/g, '').trim();
    const wordCount = wordCountFromText(text);
    const metadata: PdfParsePageMetadata = {
      wordCount,
      readingTime: readingTimeMinutes(wordCount),
    };
    return {
      pageNumber: p.index + 1,
      text,
      markdown,
      tables: Array.isArray(p.tables) ? p.tables : [],
      metadata,
    };
  });

  const fullMarkdown = pages.map((p) => p.markdown).join('\n\n');
  const fullText = pages.map((p) => p.text).join('\n\n');
  const totalWordCount = pages.reduce((s, p) => s + p.metadata.wordCount, 0);
  const tableCount = pages.reduce((s, p) => s + (p.tables?.length ?? 0), 0);

  const stats: PdfParseStats = {
    totalPages,
    totalLength: fullText.length,
    wordCount: totalWordCount,
    tableCount,
    processingTime: 0,
    resultType: options.resultType ?? 'markdown',
    splitByPage: options.splitByPage ?? true,
    preset: options.preset ?? 'default',
  };

  return {
    fullText,
    fullMarkdown,
    pages,
    tables: pages.flatMap((p) => p.tables ?? []),
    metadata: {
      provider: 'mistral-ocr',
      model: ocr.model,
      pages_processed: ocr.usage_info?.pages_processed,
    },
    stats,
  };
}

export class MistralOcrAdapter implements IPdfParserProvider {
  async healthCheck(): Promise<PdfParserHealthResult> {
    const apiKey = getApiKey();
    if (!apiKey) {
      logger.warn(LogCategory.API, '[MistralOcrAdapter] healthCheck: no MISTRAL_API_KEY');
      return { status: 'down' };
    }
    try {
      const res = await fetch(MISTRAL_FILES_URL, {
        method: 'GET',
        signal: AbortSignal.timeout(10_000),
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const ok = res.ok;
      return {
        status: toHealthStatus(ok),
        services: { pdfParse: ok, pdfPlumber: false },
      };
    } catch (err) {
      logger.error(LogCategory.API, '[MistralOcrAdapter] healthCheck error', {
        error: err instanceof Error ? err.message : String(err),
      });
      return { status: 'down' };
    }
  }

  async parse(
    formData: FormData,
    options: PdfParseOptions,
    requestQuery?: string
  ): Promise<PdfParseResult> {
    const apiKey = getApiKey();
    if (!apiKey) {
      return {
        requestId: '',
        success: false,
        error: 'MISTRAL_API_KEY is not configured',
      };
    }

    const documentUrl = getDocumentUrl(formData, requestQuery);
    if (documentUrl) {
      return this.parseFromUrl(apiKey, documentUrl, options);
    }

    const file = formData.get('file');
    if (!file || !(file instanceof Blob)) {
      return {
        requestId: '',
        success: false,
        error: 'Missing or invalid file field. Provide a PDF file or document_url (query or form).',
      };
    }

    const fileName = file instanceof File ? file.name : 'document.pdf';
    if (!fileName.toLowerCase().endsWith('.pdf')) {
      return {
        requestId: '',
        success: false,
        error: 'Mistral OCR expects a PDF file',
      };
    }

    let fileId: string;
    try {
      const buffer = await file.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');

      const uploadRes = await fetch(MISTRAL_FILES_URL, {
        method: 'POST',
        signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS),
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file: { content: base64, fileName },
          purpose: 'ocr',
        }),
      });

      const uploadData = (await uploadRes.json()) as MistralFileUploadResponse;
      if (!uploadRes.ok || !uploadData.id) {
        const msg = uploadData.error?.message ?? uploadRes.statusText ?? 'Upload failed';
        logger.warn(LogCategory.API, '[MistralOcrAdapter] upload failed', {
          status: uploadRes.status,
          error: msg,
        });
        return {
          requestId: '',
          success: false,
          error: msg,
        };
      }
      fileId = uploadData.id;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(LogCategory.API, '[MistralOcrAdapter] upload error', { error: message });
      return {
        requestId: '',
        success: false,
        error:
          err instanceof Error && err.name === 'AbortError'
            ? 'Délai dépassé lors de l’envoi du fichier.'
            : message,
      };
    }

    return this.callOcr(apiKey, { type: 'file', file_id: fileId }, options, fileId);
  }

  /** Parse un document à partir d'une URL publique (DocumentURLChunk). */
  private async parseFromUrl(
    apiKey: string,
    url: string,
    options: PdfParseOptions
  ): Promise<PdfParseResult> {
    const requestId = `url-${url.slice(0, 40)}`;
    return this.callOcr(
      apiKey,
      { type: 'document_url', document_url: { url } },
      options,
      requestId
    );
  }

  private async callOcr(
    apiKey: string,
    document:
      | { type: 'file'; file_id: string }
      | { type: 'document_url'; document_url: { url: string } },
    options: PdfParseOptions,
    requestId: string
  ): Promise<PdfParseResult> {
    try {
      const model = getOcrModel();
      const ocrRes = await fetch(MISTRAL_OCR_URL, {
        method: 'POST',
        signal: AbortSignal.timeout(OCR_TIMEOUT_MS),
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          document,
          table_format: options.includeTables !== false ? 'markdown' : undefined,
        }),
      });

      const ocrData = (await ocrRes.json()) as MistralOcrResponse & { error?: { message?: string } };
      if (!ocrRes.ok) {
        const msg = ocrData.error?.message ?? ocrRes.statusText ?? 'OCR failed';
        logger.warn(LogCategory.API, '[MistralOcrAdapter] OCR failed', {
          status: ocrRes.status,
          error: msg,
        });
        return { requestId, success: false, error: msg };
      }

      const data = mapOcrResponseToSuccessData(ocrData, options);
      logger.info(LogCategory.API, '[MistralOcrAdapter] PDF parsé', {
        requestId,
        wordCount: data.stats.wordCount,
        pages: data.stats.totalPages,
      });
      return { requestId, success: true, data };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(LogCategory.API, '[MistralOcrAdapter] OCR request error', { error: message });
      return {
        requestId,
        success: false,
        error:
          err instanceof Error && err.name === 'AbortError'
            ? 'Délai dépassé. Le PDF est peut-être trop volumineux.'
            : message,
      };
    }
  }
}
