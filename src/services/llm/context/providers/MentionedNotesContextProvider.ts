/**
 * MentionedNotesContextProvider - Injection des mentions légères comme message séparé
 * Responsabilités:
 * - Construire message contexte ultra-léger (métadonnées uniquement)
 * - Format compact pour économiser tokens
 * 
 * Pattern: MessageContextProvider
 * Conformité: < 150 lignes, ZERO any, logging structuré
 */

import { simpleLogger as logger } from '@/utils/logger';
import type { ChatMessage } from '@/types/chat';
import type { MessageContextProvider } from '../types';
import type { ExtendedLLMContext, ContextInjectionOptions } from '../types';

export class MentionedNotesContextProvider implements MessageContextProvider {
  readonly name = 'MentionedNotes';

  shouldInject(context: ExtendedLLMContext, _options?: ContextInjectionOptions): boolean {
    return !!(context.mentionedNotes && context.mentionedNotes.length > 0);
  }

  inject(
    context: ExtendedLLMContext,
    _options?: ContextInjectionOptions
  ): ChatMessage | null {
    if (!context.mentionedNotes || context.mentionedNotes.length === 0) {
      return null;
    }

    try {
      let content = '## Mentioned Notes\n\n';
      content += 'User mentioned the following notes (metadata only, use tools to fetch full content if needed):\n';

      context.mentionedNotes.forEach((mention) => {
        content += `- @${mention.slug}\n`;
        content += `  ID: ${mention.id}\n`;
        content += `  Title: ${mention.title}\n`;

        if (mention.word_count) {
          content += `  Length: ${mention.word_count} words\n`;
        }

        if (mention.created_at) {
          const date = new Date(mention.created_at);
          const formatted = date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          });
          content += `  Created: ${formatted}\n`;
        }

        if (mention.description) {
          const shortDesc = mention.description.substring(0, 100);
          content += `  Description: ${shortDesc}${mention.description.length > 100 ? '...' : ''}\n`;
        }

        content += '\n';
      });

      content += '\n💡 Use `getNote(slug)` or `searchNote(query)` to fetch full content.\n';

      logger.info('[MentionedNotesContextProvider] ✅ Contexte mentions construit:', {
        mentionsCount: context.mentionedNotes.length,
        contentLength: content.length,
        tokensEstimate: Math.ceil(content.length / 4)
      });

      return {
        role: 'user',
        content: content.trim(),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('[MentionedNotesContextProvider] ❌ Erreur construction contexte:', error);
      return null;
    }
  }
}

