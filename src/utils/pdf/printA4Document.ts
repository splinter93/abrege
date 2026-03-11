import { getPrintA4DocumentCss } from './printA4Theme';

export interface PrintA4DocumentOptions {
  title: string;
  htmlContent: string;
  fontFamily?: string | null;
  headerImage?: string | null;
  headerImageOffset?: number | null;
  headerImageBlur?: number | null;
  headerImageOverlay?: number | null;
  headerTitleInImage?: boolean;
  exportMode?: boolean;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function clampPercentage(value?: number | null): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 50;
  }

  return Math.max(0, Math.min(100, value));
}

function clampBlur(value?: number | null): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 0;
  }

  return Math.max(0, Math.min(12, value));
}

function toOverlayOpacity(value?: number | null): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 0;
  }

  return Number((0.08 + 0.14 * Math.max(0, Math.min(5, value))).toFixed(3));
}

function buildDocumentStyle(options: PrintA4DocumentOptions): string {
  return [
    `--print-header-offset: ${clampPercentage(options.headerImageOffset)}%`,
    `--print-header-blur: ${clampBlur(options.headerImageBlur)}px`,
    `--print-header-overlay: ${toOverlayOpacity(options.headerImageOverlay)}`,
  ].join('; ');
}

export function createPrintA4DocumentMarkup(options: PrintA4DocumentOptions): string {
  const {
    title,
    htmlContent,
    headerImage,
    headerTitleInImage = false,
    exportMode = false,
  } = options;

  const safeTitle = escapeHtml(title || 'Note');
  const documentClasses = [
    'print-note-document',
    headerImage ? 'print-note-document--has-header' : '',
    exportMode ? 'print-note-document--export' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return `
    <article class="${documentClasses}" style="${buildDocumentStyle(options)}">
      ${headerImage ? `
        <header class="print-note-document__header">
          <img
            src="${escapeHtml(headerImage)}"
            alt=""
            class="print-note-document__header-image"
            draggable="false"
          />
          <div class="print-note-document__header-overlay"></div>
          ${headerTitleInImage ? `
            <div class="print-note-document__header-title">
              <h1 class="print-note-document__header-title-text">${safeTitle}</h1>
            </div>
          ` : ''}
        </header>
      ` : ''}
      <div class="print-note-document__body">
        ${headerTitleInImage ? '' : `<h1 class="print-note-document__title">${safeTitle}</h1>`}
        <div class="markdown-body" id="pdf-content">${htmlContent}</div>
      </div>
    </article>
  `;
}

export function createPrintA4HtmlDocument(options: PrintA4DocumentOptions): string {
  const css = getPrintA4DocumentCss({ fontFamily: options.fontFamily });
  const markup = createPrintA4DocumentMarkup({
    ...options,
    exportMode: true,
  });

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(options.title || 'Note')}</title>
  <style>${css}</style>
</head>
<body class="print-note-body--export">
  ${markup}
  <script>
    const waitForImages = () => {
      const images = Array.from(document.images);
      return Promise.all(images.map((img) => {
        if (img.complete && img.naturalWidth > 0) {
          return Promise.resolve();
        }

        return new Promise((resolve) => {
          const done = () => resolve();
          img.addEventListener('load', done, { once: true });
          img.addEventListener('error', done, { once: true });
          setTimeout(done, 5000);
        });
      }));
    };

    const waitForFonts = async () => {
      if (!('fonts' in document) || !document.fonts?.ready) {
        return;
      }

      try {
        await document.fonts.ready;
      } catch {
        return;
      }
    };

    const waitForFrames = async () => {
      await new Promise((resolve) => requestAnimationFrame(resolve));
      await new Promise((resolve) => requestAnimationFrame(resolve));
    };

    window.addEventListener('load', async () => {
      await Promise.all([waitForImages(), waitForFonts(), waitForFrames()]);
      document.body.setAttribute('data-ready', 'true');
    });
  </script>
</body>
</html>`;
}
