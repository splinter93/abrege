/**
 * Hook pour détecter les sélections de texte dans l'éditeur du canvas
 * Émet un event custom quand une sélection est faite (avec debounce)
 * @module hooks/useCanvasSelection
 */

import { useEffect, useRef } from 'react';
import type { Editor } from '@tiptap/react';
import { logger, LogCategory } from '@/utils/logger';
import type { CanvasSelection } from '@/types/canvasSelection';

interface UseCanvasSelectionOptions {
  /** Éditeur TipTap du canvas */
  editor: Editor | null;
  
  /** Note ID du canvas (pour référence) */
  noteId?: string;
  
  /** Slug de la note (pour référence) */
  noteSlug?: string;
  
  /** Titre de la note (pour référence) */
  noteTitle?: string;
  
  /** Activer/désactiver la détection */
  enabled?: boolean;
}

/**
 * Hook pour détecter les sélections de texte dans le canvas
 * Émet un event custom 'canvas-selection' avec la sélection (debounced)
 * 
 * ✅ FIX: Debounce pour éviter d'émettre à chaque lettre sélectionnée
 * - Attend 500ms après le dernier changement de sélection
 * - Minimum 3 caractères pour considérer une sélection valide
 */
export function useCanvasSelection({
  editor,
  noteId,
  noteSlug,
  noteTitle,
  enabled = true
}: UseCanvasSelectionOptions): void {
  const lastSelectionRef = useRef<string>('');
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastEmittedSelectionRef = useRef<string>('');

  useEffect(() => {
    if (!editor || !enabled) return;

    const handleSelectionUpdate = () => {
      const { from, to } = editor.state.selection;
      
      // Ignorer si pas de sélection (curseur seul)
      if (from === to) {
        lastSelectionRef.current = '';
        // Clear le debounce si on revient à un curseur seul
        if (debounceTimeoutRef.current) {
          clearTimeout(debounceTimeoutRef.current);
          debounceTimeoutRef.current = null;
        }
        return;
      }

      // Récupérer le texte sélectionné
      const selectedText = editor.state.doc.textBetween(from, to, ' ').trim();
      
      // Ignorer si sélection vide ou trop courte (minimum 3 caractères)
      if (!selectedText || selectedText.length < 3) {
        return;
      }

      // Mettre à jour la dernière sélection
      lastSelectionRef.current = selectedText;

      // ✅ FIX: Clear le timeout précédent si une nouvelle sélection arrive
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      // ✅ FIX: Debounce de 500ms pour attendre que l'utilisateur finisse de sélectionner
      debounceTimeoutRef.current = setTimeout(() => {
        // Vérifier que la sélection n'a pas changé pendant le debounce
        const currentSelection = editor.state.selection;
        const currentText = editor.state.doc.textBetween(
          currentSelection.from,
          currentSelection.to,
          ' '
        ).trim();

        // Ignorer si la sélection a changé ou est identique à la dernière émise
        if (currentText !== lastSelectionRef.current || currentText === lastEmittedSelectionRef.current) {
          return;
        }

        // Ignorer si sélection trop courte
        if (currentText.length < 3) {
          return;
        }

        // Mettre à jour la dernière sélection émise
        lastEmittedSelectionRef.current = currentText;

        // Créer l'objet CanvasSelection
        const selection: CanvasSelection = {
          id: crypto.randomUUID(),
          text: currentText,
          noteId,
          noteSlug,
          noteTitle,
          startPos: currentSelection.from,
          endPos: currentSelection.to,
          timestamp: new Date().toISOString()
        };

        // Émettre l'event custom
        const event = new CustomEvent<CanvasSelection>('canvas-selection', {
          detail: selection,
          bubbles: true
        });
        
        document.dispatchEvent(event);

        logger.debug(LogCategory.EDITOR, '[useCanvasSelection] Sélection détectée (debounced)', {
          selectionId: selection.id,
          textLength: selection.text.length,
          textPreview: selection.text.substring(0, 50),
          noteId,
          noteTitle
        });
      }, 500); // 500ms de debounce
    };

    // Écouter les changements de sélection
    editor.on('selectionUpdate', handleSelectionUpdate);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      editor.off('selectionUpdate', handleSelectionUpdate);
    };
  }, [editor, noteId, noteSlug, noteTitle, enabled]);
}

