/**
 * CanvasSelectionsContextProvider - Injection des sélections de texte du canvas comme message séparé
 * Responsabilités:
 * - Construire message contexte avec le texte sélectionné
 * - Format clair pour indiquer que c'est une sélection dans le canvas ouvert
 * 
 * Pattern: MessageContextProvider
 * Conformité: < 150 lignes, ZERO any, logging structuré
 */

import { simpleLogger as logger } from '@/utils/logger';
import type { ChatMessage } from '@/types/chat';
import type { MessageContextProvider } from '../types';
import type { ExtendedLLMContext, ContextInjectionOptions } from '../types';
import type { CanvasSelection } from '@/types/canvasSelection';

export class CanvasSelectionsContextProvider implements MessageContextProvider {
  readonly name = 'CanvasSelections';

  shouldInject(context: ExtendedLLMContext, _options?: ContextInjectionOptions): boolean {
    return !!(context.canvasSelections && context.canvasSelections.length > 0);
  }

  inject(
    context: ExtendedLLMContext,
    _options?: ContextInjectionOptions
  ): ChatMessage | null {
    if (!context.canvasSelections || context.canvasSelections.length === 0) {
      return null;
    }

    try {
      let content = '## Canvas Text Selections\n\n';
      content += 'The user has selected the following text from the open canvas:\n\n';

      context.canvasSelections.forEach((selection: CanvasSelection, index: number) => {
        content += `### Selection ${index + 1}`;
        
        if (selection.noteTitle) {
          content += ` (from "${selection.noteTitle}")`;
        }
        
        content += '\n\n';
        content += '```\n';
        content += selection.text;
        content += '\n```\n\n';

        if (selection.noteId || selection.noteSlug) {
          content += `**Source:** `;
          if (selection.noteSlug) {
            content += `@${selection.noteSlug}`;
          } else if (selection.noteId) {
            content += `Note ID: ${selection.noteId}`;
          }
          content += '\n\n';
        }

        content += '---\n\n';
      });

      content += '💡 This is text selected by the user in the canvas editor. Use it as context for your response.\n';

      logger.info('[CanvasSelectionsContextProvider] ✅ Contexte sélections construit:', {
        selectionsCount: context.canvasSelections.length,
        contentLength: content.length,
        tokensEstimate: Math.ceil(content.length / 4)
      });

      return {
        role: 'user',
        content: content.trim(),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('[CanvasSelectionsContextProvider] ❌ Erreur construction contexte:', error);
      return null;
    }
  }
}

