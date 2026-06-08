/**
 * Tests unitaires — réinjection des tableaux Mistral OCR dans le markdown.
 */

import { describe, it, expect } from 'vitest';
import {
  replaceMistralTableRefsInMarkdown,
  getMistralTableContent,
  processMistralOcrPageTables,
} from '../mistralOcrTableInlining';

describe('getMistralTableContent', () => {
  it('priorise content puis markdown', () => {
    expect(getMistralTableContent({ id: 't1', content: '| a |' })).toBe('| a |');
    expect(getMistralTableContent({ id: 't1', markdown: '| b |' })).toBe('| b |');
    expect(getMistralTableContent({ id: 't1', html: '<table></table>' })).toBe(
      '<table></table>'
    );
  });
});

describe('replaceMistralTableRefsInMarkdown', () => {
  it('remplace [tab1.md](tab1.md) par le tableau markdown', () => {
    const md = 'Intro\n\n[tab1.md](tab1.md)\n\nFin';
    const table = '| Col A | Col B |\n| --- | --- |\n| 1 | 2 |';
    const out = replaceMistralTableRefsInMarkdown(md, 'tab1.md', table);
    expect(out).toContain('| Col A | Col B |');
    expect(out).not.toContain('[tab1.md](tab1.md)');
    expect(out).toMatch(/Intro[\s\S]*\| Col A[\s\S]*Fin/);
  });

  it('remplace [tbl-0.html](tbl-0.html)', () => {
    const html = '<table><tr><td>x</td></tr></table>';
    const md = 'Avant [tbl-0.html](tbl-0.html) après';
    const out = replaceMistralTableRefsInMarkdown(md, 'tbl-0.html', html);
    expect(out).toContain(html);
    expect(out).not.toContain('tbl-0.html');
  });

  it('ne modifie pas les liens images ![…](id)', () => {
    const md = '![fig](img-0.jpeg) et [tab1.md](tab1.md)';
    const out = replaceMistralTableRefsInMarkdown(md, 'img-0.jpeg', '| x |');
    expect(out).toContain('![fig](img-0.jpeg)');
  });
});

describe('processMistralOcrPageTables', () => {
  it('réécrit le markdown de chaque page', () => {
    const pages = processMistralOcrPageTables([
      {
        index: 0,
        markdown: 'Texte [tab1.md](tab1.md) suite',
        tables: [{ id: 'tab1.md', content: '| h |\n| - |\n| v |' }],
      },
    ]);

    expect(pages[0].markdown).toContain('| h |');
    expect(pages[0].markdown).not.toContain('[tab1.md](tab1.md)');
  });

  it('laisse les pages sans tables inchangées', () => {
    const input = [{ index: 1, markdown: 'Pas de tableau' }];
    expect(processMistralOcrPageTables(input)).toEqual(input);
  });

  it('préserve les tableaux déjà inline (pas de placeholder)', () => {
    const inline = 'Titre\n\n| A | B |\n| - | - |\n| 1 | 2 |\n\nSuite';
    const pages = processMistralOcrPageTables([{ index: 0, markdown: inline, tables: [] }]);
    expect(pages[0].markdown).toBe(inline);
  });

  it('remplace plusieurs tableaux sur une même page dans l’ordre', () => {
    const md = 'A [tab0.md](tab0.md) milieu [tab1.md](tab1.md) fin';
    const pages = processMistralOcrPageTables([
      {
        index: 0,
        markdown: md,
        tables: [
          { id: 'tab0.md', content: '| T0 |' },
          { id: 'tab1.md', content: '| T1 |' },
        ],
      },
    ]);
    const out = pages[0].markdown ?? '';
    expect(out.indexOf('| T0 |')).toBeLessThan(out.indexOf('| T1 |'));
    expect(out).toMatch(/A[\s\S]*\| T0 \|[\s\S]*milieu[\s\S]*\| T1 \|[\s\S]*fin/);
  });
});
