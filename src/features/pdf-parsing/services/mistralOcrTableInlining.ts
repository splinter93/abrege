/**
 * Réinjecte les tableaux Mistral OCR dans le markdown à la place des placeholders.
 * @see https://docs.mistral.ai/studio-api/document-processing/basic_ocr
 * Placeholders : [tbl-3.html](tbl-3.html), [tab1.md](tab1.md), etc.
 */

import { logger, LogCategory } from '@/utils/logger';
import type { MistralOcrPageWithImages } from './mistralOcrImageToS3';

/** Placeholders table Mistral non résolus (hors images ![…]). */
const UNRESOLVED_TABLE_PLACEHOLDER =
  /(?<!!)\[[^\]]+\]\((?:tbl-|tab)[^)]*\.(?:md|html)\)/i;

export interface MistralOcrTable {
  id?: string;
  content?: string;
  markdown?: string;
  table?: string;
  html?: string;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function asTableRecord(table: unknown): MistralOcrTable | null {
  if (!table || typeof table !== 'object') return null;
  return table as MistralOcrTable;
}

/**
 * Extrait le contenu tableau (markdown prioritaire, sinon html).
 */
export function getMistralTableContent(table: unknown): string | null {
  const t = asTableRecord(table);
  if (!t) return null;

  const markdown =
    (typeof t.content === 'string' && t.content.trim()) ||
    (typeof t.markdown === 'string' && t.markdown.trim()) ||
    (typeof t.table === 'string' && t.table.trim()) ||
    '';

  if (markdown.length > 0) return markdown;

  if (typeof t.html === 'string' && t.html.trim().length > 0) {
    return t.html.trim();
  }

  return null;
}

/**
 * Remplace [label](tableId) par le contenu du tableau au bon emplacement.
 */
export function replaceMistralTableRefsInMarkdown(
  markdown: string,
  tableId: string,
  tableContent: string
): string {
  const id = escapeRegExp(tableId);
  const trimmed = tableContent.trim();
  if (!trimmed) return markdown;

  // Tables : [tbl-0.md](tbl-0.md) — pas les images ![…](id)
  const linkPattern = new RegExp(`(?<!!)\\[([^\\]]*)\\]\\(${id}\\)`, 'g');
  return markdown.replace(linkPattern, () => trimmed);
}

/**
 * Pour chaque page : remplace les placeholders table par le contenu de pages[].tables.
 */
export function processMistralOcrPageTables(
  pages: MistralOcrPageWithImages[]
): MistralOcrPageWithImages[] {
  return pages.map((page) => {
    const tables = page.tables ?? [];
    if (tables.length === 0) return page;

    let markdown = page.markdown ?? '';

    for (const table of tables) {
      const record = asTableRecord(table);
      const tableId = record?.id?.trim();
      const content = getMistralTableContent(table);
      if (!tableId || !content) continue;
      markdown = replaceMistralTableRefsInMarkdown(markdown, tableId, content);
    }

    if (UNRESOLVED_TABLE_PLACEHOLDER.test(markdown)) {
      logger.warn(LogCategory.API, '[mistralOcrTableInlining] placeholder table non résolu', {
        pageIndex: page.index,
      });
    }

    return { ...page, markdown };
  });
}
