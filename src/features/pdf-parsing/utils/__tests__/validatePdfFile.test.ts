/**
 * Tests unitaires pour validatePdfFile.
 */

import { describe, it, expect } from 'vitest';
import { validatePdfFile, MAX_PDF_FILE_SIZE_BYTES } from '../validatePdfFile';

describe('validatePdfFile', () => {
  it('accepts a valid PDF file', () => {
    const file = new File(['content'], 'doc.pdf', { type: 'application/pdf' });
    expect(validatePdfFile(file)).toEqual({ valid: true });
  });

  it('accepts file with .pdf extension and generic type', () => {
    const file = new File(['content'], 'doc.pdf', { type: 'application/octet-stream' });
    expect(validatePdfFile(file)).toEqual({ valid: true });
  });

  it('rejects non-PDF type and extension', () => {
    const file = new File(['content'], 'doc.txt', { type: 'text/plain' });
    expect(validatePdfFile(file)).toEqual({
      valid: false,
      error: 'Seuls les fichiers PDF sont acceptés',
    });
  });

  it('rejects file over max size', () => {
    const file = new File(
      [new ArrayBuffer(MAX_PDF_FILE_SIZE_BYTES + 1)],
      'big.pdf',
      { type: 'application/pdf' }
    );
    expect(validatePdfFile(file).valid).toBe(false);
    expect(validatePdfFile(file).error).toContain('50');
  });

  it('accepts file at exactly max size', () => {
    const file = new File(
      [new ArrayBuffer(MAX_PDF_FILE_SIZE_BYTES)],
      'max.pdf',
      { type: 'application/pdf' }
    );
    expect(validatePdfFile(file)).toEqual({ valid: true });
  });
});
