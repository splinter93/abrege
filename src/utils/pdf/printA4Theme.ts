const FALLBACK_SANS =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif";
const FALLBACK_SERIF = "Georgia, 'Times New Roman', serif";
const FALLBACK_MONO =
  "'JetBrains Mono', 'SFMono-Regular', Menlo, Monaco, Consolas, 'Liberation Mono', monospace";

const BODY_FONT_STACKS: Record<string, string> = {
  "Cormorant Garamond": "'Cormorant Garamond', Georgia, 'Times New Roman', serif",
  "EB Garamond": "'EB Garamond', Georgia, 'Times New Roman', serif",
  Figtree: "'Figtree', 'Manrope', " + FALLBACK_SANS,
  Inter: "'Inter', " + FALLBACK_SANS,
  Lato: "'Lato', " + FALLBACK_SANS,
  Manrope: "'Manrope', " + FALLBACK_SANS,
  Montserrat: "'Montserrat', " + FALLBACK_SANS,
  "Noto Sans": "'Noto Sans', " + FALLBACK_SANS,
  "Open Sans": "'Open Sans', " + FALLBACK_SANS,
  Poppins: "'Poppins', " + FALLBACK_SANS,
  Raleway: "'Raleway', " + FALLBACK_SANS,
  Roboto: "'Roboto', " + FALLBACK_SANS,
  "Source Sans Pro": "'Source Sans 3', " + FALLBACK_SANS,
  "Source Sans 3": "'Source Sans 3', " + FALLBACK_SANS,
  Ubuntu: "'Ubuntu', " + FALLBACK_SANS,
  "Work Sans": "'Work Sans', " + FALLBACK_SANS,
};

const GOOGLE_FONT_IMPORTS = [
  'Cormorant+Garamond:wght@400;500;600;700',
  'EB+Garamond:wght@400;500;600;700',
  'Figtree:wght@300;400;500;600;700;800',
  'Inter:wght@400;500;600;700;800',
  'JetBrains+Mono:wght@400;500;600',
  'Lato:wght@400;700',
  'Manrope:wght@300;400;500;600;700;800',
  'Montserrat:wght@400;500;600;700',
  'Noto+Sans:wght@400;500;600;700;800',
  'Open+Sans:wght@400;600;700',
  'Poppins:wght@400;500;600;700',
  'Raleway:wght@400;500;600;700',
  'Roboto:wght@400;500;700',
  'Source+Sans+3:wght@400;500;600;700',
  'Ubuntu:wght@400;500;700',
  'Work+Sans:wght@400;500;600;700',
];

export interface PrintA4ThemeOptions {
  fontFamily?: string | null;
}

export const PRINT_A4_PAGE_WIDTH_MM = 210;
export const PRINT_A4_PAGE_HEIGHT_MM = 297;
export const PRINT_A4_MARGIN_TOP_MM = 12;
export const PRINT_A4_MARGIN_BOTTOM_MM = 20;
export const PRINT_A4_MARGIN_X_MM = 14;
export const PRINT_A4_HEADER_HEIGHT_MM = 74;

export function getPrintGoogleFontsCss(): string {
  const familyQuery = GOOGLE_FONT_IMPORTS.join('&family=');
  return `@import url('https://fonts.googleapis.com/css2?family=${familyQuery}&display=swap');`;
}

export function resolvePrintBodyFontFamily(fontFamily?: string | null): string {
  if (!fontFamily) {
    return BODY_FONT_STACKS.Manrope;
  }

  return BODY_FONT_STACKS[fontFamily] ?? BODY_FONT_STACKS.Manrope;
}

