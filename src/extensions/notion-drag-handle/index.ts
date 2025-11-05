/**
 * Extension Notion Drag Handle - Point d'entrée principal
 * MÉTHODE OFFICIELLE TIPTAP: Utilise view.dragging pour laisser ProseMirror gérer le déplacement
 */

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';
import {
  type NotionDragHandleOptions,
  HANDLE_VERSION,
  HANDLE_LEFT_OFFSET,
  HANDLE_TOP_OFFSET,
  HIDE_DELAY_EDITOR,
} from './types';
import {
  getGlobalDragHandle,
  getGlobalDragHandleCleanup,
  getCurrentView,
  getHideTimeout,
  getHoverBridge,
  getListenersAttached,
  setGlobalDragHandle,
  setGlobalDragHandleCleanup,
  setCurrentView,
  setHideTimeout,
  setHoverBridge,
  setListenersAttached,
  cleanupGlobalState,
} from './state';
import { createHoverBridge } from './hoverBridge';
import { createDragHandle } from './dragHandle';
import { attachDragListeners } from './listeners';

// Re-export types publics
export type { NotionDragHandleOptions };

/**
 * Extension TipTap pour les drag handles façon Notion
 */
export const NotionDragHandleExtension = Extension.create<NotionDragHandleOptions>({
  name: 'notionDragHandle',

  addOptions() {
    return {
      handleClass: 'notion-drag-handle',
      onNodeChange: undefined,
    };
  },

  addProseMirrorPlugins() {
    const options = this.options;

    return [
      new Plugin({
        key: new PluginKey('notionDragHandle'),

        view(view: EditorView) {
          // ✅ FIX: Double requestAnimationFrame pour garantir le DOM monté
          // Résout le problème de race condition lors de la navigation Next.js
          setCurrentView(view);

          // Double RAF: garantit que le DOM est complètement rendu et monté
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              // ✅ FIX: TOUJOURS détruire l'ancien handle pour forcer la recréation avec les nouveaux styles
              let globalDragHandle = getGlobalDragHandle();
              if (globalDragHandle) {
                // ✅ Nettoyer les listeners AVANT de détruire (FIX MEMORY LEAK)
                const cleanup = getGlobalDragHandleCleanup();
                if (cleanup) {
                  cleanup();
                  setGlobalDragHandleCleanup(null);
                }

                if (globalDragHandle.parentNode) {
                  globalDragHandle.parentNode.removeChild(globalDragHandle);
                }
                setGlobalDragHandle(null);
              }

              // ✅ Détruire aussi la bridge pour la recréer
              let hoverBridge = getHoverBridge();
              if (hoverBridge) {
                if (hoverBridge.parentNode) {
                  hoverBridge.parentNode.removeChild(hoverBridge);
                }
                setHoverBridge(null);
              }

              // ✅ Reset le flag listeners pour recréation
              setListenersAttached(false);

              globalDragHandle = getGlobalDragHandle();
              if (!globalDragHandle && view.dom) {
                globalDragHandle = createDragHandle();
                globalDragHandle.setAttribute('data-version', HANDLE_VERSION);
                setGlobalDragHandle(globalDragHandle);

                // Trouver .tiptap-editor-container (grand-parent) au lieu du parent direct
                const editorElement = view.dom.closest('.tiptap-editor-container') || view.dom.parentElement;
                if (editorElement) {
                  (editorElement as HTMLElement).style.position = 'relative';
                  editorElement.appendChild(globalDragHandle);

                  // ✅ Créer et ajouter la zone bridge
                  hoverBridge = getHoverBridge();
                  if (!hoverBridge) {
                    hoverBridge = createHoverBridge();
                    setHoverBridge(hoverBridge);
                    editorElement.appendChild(hoverBridge);
                  }

                  // ✅ Attacher les listeners UNE SEULE FOIS
                  const listenersAttached = getListenersAttached();
                  if (!listenersAttached) {
                    setListenersAttached(true);
                    const cleanup = attachDragListeners(globalDragHandle, view);
                    setGlobalDragHandleCleanup(cleanup);
                  }
                }
              }
            }); // Fin du 2ème RAF
          }); // Fin du 1er RAF

          // Retourner un objet de cleanup
          return {
            destroy: () => {
              cleanupGlobalState();
            }
          };
        },

        props: {
          handleDOMEvents: {
            mousemove: (view: EditorView, event: MouseEvent) => {
              setCurrentView(view);

              // ✅ Annuler le timeout de hide si on survole un nouveau bloc
              let hideTimeout = getHideTimeout();
              if (hideTimeout) {
                clearTimeout(hideTimeout);
                setHideTimeout(null);
              }

              // ✅ FIX: Créer le handle si il n'existe pas encore (fallback de sécurité)
              // Utiliser RAF pour garantir le DOM prêt même dans le fallback
              // Détruire l'ancien handle s'il existe avec une version obsolète
              let globalDragHandle = getGlobalDragHandle();
              if (globalDragHandle && globalDragHandle.getAttribute('data-version') !== HANDLE_VERSION) {
                // ✅ Nettoyer les listeners AVANT de détruire (FIX MEMORY LEAK)
                const cleanup = getGlobalDragHandleCleanup();
                if (cleanup) {
                  cleanup();
                  setGlobalDragHandleCleanup(null);
                }

                if (globalDragHandle.parentNode) {
                  globalDragHandle.parentNode.removeChild(globalDragHandle);
                }
                setGlobalDragHandle(null);

                // ✅ Détruire aussi la bridge
                let hoverBridge = getHoverBridge();
                if (hoverBridge && hoverBridge.parentNode) {
                  hoverBridge.parentNode.removeChild(hoverBridge);
                  setHoverBridge(null);
                }

                // ✅ Reset le flag listeners pour recréation
                setListenersAttached(false);
              }

              globalDragHandle = getGlobalDragHandle();
              if (!globalDragHandle && view.dom) {
                requestAnimationFrame(() => {
                  let globalDragHandle = getGlobalDragHandle();
                  if (!globalDragHandle && view.dom) {
                    globalDragHandle = createDragHandle();
                    globalDragHandle.setAttribute('data-version', HANDLE_VERSION);
                    setGlobalDragHandle(globalDragHandle);

                    // Trouver .tiptap-editor-container (grand-parent) au lieu du parent direct
                    const editorElement = view.dom.closest('.tiptap-editor-container') || view.dom.parentElement;
                    if (editorElement) {
                      (editorElement as HTMLElement).style.position = 'relative';
                      editorElement.appendChild(globalDragHandle);

                      // ✅ Créer et ajouter la bridge (fallback)
                      let hoverBridge = getHoverBridge();
                      if (!hoverBridge) {
                        hoverBridge = createHoverBridge();
                        setHoverBridge(hoverBridge);
                        editorElement.appendChild(hoverBridge);
                      }

                      // ✅ FIX BUG: Attacher les listeners dans le fallback aussi !
                      const listenersAttached = getListenersAttached();
                      if (!listenersAttached) {
                        setListenersAttached(true);
                        const cleanup = attachDragListeners(globalDragHandle, view);
                        setGlobalDragHandleCleanup(cleanup);
                      }
                    }
                  }
                });
              }

              // Positionner le handle (vérifier qu'il existe d'abord)
              globalDragHandle = getGlobalDragHandle();
              if (!globalDragHandle) return false;

              const coords = { left: event.clientX, top: event.clientY };
              const pos = view.posAtCoords(coords);

              if (!pos) {
                globalDragHandle.style.opacity = '0';
                return false;
              }

              try {
                const $pos = view.state.doc.resolve(pos.pos);
                let node = $pos.nodeAfter;
                let nodePos = pos.pos;

                // ✅ FIX: Détecter les listItem individuels au lieu de la liste entière
                // Remonter dans l'arbre pour trouver le bon niveau de bloc
                if ($pos.depth > 0) {
                  // Si on est dans un listItem, utiliser le listItem comme bloc
                  const parentNode = $pos.node($pos.depth);
                  if (parentNode.type.name === 'listItem') {
                    node = parentNode;
                    nodePos = $pos.before($pos.depth);
                  } else {
                    node = $pos.node();
                    nodePos = $pos.before();
                  }
                }

                if (node && (node.isBlock || node.type.name === 'listItem')) {
                  const domNode = view.nodeDOM(nodePos);

                  if (domNode && domNode instanceof HTMLElement) {
                    // Trouver l'élément de premier niveau
                    let targetElement = domNode;
                    while (targetElement.parentElement && targetElement.parentElement !== view.dom) {
                      targetElement = targetElement.parentElement;
                    }

                    const rect = targetElement.getBoundingClientRect();
                    const editorRect = view.dom.getBoundingClientRect();

                    // ✅ Annuler le timeout de hide quand on affiche les handles
                    hideTimeout = getHideTimeout();
                    if (hideTimeout) {
                      clearTimeout(hideTimeout);
                      setHideTimeout(null);
                    }

                    // Positionner le container (+ à gauche du drag handle)
                    globalDragHandle.style.left = `${rect.left - editorRect.left + HANDLE_LEFT_OFFSET}px`;
                    globalDragHandle.style.top = `${rect.top - editorRect.top + HANDLE_TOP_OFFSET}px`;
                    globalDragHandle.style.opacity = '1';

                    // Utiliser posAtDOM pour la position exacte
                    let blockStartPos = view.posAtDOM(targetElement, 0);

                    const $check = view.state.doc.resolve(blockStartPos);
                    if ($check.depth > 1) {
                      blockStartPos = $check.before(1);
                    }

                    globalDragHandle.setAttribute('data-node-pos', blockStartPos.toString());

                    if (options.onNodeChange) {
                      options.onNodeChange({
                        node,
                        pos: nodePos,
                        editor: view.state,
                      });
                    }
                  }
                }
              } catch (error) {
                globalDragHandle.style.opacity = '0';
              }

              return false;
            },

            mouseleave: (view: EditorView, event: MouseEvent) => {
              const globalDragHandle = getGlobalDragHandle();
              if (!globalDragHandle) return false;

              const relatedTarget = event.relatedTarget as HTMLElement;

              // ✅ Si la souris entre dans les handles, ne pas cacher
              if (relatedTarget && (relatedTarget === globalDragHandle || globalDragHandle.contains(relatedTarget))) {
                return false;
              }

              // ✅ Délai avant de cacher (laisse le temps d'aller vers les handles)
              let hideTimeout = getHideTimeout();
              if (hideTimeout) {
                clearTimeout(hideTimeout);
              }

              hideTimeout = setTimeout(() => {
                const globalDragHandle = getGlobalDragHandle();
                if (globalDragHandle) {
                  globalDragHandle.style.opacity = '0';
                }
              }, HIDE_DELAY_EDITOR);
              setHideTimeout(hideTimeout);

              return false;
            },
          },
        },
      }),
    ];
  },
});

export default NotionDragHandleExtension;

