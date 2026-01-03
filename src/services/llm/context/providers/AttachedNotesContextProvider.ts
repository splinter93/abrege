/**
 * AttachedNotesContextProvider - Injection des notes attachées comme message séparé
 * Responsabilités:
 * - Formater les notes avec numéros de lignes (style Cursor)
 * - Construire message contexte séparé du system message
 * 
 * Pattern: MessageContextProvider
 * Conformité: < 200 lignes, ZERO any, logging structuré
 */

import { simpleLogger as logger } from '@/utils/logger';
import type { ChatMessage } from '@/types/chat';
import type { MessageContextProvider } from '../types';
import type { ExtendedLLMContext, ContextInjectionOptions, AttachedNote } from '../types';
import type { AttachedNoteMetadata, AttachedNoteFormatted } from '@/types/attachedNotes';

export class AttachedNotesContextProvider implements MessageContextProvider {
  readonly name = 'AttachedNotes';

  shouldInject(context: ExtendedLLMContext, _options?: ContextInjectionOptions): boolean {
    return !!(context.attachedNotes && context.attachedNotes.length > 0);
  }

  inject(
    context: ExtendedLLMContext,
    _options?: ContextInjectionOptions
  ): ChatMessage | null {
    if (!context.attachedNotes || context.attachedNotes.length === 0) {
      return null;
    }

    try {
      const formatted = this.formatNotes(context.attachedNotes);

      if (formatted.length === 0) {
        logger.warn('[AttachedNotesContextProvider] ⚠️ Aucune note valide à formater');
        return null;
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

      logger.info('[AttachedNotesContextProvider] ✅ Message contexte construit:', {
        notesCount: formatted.length,
        totalLines: formatted.reduce((sum, n) => sum + n.metadata.lineCount, 0),
        contentLength: content.length
      });

      return {
        role: 'user',
        content: content.trim(),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('[AttachedNotesContextProvider] ❌ Erreur construction contexte:', error);
      return null;
    }
  }

  /**
   * Formate une note avec numéros de lignes (style Cursor)
   */
  private formatNote(note: AttachedNote): AttachedNoteFormatted {
    if (!note.markdown_content || note.markdown_content.trim() === '') {
      logger.warn('[AttachedNotesContextProvider] ⚠️ Note sans contenu ou vide, skip:', note.id);
      throw new Error(`Note ${note.id} sans contenu markdown`);
    }

    try {
      const metadata = this.calculateMetadata(note);
      const lines = note.markdown_content.split('\n');
      const contentWithLines = lines
        .map((line, idx) => {
          const lineNum = (idx + 1).toString().padStart(6, ' ');
          return `${lineNum}|${line}`;
        })
        .join('\n');

      logger.dev('[AttachedNotesContextProvider] ✅ Note formatée:', {
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
      logger.error('[AttachedNotesContextProvider] ❌ Erreur formatage note:', {
        noteId: note.id,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Formate plusieurs notes en parallèle avec gestion d'erreurs
   */
  private formatNotes(notes: AttachedNote[]): AttachedNoteFormatted[] {
    if (!notes || notes.length === 0) {
      return [];
    }

    const formatted: AttachedNoteFormatted[] = [];

    for (const note of notes) {
      try {
        const formattedNote = this.formatNote(note);
        formatted.push(formattedNote);
      } catch (error) {
        logger.warn('[AttachedNotesContextProvider] ⚠️ Note skippée:', {
          noteId: note.id,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    logger.info('[AttachedNotesContextProvider] 📊 Formatage batch:', {
      total: notes.length,
      success: formatted.length,
      failed: notes.length - formatted.length
    });

    return formatted;
  }

  /**
   * Calcule les métadonnées d'une note
   */
  private calculateMetadata(note: AttachedNote): AttachedNoteMetadata {
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
      lastModified: note.updated_at || undefined
    };
  }
}

