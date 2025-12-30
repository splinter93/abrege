/**
 * Hook pour l'exécution de prompts avec streaming
 * ⚠️ CRITIQUE : Gère le streaming AI avec insertion progressive
 */

import { useState } from 'react';
import type { Editor } from '@tiptap/react';
import { EditorPromptExecutor } from '@/services/editorPromptExecutor';
import type { EditorPrompt } from '@/types/editorPrompts';
import { simpleLogger as logger } from '@/utils/logger';
import type { NoteContext, InsertionMode, PromptExecutionResult } from '../types';
import { supabase } from '@/supabaseClient';

interface UsePromptExecutionParams {
  editor: Editor | null;
  noteId?: string;
  noteTitle?: string;
  noteContent?: string;
  noteSlug?: string;
  classeurId?: string;
  classeurName?: string;
}

export function usePromptExecution({
  editor,
  noteId,
  noteTitle,
  noteContent,
  noteSlug,
  classeurId,
  classeurName
}: UsePromptExecutionParams) {
  const [isExecuting, setIsExecuting] = useState(false);

  /**
   * Prépare la position d'insertion selon le mode
   * ⚠️ CRITIQUE : Gère replace/append/prepend avec curseur
   */
  const prepareInsertionPosition = (mode: InsertionMode): number => {
    if (!editor) return 0;

    const { from, to } = editor.state.selection;
    let insertPosition = from;

    switch (mode) {
      case 'replace':
        // Supprimer la sélection AVANT le streaming
        editor.chain().focus().deleteSelection().run();
        insertPosition = editor.state.selection.from;
        logger.dev('[PromptExecution] Mode replace: sélection supprimée');
        break;

      case 'append':
        // Positionner après la sélection avec saut de ligne
        editor.chain().focus(to).insertContent('\n\n').run();
        insertPosition = editor.state.selection.from;
        logger.dev('[PromptExecution] Mode append: curseur après sélection');
        break;

      case 'prepend':
        // Positionner avant la sélection
        editor.chain().focus(from).run();
        insertPosition = from;
        logger.dev('[PromptExecution] Mode prepend: curseur avant sélection');
        break;

      default:
        logger.warn('[PromptExecution] Mode inconnu, fallback sur replace');
        editor.chain().focus().deleteSelection().run();
        insertPosition = editor.state.selection.from;
    }

    return insertPosition;
  };

  /**
   * Construit le contexte enrichi de la note
   */
  const buildNoteContext = (): NoteContext | undefined => {
    if (!noteId || !noteTitle || !noteContent) {
      return undefined;
    }

    return {
      noteId,
      noteTitle,
      noteContent,
      noteSlug,
      classeurId,
      classeurName
    };
  };

  /**
   * Exécute un prompt avec streaming progressif
   * ⚠️ CRITIQUE : Logique de streaming avec insertion chunk par chunk
   */
  const executePrompt = async (
    prompt: EditorPrompt,
    selectedText: string
  ): Promise<PromptExecutionResult> => {
    if (!editor) {
      logger.error('[PromptExecution] Editor manquant');
      return { success: false, error: 'Éditeur non disponible' };
    }

    setIsExecuting(true);
    logger.info('[PromptExecution] Exécution prompt (streaming):', prompt.name);

    try {
      // ✅ FIX: Obtenir le JWT au lieu d'utiliser userId directement
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.access_token) {
        logger.error('[PromptExecution] Token JWT manquant ou invalide:', sessionError);
        return { success: false, error: 'Authentification requise' };
      }

      const userToken = session.access_token;

      // 🎯 Préparer la position d'insertion
      const insertionMode = (prompt.insertion_mode as InsertionMode) || 'replace';
      const startPos = prepareInsertionPosition(insertionMode);

      // 📎 Construire le contexte enrichi
      const noteContext = buildNoteContext();
      logger.dev('[PromptExecution] Contexte note:', {
        hasContext: !!noteContext,
        noteTitle: noteContext?.noteTitle,
        contentLength: noteContext?.noteContent?.length
      });

      // 🌊 STREAMING : Texte brut pendant stream + Markdown parsé à la fin
      let accumulatedContent = '';

      const result = await EditorPromptExecutor.executePromptStream(
        prompt,
        selectedText,
        userToken,
        (chunk: string) => {
          // ✅ Accumuler le contenu complet
          accumulatedContent += chunk;

          // ✅ Pendant le streaming : Insertion en TEXTE BRUT uniquement (pas de parsing)
          // Remplacer tout le texte brut accumulé à chaque chunk
          const currentLength = editor.state.doc.textBetween(
            startPos,
            editor.state.doc.content.size
          ).length;
          const endPos = startPos + Math.min(
            accumulatedContent.length,
            currentLength + chunk.length
          );

          editor.chain()
            .focus()
            .setTextSelection({ 
              from: startPos, 
              to: Math.min(endPos, editor.state.doc.content.size) 
            })
            .deleteSelection()
            .focus(startPos)
            .insertContent({ type: 'text', text: accumulatedContent }) // Texte brut
            .run();
        },
        noteContext
      );

      logger.info('[PromptExecution] Streaming terminé, conversion markdown...', {
        success: result.success,
        mode: insertionMode,
        contentLength: accumulatedContent.length
      });

      // ✅ À LA FIN : Remplacer le texte brut par du markdown parsé
      if (result.success && accumulatedContent) {
        const endPos = startPos + accumulatedContent.length;
        editor.chain()
          .focus()
          .setTextSelection({ 
            from: startPos, 
            to: Math.min(endPos, editor.state.doc.content.size) 
          })
          .deleteSelection()
          .focus(startPos)
          .insertContent(accumulatedContent) // Parse le markdown complet maintenant
          .run();

        logger.info('[PromptExecution] Markdown converti avec succès');
      }

      // Ajouter saut de ligne après si mode prepend
      if (insertionMode === 'prepend' && result.success) {
        editor.commands.insertContent('\n\n');
      }

      if (!result.success) {
        logger.error('[PromptExecution] Erreur streaming:', result.error);
      }

      return result;
    } catch (error) {
      logger.error('[PromptExecution] Erreur:', error);
      return { success: false, error: String(error) };
    } finally {
      setIsExecuting(false);
    }
  };

  return {
    executePrompt,
    isExecuting
  };
}

