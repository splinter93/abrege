/**
 * Tests unitaires pour getPdfParserProvider.
 * Chaque test importe dynamiquement le module après vi.resetModules() pour respecter
 * l'env (défaut mistral ; railway pour le test parse + mock fetch Railway).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const PROVIDER_ENV = 'PDF_PARSER_PROVIDER';

describe('getPdfParserProvider', () => {
  const originalEnv = process.env[PROVIDER_ENV];

  beforeEach(() => {
    delete process.env[PROVIDER_ENV];
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalEnv !== undefined) {
      process.env[PROVIDER_ENV] = originalEnv;
    } else {
      delete process.env[PROVIDER_ENV];
    }
  });

  it('returns an object with parse and healthCheck methods', async () => {
    const { getPdfParserProvider } = await import('../getPdfParserProvider');
    const provider = getPdfParserProvider();
    expect(provider).toBeDefined();
    expect(typeof provider.parse).toBe('function');
    expect(typeof provider.healthCheck).toBe('function');
  });

  it('returns same instance when called twice (singleton)', async () => {
    const { getPdfParserProvider } = await import('../getPdfParserProvider');
    const a = getPdfParserProvider();
    const b = getPdfParserProvider();
    expect(a).toBe(b);
  });

  it('provider.parse returns a Promise resolving to result shape (Railway + fetch mock)', async () => {
    process.env[PROVIDER_ENV] = 'railway';
    vi.resetModules();
    const { getPdfParserProvider } = await import('../getPdfParserProvider');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            requestId: 'test-id',
            success: true,
            data: {
              fullMarkdown: '',
              stats: {
                totalPages: 1,
                wordCount: 0,
                tableCount: 0,
                processingTime: 0,
                resultType: 'markdown',
                splitByPage: false,
                preset: 'default',
              },
              metadata: {},
            },
          }),
      })
    );
    const provider = getPdfParserProvider();
    const formData = new FormData();
    formData.append('file', new File(['x'], 't.pdf', { type: 'application/pdf' }));
    const result = await provider.parse(formData, {});
    expect(result).toMatchObject({
      success: true,
      requestId: 'test-id',
    });
  });
});
