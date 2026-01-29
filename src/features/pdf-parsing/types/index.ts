/**
 * Types canoniques pour le parsing PDF (domaine, sans référence à un backend).
 * Source unique de vérité pour options, résultat et health.
 */

export type PdfParseResultType = 'markdown' | 'text' | 'json';
export type PdfParsePreset =
  | 'default'
  | 'insurance'
  | 'invoice'
  | 'contract'
  | 'scientific';

export interface PdfParseOptions {
  resultType?: PdfParseResultType;
  splitByPage?: boolean;
  preset?: PdfParsePreset;
  includeTables?: boolean;
}

export interface PdfParsePageMetadata {
  wordCount: number;
  readingTime: number;
}

export interface PdfParsePage {
  pageNumber: number;
  text: string;
  markdown: string;
  tables: unknown[];
  metadata: PdfParsePageMetadata;
}

export interface PdfParseStats {
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
}

export interface PdfParseSuccessData {
  fullText?: string;
  fullMarkdown?: string;
  pages?: PdfParsePage[];
  tables?: unknown[];
  metadata: Record<string, unknown>;
  stats: PdfParseStats;
}

export interface PdfParseResult {
  requestId: string;
  success: boolean;
  data?: PdfParseSuccessData;
  error?: string;
}

export type PdfParserHealthStatus = 'healthy' | 'degraded' | 'down';

export interface PdfParserHealthServices {
  pdfParse: boolean;
  pdfPlumber: boolean;
}

export interface PdfParserHealthResult {
  status: PdfParserHealthStatus;
  services?: PdfParserHealthServices;
}
