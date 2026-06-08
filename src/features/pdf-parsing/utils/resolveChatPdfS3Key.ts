/**
 * Résout une clé S3 chat-pdfs en URL presignée GET pour Mistral OCR.
 * Validation ownership, existence, type et taille côté serveur.
 */

import { s3Service } from '@/services/s3Service';
import { MAX_PDF_FILE_SIZE_BYTES } from './validatePdfFile';

export const CHAT_PDF_S3_PREFIX = 'chat-pdfs';
export const CHAT_PDF_PRESIGNED_GET_TTL_SECONDS = 1800; // 30 min

export type ResolveChatPdfS3KeyErrorCode =
  | 'INVALID_KEY'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'INVALID_TYPE'
  | 'TOO_LARGE';

export class ResolveChatPdfS3KeyError extends Error {
  readonly code: ResolveChatPdfS3KeyErrorCode;
  readonly httpStatus: number;

  constructor(code: ResolveChatPdfS3KeyErrorCode, message: string, httpStatus: number) {
    super(message);
    this.name = 'ResolveChatPdfS3KeyError';
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

export interface ResolveChatPdfS3KeyResult {
  presignedGetUrl: string;
  key: string;
}

function normalizeS3Key(key: string): string {
  return key.trim().replace(/^\/+/, '');
}

function isOwnedChatPdfKey(userId: string, key: string): boolean {
  const normalized = normalizeS3Key(key);
  const expectedPrefix = `${CHAT_PDF_S3_PREFIX}/${userId}/`;
  return normalized.startsWith(expectedPrefix) && !normalized.includes('..');
}

/**
 * Valide une clé S3 chat-pdfs et retourne une URL presignée GET pour Mistral.
 */
export async function resolveChatPdfS3Key(
  userId: string,
  s3Key: string
): Promise<ResolveChatPdfS3KeyResult> {
  const key = normalizeS3Key(s3Key);
  if (!key || !key.endsWith('.pdf')) {
    throw new ResolveChatPdfS3KeyError(
      'INVALID_KEY',
      'Clé S3 invalide',
      400
    );
  }

  if (!isOwnedChatPdfKey(userId, key)) {
    throw new ResolveChatPdfS3KeyError(
      'FORBIDDEN',
      'Accès refusé à ce fichier',
      403
    );
  }

  let head: { contentType?: string; contentLength?: number };
  try {
    head = await s3Service.getHeadObject(key);
  } catch {
    throw new ResolveChatPdfS3KeyError(
      'NOT_FOUND',
      'Upload non terminé ou fichier introuvable',
      404
    );
  }

  const contentType = head.contentType?.toLowerCase().split(';')[0].trim() ?? '';
  if (contentType && !contentType.startsWith('application/pdf')) {
    throw new ResolveChatPdfS3KeyError(
      'INVALID_TYPE',
      'Le fichier S3 n\'est pas un PDF',
      400
    );
  }

  const size = head.contentLength ?? 0;
  if (size <= 0) {
    throw new ResolveChatPdfS3KeyError(
      'NOT_FOUND',
      'Upload non terminé ou fichier introuvable',
      404
    );
  }
  if (size > MAX_PDF_FILE_SIZE_BYTES) {
    throw new ResolveChatPdfS3KeyError(
      'TOO_LARGE',
      `Fichier trop volumineux (max ${MAX_PDF_FILE_SIZE_BYTES / (1024 * 1024)} Mo)`,
      400
    );
  }

  const presignedGetUrl = await s3Service.generateGetUrl(key, CHAT_PDF_PRESIGNED_GET_TTL_SECONDS);

  return { presignedGetUrl, key };
}
