/**
 * Event listeners pour le drag & drop
 */

import { TextSelection } from '@tiptap/pm/state';
import { getSelectionRanges, NodeRangeSelection } from '@tiptap/extension-node-range';
import type { EditorView } from '@tiptap/pm/view';
import type { DraggingInfo } from './types';
import { DRAGEND_SELECTION_DELAY } from './types';
import { applyDragImage } from './dragImage';
import { simpleLogger as logger } from '@/utils/logger';

/**
 * Attacher les event listeners de drag au drag handle
 * @param dragHandle - Container HTML du drag handle
 * @param view - Vue ProseMirror
 * @returns Fonction cleanup pour retirer les listeners
 */
export function attachDragListeners(
  dragHandle: HTMLElement,
  view: EditorView
): () => void {
  const dragBtn = dragHandle.querySelector('.notion-drag-handle-btn') as HTMLElement;
  if (!dragBtn) {
    logger.error('[DragListeners] dragBtn non trouvé dans attachDragListeners');
    return () => {}; // Cleanup vide
  }

  // Handler dragstart
  const handleDragStart = (e: DragEvent) => {
    const posStr = dragHandle.getAttribute('data-node-pos');
    const pos = posStr ? parseInt(posStr) : -1;

    if (pos >= 0 && e.dataTransfer) {
      const { doc } = view.state;
      const $pos = doc.resolve(pos);
      const node = $pos.nodeAfter;

      if (!node) return;

      // Créer les ranges avec getSelectionRanges (méthode Tiptap)
      const from = pos;
      const to = pos + node.nodeSize;
      const $from = doc.resolve(from);
      const $to = doc.resolve(to);

      const ranges = getSelectionRanges($from, $to, 0);

      if (!ranges.length) {
        return;
      }

      // Créer la sélection et la slice
      const selection = NodeRangeSelection.create(doc, from, to);
      const slice = selection.content();

      // ✅ MAGIE: Dire à ProseMirror qu'on drag
      // ProseMirror va AUTOMATIQUEMENT gérer le drop !
      (view as EditorView & { dragging?: DraggingInfo | null }).dragging = {
        slice,
        move: true,
      };

      // Sélectionner le bloc visuellement
      const tr = view.state.tr.setSelection(selection);
      view.dispatch(tr);

      // ✅ Créer une drag image custom avec STYLES selon le type de bloc
      applyDragImage(e, node, slice);
    }
  };

  // Handler dragend
  const handleDragEnd = () => {
    if (view) {
      // Attendre un peu que ProseMirror finisse le drop
      setTimeout(() => {
        const { tr, doc } = view.state;

        // Créer une TextSelection vide à la position courante
        const currentPos = view.state.selection.from;
        const selection = TextSelection.create(doc, currentPos);
        tr.setSelection(selection);
        view.dispatch(tr);
      }, DRAGEND_SELECTION_DELAY);
    }
  };

  // Attacher les listeners
  dragBtn.addEventListener('dragstart', handleDragStart as EventListener);
  dragBtn.addEventListener('dragend', handleDragEnd);

  // Retourner la fonction cleanup
  return () => {
    dragBtn.removeEventListener('dragstart', handleDragStart as EventListener);
    dragBtn.removeEventListener('dragend', handleDragEnd);
  };
}

