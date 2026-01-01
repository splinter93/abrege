/**
 * useSlashCommandHandler - Hook pour gérer l'insertion de slash commands
 * 
 * Responsabilités:
 * - Gestion de l'insertion de slash commands
 * - Fallback markdown
 */

import { useCallback, useMemo } from 'react';
import type { Editor as TiptapEditor } from '@tiptap/react';
import { logger, LogCategory } from '@/utils/logger';
import type { EditorSlashCommand } from '@/components/EditorSlashMenu';

interface UseSlashCommandHandlerOptions {
  editor: TiptapEditor | null;
  isTemporaryNote: boolean;
}

/**
 * Hook pour gérer l'insertion de slash commands
 */
export function useSlashCommandHandler({
  editor,
  isTemporaryNote
}: UseSlashCommandHandlerOptions) {
  const fallbackMarkdownByCommand: Record<string, string> = useMemo(() => ({
    h1: '# ',
    heading1: '# ',
    h2: '## ',
    heading2: '## ',
    h3: '### ',
    heading3: '### ',
    text: '',
    paragraph: '',
    ul: '- ',
    bulletList: '- ',
    ol: '1. ',
    orderedList: '1. ',
    quote: '> ',
    code: '```\n\n```',
    divider: '---\n',
    separator: '---\n'
  }), []);

  const handleSlashCommandInsert = useCallback((cmd: EditorSlashCommand) => {
    if (process.env.NODE_ENV === 'development') {
      logger.debug(LogCategory.EDITOR, '[handleSlashCommandInsert] called', {
        cmdId: cmd.id,
        hasEditor: !!editor,
        isTemp: isTemporaryNote,
        context: { operation: 'slashCommand' }
      });
    }
    
    if (!editor) {
      logger.error(LogCategory.EDITOR, 'Editor non disponible pour slash command');
      return;
    }
    
    try {
      // Remove any preceding slash token if present
      const { state, dispatch } = editor.view;
      const from = state.selection.from;
      const $pos = state.doc.resolve(from);
      const start = $pos.start();
      const textBefore = $pos.parent.textBetween(0, $pos.parentOffset, undefined, '\uFFFC');
      const match = textBefore.match(/\/?[\w-]*$/);
      if (match) {
        const deleteFrom = start + $pos.parentOffset - match[0].length;
        dispatch(state.tr.delete(deleteFrom, from));
      }
    } catch (error) {
      logger.error(LogCategory.EDITOR, 'Erreur suppression slash:', error);
    }
    
    let executed = false;
    // EditorSlashCommand a action optionnel, donc on vérifie s'il existe
    if (cmd.action && typeof cmd.action === 'function') {
      try {
        const result = cmd.action(editor);
        executed = typeof result === 'boolean' ? result : true;
        if (process.env.NODE_ENV === 'development') {
          logger.debug(LogCategory.EDITOR, '[handleSlashCommandInsert] action executed', {
            cmdId: cmd.id,
            executed,
            context: { operation: 'slashCommandExecute' }
          });
        }
        logger.debug(LogCategory.EDITOR, 'Slash command exécutée', { cmdId: cmd.id, executed });
      } catch (error) {
        logger.error(LogCategory.EDITOR, 'Erreur exécution commande:', error);
      }
    }

    if (!executed) {
      const fallback = fallbackMarkdownByCommand[cmd.id];
      if (process.env.NODE_ENV === 'development') {
        logger.debug(LogCategory.EDITOR, '[handleSlashCommandInsert] using fallback', {
          cmdId: cmd.id,
          fallback,
          context: { operation: 'slashCommandFallback' }
        });
      }
      if (fallback !== undefined) {
        editor.chain().focus().insertContent(fallback).run();
      }
    }
  }, [editor, isTemporaryNote, fallbackMarkdownByCommand]);

  return {
    handleSlashCommandInsert
  };
}