function createPrintRootVariables(fontFamily?: string | null): string {
  const bodyFontFamily = resolvePrintBodyFontFamily(fontFamily);

  return `
    :root {
      --print-page-width: ${PRINT_A4_PAGE_WIDTH_MM}mm;
      --print-page-height: ${PRINT_A4_PAGE_HEIGHT_MM}mm;
      --print-margin-top: ${PRINT_A4_MARGIN_TOP_MM}mm;
      --print-margin-bottom: ${PRINT_A4_MARGIN_BOTTOM_MM}mm;
      --print-margin-x: ${PRINT_A4_MARGIN_X_MM}mm;
      --print-header-height: ${PRINT_A4_HEADER_HEIGHT_MM}mm;
      --print-page-gap: 16px;
      --print-page-shadow: 0 18px 48px rgba(15, 23, 42, 0.16);
      --print-surface: #ffffff;
      --print-background: #eef2f7;
      --print-border: rgba(148, 163, 184, 0.28);
      --print-text: #111827;
      --print-text-muted: #4b5563;
      --print-heading-font-family: 'Manrope', ${FALLBACK_SANS};
      --print-body-font-family: ${bodyFontFamily};
      --print-mono-font-family: ${FALLBACK_MONO};
      --print-title-size: 42px;
      --print-body-size: 15px;
      --print-body-weight: 525;
      --print-line-height: 1.75;
      --print-title-line-height: 1.2;
      --print-h1-size: 2.25rem;
      --print-h2-size: 1.75rem;
      --print-h3-size: 1.5rem;
      --print-h4-size: 1.25rem;
      --print-block-bg: #f6f7f9;
      --print-block-border: #e5e7eb;
      --print-link: #b45309;
    }
  `;
}

