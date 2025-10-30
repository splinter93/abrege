/**
 * Service pour formater les notes attachées style Cursor
 * Responsabilités:
 * - Ajouter numéros de lignes (right-aligned sur 6 chars)
 * - Calculer métadonnées enrichies (lineCount, sizeBytes, etc.)
 * - Construire message contexte séparé du system message
 * 
 * Pattern: Singleton thread-safe
 * Conformité: < 250 lignes, ZERO any, logging structuré
 * @module services/llm/AttachedNotesFormatter
 */

import { simpleLogger as logger } from '@/utils/logger';
import type { Note } from '@/services/chat/ChatContextBuilder';
import type {
  AttachedNoteMetadata,
  AttachedNoteFormatted
} from '@/types/attachedNotes';

/**
 * Service singleton pour formater les notes attachées
 * Thread-safe, stateless, optimisé pour performance
 */
export class AttachedNotesFormatter {
  private static instance: AttachedNotesFormatter;

  private constructor() {
    // Private constructor pour singleton
  }

  /**
   * Récupère l'instance singleton
   * @returns Instance unique du formatter
   */
  static getInstance(): AttachedNotesFormatter {
    if (!AttachedNotesFormatter.instance) {
      AttachedNotesFormatter.instance = new AttachedNotesFormatter();
      logger.dev('[AttachedNotesFormatter] ✅ Instance singleton créée');
    }
    return AttachedNotesFormatter.instance;
  }

  /**
   * Formate une note avec numéros de lignes (style Cursor)
   * 
   * Format: "     1|line content" (right-aligned sur 6 chars)
   * Exemple:
   *      1|# Documentation
   *      2|## Introduction
   *      3|...
   * 
   * @param note - Note brute depuis DB
   * @returns Note formatée avec métadonnées + contenu numéroté
   * @throws {Error} Si note invalide (pas de markdown_content)
   */
  formatNote(note: Note): AttachedNoteFormatted {
    // Validation stricte (contenu non vide après trim)
    if (!note.markdown_content || note.markdown_content.trim() === '') {
      logger.warn('[AttachedNotesFormatter] ⚠️ Note sans contenu ou vide, skip:', note.id);
      throw new Error(`Note ${note.id} sans contenu markdown`);
    }

    try {
      // 1. Calculer métadonnées
      const metadata = this.calculateMetadata(note);

      // 2. Ajouter numéros de lignes
      const lines = note.markdown_content.split('\n');
      const contentWithLines = lines
        .map((line, idx) => {
          const lineNum = (idx + 1).toString().padStart(6, ' ');
          return `${lineNum}|${line}`;
        })
        .join('\n');

      logger.dev('[AttachedNotesFormatter] ✅ Note formatée:', {
        id: note.id,
        slug: note.slug,
        lineCount: metadata.lineCount,
        sizeBytes: metadata.sizeBytes
      });

      return {
        metadata,
        contentWithLines
      };
    } catch (error) {
      logger.error('[AttachedNotesFormatter] ❌ Erreur formatage note:', {
        noteId: note.id,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Formate plusieurs notes en parallèle avec gestion d'erreurs
   * 
   * @param notes - Notes à formater
   * @returns Notes formatées (skip celles en erreur)
   */
  formatNotes(notes: Note[]): AttachedNoteFormatted[] {
    if (!notes || notes.length === 0) {
      return [];
    }

    const formatted: AttachedNoteFormatted[] = [];

    for (const note of notes) {
      try {
        const formattedNote = this.formatNote(note);
        formatted.push(formattedNote);
      } catch (error) {
        // Skip notes en erreur (fallback gracieux)
        logger.warn('[AttachedNotesFormatter] ⚠️ Note skippée:', {
          noteId: note.id,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    logger.info('[AttachedNotesFormatter] 📊 Formatage batch:', {
      total: notes.length,
      success: formatted.length,
      failed: notes.length - formatted.length
    });

    return formatted;
  }

  /**
   * Construit le message de contexte complet style Cursor
   * 
   * Format inspiré de Cursor:
   * ## Attached Files
   * 
   * ### File 1: api-docs.md
   * Path: api-docs.md | Lines: 156 | Modified: 2025-10-30T14:23:00Z
   * 
   * ```
   *      1|# API Documentation
   *      2|## Authentication
   * ```
   * 
   * @param notes - Notes brutes depuis DB
   * @returns Contenu markdown formaté pour injection LLM
   */
  buildContextMessage(notes: Note[]): string {
    if (!notes || notes.length === 0) {
      return '';
    }

    try {
      // Formater toutes les notes (avec gestion d'erreurs)
      const formatted = this.formatNotes(notes);

      if (formatted.length === 0) {
        logger.warn('[AttachedNotesFormatter] ⚠️ Aucune note valide à formater');
        return '';
      }

      // Construire le message contexte
      let content = '## Attached Files\n\n';
      content += 'The user has attached the following notes using @ mentions (like Cursor).\n';
      content += 'You MUST reference their content to answer accurately.\n\n';

      formatted.forEach((note, idx) => {
        const m = note.metadata;
        content += `### File ${idx + 1}: ${m.title}\n`;
        content += `Path: ${m.path} | Lines: ${m.lineCount}`;
        
        if (m.lastModified) {
          content += ` | Modified: ${m.lastModified}`;
        }
        
        content += '\n\n';
        content += '```\n';
        content += note.contentWithLines;
        content += '\n```\n\n';
        content += '---\n\n';
      });

      logger.info('[AttachedNotesFormatter] ✅ Message contexte construit:', {
        notesCount: formatted.length,
        totalLines: formatted.reduce((sum, n) => sum + n.metadata.lineCount, 0),
        contentLength: content.length
      });

      return content;
    } catch (error) {
      logger.error('[AttachedNotesFormatter] ❌ Erreur construction contexte:', error);
      // Fallback gracieux: retourner string vide
      return '';
    }
  }

  /**
   * Calcule les métadonnées d'une note
   * 
   * @param note - Note brute
   * @returns Métadonnées enrichies
   * @private
   */
  private calculateMetadata(note: Note): AttachedNoteMetadata {
    const lines = note.markdown_content.split('\n');
    const sizeBytes = Buffer.byteLength(note.markdown_content, 'utf8');

    return {
      id: note.id,
      slug: note.slug,
      title: note.title,
      path: `${note.slug}.md`,
      lineCount: lines.length,
      isFullContent: true,
      sizeBytes,
      // Utiliser la vraie date de modification si disponible, sinon undefined
      lastModified: note.updated_at || undefined
    };
  }
}

/**
 * Instance singleton exportée
 * Utiliser cette instance dans toute l'application
 */
export const attachedNotesFormatter = AttachedNotesFormatter.getInstance();

