/**
 * Service pour formater les mentions légères de notes
 * Responsabilités :
 * - Construire message contexte ultra-léger (métadonnées uniquement)
 * - Format compact pour économiser tokens
 * 
 * Pattern: Singleton thread-safe
 * Conformité: < 100 lignes, ZERO any, logging structuré
 * @module services/llm/MentionedNotesFormatter
 */

import { simpleLogger as logger } from '@/utils/logger';
import type { NoteMention } from '@/types/noteMention';

/**
 * Service singleton pour formater les mentions légères
 * Thread-safe, stateless, optimisé pour tokens
 */
export class MentionedNotesFormatter {
  private static instance: MentionedNotesFormatter;

  private constructor() {
    // Private constructor pour singleton
  }

  /**
   * Récupère l'instance singleton
   */
  static getInstance(): MentionedNotesFormatter {
    if (!MentionedNotesFormatter.instance) {
      MentionedNotesFormatter.instance = new MentionedNotesFormatter();
      logger.dev('[MentionedNotesFormatter] ✅ Instance singleton créée');
    }
    return MentionedNotesFormatter.instance;
  }

  /**
   * Construit le message de contexte ultra-léger pour mentions
   * 
   * Format structuré (~30-40 tokens par note) :
   * ```
   * ## Mentioned Notes
   * User mentioned these notes (metadata only, use tools to fetch full content if needed):
   * 
   * - @architecture-systeme
   *   ID: 123e4567-e89b-12d3-a456-426614174000
   *   Title: Architecture Système
   *   Length: 1250 words
   *   Created: Jan 15, 2024
   *   Description: Guide complet de l'architecture...
   * 
   * - @guide-api
   *   ID: 987e6543-e21b-98d7-b654-321098765432
   *   Title: Guide API
   *   Length: 890 words
   *   Created: Feb 3, 2024
   * 
   * 💡 Use getNote(slug) or searchNote(query) to fetch full content.
   * ```
   * 
   * @param mentions - Métadonnées des notes mentionnées
   * @returns Contenu markdown formaté (ultra-léger)
   */
  buildContextMessage(mentions: NoteMention[]): string {
    if (!mentions || mentions.length === 0) {
      return '';
    }

    try {
      let content = '## Mentioned Notes\n\n';
      content += 'User mentioned the following notes (metadata only, use tools to fetch full content if needed):\n';
      
      mentions.forEach((mention) => {
        // Format ultra-compact
        content += `- @${mention.slug}\n`;
        content += `  ID: ${mention.id}\n`;
        content += `  Title: ${mention.title}\n`;
        
        if (mention.word_count) {
          content += `  Length: ${mention.word_count} words\n`;
        }
        
        if (mention.created_at) {
          // Format date lisible
          const date = new Date(mention.created_at);
          const formatted = date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
          });
          content += `  Created: ${formatted}\n`;
        }
        
        // Ajouter description si présente (max 100 chars)
        if (mention.description) {
          const shortDesc = mention.description.substring(0, 100);
          content += `  Description: ${shortDesc}${mention.description.length > 100 ? '...' : ''}\n`;
        }
        
        content += '\n'; // Ligne vide entre mentions
      });
      
      content += '\n💡 Use `getNote(slug)` or `searchNote(query)` to fetch full content.\n';

      logger.info('[MentionedNotesFormatter] ✅ Contexte mentions construit:', {
        mentionsCount: mentions.length,
        contentLength: content.length,
        tokensEstimate: Math.ceil(content.length / 4) // ~1 token = 4 chars
      });

      return content;
    } catch (error) {
      logger.error('[MentionedNotesFormatter] ❌ Erreur construction contexte:', error);
      // Fallback gracieux: retourner string vide
      return '';
    }
  }
}

/**
 * Instance singleton exportée
 */
export const mentionedNotesFormatter = MentionedNotesFormatter.getInstance();