export function getPrintA4DocumentCss(options: PrintA4ThemeOptions = {}): string {
  return `
    ${getPrintGoogleFontsCss()}
    ${createPrintRootVariables(options.fontFamily)}

    * {
      box-sizing: border-box;
    }

    html,
    body {
      margin: 0;
      padding: 0;
      min-height: 100%;
      background: var(--print-background);
      color: var(--print-text);
      font-family: var(--print-body-font-family);
      font-size: var(--print-body-size);
      line-height: var(--print-line-height);
      -webkit-font-smoothing: antialiased;
      text-rendering: geometricPrecision;
    }

    body {
      padding: 24px 0 48px;
    }

    .print-note-body--export {
      padding: 0;
      background: #ffffff;
    }

    .print-note-document {
      width: var(--print-page-width);
      min-height: var(--print-page-height);
      margin: 0 auto;
      padding: 0;
      background: var(--print-surface);
      color: var(--print-text);
      box-shadow: var(--print-page-shadow);
      position: relative;
      overflow: hidden;
    }

    .print-note-document--export {
      margin: 0 auto;
      box-shadow: none;
    }

    /* ── Cover image: naturally full-bleed, no negative-margin hacks ── */
    .print-note-document__header {
      position: relative;
      width: 100%;
      height: var(--print-header-height);
      margin: 0;
      overflow: hidden;
      background: #dbe4f0;
      flex-shrink: 0;
    }

    .print-note-document__header-image {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      max-width: none;
      object-fit: cover;
      object-position: center var(--print-header-offset, 50%);
      filter: blur(var(--print-header-blur, 0px));
      transform: scale(1.04);
      display: block;
      margin: 0;
    }

    .print-note-document__header-overlay {
      position: absolute;
      inset: 0;
      background: rgba(15, 23, 42, var(--print-header-overlay, 0));
      pointer-events: none;
    }

    .print-note-document__header-title {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 var(--print-margin-x);
      z-index: 1;
      text-align: center;
    }

    .print-note-document__header-title-text {
      width: 100%;
      color: #ffffff;
      font-family: var(--print-heading-font-family);
      font-size: var(--print-title-size);
      font-weight: 850;
      line-height: 1.1;
      letter-spacing: -0.025em;
      text-shadow: 0 2px 12px rgba(15, 23, 42, 0.38);
      margin: 0;
    }

    /* ── Body: carries all margins (replaces document padding) ── */
    .print-note-document__body {
      padding: var(--print-margin-x) var(--print-margin-x) var(--print-margin-bottom);
    }

    /* Without cover: generous top breathing room */
    .print-note-document:not(.print-note-document--has-header) .print-note-document__body {
      padding-top: var(--print-margin-top);
    }

    /* With cover: tighter gap below image */
    .print-note-document--has-header .print-note-document__body {
      padding-top: 10mm;
    }

    .print-note-document__title {
      font-family: var(--print-heading-font-family);
      font-size: var(--print-title-size);
      font-weight: 850;
      line-height: var(--print-title-line-height);
      letter-spacing: -0.025em;
      color: var(--print-text);
      margin: 0 0 10px;
      padding-bottom: 18px;
      border-bottom: 1.5px solid #e5e7eb;
    }

    .markdown-body {
      font-family: var(--print-body-font-family);
      font-size: var(--print-body-size);
      font-weight: var(--print-body-weight);
      line-height: var(--print-line-height);
      color: var(--print-text);
      overflow-wrap: break-word;
      word-break: break-word;
    }

    .markdown-body :first-child {
      margin-top: 0;
    }

    .markdown-body h1,
    .markdown-body h2,
    .markdown-body h3,
    .markdown-body h4,
    .markdown-body h5,
    .markdown-body h6 {
      font-family: var(--print-heading-font-family);
      color: var(--print-text);
      letter-spacing: -0.02em;
      break-after: avoid-page;
      page-break-after: avoid;
    }

    .markdown-body h1 { font-size: var(--print-h1-size); line-height: 1.25; margin: 34px 0 16px; }
    .markdown-body h2 { font-size: var(--print-h2-size); line-height: 1.35; margin: 28px 0 12px; }
    .markdown-body h3 { font-size: var(--print-h3-size); line-height: 1.45; margin: 22px 0 10px; }
    .markdown-body h4 { font-size: var(--print-h4-size); line-height: 1.5;  margin: 18px 0 8px;  }
    .markdown-body h5,
    .markdown-body h6 { font-size: 1rem; line-height: 1.6; margin: 14px 0 6px; }

    .markdown-body p,
    .markdown-body li,
    .markdown-body blockquote p {
      margin: 0 0 12px;
      line-height: var(--print-line-height);
      color: var(--print-text);
      orphans: 3;
      widows: 3;
    }

    .markdown-body strong { font-weight: 800; }
    .markdown-body em { font-style: italic; }

    .markdown-body a {
      color: var(--print-link);
      text-decoration: underline;
      text-decoration-thickness: 1px;
      text-underline-offset: 2px;
    }

    .markdown-body ul,
    .markdown-body ol { margin: 8px 0; padding-left: 1.5rem; }
    .markdown-body li { margin: 4px 0; }

    .markdown-body img {
      display: block;
      max-width: 100%;
      height: auto;
      margin: 16px 0 18px;
      border-radius: 12px;
      break-inside: avoid-page;
      page-break-inside: avoid;
    }

    .markdown-body code {
      font-family: var(--print-mono-font-family);
      font-size: 0.88em;
      background: var(--print-block-bg);
      border: 1px solid var(--print-block-border);
      border-radius: 6px;
      padding: 0.15rem 0.375rem;
      color: #9a3412;
    }

    .markdown-body pre {
      margin: 16px 0;
      padding: 14px 16px;
      background: var(--print-block-bg);
      border: 1px solid var(--print-block-border);
      border-radius: 12px;
      overflow-x: auto;
      break-inside: avoid-page;
      page-break-inside: avoid;
    }

    .markdown-body pre code {
      background: transparent;
      border: 0;
      padding: 0;
      color: var(--print-text);
    }

    .markdown-body blockquote {
      margin: 14px 0;
      padding: 10px 0 10px 18px;
      border-left: 4px solid #cbd5e1;
      color: var(--print-text-muted);
      break-inside: avoid-page;
      page-break-inside: avoid;
    }

    .markdown-body hr {
      border: 0;
      border-top: 1px solid #dbe1ea;
      margin: 20px 0;
    }

    .markdown-body table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
      break-inside: avoid-page;
      page-break-inside: avoid;
    }

    .markdown-body th,
    .markdown-body td {
      border: 1px solid #d8dee8;
      padding: 10px 12px;
      text-align: left;
      vertical-align: top;
      color: var(--print-text);
    }

    .markdown-body th {
      background: #f7f9fc;
      font-weight: 700;
    }

    @page {
      size: A4;
      margin: var(--print-margin-top) var(--print-margin-x) var(--print-margin-bottom);
    }

    @media print {
      html,
      body {
        background: #ffffff;
      }

      body {
        padding: 0;
      }

      .print-note-document {
        width: auto;
        min-height: auto;
        box-shadow: none;
        overflow: visible;
      }

      /* Header is already full-width — no overrides needed in print */
    }
  `;
}
