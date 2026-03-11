import { describe, expect, it } from 'vitest';
import {
  createPrintA4DocumentMarkup,
  createPrintA4HtmlDocument,
} from '@/utils/pdf/printA4Document';
import { resolvePrintBodyFontFamily } from '@/utils/pdf/printA4Theme';

describe('printA4Document', () => {
  it('uses the selected body font stack', () => {
    expect(resolvePrintBodyFontFamily('Inter')).toContain("'Inter'");
    expect(resolvePrintBodyFontFamily('Unknown font')).toContain("'Manrope'");
  });

  it('renders the title inside the header when requested', () => {
    const markup = createPrintA4DocumentMarkup({
      title: 'Courrier important',
      htmlContent: '<p>Bonjour</p>',
      headerImage: 'https://example.com/header.jpg',
      headerTitleInImage: true,
      headerImageOffset: 42,
    });

    expect(markup).toContain('print-note-document__header-title-text');
    expect(markup).not.toContain('print-note-document__title');
    expect(markup).toContain('--print-header-offset: 42%');
  });

  it('builds a ready-to-print HTML document with readiness hook', () => {
    const html = createPrintA4HtmlDocument({
      title: 'Lettre',
      htmlContent: '<p>Contenu</p>',
      fontFamily: 'Inter',
      headerImageOverlay: 2,
    });

    expect(html).toContain('data-ready');
    expect(html).toContain('document.fonts.ready');
    expect(html).toContain('print-note-body--export');
  });
});
