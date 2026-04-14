/**
 * Export texte brut à partir du HTML de la note (DOMParser + innerText).
 */

import { downloadTextFile } from '@/utils/clientFileDownload';
import { noteExportFilename } from '@/utils/noteExportFilename';

export interface PlainTextExportOptions {
  title: string;
  htmlContent: string;
  filename?: string;
}

export interface PlainTextExportResult {
  success: boolean;
  error?: string;
}

function htmlToPlainText(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const raw = doc.body.innerText ?? '';
  const trimmed = raw.trim();
  return trimmed.replace(/\n{3,}/g, '\n\n');
}

/**
 * Exporte le texte visible de la note en .txt et déclenche le téléchargement.
 */
export function exportNoteToPlainText(
  options: PlainTextExportOptions
): PlainTextExportResult {
  try {
    const { title, htmlContent, filename } = options;

    if (!htmlContent || htmlContent.trim().length === 0) {
      return { success: false, error: 'Contenu HTML vide' };
    }

    const body = htmlToPlainText(htmlContent);
    const textContent = `${title}\n\n${body}`;

    const outName = filename ?? noteExportFilename(title, 'txt');
    downloadTextFile(textContent, 'text/plain;charset=utf-8', outName);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    };
  }
}
