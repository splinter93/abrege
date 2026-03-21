/**
 * Utilitaires pour l'application d'opérations de contenu
 * Gère les regex, headings, positions et ancres
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { logApi } from '@/utils/logger';
import { slugify, extractTOCWithSlugs } from '@/utils/markdownTOC';

// ============================================================================
// TYPES
// ============================================================================

export interface ContentOperation {
  id: string;
  action: 'insert' | 'replace' | 'delete' | 'upsert_section';
  target: {
    type: 'heading' | 'regex' | 'position' | 'anchor';
    heading?: {
      path?: string[];
      level?: number;
      heading_id?: string;
    };
    regex?: {
      pattern: string;
      flags?: string;
      nth?: number;
    };
    position?: {
      mode: 'offset' | 'start' | 'end';
      offset?: number;
    };
    anchor?: {
      name: 'doc_start' | 'doc_end' | 'after_toc' | 'before_first_heading';
    };
  };
  where?: 'before' | 'after' | 'inside_start' | 'inside_end' | 'at' | 'replace_match';
  content?: string;
  options?: {
    ensure_heading?: boolean;
    surround_with_blank_lines?: number;
    dedent?: boolean;
  };
}

export interface OperationResult {
  id: string;
  status: 'applied' | 'skipped' | 'failed';
  matches: number;
  range_before?: { start: number; end: number };
  range_after?: { start: number; end: number };
  preview?: string;
  error?: string;
  newContent?: string;
  // FIX3: aide LLM à corriger ses cibles quand une op est skipped
  available_headings?: Array<{ title: string; slug: string; level: number }>;
}

export interface ContentApplyResult {
  note_id: string;
  ops_results: OperationResult[];
  etag: string;
  diff?: string;
  content?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const CONTENT_APPLY_ERRORS = {
  TARGET_NOT_FOUND: { code: 'TARGET_NOT_FOUND', status: 404 },
  AMBIGUOUS_MATCH: { code: 'AMBIGUOUS_MATCH', status: 409 },
  REGEX_COMPILE_ERROR: { code: 'REGEX_COMPILE_ERROR', status: 400 },
  REGEX_TIMEOUT: { code: 'REGEX_TIMEOUT', status: 408 },
  PRECONDITION_FAILED: { code: 'PRECONDITION_FAILED', status: 412 },
  PARTIAL_APPLY: { code: 'PARTIAL_APPLY', status: 207 },
  CONTENT_TOO_LARGE: { code: 'CONTENT_TOO_LARGE', status: 413 },
  INVALID_OPERATION: { code: 'INVALID_OPERATION', status: 400 }
} as const;

const REGEX_TIMEOUT_MS = 5000;
const MAX_CONTENT_LENGTH = 100000;
const MAX_REGEX_PATTERN_LENGTH = 1000;

// ============================================================================
// MAIN CONTENT APPLIER
// ============================================================================

export class ContentApplier {
  private content: string;
  private results: OperationResult[] = [];
  private charDiff = { added: 0, removed: 0 };

  constructor(content: string) {
    this.content = content;
  }

  /**
   * Applique une liste d'opérations sur le contenu.
   * Si transaction='all_or_nothing', rollback complet si une op échoue.
   */
  async applyOperations(
    ops: ContentOperation[],
    options?: { transaction?: 'all_or_nothing' | 'best_effort' }
  ): Promise<{
    content: string;
    results: OperationResult[];
    charDiff: { added: number; removed: number };
  }> {
    this.results = [];
    this.charDiff = { added: 0, removed: 0 };
    const isAllOrNothing = options?.transaction === 'all_or_nothing';
    const snapshot = this.content;
    let currentContent = this.content;

    for (let i = 0; i < ops.length; i++) {
      const op = ops[i];
      try {
        const result = await this.applyOperation(currentContent, op);
        this.results.push(result);

        if (result.status === 'failed' && isAllOrNothing) {
          // FIX5: rollback — remettre le snapshot et marquer le reste skipped
          logApi.warn('[applyOperations] all_or_nothing: rollback triggered', { opId: op.id });
          currentContent = snapshot;
          for (let j = i + 1; j < ops.length; j++) {
            this.results.push({
              id: ops[j].id,
              status: 'skipped',
              matches: 0,
              error: 'Rolled back due to previous failure (all_or_nothing)'
            });
          }
          break;
        }

        if (result.status === 'applied' && result.newContent !== undefined) {
          currentContent = result.newContent;
        }
      } catch (error) {
        this.results.push({
          id: op.id,
          status: 'failed',
          matches: 0,
          error: error instanceof Error ? error.message : 'Erreur inconnue'
        });

        if (isAllOrNothing) {
          currentContent = snapshot;
          for (let j = i + 1; j < ops.length; j++) {
            this.results.push({
              id: ops[j].id,
              status: 'skipped',
              matches: 0,
              error: 'Rolled back due to previous failure (all_or_nothing)'
            });
          }
          break;
        }
      }
    }

    return {
      content: currentContent,
      results: this.results,
      charDiff: this.charDiff
    };
  }

  /**
   * Applique une opération individuelle
   */
  private async applyOperation(content: string, op: ContentOperation): Promise<OperationResult> {
    const isUpsert = op.action === 'upsert_section';

    const target = await this.findTarget(content, op.target, isUpsert);

    if (!target || target.matches.length === 0) {
      if (isUpsert) {
        logApi.info('[applyOperation] upsert_section avec 0 match, création de section');
        const emptyRange = { start: content.length, end: content.length };
        const result = this.executeOperation(content, op, '', emptyRange);

        const contentLength = op.content?.length || 0;
        this.charDiff.added += contentLength;

        return {
          id: op.id,
          status: 'applied',
          matches: 0,
          range_before: emptyRange,
          range_after: {
            start: emptyRange.start,
            end: emptyRange.start + contentLength
          },
          preview: this.generatePreview(result.newContent, emptyRange.start, 80),
          newContent: result.newContent
        };
      }

      // FIX3: feedback enrichi pour aider le LLM à corriger sa cible
      const toc = extractTOCWithSlugs(content);
      return {
        id: op.id,
        status: 'skipped',
        matches: 0,
        error: !target ? 'Cible non trouvée' : 'Aucune correspondance trouvée',
        available_headings: toc.slice(0, 10).map(t => ({
          title: t.title,
          slug: t.slug,
          level: t.level
        }))
      };
    }

    const { matches, ranges } = target;
    const match = matches[0];
    let range = ranges[0];

    // FIX2: pour inside_start / inside_end sur une cible heading,
    // on calcule la position exacte dans le corps de la section
    if (
      op.target.type === 'heading' &&
      (op.where === 'inside_start' || op.where === 'inside_end')
    ) {
      range = this.resolveSectionInsertionPoint(content, range, op.where, op.target.heading?.level);
      // On remplace le where par 'at' car la range est déjà le point d'insertion exact
      op = { ...op, where: 'at' };
    }

    const result = this.executeOperation(content, op, match, range);

    const contentLength = op.content?.length || 0;
    const removedLength = range.end - range.start;

    this.charDiff.added += contentLength;
    this.charDiff.removed += removedLength;

    return {
      id: op.id,
      status: 'applied',
      matches: matches.length,
      range_before: range,
      range_after: {
        start: range.start,
        end: range.start + contentLength
      },
      preview: this.generatePreview(result.newContent, range.start, 80),
      newContent: result.newContent
    };
  }

  /**
   * FIX2: Résout le point d'insertion exact dans le corps d'une section.
   * - inside_start → juste après la ligne du heading (fin du titre)
   * - inside_end → juste avant le prochain heading de même niveau ou supérieur
   */
  private resolveSectionInsertionPoint(
    content: string,
    headingRange: { start: number; end: number },
    where: 'inside_start' | 'inside_end',
    level?: number
  ): { start: number; end: number } {
    const headingLine = content.substring(headingRange.start, headingRange.end);

    // Déterminer le niveau du heading si non fourni
    const levelMatch = headingLine.match(/^(#{1,6})\s/);
    const headingLevel = level ?? (levelMatch ? levelMatch[1].length : 1);

    const afterHeading = headingRange.end;
    const remainingContent = content.substring(afterHeading);

    // Trouver le prochain heading de même niveau ou supérieur
    const nextSectionPattern = new RegExp(`^#{1,${headingLevel}}\\s`, 'm');
    const nextSectionMatch = remainingContent.match(nextSectionPattern);

    let sectionEnd: number;
    if (nextSectionMatch && nextSectionMatch.index !== undefined) {
      sectionEnd = afterHeading + nextSectionMatch.index;
    } else {
      sectionEnd = content.length;
    }

    if (where === 'inside_start') {
      // Insérer juste après le saut de ligne qui termine la ligne du heading
      // (headingRange.end pointe avant le \n car $ en mode multiline exclut le \n)
      let insertPos = afterHeading;
      if (insertPos < content.length && content[insertPos] === '\n') {
        insertPos++;
      }
      return { start: insertPos, end: insertPos };
    } else {
      // inside_end : insérer à la fin du corps de la section
      // On recule pour éviter de dupliquer les sauts de ligne en fin de section
      let insertPos = sectionEnd;
      while (insertPos > afterHeading && content[insertPos - 1] === '\n') {
        insertPos--;
      }
      return { start: insertPos, end: insertPos };
    }
  }

  /**
   * Trouve la cible selon le type
   */
  private async findTarget(
    content: string,
    target: ContentOperation['target'],
    allowEmpty: boolean = false
  ): Promise<{
    matches: string[];
    ranges: Array<{ start: number; end: number }>;
  } | null> {
    switch (target.type) {
      case 'heading':
        return this.findHeadingTarget(content, target.heading!, allowEmpty);
      case 'regex':
        return await this.findRegexTarget(content, target.regex!);
      case 'position':
        return this.findPositionTarget(content, target.position!);
      case 'anchor':
        return this.findAnchorTarget(content, target.anchor!);
      default:
        return null;
    }
  }

  /**
   * Trouve une cible de type heading
   */
  private findHeadingTarget(
    content: string,
    heading: NonNullable<ContentOperation['target']['heading']>,
    allowEmpty: boolean = false
  ): {
    matches: string[];
    ranges: Array<{ start: number; end: number }>;
  } | null {
    const { path, level, heading_id } = heading;

    // FIX1: utiliser slugify (même implémentation que extractTOCWithSlugs)
    if (heading_id) {
      const headingPattern = level
        ? `^#{${level}}\\s+(.+)$`
        : `^#{1,6}\\s+(.+)$`;

      const headingRegex = new RegExp(headingPattern, 'gm');
      let match;
      const slugCount: Record<string, number> = {};

      while ((match = headingRegex.exec(content)) !== null) {
        const headingText = match[1].trim();
        const baseSlug = slugify(headingText);
        let dedupedSlug: string;
        if (slugCount[baseSlug] !== undefined) {
          dedupedSlug = `${baseSlug}-${++slugCount[baseSlug]}`;
        } else {
          slugCount[baseSlug] = 0;
          dedupedSlug = baseSlug;
        }

        if (dedupedSlug === heading_id) {
          const start = match.index;
          const end = start + match[0].length;
          return {
            matches: [match[0]],
            ranges: [{ start, end }]
          };
        }
      }

      if (allowEmpty) {
        logApi.info('[findHeadingTarget] Heading non trouvé mais allowEmpty=true, retour vide');
        return { matches: [], ranges: [] };
      }
      return null;
    }

    if (path && path.length > 0) {
      const targetTitle = path[path.length - 1];
      const pattern = level
        ? `^#{${level}}\\s+${this.escapeRegExp(targetTitle)}.*$`
        : `^#{1,6}\\s+${this.escapeRegExp(targetTitle)}.*$`;

      const pathRegex = new RegExp(pattern, 'm');
      const match = pathRegex.exec(content);

      if (!match) {
        if (allowEmpty) {
          logApi.info('[findHeadingTarget] Heading non trouvé mais allowEmpty=true, retour vide');
          return { matches: [], ranges: [] };
        }
        return null;
      }

      const start = match.index;
      const end = start + match[0].length;

      return {
        matches: [match[0]],
        ranges: [{ start, end }]
      };
    }

    if (allowEmpty) {
      logApi.info('[findHeadingTarget] Aucun critère mais allowEmpty=true, retour vide');
      return { matches: [], ranges: [] };
    }
    return null;
  }

  /**
   * Trouve une cible de type regex
   */
  private async findRegexTarget(content: string, regex: NonNullable<ContentOperation['target']['regex']>): Promise<{
    matches: string[];
    ranges: Array<{ start: number; end: number }>;
  } | null> {
    const { pattern, nth } = regex;
    let flags = regex.flags ?? '';
    if ((pattern.includes('^') || pattern.includes('$')) && !flags.includes('m')) {
      flags += 'm';
    }

    if (pattern.length > MAX_REGEX_PATTERN_LENGTH) {
      throw new Error('REGEX_COMPILE_ERROR: Pattern trop long');
    }

    try {
      const regexObj = new RegExp(pattern, flags);

      logApi.info(`🔍 Regex search: pattern="${pattern}", flags="${flags}", content_length=${content.length}`, {
        operation: 'findRegexTarget',
        component: 'ContentApplier'
      });

      const matches = await this.executeRegexWithTimeout(regexObj, content);

      logApi.info(`🔍 Regex matches found: ${matches.length}`, {
        operation: 'findRegexTarget',
        component: 'ContentApplier',
        matches: matches.slice(0, 3)
      });

      if (matches.length === 0) {
        return null;
      }

      const targetIndex = nth !== undefined ? nth : 0;
      if (targetIndex < 0 || targetIndex >= matches.length) {
        logApi.warn(`🔍 Invalid nth index: ${targetIndex}, available: ${matches.length}`, {
          operation: 'findRegexTarget',
          component: 'ContentApplier'
        });
        return null;
      }

      const targetMatch = matches[targetIndex];

      const globalFlags = flags.includes('g') ? flags : flags + 'g';
      const regexWithGlobal = new RegExp(pattern, globalFlags);
      let match;
      let matchIndex = 0;
      let start = -1;
      let end = -1;

      while ((match = regexWithGlobal.exec(content)) !== null) {
        if (matchIndex === targetIndex) {
          start = match.index;
          end = match.index + match[0].length;
          break;
        }
        matchIndex++;
      }

      if (start === -1 || end === -1) {
        logApi.warn(`🔍 Position not found for match ${targetIndex}`, {
          operation: 'findRegexTarget',
          component: 'ContentApplier',
          targetIndex,
          totalMatches: matches.length
        });
        return null;
      }

      logApi.info(`🔍 Regex target found: start=${start}, end=${end}, match="${targetMatch.substring(0, 50)}..."`, {
        operation: 'findRegexTarget',
        component: 'ContentApplier'
      });

      return {
        matches: [targetMatch],
        ranges: [{ start, end }]
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('timeout')) {
        throw new Error('REGEX_TIMEOUT');
      }
      throw new Error('REGEX_COMPILE_ERROR: ' + error);
    }
  }

  /**
   * Trouve une cible de type position
   */
  private findPositionTarget(content: string, position: NonNullable<ContentOperation['target']['position']>): {
    matches: string[];
    ranges: Array<{ start: number; end: number }>;
  } | null {
    const { mode, offset } = position;

    let start: number;

    switch (mode) {
      case 'start':
        start = 0;
        break;
      case 'end':
        start = content.length;
        break;
      case 'offset':
        start = offset || 0;
        break;
      default:
        return null;
    }

    return {
      matches: [''],
      ranges: [{ start, end: start }]
    };
  }

  /**
   * Trouve une cible de type anchor
   */
  private findAnchorTarget(content: string, anchor: NonNullable<ContentOperation['target']['anchor']>): {
    matches: string[];
    ranges: Array<{ start: number; end: number }>;
  } | null {
    const { name } = anchor;

    let start: number;

    switch (name) {
      case 'doc_start':
        start = 0;
        break;
      case 'doc_end':
        start = content.length;
        break;
      case 'after_toc': {
        // FIX4: chercher un vrai bloc TOC markdown (liste de liens)
        // ex: "- [Titre](#slug)\n" répété sur plusieurs lignes
        const tocBlockMatch = content.match(/^(?:[*-]\s+\[.+\]\(#.+\)\s*\n)+/m);
        if (tocBlockMatch && tocBlockMatch.index !== undefined) {
          start = tocBlockMatch.index + tocBlockMatch[0].length;
        } else {
          // Pas de bloc TOC trouvé → fallback début du document
          start = 0;
        }
        break;
      }
      case 'before_first_heading': {
        const firstHeadingMatch = content.match(/^#{1,6}\s+/m);
        if (firstHeadingMatch) {
          start = content.indexOf(firstHeadingMatch[0]);
        } else {
          start = content.length;
        }
        break;
      }
      default:
        return null;
    }

    return {
      matches: [''],
      ranges: [{ start, end: start }]
    };
  }

  /**
   * Exécute une regex avec timeout
   */
  private async executeRegexWithTimeout(regex: RegExp, content: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('REGEX_TIMEOUT'));
      }, REGEX_TIMEOUT_MS);

      try {
        if (content.length > MAX_CONTENT_LENGTH) {
          clearTimeout(timeout);
          reject(new Error('CONTENT_TOO_LARGE'));
          return;
        }

        const matches: string[] = [];
        const regexWithGlobal = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g');
        let match;

        while ((match = regexWithGlobal.exec(content)) !== null) {
          matches.push(match[0]);
          if (match[0].length === 0) {
            regexWithGlobal.lastIndex++;
          }
        }

        clearTimeout(timeout);
        resolve(matches);
      } catch (error) {
        clearTimeout(timeout);
        if (error instanceof Error) {
          if (error.message.includes('timeout')) {
            reject(new Error('REGEX_TIMEOUT'));
          } else if (error.message.includes('Invalid regular expression')) {
            reject(new Error('REGEX_COMPILE_ERROR: ' + error.message));
          } else {
            reject(error);
          }
        } else {
          reject(new Error('REGEX_COMPILE_ERROR: Erreur inconnue'));
        }
      }
    });
  }

  /**
   * FIX6: Applique les options de contenu (dedent, surround_with_blank_lines)
   */
  private applyContentOptions(content: string, options?: ContentOperation['options']): string {
    let result = content;
    if (options?.dedent) {
      result = result.replace(/^[ \t]+/gm, '');
    }
    if (options?.surround_with_blank_lines) {
      const nl = '\n'.repeat(options.surround_with_blank_lines);
      result = nl + result + nl;
    }
    return result;
  }

  /**
   * Exécute l'opération sur le contenu
   */
  private executeOperation(
    content: string,
    op: ContentOperation,
    match: string,
    range: { start: number; end: number }
  ): { newContent: string } {
    const { action, options } = op;
    const where = op.where ?? 'at';
    // FIX6: appliquer les options sur le contenu avant insertion
    const newContent = this.applyContentOptions(op.content ?? '', options);

    if (range.start < 0 || range.end < 0 || range.start > content.length || range.end > content.length) {
      throw new Error('Range invalide: indices hors limites');
    }

    if (range.start > range.end) {
      throw new Error('Range invalide: start > end');
    }

    let result = content;

    try {
      switch (action) {
        case 'insert':
          result = this.insertContent(content, range, newContent, where);
          break;
        case 'replace':
          result = this.replaceContent(content, range, newContent);
          break;
        case 'delete':
          result = this.deleteContent(content, range);
          break;
        case 'upsert_section':
          result = this.upsertSection(content, range, newContent, where);
          break;
        default:
          throw new Error(`Action non supportée: ${action}`);
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Erreur lors de l'exécution de l'opération ${action}: ${error.message}`);
      }
      throw new Error(`Erreur inconnue lors de l'exécution de l'opération ${action}`);
    }

    return { newContent: result };
  }

  /**
   * Insère du contenu à une position
   */
  private insertContent(
    content: string,
    range: { start: number; end: number },
    newContent: string,
    where: string
  ): string {
    const before = content.substring(0, range.start);
    const match = content.substring(range.start, range.end);
    const after = content.substring(range.end);

    switch (where) {
      case 'before':
        return before + newContent + match + after;
      case 'after':
        return before + match + newContent + after;
      case 'inside_start':
        return before + match + '\n' + newContent + after;
      case 'inside_end':
        return before + match + newContent + '\n' + after;
      case 'at':
        return before + newContent + after;
      case 'replace_match':
        return before + newContent + after;
      default:
        return content;
    }
  }

  /**
   * Remplace du contenu
   */
  private replaceContent(
    content: string,
    range: { start: number; end: number },
    newContent: string
  ): string {
    const before = content.substring(0, range.start);
    const after = content.substring(range.end);
    return before + newContent + after;
  }

  /**
   * Supprime du contenu
   */
  private deleteContent(content: string, range: { start: number; end: number }): string {
    const before = content.substring(0, range.start);
    const after = content.substring(range.end);
    return before + after;
  }

  /**
   * Upsert une section (UPDATE si existe, INSERT si n'existe pas)
   *
   * Comportement :
   * - Si section trouvée : remplace TOUTE la section (heading + contenu jusqu'à la prochaine section)
   * - Si section non trouvée : ajoute la nouvelle section à la fin du document
   */
  private upsertSection(
    content: string,
    range: { start: number; end: number },
    newContent: string,
    _where: string
  ): string {
    // CAS 1 : Section non trouvée → Créer à la fin du document
    if (range.start === range.end) {
      logApi.info('[upsertSection] Section non trouvée, création à la fin du document');
      const needsSpacing = content.length > 0 && !content.endsWith('\n\n');
      const spacing = needsSpacing ? '\n\n' : (content.endsWith('\n') ? '\n' : '\n\n');
      return content + spacing + newContent.trim() + '\n';
    }

    // CAS 2 : Section trouvée → Remplacer TOUTE la section
    logApi.info('[upsertSection] Section trouvée, remplacement du contenu complet');

    const headingMatch = content.substring(range.start, range.end).match(/^(#{1,6})\s/);
    if (!headingMatch) {
      return this.replaceContent(content, range, newContent);
    }

    const targetLevel = headingMatch[1].length;
    const afterHeading = range.end;
    const remainingContent = content.substring(afterHeading);

    const nextSectionPattern = new RegExp(`^#{1,${targetLevel}}\\s`, 'm');
    const nextSectionMatch = remainingContent.match(nextSectionPattern);

    let sectionEnd: number;
    if (nextSectionMatch && nextSectionMatch.index !== undefined) {
      sectionEnd = afterHeading + nextSectionMatch.index;
    } else {
      sectionEnd = content.length;
    }

    const before = content.substring(0, range.start);
    const after = content.substring(sectionEnd);

    return before + newContent.trim() + '\n' + after;
  }

  /**
   * Génère un aperçu du contenu
   */
  private generatePreview(content: string, start: number, maxLength: number): string {
    const preview = content.substring(start, start + maxLength);
    return preview.length < maxLength ? preview : preview + '...';
  }

  /**
   * Échappe les caractères spéciaux pour les regex
   */
  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calcule l'ETag d'un contenu
 */
export function calculateETag(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `W/"${Math.abs(hash).toString(16)}"`;
}

/**
 * Génère un diff simple
 */
export function generateDiff(original: string, modified: string): string {
  const originalLines = original.split('\n');
  const modifiedLines = modified.split('\n');

  let diff = '';
  let i = 0;
  let j = 0;

  while (i < originalLines.length || j < modifiedLines.length) {
    if (i >= originalLines.length) {
      diff += `+${modifiedLines[j]}\n`;
      j++;
    } else if (j >= modifiedLines.length) {
      diff += `-${originalLines[i]}\n`;
      i++;
    } else if (originalLines[i] === modifiedLines[j]) {
      diff += ` ${originalLines[i]}\n`;
      i++;
      j++;
    } else {
      diff += `-${originalLines[i]}\n`;
      diff += `+${modifiedLines[j]}\n`;
      i++;
      j++;
    }
  }

  return diff;
}

// ============================================================================
// SHARED ROUTE UTILITIES
// ============================================================================

/**
 * Vérifie si un canva est ouvert pour cette note (pour streaming automatique)
 */
export async function isCanvaOpen(
  supabase: SupabaseClient,
  noteId: string,
  userId: string
): Promise<boolean> {
  try {
    const { data: openCanva, error } = await supabase
      .from('canva_sessions')
      .select('id, status')
      .eq('note_id', noteId)
      .eq('status', 'open')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      logApi.warn('[contentApply] Error checking canva status', { noteId, error: error.message });
      return false;
    }
    return !!openCanva;
  } catch (error) {
    logApi.warn('[contentApply] Exception checking canva status', {
      noteId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return false;
  }
}

/**
 * Valide l'ETag ou la version de la note (optimistic locking)
 */
export async function validateETag(
  supabase: SupabaseClient,
  noteId: string,
  ifMatch?: string | null,
  xNoteVersion?: string | null
): Promise<{ valid: boolean; etag?: string; message?: string }> {
  try {
    const { data: note, error } = await supabase
      .from('articles')
      .select('updated_at, markdown_content')
      .eq('id', noteId)
      .single();

    if (error || !note) {
      return { valid: false, message: 'Note non trouvée' };
    }

    const currentETag = calculateETag(note.markdown_content);

    if (ifMatch && ifMatch !== currentETag) {
      return {
        valid: false,
        etag: currentETag,
        message: `ETag mismatch: expected ${ifMatch}, got ${currentETag}`
      };
    }

    if (xNoteVersion) {
      const version = parseInt(xNoteVersion);
      if (isNaN(version)) {
        return { valid: false, message: 'Version invalide' };
      }
      const currentVersion = new Date(note.updated_at).getTime();
      if (version !== currentVersion) {
        return {
          valid: false,
          etag: currentETag,
          message: `Version mismatch: expected ${version}, got ${currentVersion}`
        };
      }
    }

    return { valid: true, etag: currentETag };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    logApi.error('[contentApply] Error validating ETag', { error: errorMessage, noteId });
    return { valid: false, message: 'Erreur lors de la validation' };
  }
}
