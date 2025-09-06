/**
 * Utilitaires pour l'application d'opérations de contenu
 * Gère les regex, headings, positions et ancres
 */

import { logApi } from '@/utils/logger';

// ============================================================================
// TYPES
// ============================================================================

export interface ContentOperation {
  id: string;
  action: 'insert' | 'replace' | 'delete' | 'upsert_section';
  target: {
    type: 'heading' | 'regex' | 'position' | 'anchor';
    heading?: {
      path: string[];
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
  where: 'before' | 'after' | 'inside_start' | 'inside_end' | 'at' | 'replace_match';
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
   * Applique une liste d'opérations sur le contenu
   */
  async applyOperations(ops: ContentOperation[]): Promise<{
    content: string;
    results: OperationResult[];
    charDiff: { added: number; removed: number };
  }> {
    this.results = [];
    this.charDiff = { added: 0, removed: 0 };
    let currentContent = this.content;

    for (const op of ops) {
      try {
        const result = await this.applyOperation(currentContent, op);
        this.results.push(result);
        
        if (result.status === 'applied' && result.range_before && result.range_after) {
          // Mettre à jour le contenu avec le résultat de l'opération
          currentContent = this.updateContentWithResult(currentContent, result, op);
        }
      } catch (error) {
        this.results.push({
          id: op.id,
          status: 'failed',
          matches: 0,
          error: error instanceof Error ? error.message : 'Erreur inconnue'
        });
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
    const target = await this.findTarget(content, op.target);
    
    if (!target) {
      return {
        id: op.id,
        status: 'skipped',
        matches: 0,
        error: 'Cible non trouvée'
      };
    }

    const { matches, ranges } = target;
    
    if (matches.length === 0) {
      return {
        id: op.id,
        status: 'skipped',
        matches: 0,
        error: 'Aucune correspondance trouvée'
      };
    }

    // Appliquer l'opération sur la première correspondance
    const match = matches[0];
    const range = ranges[0];
    
    const result = this.executeOperation(content, op, match, range);
    
    // Calculer les différences de caractères
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
      preview: this.generatePreview(result.newContent, range.start, 80)
    };
  }

  /**
   * Trouve la cible selon le type
   */
  private async findTarget(content: string, target: ContentOperation['target']): Promise<{
    matches: string[];
    ranges: Array<{ start: number; end: number }>;
  } | null> {
    switch (target.type) {
      case 'heading':
        return this.findHeadingTarget(content, target.heading!);
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
  private findHeadingTarget(content: string, heading: NonNullable<ContentOperation['target']['heading']>): {
    matches: string[];
    ranges: Array<{ start: number; end: number }>;
  } | null {
    const { path, level, heading_id } = heading;
    
    // Construire le pattern regex pour le heading
    let pattern = '';
    
    if (level) {
      pattern = `^#{${level}}\\s+`;
    } else {
      pattern = `^#{1,6}\\s+`;
    }
    
    // Ajouter le chemin
    const escapedPath = path.map(p => this.escapeRegExp(p)).join('.*?');
    pattern += `(${escapedPath})`;
    
    // Ajouter l'ID si spécifié
    if (heading_id) {
      pattern += `(?:\\s*\\{#${this.escapeRegExp(heading_id)}\\})?`;
    }
    
    const regex = new RegExp(pattern, 'im');
    const match = content.match(regex);
    
    if (!match) {
      return null;
    }
    
    const start = content.indexOf(match[0]);
    const end = start + match[0].length;
    
    return {
      matches: [match[0]],
      ranges: [{ start, end }]
    };
  }

  /**
   * Trouve une cible de type regex
   */
  private async findRegexTarget(content: string, regex: NonNullable<ContentOperation['target']['regex']>): Promise<{
    matches: string[];
    ranges: Array<{ start: number; end: number }>;
  } | null> {
    const { pattern, flags = '', nth } = regex;
    
    // Validation de sécurité
    if (pattern.length > MAX_REGEX_PATTERN_LENGTH) {
      throw new Error('REGEX_COMPILE_ERROR: Pattern trop long');
    }
    
    try {
      const regexObj = new RegExp(pattern, flags);
      
      // Timeout pour éviter les regex malveillantes
      const matches = await this.executeRegexWithTimeout(regexObj, content);
      
      if (matches.length === 0) {
        return null;
      }
      
      // Sélectionner la correspondance selon nth
      const targetMatch = nth !== undefined ? matches[nth] : matches[0];
      if (!targetMatch) {
        return null;
      }
      
      const start = content.indexOf(targetMatch);
      const end = start + targetMatch.length;
      
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
      case 'after_toc':
        // Trouver la fin de la table des matières
        const tocMatch = content.match(/^#{1,6}\s+.*$/gm);
        if (tocMatch) {
          const lastTocLine = tocMatch[tocMatch.length - 1];
          start = content.indexOf(lastTocLine) + lastTocLine.length;
        } else {
          start = 0;
        }
        break;
      case 'before_first_heading':
        // Trouver le premier heading
        const firstHeadingMatch = content.match(/^#{1,6}\s+/m);
        if (firstHeadingMatch) {
          start = content.indexOf(firstHeadingMatch[0]);
        } else {
          start = content.length;
        }
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
   * Exécute une regex avec timeout
   */
  private async executeRegexWithTimeout(regex: RegExp, content: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('REGEX_TIMEOUT'));
      }, REGEX_TIMEOUT_MS);
      
      try {
        const matches = content.match(regex);
        clearTimeout(timeout);
        resolve(matches || []);
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
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
    const { action, where, content: newContent = '' } = op;
    
    let result = content;
    
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
    const after = content.substring(range.end);
    
    switch (where) {
      case 'before':
        return before + newContent + content.substring(range.start);
      case 'after':
        return before + content.substring(range.start) + newContent + after;
      case 'inside_start':
        return before + newContent + content.substring(range.start);
      case 'inside_end':
        return before + content.substring(range.start) + newContent + after;
      case 'at':
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
   * Upsert une section
   */
  private upsertSection(
    content: string, 
    range: { start: number; end: number }, 
    newContent: string, 
    where: string
  ): string {
    // Pour upsert_section, on fait un replace si on trouve la section, sinon insert
    if (range.start === range.end) {
      return this.insertContent(content, range, newContent, where);
    } else {
      return this.replaceContent(content, range, newContent);
    }
  }

  /**
   * Met à jour le contenu avec le résultat d'une opération
   */
  private updateContentWithResult(
    content: string, 
    result: OperationResult, 
    op: ContentOperation
  ): string {
    if (!result.range_before || !result.range_after) {
      return content;
    }
    
    const before = content.substring(0, result.range_before.start);
    const after = content.substring(result.range_before.end);
    const newContent = op.content || '';
    
    return before + newContent + after;
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
  // Utiliser une fonction de hachage simple pour l'ETag
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convertir en 32-bit integer
  }
  return `W/"${Math.abs(hash).toString(16)}"`;
}

/**
 * Génère un diff simple
 */
export function generateDiff(original: string, modified: string): string {
  // Implémentation simple de diff - peut être améliorée avec une librairie
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
