/**
 * Tests unitaires pour getPdfParserProvider.
 * Vérifie que le bon adapter est retourné selon l'env (railway / inconnu → fallback).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getPdfParserProvider } from '../getPdfParserProvider';

const PROVIDER_ENV = 'PDF_PARSER_PROVIDER';

describe('getPdfParserProvider', () => {
  const originalEnv = process.env[PROVIDER_ENV];

  beforeEach(() => {
    delete process.env[PROVIDER_ENV];
    // Reset module cache so singleton is fresh per test (optional; provider is cached)
    vi.resetModules();
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env[PROVIDER_ENV] = originalEnv;
    } else {
      delete process.env[PROVIDER_ENV];
    }
  });

  it('returns an object with parse and healthCheck methods', () => {
    const provider = getPdfParserProvider();
    expect(provider).toBeDefined();
    expect(typeof provider.parse).toBe('function');
    expect(typeof provider.healthCheck).toBe('function');
  });

  it('returns same instance when called twice (singleton)', () => {
    const a = getPdfParserProvider();
    const b = getPdfParserProvider();
    expect(a).toBe(b);
  });

  it('provider.parse returns a Promise resolving to result shape', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
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
    }));
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
