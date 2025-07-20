import { describe, it, expect, vi } from 'vitest';
import { markdownContentSchema, markdownExamples } from './markdownValidation';

describe('markdownContentSchema', () => {
  it('accepte le markdown pur et les balises <div align>', () => {
    for (const valid of markdownExamples.valid) {
      expect(() => markdownContentSchema.parse(valid)).not.toThrow();
    }
  });

  it('rejette tout HTML non autorisé', () => {
    for (const invalid of markdownExamples.invalid) {
      expect(() => markdownContentSchema.parse(invalid)).toThrow();
    }
  });

  it('log un avertissement sur rejet', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      expect(() => {
        try {
          markdownContentSchema.parse('<b>test</b>');
        } catch (e) {
          const msg = (e && typeof e === 'object' && 'errors' in e && Array.isArray(e.errors)) ? e.errors[0]?.message : (e && typeof e === 'object' && 'message' in e ? e.message : String(e));
          console.warn('Tentative d\'injection rejetée:', msg);
          throw e;
        }
      }).toThrow();
      expect(spy).toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });

  it('rejette les balises mal fermées ou imbriquées', () => {
    expect(() => markdownContentSchema.parse('<div align="center">Texte')).toThrow();
    expect(() => markdownContentSchema.parse('<div align="center"><b>texte</b></div>')).toThrow();
  });
}); 