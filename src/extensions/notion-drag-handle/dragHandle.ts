/**
 * Création du drag handle UI (boutons + et ⋮⋮)
 */

import { TextSelection } from '@tiptap/pm/state';
import { HIDE_DELAY_HANDLES } from './types';
import {
  getCurrentView,
  getHideTimeout,
  setHideTimeout,
} from './state';
import { simpleLogger as logger } from '@/utils/logger';

/**
 * Créer le drag handle UI avec les boutons + et ⋮⋮
 * @returns HTMLElement container avec les deux boutons
 */
export function createDragHandle(): HTMLElement {
  // Créer le container pour les deux boutons (+ et ⋮⋮)
  const container = document.createElement('div');
  container.className = 'notion-drag-handle notion-handle-container';
  container.style.position = 'absolute';
  container.style.zIndex = '100';
  container.style.opacity = '0';
  container.style.transition = 'opacity 150ms ease, top 180ms cubic-bezier(0.22, 1, 0.36, 1), left 180ms cubic-bezier(0.22, 1, 0.36, 1)';
  container.style.display = 'flex';
  container.style.gap = '12px';  // Espacé 8→12
  container.style.alignItems = 'center';

  // Créer le bouton "+" (à gauche)
  const plusBtn = document.createElement('button');
  plusBtn.className = 'notion-plus-btn';
  plusBtn.title = 'Ajouter un bloc';
  plusBtn.style.width = '20px';  // Légèrement plus gros pour le cercle
  plusBtn.style.height = '20px';
  plusBtn.style.display = 'flex';
  plusBtn.style.alignItems = 'center';
  plusBtn.style.justifyContent = 'center';
  plusBtn.style.border = 'none';
  plusBtn.style.background = 'transparent';
  plusBtn.style.borderRadius = '0';
  plusBtn.style.cursor = 'pointer';
  plusBtn.style.color = 'var(--text-primary)';  // ✅ Couleur du texte
  plusBtn.style.filter = 'brightness(0.55)';    // ✅ 45% plus sombre (très discret)
  plusBtn.style.transition = 'all 150ms ease, filter 150ms ease';
  plusBtn.draggable = false; // ✅ Empêcher le + d'être draggable
  plusBtn.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="16"></line>
      <line x1="8" y1="12" x2="16" y2="12"></line>
    </svg>
  `;

  // Hover effect sur le bouton + (sans background)
  plusBtn.addEventListener('mouseenter', () => {
    plusBtn.style.background = 'transparent';
    plusBtn.style.filter = 'brightness(1)';  // ✅ Couleur normale au hover
  });
  plusBtn.addEventListener('mouseleave', () => {
    plusBtn.style.background = 'transparent';
    plusBtn.style.filter = 'brightness(0.55)';  // ✅ 45% plus sombre (très discret)
  });

  // ✅ Empêcher le drag du bouton +
  plusBtn.addEventListener('dragstart', (e) => {
    e.preventDefault();
    e.stopPropagation();
  });

  // Click sur le bouton + pour créer une ligne vide sous le bloc
  plusBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();

    const currentView = getCurrentView();
    if (currentView) {
      const pos = container.getAttribute('data-node-pos');
      if (pos) {
        const nodePos = parseInt(pos);
        const { state, dispatch } = currentView;
        const { doc, tr } = state;

        try {
          // Trouver le nœud actuel
          const $pos = doc.resolve(nodePos);
          const node = $pos.nodeAfter;

          if (node) {
            // Calculer la position après le bloc
            const afterPos = nodePos + node.nodeSize;

            // Insérer un nouveau paragraphe vide après le bloc
            const paragraph = state.schema.nodes.paragraph.create();
            const transaction = tr.insert(afterPos, paragraph);

            // Placer le curseur dans le nouveau paragraphe
            transaction.setSelection(
              TextSelection.near(transaction.doc.resolve(afterPos + 1))
            );

            dispatch(transaction);
            currentView.focus();
          }
        } catch (error) {
          logger.error('[DragHandle] Erreur lors de la création de ligne:', error);
        }
      }
    }
  });

  // Créer le drag handle (⋮⋮) (à droite)
  const dragBtn = document.createElement('div');
  dragBtn.className = 'notion-drag-handle-btn';
  dragBtn.title = 'Glisser pour déplacer';
  dragBtn.style.width = '18px';  // Réduit 20→18
  dragBtn.style.height = '18px';  // Réduit 20→18
  dragBtn.style.display = 'flex';
  dragBtn.style.alignItems = 'center';
  dragBtn.style.justifyContent = 'center';
  dragBtn.style.cursor = 'grab';
  dragBtn.style.background = 'transparent';
  dragBtn.style.borderRadius = '4px';
  dragBtn.style.color = 'var(--text-primary)';  // ✅ Couleur du texte
  dragBtn.style.filter = 'brightness(0.55)';    // ✅ 45% plus sombre (très discret)
  dragBtn.style.transition = 'all 150ms ease, filter 150ms ease';
  dragBtn.innerHTML = `
    <svg width="14" height="22" viewBox="0 0 14 22" fill="currentColor">
      <circle cx="4" cy="4" r="1"/>
      <circle cx="10" cy="4" r="1"/>
      <circle cx="4" cy="11" r="1"/>
      <circle cx="10" cy="11" r="1"/>
      <circle cx="4" cy="18" r="1"/>
      <circle cx="10" cy="18" r="1"/>
      </svg>
  `;

  // Hover effect minimal (plus visible au hover)
  dragBtn.addEventListener('mouseenter', () => {
    dragBtn.style.background = 'transparent';
    dragBtn.style.filter = 'brightness(1)';  // ✅ Couleur normale au hover
  });
  dragBtn.addEventListener('mouseleave', () => {
    dragBtn.style.background = 'transparent';
    dragBtn.style.filter = 'brightness(0.55)';  // ✅ 45% plus sombre (très discret)
  });

  // ✅ Rendre UNIQUEMENT le dragBtn draggable
  dragBtn.draggable = true;
  container.draggable = false; // Container PAS draggable
  container.style.pointerEvents = 'auto';

  // ✅ FIX: Empêcher la disparition quand la souris entre dans les handles
  container.addEventListener('mouseenter', () => {
    // Annuler le timeout de hide
    const hideTimeout = getHideTimeout();
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      setHideTimeout(null);
    }
    // Forcer la visibilité
    container.style.opacity = '1';
  });

  // ✅ FIX: Délai avant de cacher quand on quitte les handles
  container.addEventListener('mouseleave', () => {
    let hideTimeout = getHideTimeout();
    if (hideTimeout) {
      clearTimeout(hideTimeout);
    }
    hideTimeout = setTimeout(() => {
      container.style.opacity = '0';
    }, HIDE_DELAY_HANDLES);
    setHideTimeout(hideTimeout);
  });

  // Ajouter les boutons au container
  container.appendChild(plusBtn);
  container.appendChild(dragBtn);

  return container;
}

