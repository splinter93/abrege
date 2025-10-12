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
  newContent?: string; // ✅ FIX: Ajouter le contenu résultant
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
        
        // ✅ FIX: Utiliser directement le contenu retourné par executeOperation
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
    // Exception pour upsert_section : permettre 0 match (création de section)
    // Vérifier AVANT de chercher la cible
    const isUpsert = op.action === 'upsert_section';
    
    const target = await this.findTarget(content, op.target, isUpsert);
    
    if (!target || target.matches.length === 0) {
      if (isUpsert) {
        // Pour upsert, 0 match signifie "créer la section"
        logApi.info('[applyOperation] upsert_section avec 0 match, création de section');
        const emptyRange = { start: content.length, end: content.length };
        const result = this.executeOperation(content, op, '', emptyRange);
        
        const contentLength = op.content?.length || 0;
        this.charDiff.added += contentLength;
        
        return {
          id: op.id,
          status: 'applied',
          matches: 0, // 0 match mais opération réussie
          range_before: emptyRange,
          range_after: {
            start: emptyRange.start,
            end: emptyRange.start + contentLength
          },
          preview: this.generatePreview(result.newContent, emptyRange.start, 80),
          newContent: result.newContent
        };
      }
      
      // Pour les autres actions, skip si cible non trouvée
      return {
        id: op.id,
        status: 'skipped',
        matches: 0,
        error: !target ? 'Cible non trouvée' : 'Aucune correspondance trouvée'
      };
    }

    const { matches, ranges } = target;

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
      preview: this.generatePreview(result.newContent, range.start, 80),
      newContent: result.newContent // ✅ FIX: Retourner le contenu résultant
    };
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
    
    // ✅ FIX: Si heading_id est fourni, chercher directement par slug
    if (heading_id) {
      // Le heading_id correspond au slug du heading
      // Chercher un heading dont le contenu génère ce slug
      const headingPattern = level 
        ? `^#{${level}}\\s+(.+)$`
        : `^#{1,6}\\s+(.+)$`;
      
      const headingRegex = new RegExp(headingPattern, 'gm');
      let match;
      
      while ((match = headingRegex.exec(content)) !== null) {
        const headingText = match[1].trim();
        const generatedSlug = this.generateSlug(headingText);
        
        if (generatedSlug === heading_id) {
          const start = match.index;
          const end = start + match[0].length;
          
          return {
            matches: [match[0]],
            ranges: [{ start, end }]
          };
        }
      }
      
      // Si allowEmpty (pour upsert), retourner un résultat vide au lieu de null
      if (allowEmpty) {
        logApi.info('[findHeadingTarget] Heading non trouvé mais allowEmpty=true, retour vide');
        return {
          matches: [],
          ranges: []
        };
      }
      
      return null;
    }
    
    // ✅ FIX: Si path est fourni, chercher le dernier élément du path
    // (le système hiérarchique complet est complexe, on simplifie)
    if (path && path.length > 0) {
      const targetTitle = path[path.length - 1]; // Prendre le dernier élément du path
      const pattern = level 
        ? `^#{${level}}\\s+${this.escapeRegExp(targetTitle)}.*$`
        : `^#{1,6}\\s+${this.escapeRegExp(targetTitle)}.*$`;
      
      const regex = new RegExp(pattern, 'm');
      const match = content.match(regex);
      
      if (!match) {
        // Si allowEmpty (pour upsert), retourner un résultat vide au lieu de null
        if (allowEmpty) {
          logApi.info('[findHeadingTarget] Heading non trouvé mais allowEmpty=true, retour vide');
          return {
            matches: [],
            ranges: []
          };
        }
        return null;
      }
      
      const start = content.indexOf(match[0]);
      const end = start + match[0].length;
      
      return {
        matches: [match[0]],
        ranges: [{ start, end }]
      };
    }
    
    // Si aucun critère n'est fourni
    if (allowEmpty) {
      logApi.info('[findHeadingTarget] Aucun critère mais allowEmpty=true, retour vide');
      return {
        matches: [],
        ranges: []
      };
    }
    
    return null;
  }
  
  /**
   * Génère un slug à partir d'un titre de heading
   */
  private generateSlug(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Enlever les accents
      .replace(/[^\w\s-]/g, '') // Enlever les caractères spéciaux
      .replace(/\s+/g, '-') // Espaces -> tirets
      .replace(/-+/g, '-') // Multiples tirets -> un seul
      .replace(/^-+|-+$/g, ''); // Enlever tirets début/fin
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
      
      // 🔍 DEBUG: Log du pattern et du contenu
      logApi.info(`🔍 Regex search: pattern="${pattern}", flags="${flags}", content_length=${content.length}`, {
        operation: 'findRegexTarget',
        component: 'ContentApplier'
      });
      
      // Timeout pour éviter les regex malveillantes
      const matches = await this.executeRegexWithTimeout(regexObj, content);
      
      logApi.info(`🔍 Regex matches found: ${matches.length}`, {
        operation: 'findRegexTarget',
        component: 'ContentApplier',
        matches: matches.slice(0, 3) // Log des 3 premières correspondances
      });
      
      if (matches.length === 0) {
        return null;
      }
      
      // Sélectionner la correspondance selon nth
      const targetIndex = nth !== undefined ? nth : 0;
      if (targetIndex < 0 || targetIndex >= matches.length) {
        logApi.warn(`🔍 Invalid nth index: ${targetIndex}, available: ${matches.length}`, {
          operation: 'findRegexTarget',
          component: 'ContentApplier'
        });
        return null;
      }
      
      const targetMatch = matches[targetIndex];
      
      // 🔧 CORRECTION: Utiliser exec() pour obtenir les positions exactes
      const regexWithGlobal = new RegExp(pattern, flags + 'g');
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
        // Vérifier la taille du contenu avant d'exécuter la regex
        if (content.length > MAX_CONTENT_LENGTH) {
          clearTimeout(timeout);
          reject(new Error('CONTENT_TOO_LARGE'));
          return;
        }

        // 🔧 CORRECTION: Utiliser exec() pour une meilleure gestion des regex globales
        const matches: string[] = [];
        const regexWithGlobal = new RegExp(regex.source, regex.flags + (regex.global ? '' : 'g'));
        let match;
        
        while ((match = regexWithGlobal.exec(content)) !== null) {
          matches.push(match[0]);
          // Éviter les boucles infinies avec les regex qui matchent des chaînes vides
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
   * Exécute l'opération sur le contenu
   */
  private executeOperation(
    content: string, 
    op: ContentOperation, 
    match: string, 
    range: { start: number; end: number }
  ): { newContent: string } {
    const { action, where, content: newContent = '' } = op;
    
    // Validation des ranges
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
    const match = content.substring(range.start, range.end); // ✅ FIX: Extraire le match
    const after = content.substring(range.end);
    
    switch (where) {
      case 'before':
        // Insérer AVANT le match, puis le match, puis ce qui suit
        return before + newContent + match + after;
      case 'after':
        // ✅ FIX: Préserver le match, insérer après
        return before + match + newContent + after;
      case 'inside_start':
        // Insérer au début de la section matchée
        return before + match + '\n' + newContent + after;
      case 'inside_end':
        // Insérer à la fin de la section matchée
        return before + match + newContent + '\n' + after;
      case 'at':
        // Remplacer complètement le match
        return before + newContent + after;
      case 'replace_match':
        // Remplacer le contenu dans la plage spécifiée
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
    where: string
  ): string {
    // CAS 1 : Section non trouvée → Créer à la fin du document
    if (range.start === range.end) {
      logApi.info('[upsertSection] Section non trouvée, création à la fin du document');
      
      // Ajouter 2 sauts de ligne avant la nouvelle section si le document ne se termine pas par \n\n
      const needsSpacing = content.length > 0 && !content.endsWith('\n\n');
      const spacing = needsSpacing ? '\n\n' : (content.endsWith('\n') ? '\n' : '\n\n');
      
      return content + spacing + newContent.trim() + '\n';
    }
    
    // CAS 2 : Section trouvée → Remplacer TOUTE la section
    logApi.info('[upsertSection] Section trouvée, remplacement du contenu complet');
    
    // Trouver le niveau du heading ciblé
    const headingMatch = content.substring(range.start, range.end).match(/^(#{1,6})\s/);
    if (!headingMatch) {
      // Pas un heading, faire un simple replace
      return this.replaceContent(content, range, newContent);
    }
    
    const targetLevel = headingMatch[1].length;
    
    // Trouver la fin de la section (prochain heading de niveau égal ou supérieur)
    const afterHeading = range.end;
    const remainingContent = content.substring(afterHeading);
    
    // Regex pour trouver le prochain heading de niveau égal ou supérieur
    const nextSectionPattern = new RegExp(`^#{1,${targetLevel}}\\s`, 'm');
    const nextSectionMatch = remainingContent.match(nextSectionPattern);
    
    let sectionEnd: number;
    if (nextSectionMatch && nextSectionMatch.index !== undefined) {
      // Trouvé le prochain heading → fin de section juste avant
      sectionEnd = afterHeading + nextSectionMatch.index;
    } else {
      // Pas de prochain heading → fin du document
      sectionEnd = content.length;
    }
    
    // Remplacer toute la section
    const before = content.substring(0, range.start);
    const after = content.substring(sectionEnd);
    
    return before + newContent.trim() + '\n' + after;
  }

  // ✅ FONCTION SUPPRIMÉE: updateContentWithResult
  // Maintenant on utilise directement result.newContent de executeOperation
  // Plus besoin de reconstruire le contenu (causait l'écrasement du match)

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
