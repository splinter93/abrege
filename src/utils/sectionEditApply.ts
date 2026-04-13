/**
 * Application d'éditions centrées TOC (slug / titre de section).
 * Réutilise les primitives line-based de markdownTOC.ts.
 */

import type { TOCItemWithSlug } from '@/utils/markdownTOC';
import {
  appendToSection,
  clearSection,
  eraseSection,
  extractTOCWithSlugs
} from '@/utils/markdownTOC';

export const SECTION_EDIT_ACTIONS = [
  'insert_before',
  'insert_after',
  'insert_inside_start',
  'insert_inside_end',
  'replace_content',
  'replace_heading',
  'delete',
  'create_section'
] as const;

export type SectionEditAction = (typeof SECTION_EDIT_ACTIONS)[number];

export interface SectionEditPayload {
  action: SectionEditAction;
  /** Slug ou titre exact retourné par getNoteTOC (obligatoire sauf create_section) */
  section_slug?: string;
  content?: string;
  /** replace_heading : nouveau titre (sans #) */
  new_heading_title?: string;
  /** replace_heading (optionnel) ou create_section (obligatoire) */
  heading_level?: number;
  /** create_section : texte du titre */
  heading_title?: string;
  create_placement?: 'at_start' | 'at_end' | 'after_slug';
  /** create_section + placement after_slug : section après laquelle insérer */
  after_slug?: string;
}

export interface SectionBounds {
  lines: string[];
  headingLineIdx: number;
  /** Index de ligne (0-based) du premier heading hors section (ou lines.length) */
  sectionEndLine: number;
  target: TOCItemWithSlug;
}

