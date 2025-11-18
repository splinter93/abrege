/**
 * Création de la drag image stylée selon le type de bloc
 */

import type { Node, Slice } from '@tiptap/pm/model';
import { DRAG_IMAGE_CLEANUP_DELAY } from './types';
import { simpleLogger as logger } from '@/utils/logger';

/**
 * Crée une drag image stylée selon le type de bloc
 * @param node - Node ProseMirror du bloc dragué
 * @param slice - Slice contenant le contenu du bloc
 * @returns HTMLElement wrapper prêt pour setDragImage
 */
export function createDragImage(node: Node, slice: Slice): HTMLElement {
  // Extraire le texte du bloc
  let textContent = slice.content.textBetween(0, slice.content.size, '\n', '\n');
  if (!textContent || textContent.trim() === '') {
    textContent = node.type.name; // Fallback: nom du type de bloc
  }

  // Détecter le type de bloc pour adapter les styles
  const nodeType = node.type.name;
  const nodeLevel = node.attrs?.level || 0;

  // Styles de base
  let fontSize = '15px';
  let fontWeight = '400';
  let color = '#B5BCC4';

  // Adapter selon le type
  if (nodeType === 'heading') {
    fontWeight = '600';
    color = '#FFFFFF';
    switch (nodeLevel) {
      case 1:
        fontSize = '28px';
        fontWeight = '700';
        break;
      case 2:
        fontSize = '22px';
        fontWeight = '600';
        break;
      case 3:
        fontSize = '18px';
        fontWeight = '600';
        break;
      case 4:
        fontSize = '16px';
        fontWeight = '600';
        break;
      default:
        fontSize = '15px';
        fontWeight = '600';
    }
  } else if (nodeType === 'codeBlock') {
    fontSize = '14px';
    fontWeight = '400';
    color = '#A8B4C0';
  } else if (nodeType === 'blockquote') {
    fontSize = '15px';
    fontWeight = '400';
    color = '#8B95A0';
  }

  // Créer le wrapper pour la drag image
  const wrapper = document.createElement('div');
  wrapper.style.cssText = `
    position: fixed;
    top: 0;
    left: -9999px;
    max-width: 500px;
    padding: 10px 14px;
    background: #1a1a1a;
    color: ${color};
    border-radius: 6px;
    box-shadow: 0 8px 20px rgba(0,0,0,0.4);
    font-family: 'Figtree', 'Geist', -apple-system, sans-serif;
    font-size: ${fontSize};
    font-weight: ${fontWeight};
    line-height: 1.4;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    z-index: 99999;
  `;
  wrapper.textContent = textContent;

  return wrapper;
}

/**
 * Applique la drag image à un événement de drag
 * Gère aussi le cleanup automatique après le drag
 * @param e - DragEvent
 * @param node - Node ProseMirror du bloc dragué
 * @param slice - Slice contenant le contenu du bloc
 */
export function applyDragImage(e: DragEvent, node: Node, slice: Slice): void {
  try {
    const wrapper = createDragImage(node, slice);
    document.body.appendChild(wrapper);

    // Forcer le reflow pour que les styles CSS s'appliquent
    void wrapper.offsetHeight;

    // setDragImage DOIT être synchrone dans dragstart
    e.dataTransfer!.setDragImage(wrapper, 10, 10);

    // Cleanup après le drag
    setTimeout(() => {
      if (wrapper.parentNode) {
        wrapper.parentNode.removeChild(wrapper);
      }
    }, DRAG_IMAGE_CLEANUP_DELAY);
  } catch (err) {
    logger.error('[DragImage] Erreur création drag image:', err);
  }
}

