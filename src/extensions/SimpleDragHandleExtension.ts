/**
 * Extension Drag Handle simplifiée qui utilise le drag and drop natif de ProseMirror
 * Version épurée qui fonctionne avec le système natif
 */

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { Editor } from '@tiptap/core';
import type { Node } from '@tiptap/pm/model';
import type { EditorView } from '@tiptap/pm/view';

export interface SimpleDragHandleOptions {
  render(): HTMLElement;
  onNodeChange?: (options: { node: Node | null; editor: Editor; pos: number }) => void;
}

export const SimpleDragHandleExtension = Extension.create<SimpleDragHandleOptions>({
  name: 'simpleDragHandle',

  addOptions() {
    return {
      render() {
        const element = document.createElement('div');
        element.classList.add('simple-drag-handle');
        element.innerHTML = `
          <div class="simple-drag-handle-content">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" class="simple-drag-handle-icon">
              <path d="M4 6h2v2H4V6zm6 0h2v2h-2V6zM4 10h2v2H4v-2zm6 0h2v2h-2v-2z"/>
            </svg>
          </div>
        `;
        return element;
      },
      onNodeChange: () => {
        return null;
      },
    };
  },

  addProseMirrorPlugins() {
    const element = this.options.render();
    const editor = this.editor;
    const options = this.options;
    let currentNode: Node | null = null;
    let currentNodePos = -1;
    let locked = false;
    let rafId: number | null = null;
    let pendingMouseCoords: { x: number; y: number } | null = null;

    function hideHandle() {
      if (!element) return;
      element.style.visibility = 'hidden';
      element.style.pointerEvents = 'none';
    }

    function showHandle() {
      if (!element) return;
      if (!editor || !editor.isEditable) {
        hideHandle();
        return;
      }
      element.style.visibility = 'visible';
      element.style.pointerEvents = 'auto';
    }

    function repositionDragHandle(dom: Element) {
      if (!element || !editor) return;
      
      const rect = dom.getBoundingClientRect();
      const editorRect = editor.view.dom.getBoundingClientRect();
      
      element.style.position = 'absolute';
      element.style.left = `${rect.left - editorRect.left - 24}px`;
      element.style.top = `${rect.top - editorRect.top}px`;
    }

    // Fonction simplifiée pour trouver l'élément à côté des coordonnées
    const findElementNextToCoords = (options: {
      x: number;
      y: number;
      editor: Editor;
    }) => {
      const { x, y, editor } = options;

      const rect = {
        top: y - 5,
        bottom: y + 5,
        left: x,
        right: x,
      };

      const root = editor.view.dom as HTMLElement;

      const candidates = [...root.querySelectorAll<HTMLElement>('*')]
        .filter(candidate => {
          return editor.view.posAtDOM(candidate, 0) >= 0;
        })
        .filter(candidate => {
          const candidateRect = candidate.getBoundingClientRect();
          return !(
            candidateRect.bottom < rect.top ||
            candidateRect.top > rect.bottom ||
            candidateRect.right < rect.left ||
            candidateRect.left > rect.right
          );
        });

      if (!candidates || candidates.length === 0) {
        return { resultElement: null, resultNode: null, pos: null };
      }

      const finalCandidate = candidates[0];
      const candidatePos = editor.view.posAtDOM(finalCandidate, 0);
      if (candidatePos === -1) {
        return { resultElement: finalCandidate, resultNode: null, pos: null };
      }

      const $pos = editor.state.doc.resolve(candidatePos);

      if ($pos.nodeAfter) {
        const nodeAfterDom = editor.view.nodeDOM($pos.pos);
        if (nodeAfterDom && nodeAfterDom === finalCandidate) {
          return {
            resultElement: finalCandidate,
            resultNode: $pos.nodeAfter,
            pos: candidatePos,
          };
        }
      }

      const candidateNode = editor.state.doc.nodeAt(candidatePos - 1);
      return { resultElement: finalCandidate, resultNode: candidateNode, pos: candidatePos };
    };

    // Fonction pour obtenir le nœud externe
    const getOuterNode = (doc: Node, pos: number): Node | null => {
      const node = doc.nodeAt(pos);
      const resolvedPos = doc.resolve(pos);
      let { depth } = resolvedPos;
      let parent = node;

      while (depth > 0) {
        const currentNode = resolvedPos.node(depth);
        depth -= 1;
        if (depth === 0) {
          parent = currentNode;
        }
      }

      return parent;
    };

    const getOuterNodePos = (doc: Node, pos: number): number => {
      const resolvedPos = doc.resolve(pos);
      const { depth } = resolvedPos;

      if (depth === 0) {
        return pos;
      }

      const a = resolvedPos.pos - resolvedPos.parentOffset;
      return a - 1;
    };

    // Gestionnaire de clic simplifié qui active le drag natif
    function onMouseDown(e: MouseEvent) {
      e.preventDefault();
      e.stopPropagation();

      if (!currentNode || currentNodePos === -1 || !editor) {
        console.warn('⚠️ Pas de nœud sélectionné');
        return;
      }

      console.log('🚀 Démarrage du drag natif:', {
        nodeType: currentNode.type.name,
        pos: currentNodePos
      });

      // Sélectionner le bloc entier
      const $pos = editor.state.doc.resolve(currentNodePos);
      let start, end;
      
      if ($pos.depth === 0) {
        start = currentNodePos;
        end = currentNodePos + currentNode.nodeSize;
      } else {
        start = $pos.before();
        end = $pos.after();
      }

      // Créer une sélection sur tout le bloc
      const tr = editor.state.tr;
      const selection = editor.state.selection.constructor.near(editor.state.doc.resolve(start));
      tr.setSelection(selection);
      
      // Étendre la sélection pour couvrir tout le bloc
      const extendedSelection = editor.state.selection.constructor.near(editor.state.doc.resolve(end));
      tr.setSelection(extendedSelection);
      
      // Appliquer la sélection
      editor.view.dispatch(tr);

      // Maintenant, déclencher le drag natif de ProseMirror
      const selectionElement = editor.view.domAtPos(editor.state.selection.from).node as HTMLElement;
      if (selectionElement) {
        // Rendre l'élément draggable
        selectionElement.draggable = true;
        
        // Créer et dispatcher l'événement de drag
        const dragEvent = new DragEvent('dragstart', {
          bubbles: true,
          cancelable: true,
          dataTransfer: new DataTransfer()
        });
        
        selectionElement.dispatchEvent(dragEvent);
        
        console.log('✅ Drag natif déclenché');
      }
    }

    element.addEventListener('mousedown', onMouseDown);
    element.draggable = false;

    return [
      new Plugin({
        key: new PluginKey('simpleDragHandle'),

        state: {
          init() {
            return { locked: false };
          },
          apply(tr, value) {
            const isLocked = tr.getMeta('lockDragHandle');
            if (isLocked !== undefined) {
              locked = isLocked;
            }
            return value;
          },
        },

        view: (view: EditorView) => {
          const editorElement = view.dom.parentElement;
          if (editorElement) {
            editorElement.appendChild(element);
          }

          return {
            update(view, oldState) {
              if (!element) return;

              if (!editor || !editor.isEditable) {
                hideHandle();
                return;
              }

              if (locked) {
                return;
              }

              // Recalculer la position si le document a changé
              if (view.state.doc.eq(oldState.doc) || currentNodePos === -1) {
                return;
              }

              // Mettre à jour la position du handle
              let domNode = view.nodeDOM(currentNodePos) as HTMLElement;
              if (domNode) {
                domNode = getOuterDomNode(view, domNode);
                if (domNode && domNode !== view.dom) {
                  repositionDragHandle(domNode);
                }
              }
            },

            destroy() {
              if (element && element.parentNode) {
                element.parentNode.removeChild(element);
              }
              if (rafId) {
                cancelAnimationFrame(rafId);
                rafId = null;
                pendingMouseCoords = null;
              }
            },
          };
        },

        props: {
          handleDOMEvents: {
            mousemove(view, e) {
              if (!element || locked) return false;

              pendingMouseCoords = { x: e.clientX, y: e.clientY };

              if (rafId) {
                return false;
              }

              rafId = requestAnimationFrame(() => {
                rafId = null;

                if (!pendingMouseCoords) {
                  return;
                }

                const { x, y } = pendingMouseCoords;
                pendingMouseCoords = null;

                const nodeData = findElementNextToCoords({
                  x,
                  y,
                  editor,
                });

                if (!nodeData.resultElement) {
                  return;
                }

                let domNode = nodeData.resultElement as HTMLElement;
                domNode = getOuterDomNode(view, domNode);

                if (domNode === view.dom) {
                  return;
                }

                if (domNode?.nodeType !== 1) {
                  return;
                }

                const domNodePos = view.posAtDOM(domNode, 0);
                const outerNode = getOuterNode(editor.state.doc, domNodePos);

                if (outerNode !== currentNode) {
                  const outerNodePos = getOuterNodePos(editor.state.doc, domNodePos);

                  currentNode = outerNode;
                  currentNodePos = outerNodePos;

                  if (editor) {
                    options.onNodeChange?.({ editor, node: outerNode, pos: outerNodePos });
                  }

                  repositionDragHandle(domNode as Element);
                  showHandle();
                }
              });

              return false;
            },

            mouseleave(view, event) {
              if (locked) return false;
              
              const relatedTarget = event.relatedTarget as HTMLElement;
              if (relatedTarget && (
                relatedTarget === element ||
                element.contains(relatedTarget)
              )) {
                return false;
              }
              
              hideHandle();
              currentNode = null;
              currentNodePos = -1;
              if (editor) {
                options.onNodeChange?.({ editor, node: null, pos: -1 });
              }
              return false;
            },

            keydown() {
              if (locked) return false;
              hideHandle();
              currentNode = null;
              currentNodePos = -1;
              if (editor) {
                options.onNodeChange?.({ editor, node: null, pos: -1 });
              }
              return false;
            },
          },
        },
      }),
    ];
  },
});

// Helper function pour obtenir le nœud DOM externe
function getOuterDomNode(view: EditorView, domNode: HTMLElement) {
  let tmpDomNode = domNode;

  while (tmpDomNode?.parentNode) {
    if (tmpDomNode.parentNode === view.dom) {
      break;
    }
    tmpDomNode = tmpDomNode.parentNode as HTMLElement;
  }

  return tmpDomNode;
}

export default SimpleDragHandleExtension;


