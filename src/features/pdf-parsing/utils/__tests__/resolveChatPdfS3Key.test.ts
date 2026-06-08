/**
 * Tests unitaires pour resolveChatPdfS3Key.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  resolveChatPdfS3Key,
  ResolveChatPdfS3KeyError,
  CHAT_PDF_PRESIGNED_GET_TTL_SECONDS,
} from '../resolveChatPdfS3Key';
import { MAX_PDF_FILE_SIZE_BYTES } from '../validatePdfFile';

vi.mock('@/services/s3Service', () => ({
  s3Service: {
    getHeadObject: vi.fn(),
    generateGetUrl: vi.fn(),
  },
}));

describe('resolveChatPdfS3Key', () => {
  const userId = 'user-abc';
  const validKey = `chat-pdfs/${userId}/session-1/123-abc.pdf`;

  let s3Service: {
    getHeadObject: ReturnType<typeof vi.fn>;
    generateGetUrl: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module = await import('@/services/s3Service');
    s3Service = module.s3Service as unknown as typeof s3Service;
  });

  it('retourne une presigned GET URL pour une clé valide', async () => {
    s3Service.getHeadObject.mockResolvedValueOnce({
      contentType: 'application/pdf',
      contentLength: 1024,
    });
    s3Service.generateGetUrl.mockResolvedValueOnce('https://signed-url');

    const result = await resolveChatPdfS3Key(userId, validKey);

    expect(result.key).toBe(validKey);
    expect(result.presignedGetUrl).toBe('https://signed-url');
    expect(s3Service.generateGetUrl).toHaveBeenCalledWith(
      validKey,
      CHAT_PDF_PRESIGNED_GET_TTL_SECONDS
    );
  });

  it('rejette une clé sans prefix utilisateur', async () => {
    await expect(
      resolveChatPdfS3Key(userId, 'chat-pdfs/other-user/session/x.pdf')
    ).rejects.toMatchObject({
      code: 'FORBIDDEN',
      httpStatus: 403,
    });
    expect(s3Service.getHeadObject).not.toHaveBeenCalled();
  });

  it('rejette une clé avec path traversal', async () => {
    await expect(
      resolveChatPdfS3Key(userId, `chat-pdfs/${userId}/../other/x.pdf`)
    ).rejects.toMatchObject({
      code: 'FORBIDDEN',
      httpStatus: 403,
    });
  });

  it('rejette une clé sans extension .pdf', async () => {
    await expect(
      resolveChatPdfS3Key(userId, `chat-pdfs/${userId}/session/file.txt`)
    ).rejects.toMatchObject({
      code: 'INVALID_KEY',
      httpStatus: 400,
    });
  });

  it('rejette un objet S3 introuvable', async () => {
    s3Service.getHeadObject.mockRejectedValueOnce(new Error('NotFound'));

    await expect(resolveChatPdfS3Key(userId, validKey)).rejects.toMatchObject({
      code: 'NOT_FOUND',
      httpStatus: 404,
    });
  });

  it('rejette un type MIME non PDF', async () => {
    s3Service.getHeadObject.mockResolvedValueOnce({
      contentType: 'image/png',
      contentLength: 1024,
    });

    await expect(resolveChatPdfS3Key(userId, validKey)).rejects.toMatchObject({
      code: 'INVALID_TYPE',
      httpStatus: 400,
    });
  });

  it('rejette un fichier trop volumineux', async () => {
    s3Service.getHeadObject.mockResolvedValueOnce({
      contentType: 'application/pdf',
      contentLength: MAX_PDF_FILE_SIZE_BYTES + 1,
    });

    await expect(resolveChatPdfS3Key(userId, validKey)).rejects.toMatchObject({
      code: 'TOO_LARGE',
      httpStatus: 400,
    });
  });

  it('accepte un contentType absent (fallback)', async () => {
    s3Service.getHeadObject.mockResolvedValueOnce({
      contentLength: 5000,
    });
    s3Service.generateGetUrl.mockResolvedValueOnce('https://signed');

    const result = await resolveChatPdfS3Key(userId, validKey);
    expect(result.presignedGetUrl).toBe('https://signed');
  });

  it('accepte application/pdf avec paramètres MIME', async () => {
    s3Service.getHeadObject.mockResolvedValueOnce({
      contentType: 'application/pdf; charset=binary',
      contentLength: 5000,
    });
    s3Service.generateGetUrl.mockResolvedValueOnce('https://signed');

    const result = await resolveChatPdfS3Key(userId, validKey);
    expect(result.presignedGetUrl).toBe('https://signed');
  });

  it('rejette un fichier vide (size 0) avec 404', async () => {
    s3Service.getHeadObject.mockResolvedValueOnce({
      contentType: 'application/pdf',
      contentLength: 0,
    });

    await expect(resolveChatPdfS3Key(userId, validKey)).rejects.toMatchObject({
      code: 'NOT_FOUND',
      httpStatus: 404,
    });
  });

  it('lève ResolveChatPdfS3KeyError', async () => {
    try {
      await resolveChatPdfS3Key(userId, '');
    } catch (err) {
      expect(err).toBeInstanceOf(ResolveChatPdfS3KeyError);
    }
  });
});
