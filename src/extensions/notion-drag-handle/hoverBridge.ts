/**
 * Hover Bridge - Zone invisible à gauche de l'éditeur
 * Permet de garder les handles visibles quand la souris va vers eux
 */

import {
  HOVER_BRIDGE_WIDTH,
  HANDLE_LEFT_OFFSET,
  HANDLE_TOP_OFFSET,
  HIDE_DELAY_HANDLES,
} from './types';
import {
  getCurrentView,
  getGlobalDragHandle,
  getHideTimeout,
  setHideTimeout,
} from './state';
import { simpleLogger as logger } from '@/utils/logger';

/**
 * Créer une zone invisible à gauche de l'éditeur
 * Permet de garder les handles visibles quand la souris va vers eux
 * @returns HTMLElement bridge
 */
export function createHoverBridge(): HTMLElement {
  const bridge = document.createElement('div');
  bridge.className = 'notion-hover-bridge';
  bridge.style.position = 'absolute';
  bridge.style.left = `-${HOVER_BRIDGE_WIDTH}px`;
  bridge.style.top = '0';
  bridge.style.width = `${HOVER_BRIDGE_WIDTH}px`;
  bridge.style.height = '100%';
  bridge.style.zIndex = '99'; // Sous les handles (z-index: 100)
  bridge.style.pointerEvents = 'auto';
  bridge.style.background = 'transparent';
  // bridge.style.background = 'rgba(255, 0, 0, 0.1)'; // DEBUG: décommenter pour voir la zone

  // ✅ FIX: Listeners sur la bridge pour maintenir les handles
  bridge.addEventListener('mouseenter', () => {
    // Annuler le timeout de hide
    const hideTimeout = getHideTimeout();
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      setHideTimeout(null);
    }
  });

  bridge.addEventListener('mousemove', (e: MouseEvent) => {
    // Annuler le timeout
    let hideTimeout = getHideTimeout();
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      setHideTimeout(null);
    }

    // Détecter quel bloc est à la hauteur Y de la souris
    const currentView = getCurrentView();
    const globalDragHandle = getGlobalDragHandle();
    
    if (currentView && globalDragHandle) {
      const editorRect = currentView.dom.getBoundingClientRect();
      const mouseY = e.clientY;

      // Trouver tous les blocs de premier niveau
      const blocks = Array.from(currentView.dom.children) as HTMLElement[];

      for (const block of blocks) {
        const blockRect = block.getBoundingClientRect();

        // Si la souris est à la hauteur de ce bloc
        if (mouseY >= blockRect.top && mouseY <= blockRect.bottom) {
          // Positionner les handles sur ce bloc
          globalDragHandle.style.left = `${blockRect.left - editorRect.left + HANDLE_LEFT_OFFSET}px`;
          globalDragHandle.style.top = `${blockRect.top - editorRect.top + HANDLE_TOP_OFFSET}px`;
          globalDragHandle.style.opacity = '1';

          // Sauvegarder la position du bloc
          try {
            const blockStartPos = currentView.posAtDOM(block, 0);
            globalDragHandle.setAttribute('data-node-pos', blockStartPos.toString());
          } catch (error) {
            logger.dev('[HoverBridge] Erreur posAtDOM dans bridge:', error);
          }

          break;
        }
      }
    }
  });

  bridge.addEventListener('mouseleave', () => {
    // Délai avant de cacher
    let hideTimeout = getHideTimeout();
    if (hideTimeout) {
      clearTimeout(hideTimeout);
    }
    hideTimeout = setTimeout(() => {
      const globalDragHandle = getGlobalDragHandle();
      if (globalDragHandle) {
        globalDragHandle.style.opacity = '0';
      }
    }, HIDE_DELAY_HANDLES);
    setHideTimeout(hideTimeout);
  });

  return bridge;
}

