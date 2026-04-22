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
  disableLocalInsertion?: boolean;
}

export function usePromptExecution({
  editor,
  noteId,
  noteTitle,
  noteContent,
  noteSlug,
  classeurId,
  classeurName,
  disableLocalInsertion = false
}: UsePromptExecutionParams) {
  const [isExecuting, setIsExecuting] = useState(false);

  const safeInsertAccumulatedContent = (
    startPos: number,
    accumulatedContent: string
  ): boolean => {
    if (!editor) return false;
    if (!accumulatedContent) return true;

    try {
      const docSize = editor.state.doc.content.size;
      const safeStart = Math.max(0, Math.min(startPos, docSize));
      const safeEnd = Math.max(
        safeStart,
        Math.min(safeStart + accumulatedContent.length, docSize)
      );

      editor
        .chain()
        .focus()
        .setTextSelection({ from: safeStart, to: safeEnd })
        .deleteSelection()
        .focus(safeStart)
        .insertContent({ type: 'text', text: accumulatedContent })
        .run();

      return true;
    } catch (error) {
      logger.error('[PromptExecution] ❌ Échec insertion chunk (sécurisé):', error);
      return false;
    }
  };

  /**
   * Prépare la position d'insertion selon le mode
   * ⚠️ CRITIQUE : Modifie l'éditeur de façon synchrone.
   * NE PAS appeler en mode canvas (avant un appel async long).
   */
  const prepareInsertionPosition = (mode: InsertionMode): number => {
    if (!editor) return 0;

    const { from, to } = editor.state.selection;
    let insertPosition = from;

    switch (mode) {
      case 'replace':
        editor.chain().focus().deleteSelection().run();
        insertPosition = editor.state.selection.from;
        logger.dev('[PromptExecution] Mode replace: sélection supprimée');
        break;

      case 'append':
        editor.chain().focus(to).insertContent('\n\n').run();
        insertPosition = editor.state.selection.from;
        logger.dev('[PromptExecution] Mode append: curseur après sélection');
        break;

      case 'prepend':
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
   * Exécute un prompt avec streaming progressif (éditeur) ou atomique (canvas).
   *
   * Mode canvas (disableLocalInsertion=true) :
   *   - On ne touche PAS l'éditeur avant l'appel LLM (évite stale positions et unmount du menu).
   *   - On appelle /api/chat/llm (non-streaming) et on insère la réponse complète d'un seul coup.
   *
   * Mode éditeur (disableLocalInsertion=false) :
   *   - Streaming chunk par chunk via /api/chat/llm/stream.
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
    logger.info('[PromptExecution] Exécution prompt:', prompt.name, { disableLocalInsertion });

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        logger.error('[PromptExecution] Token JWT manquant ou invalide:', sessionError);
        return { success: false, error: 'Authentification requise' };
      }

      const userToken = session.access_token;
      const insertionMode = (prompt.insertion_mode as InsertionMode) || 'replace';
      const noteContext = buildNoteContext();

      logger.dev('[PromptExecution] Contexte note:', {
        hasContext: !!noteContext,
        noteTitle: noteContext?.noteTitle,
        contentLength: noteContext?.noteContent?.length
      });

      // ────────────────────────────────────────────────────────────────
      // MODE CANVAS — insertion atomique, sans modification préalable
      // ────────────────────────────────────────────────────────────────
      // Problème résolu : prepareInsertionPosition modifie l'éditeur de façon
      // synchrone (deleteSelection) → le menu se démonte (sélection perdue),
      // et après 10-65s d'attente LLM, startPos est stale → RangeError.
      //
      // Solution : lire les positions sans modifier l'éditeur, attendre la
      // réponse LLM, puis faire UNE transaction atomique avec bounds actualisés.
      // ────────────────────────────────────────────────────────────────
      if (disableLocalInsertion) {
        // Lecture seule de la sélection courante (pas de modification de l'éditeur)
        const selFrom = editor.state.selection.from;
        const selTo = editor.state.selection.to;

        logger.dev('[PromptExecution] Mode canvas: positions sauvegardées', { selFrom, selTo });

        const atomicResult = await EditorPromptExecutor.executePrompt(
          prompt,
          selectedText,
          userToken
        );

        if (!atomicResult.success || !atomicResult.response) {
          logger.error('[PromptExecution] Erreur exécution atomique canvas:', atomicResult.error);
          return {
            success: false,
            error: atomicResult.error || 'Réponse vide'
          };
        }

        const finalContent = atomicResult.response;

        // Vérifier que l'éditeur n'a pas été détruit pendant l'attente async
        if (editor.isDestroyed) {
          logger.warn('[PromptExecution] Éditeur détruit pendant appel LLM, insertion abandonnée');
          return { success: false, error: 'Éditeur non disponible' };
        }

        try {
          // Recalculer les bornes sur le document ACTUEL (peut avoir changé pendant l'attente)
          const docSize = editor.state.doc.content.size;
          const safeFrom = Math.max(0, Math.min(selFrom, docSize));
          const safeTo = Math.max(safeFrom, Math.min(selTo, docSize));

          // Convertir le contenu en nœuds ProseMirror valides.
          // Les \n ne sont pas autorisés dans un nœud text inline — chaque ligne
          // doit être un nœud paragraph séparé.
          const cleanContent = finalContent.replace(/^\uFEFF/, ''); // strip BOM
          const paragraphNodes = cleanContent.split('\n').map(line => ({
            type: 'paragraph' as const,
            content: line.length > 0 ? [{ type: 'text' as const, text: line }] : []
          }));

          // Transaction atomique : supprimer la sélection + insérer les paragraphes
          editor
            .chain()
            .focus()
            .setTextSelection({ from: safeFrom, to: safeTo })
            .deleteSelection()
            .insertContent(paragraphNodes)
            .run();

          if (insertionMode === 'prepend') {
            editor.commands.insertContent('\n\n');
          }

          logger.info('[PromptExecution] ✅ Insertion atomique canvas réussie', {
            contentLength: finalContent.length,
            mode: insertionMode
          });

          return { success: true, content: finalContent };
        } catch (error) {
          logger.error('[PromptExecution] ❌ Échec insertion atomique canvas:', error);
          return { success: false, error: 'Erreur insertion canvas' };
        }
      }

      // ────────────────────────────────────────────────────────────────
      // MODE ÉDITEUR STANDARD — streaming progressif
      // ────────────────────────────────────────────────────────────────
      // Ici on peut modifier l'éditeur avant l'appel car les chunks arrivent
      // en < 1s chacun et le menu reste monté.
      const startPos = prepareInsertionPosition(insertionMode);

      let accumulatedContent = '';
      let insertionFailed = false;

      const result = await EditorPromptExecutor.executePromptStream(
        prompt,
        selectedText,
        userToken,
        (chunk: string) => {
          if (insertionFailed) return;

          accumulatedContent += chunk;

          const inserted = safeInsertAccumulatedContent(startPos, accumulatedContent);
          if (!inserted) {
            insertionFailed = true;
          }
        },
        noteContext
      );

      logger.info('[PromptExecution] Streaming terminé, conversion markdown...', {
        success: result.success,
        mode: insertionMode,
        contentLength: accumulatedContent.length
      });

      // Remplacement final : texte brut → markdown parsé
      if (result.success && accumulatedContent) {
        try {
          const docSize = editor.state.doc.content.size;
          const safeStart = Math.max(0, Math.min(startPos, docSize));
          const safeEnd = Math.max(
            safeStart,
            Math.min(safeStart + accumulatedContent.length, docSize)
          );

          editor.chain()
            .focus()
            .setTextSelection({ from: safeStart, to: safeEnd })
            .deleteSelection()
            .focus(safeStart)
            .insertContent(accumulatedContent)
            .run();

          logger.info('[PromptExecution] Markdown converti avec succès');
        } catch (error) {
          logger.error('[PromptExecution] ❌ Échec conversion markdown finale:', error);
          return { success: false, error: 'Erreur insertion éditeur' };
        }
      }

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