export function findSectionBounds(markdown: string, slugOrTitle: string): SectionBounds | null {
  const toc = extractTOCWithSlugs(markdown);
  const idx = toc.findIndex(t => t.slug === slugOrTitle || t.title === slugOrTitle);
  if (idx === -1) return null;

  const target = toc[idx];
  const lines = markdown.split('\n');
  const headingLineIdx = target.line - 1;
  let sectionEndLine = lines.length;

  for (let i = target.line; i < lines.length; i++) {
    const m = lines[i].match(/^(#{1,6})\s+(.+)/);
    if (m && m[1].length <= target.level) {
      sectionEndLine = i;
      break;
    }
  }

  return { lines, headingLineIdx, sectionEndLine, target };
}

function joinLines(lines: string[]): string {
  return lines.join('\n');
}

/**
 * Applique une édition TOC-first sur le markdown.
 * @returns nouveau markdown ou message d'erreur métier
 */
export function applySectionEdit(
  markdown: string,
  payload: SectionEditPayload
): { ok: true; markdown: string } | { ok: false; error: string; code?: string } {
  const { action } = payload;

  if (action === 'create_section') {
    return applyCreateSection(markdown, payload);
  }

  const slug = payload.section_slug?.trim();
  if (!slug) {
    return { ok: false, error: 'section_slug est requis pour cette action', code: 'MISSING_SECTION_SLUG' };
  }

  const bounds = findSectionBounds(markdown, slug);
  if (!bounds) {
    return { ok: false, error: `Section introuvable: "${slug}"`, code: 'SECTION_NOT_FOUND' };
  }

  try {
    switch (action) {
      case 'insert_before': {
        const piece = (payload.content ?? '').trimEnd();
        const { lines, headingLineIdx } = bounds;
        const before = joinLines(lines.slice(0, headingLineIdx));
        const rest = joinLines(lines.slice(headingLineIdx));
        const out =
          (before ? `${before}\n\n` : '') + piece + (rest ? `\n${rest}` : '');
        return { ok: true, markdown: out };
      }
      case 'insert_after': {
        const piece = (payload.content ?? '').trimEnd();
        const { lines, sectionEndLine } = bounds;
        const before = joinLines(lines.slice(0, sectionEndLine));
        const rest = joinLines(lines.slice(sectionEndLine));
        const out =
          (before ? `${before}\n\n` : '') + piece + (rest ? `\n\n${rest}` : '');
        return { ok: true, markdown: out };
      }
      case 'insert_inside_start':
        return {
          ok: true,
          markdown: appendToSection(markdown, slug, payload.content ?? '', 'start')
        };
      case 'insert_inside_end':
        return {
          ok: true,
          markdown: appendToSection(markdown, slug, payload.content ?? '', 'end')
        };
      case 'replace_content': {
        const cleared = clearSection(markdown, slug);
        return {
          ok: true,
          markdown: appendToSection(cleared, slug, payload.content ?? '', 'end')
        };
      }
      case 'replace_heading': {
        const title = payload.new_heading_title?.trim();
        if (!title) {
          return { ok: false, error: 'new_heading_title est requis pour replace_heading', code: 'MISSING_NEW_HEADING' };
        }
        const level = payload.heading_level ?? bounds.target.level;
        if (level < 1 || level > 6) {
          return { ok: false, error: 'heading_level doit être entre 1 et 6', code: 'INVALID_HEADING_LEVEL' };
        }
        const newLines = [...bounds.lines];
        newLines[bounds.headingLineIdx] = `${'#'.repeat(level)} ${title}`;
        return { ok: true, markdown: joinLines(newLines) };
      }
      case 'delete':
        return { ok: true, markdown: eraseSection(markdown, slug) };
      default:
        return { ok: false, error: `Action non supportée: ${String(action)}`, code: 'INVALID_ACTION' };
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur inconnue';
    return { ok: false, error: msg, code: 'APPLY_ERROR' };
  }
}

function applyCreateSection(
  markdown: string,
  payload: SectionEditPayload
): { ok: true; markdown: string } | { ok: false; error: string; code?: string } {
  const title = payload.heading_title?.trim();
  const level = payload.heading_level;
  const placement = payload.create_placement;

  if (!title || level === undefined || level < 1 || level > 6) {
    return {
      ok: false,
      error: 'heading_title et heading_level (1–6) sont requis pour create_section',
      code: 'MISSING_CREATE_FIELDS'
    };
  }
  if (!placement) {
    return { ok: false, error: 'create_placement est requis pour create_section', code: 'MISSING_PLACEMENT' };
  }
  if (placement === 'after_slug' && !payload.after_slug?.trim()) {
    return { ok: false, error: 'after_slug est requis quand create_placement vaut after_slug', code: 'MISSING_AFTER_SLUG' };
  }

  const body = (payload.content ?? '').trim();
  const headingLine = `${'#'.repeat(level)} ${title}`;
  const block = body ? `${headingLine}\n\n${body}` : headingLine;

  if (placement === 'at_start') {
    const trimmed = markdown.trim();
    return { ok: true, markdown: trimmed ? `${block}\n\n${trimmed}` : block };
  }

  if (placement === 'at_end') {
    const trimmed = markdown.trimEnd();
    return { ok: true, markdown: trimmed ? `${trimmed}\n\n${block}` : block };
  }

  const after = payload.after_slug!.trim();
  const bounds = findSectionBounds(markdown, after);
  if (!bounds) {
    return { ok: false, error: `Section after_slug introuvable: "${after}"`, code: 'SECTION_NOT_FOUND' };
  }

  const { lines, sectionEndLine } = bounds;
  const before = joinLines(lines.slice(0, sectionEndLine));
  const rest = joinLines(lines.slice(sectionEndLine));
  const out = (before ? `${before}\n\n` : '') + block + (rest ? `\n\n${rest}` : '');
  return { ok: true, markdown: out };
}

export function tocSummaryForResponse(markdown: string): Array<{ slug: string; title: string; level: number }> {
  return extractTOCWithSlugs(markdown).map(t => ({
    slug: t.slug,
    title: t.title,
    level: t.level
  }));
}
