import { describe, it, expect } from 'vitest';
import { stripTtsInlineTagsForDisplay } from '../stripTtsInlineTagsForDisplay';

describe('stripTtsInlineTagsForDisplay', () => {
  it('retire les tags inline TTS reconnus', () => {
    expect(stripTtsInlineTagsForDisplay('Salut [laugh] ça va ?')).toBe('Salut ça va ?');
    expect(stripTtsInlineTagsForDisplay('A [pause] B [long-pause] C')).toBe('A B C');
  });

  it('ne retire pas les liens markdown [texte](url)', () => {
    expect(stripTtsInlineTagsForDisplay('Voir [doc](https://x.ai)')).toBe('Voir [doc](https://x.ai)');
  });

  it('ne retire pas les crochets arbitraires', () => {
    expect(stripTtsInlineTagsForDisplay('[note] et [ref]')).toBe('[note] et [ref]');
  });

  it('gère null / undefined', () => {
    expect(stripTtsInlineTagsForDisplay(null)).toBe('');
    expect(stripTtsInlineTagsForDisplay(undefined)).toBe('');
  });

  it('ne retire pas les tags à l’intérieur du code inline `…`', () => {
    expect(stripTtsInlineTagsForDisplay('Avant [pause] puis `litéral [laugh] ici` après.')).toBe(
      'Avant puis `litéral [laugh] ici` après.'
    );
  });

  it('ne retire pas les tags à l’intérieur des blocs ``` … ```', () => {
    const md = 'Texte [pause]\n\n```\n[laugh]\n```\nFin [sigh]';
    const out = stripTtsInlineTagsForDisplay(md);
    expect(out).toContain('```\n[laugh]\n```');
    expect(out).not.toMatch(/\[pause\]/);
    expect(out).not.toMatch(/\[sigh\]/);
  });
});
