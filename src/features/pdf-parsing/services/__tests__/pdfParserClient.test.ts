/**
 * Tests unitaires pour PdfParserClient (mock fetch vers /api/pdf/parse).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PdfParserClient, pdfParserService } from '../pdfParserClient';

describe('PdfParserClient', () => {
  let client: PdfParserClient;

  beforeEach(() => {
    client = new PdfParserClient();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('parse calls POST /api/pdf/parse with FormData and query params', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      headers: {
        get: () => 'application/json',
      },
      json: () =>
        Promise.resolve({
          requestId: 'r1',
          success: true,
          data: {
            fullMarkdown: 'x',
            stats: {
              totalPages: 1,
              wordCount: 1,
              tableCount: 0,
              processingTime: 1,
              resultType: 'markdown',
              splitByPage: false,
              preset: 'default',
            },
            metadata: {},
          },
        }),
    });
    const file = new File(['%PDF'], 'a.pdf', { type: 'application/pdf' });
    await client.parse(file, { resultType: 'markdown' }, 'token');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/pdf/parse'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer token' }),
      })
    );
  });

  it('healthCheck calls GET /api/pdf/parse', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      headers: {
        get: () => 'application/json',
      },
      json: () => Promise.resolve({ status: 'healthy' }),
    });
    await client.healthCheck('token');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/pdf/parse',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({ Authorization: 'Bearer token' }),
      })
    );
  });

  it('parse returns clear error on 413 non-JSON response', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 413,
      headers: {
        get: () => 'text/plain',
      },
    });
    const file = new File(['%PDF'], 'too-big.pdf', { type: 'application/pdf' });
    const result = await client.parse(file);
    expect(result.success).toBe(false);
    expect(result.error).toContain('HTTP 413');
  });

  it('parseFromS3Key calls POST with s3_key and pdf_parser=mistral', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      headers: { get: () => 'application/json' },
      json: () =>
        Promise.resolve({
          requestId: 'r-s3',
          success: true,
          data: {
            fullMarkdown: 'parsed',
            stats: {
              totalPages: 2,
              wordCount: 10,
              tableCount: 0,
              processingTime: 1,
              resultType: 'markdown',
              splitByPage: false,
              preset: 'default',
            },
            metadata: {},
          },
        }),
    });

    const result = await client.parseFromS3Key(
      'chat-pdfs/user-id/session-id/file.pdf',
      { resultType: 'markdown' },
      'token'
    );

    expect(result.success).toBe(true);
    const fetchUrl = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(fetchUrl).toContain('/api/pdf/parse');
    expect(fetchUrl).toContain('s3_key=');
    expect(fetchUrl).toContain('pdf_parser=mistral');
  });

  it('parseFromS3Key retries once on 404', async () => {
    vi.useFakeTimers();
    (globalThis.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        headers: { get: () => 'application/json' },
        json: () =>
          Promise.resolve({
            success: false,
            error: 'Upload non terminé ou fichier introuvable',
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: () =>
          Promise.resolve({
            requestId: 'r-retry',
            success: true,
            data: {
              fullMarkdown: 'ok',
              stats: {
                totalPages: 1,
                wordCount: 1,
                tableCount: 0,
                processingTime: 1,
                resultType: 'markdown',
                splitByPage: false,
                preset: 'default',
              },
              metadata: {},
            },
          }),
      });

    const promise = client.parseFromS3Key('chat-pdfs/u/s/f.pdf', {}, 'token');
    await vi.advanceTimersByTimeAsync(500);
    const result = await promise;

    expect(result.success).toBe(true);
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it('pdfParserService is an instance of PdfParserClient', () => {
    expect(pdfParserService).toBeInstanceOf(PdfParserClient);
  });
});
