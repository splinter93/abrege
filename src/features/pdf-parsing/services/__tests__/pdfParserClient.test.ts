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

  it('pdfParserService is an instance of PdfParserClient', () => {
    expect(pdfParserService).toBeInstanceOf(PdfParserClient);
  });
});
