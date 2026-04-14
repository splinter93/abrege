/**
 * Service d'export Markdown pour les notes
 *
 * Convertit le HTML TipTap en Markdown propre via turndown,
 * puis déclenche un téléchargement côté client.
 */

import TurndownService from 'turndown';

export interface MarkdownExportOptions {
  title: string;
  htmlContent: string;
  filename?: string;
}

export interface MarkdownExportResult {
  success: boolean;
  error?: string;
}

function buildTurndownService(): TurndownService {
  const td = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
    emDelimiter: '_',
    strongDelimiter: '**',
  });

  // Tables
  td.addRule('table', {
    filter: 'table',
    replacement: (_content, node) => {
      const el = node as HTMLTableElement;
      const rows = Array.from(el.querySelectorAll('tr'));
      if (rows.length === 0) return '';

      const toCell = (cell: Element) =>
        cell.textContent?.replace(/\n/g, ' ').trim() ?? '';

      const header = rows[0];
      const headerCells = Array.from(header.querySelectorAll('th, td')).map(toCell);
      const separator = headerCells.map(() => '---');

      const bodyRows = rows.slice(1).map((row) =>
        Array.from(row.querySelectorAll('td')).map(toCell)
      );

      const lines = [
        `| ${headerCells.join(' | ')} |`,
        `| ${separator.join(' | ')} |`,
        ...bodyRows.map((cells) => `| ${cells.join(' | ')} |`),
      ];

      return `\n\n${lines.join('\n')}\n\n`;
    },
  });

  // Callout / blockquote custom divs → blockquote
  td.addRule('callout', {
    filter: (node) =>
      node.nodeName === 'DIV' &&
      (node as HTMLElement).classList.contains('callout'),
    replacement: (content) =>
      content
        .split('\n')
        .map((l) => `> ${l}`)
        .join('\n') + '\n\n',
  });

  return td;
}

/**
 * Exporte une note en Markdown et déclenche le téléchargement du fichier .md
 */
export function exportNoteToMarkdown(
  options: MarkdownExportOptions
): MarkdownExportResult {
  try {
    const { title, htmlContent, filename } = options;

    if (!htmlContent || htmlContent.trim().length === 0) {
      return { success: false, error: 'Contenu HTML vide' };
    }

    const td = buildTurndownService();
    const body = td.turndown(htmlContent);
    const markdownContent = `# ${title}\n\n${body}`;

    const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download =
      filename ??
      `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    };
  }
}
