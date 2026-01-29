/**
 * Tests unitaires pour RailwayHybridAdapter (mock fetch).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RailwayHybridAdapter } from '../adapters/railwayHybridAdapter';

describe('RailwayHybridAdapter', () => {
  let adapter: RailwayHybridAdapter;

  beforeEach(() => {
    adapter = new RailwayHybridAdapter();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('healthCheck returns healthy when upstream returns status ok', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          status: 'healthy',
          services: { pdfParse: true, pdfPlumber: true },
          version: '1.0.0',
        }),
    });
    const result = await adapter.healthCheck();
    expect(result).toEqual({
      status: 'healthy',
      services: { pdfParse: true, pdfPlumber: true },
    });
  });

  it('healthCheck returns down on fetch error', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'));
    const result = await adapter.healthCheck();
    expect(result).toEqual({ status: 'down' });
  });

  it('parse returns success when upstream returns success', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          requestId: 'req-1',
          success: true,
          data: {
            fullMarkdown: '# Hello',
            stats: {
              totalPages: 1,
              wordCount: 2,
              tableCount: 0,
              processingTime: 100,
              resultType: 'markdown',
              splitByPage: false,
              preset: 'default',
            },
            metadata: {},
          },
        }),
    });
    const formData = new FormData();
    formData.append('file', new File(['%PDF'], 't.pdf', { type: 'application/pdf' }));
    const result = await adapter.parse(formData, { resultType: 'markdown' });
    expect(result.success).toBe(true);
    expect(result.requestId).toBe('req-1');
    expect(result.data?.fullMarkdown).toBe('# Hello');
  });

  it('parse returns error when file is missing in FormData', async () => {
    const formData = new FormData();
    const result = await adapter.parse(formData, {});
    expect(result.success).toBe(false);
    expect(result.error).toContain('file');
  });
});
