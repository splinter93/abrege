/**
 * Export HTML autonome pour les notes (document lisible hors app).
 */

import { downloadTextFile } from '@/utils/clientFileDownload';
import { noteExportFilename } from '@/utils/noteExportFilename';

export interface HtmlExportOptions {
  title: string;
  htmlContent: string;
  filename?: string;
  /** Langue du document exporté (accessibilité / SEO léger). */
  documentLang?: 'fr' | 'en';
}

export interface HtmlExportResult {
  success: boolean;
  error?: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const MINIMAL_STYLES = `
  :root { color-scheme: light dark; }
  body {
    font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
    line-height: 1.5;
    margin: 0 auto;
    max-width: 48rem;
    padding: 1.5rem 1.25rem;
  }
  img { max-width: 100%; height: auto; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #ccc; padding: 0.35rem 0.5rem; }
`;

/**
 * Exporte une note en fichier HTML autonome et déclenche le téléchargement.
 */
export function exportNoteToHtml(options: HtmlExportOptions): HtmlExportResult {
  try {
    const { title, htmlContent, filename, documentLang } = options;

    if (!htmlContent || htmlContent.trim().length === 0) {
      return { success: false, error: 'Contenu HTML vide' };
    }

    const lang = documentLang === 'en' ? 'en' : 'fr';
    const safeTitle = escapeHtml(title);
    const documentHtml = `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${safeTitle}</title>
  <style>${MINIMAL_STYLES}</style>
</head>
<body>
  <h1>${safeTitle}</h1>
  <main class="note-export">
${htmlContent}
  </main>
</body>
</html>`;

    const outName = filename ?? noteExportFilename(title, 'html');
    downloadTextFile(documentHtml, 'text/html;charset=utf-8', outName);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    };
  }
}
