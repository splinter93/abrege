/**
 * Extension Drag Handle améliorée pour l'éditeur
 * 
 * @description Extension Tiptap personnalisée inspirée de l'extension officielle
 * avec un suivi parfait du curseur et une meilleure gestion du hover.
 */

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { Editor } from '@tiptap/core';
import type { Node } from '@tiptap/pm/model';
import type { EditorView } from '@tiptap/pm/view';

export interface DragHandleOptions {
  /**
   * Renders an element that is positioned as the drag handle
   */
  render(): HTMLElement;
  /**
   * Returns a node or null when a node is hovered over
   */
  onNodeChange?: (options: { node: Node | null; editor: Editor; pos: number }) => void;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    dragHandle: {
      /**
       * Locks the draghandle in place and visibility
       */
      lockDragHandle: () => ReturnType;
      /**
       * Unlocks the draghandle
       */
      unlockDragHandle: () => ReturnType;
      /**
       * Toggle draghandle lock state
       */
      toggleDragHandle: () => ReturnType;
    }
  }
}

// Helper functions inspirées de l'extension officielle
const findElementNextToCoords = (options: {
  x: number;
  y: number;
  direction?: 'left' | 'right';
  editor: Editor;
  bandHeight?: number;
}) => {
  const { x, y, direction = 'right', editor, bandHeight = 5 } = options;

  const rect = {
    top: y - bandHeight,
    bottom: y + bandHeight,
    left: direction === 'right' ? x : 0,
    right: direction === 'right' ? window.innerWidth - x : x,
  };

  const root = editor.view.dom as HTMLElement;

  // Get potential candidates from prosemirror child elements
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

export const DragHandleExtension = Extension.create<DragHandleOptions>({
  name: 'dragHandle',

  addOptions() {
    return {
      render() {
        const element = document.createElement('div');
        element.classList.add('drag-handle-custom');
        element.innerHTML = `
          <div class="drag-handle-content">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" class="drag-handle-icon">
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

  addCommands() {
    return {
      lockDragHandle:
        () =>
        ({ editor }) => {
          return editor.commands.setMeta('lockDragHandle', true);
        },
      unlockDragHandle:
        () =>
        ({ editor }) => {
          return editor.commands.setMeta('lockDragHandle', false);
        },
      toggleDragHandle:
        () =>
        ({ editor }) => {
          return editor.commands.setMeta('toggleDragHandle', true);
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

    // Stocker les références pour les événements avec une copie stable
    const getCurrentNode = () => currentNode;
    const getCurrentNodePos = () => currentNodePos;
    const setCurrentNode = (node: Node | null, pos: number) => {
      currentNode = node;
      currentNodePos = pos;
      
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ setCurrentNode appelé:', {
          nodeType: node?.type.name,
          pos,
          hasNode: !!node
        });
      }
    };

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

    function onMouseDown(e: MouseEvent) {
      e.preventDefault();
      e.stopPropagation();
      
      // Récupérer le nœud au moment du clic
      let node = getCurrentNode();
      let pos = getCurrentNodePos();
      
      // Si le nœud est null, essayer de le retrouver via le DOM
      if (!node || pos === -1) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('⚠️ Node perdu, tentative de récupération via DOM');
        }
        
        // Chercher le bloc sous le handle
        const rect = element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        const coords = editor.view.posAtCoords({
          left: centerX + 30, // Décalage pour être sur le bloc
          top: centerY
        });
        
        if (coords) {
          const $pos = editor.view.state.doc.resolve(coords.pos);
          node = getOuterNode(editor.view.state.doc, coords.pos);
          
          // Calculer la position correcte selon le niveau
          if ($pos.depth === 0) {
            pos = coords.pos;
          } else {
            pos = getOuterNodePos(editor.view.state.doc, coords.pos);
          }
          
          if (process.env.NODE_ENV === 'development') {
            console.log('✅ Node récupéré:', { 
              nodeType: node?.type.name, 
              pos,
              depth: $pos.depth,
              nodeSize: node?.nodeSize
            });
          }
        }
      }
      
      if (!node || pos === -1 || !editor) {
        console.warn('⚠️ Mouse down échoué: données manquantes', {
          currentNode: !!node,
          currentNodePos: pos,
          editor: !!editor
        });
        return;
      }
      
      console.log('🔍 Debug drag handle:', {
        currentNode: node,
        currentNodePos: pos,
        nodeType: node.type.name,
        nodeSize: node.nodeSize,
        content: node.textContent?.substring(0, 100)
      });
      
      // Sélectionner le bloc entier dans l'éditeur
      const $pos = editor.state.doc.resolve(pos);
      
      // Gérer les nœuds de niveau racine vs les nœuds imbriqués
      let start, end;
      if ($pos.depth === 0) {
        // Nœud de niveau racine - utiliser directement la position
        start = pos;
        end = pos + node.nodeSize;
      } else {
        // Nœud imbriqué - utiliser before/after
        start = $pos.before();
        end = $pos.after();
      }
      
      // Vérifier que les positions sont valides
      if (start < 0 || end > editor.state.doc.content.size || start >= end) {
        console.error('❌ Positions invalides:', {
          start,
          end,
          docSize: editor.state.doc.content.size,
          depth: $pos.depth
        });
        return;
      }
      
      console.log('📍 Positions calculées:', {
        currentNodePos: pos,
        start,
        end,
        depth: $pos.depth,
        parentOffset: $pos.parentOffset,
        nodeSize: node.nodeSize
      });
      
      // Créer une sélection qui couvre tout le bloc
      const tr = editor.state.tr;
      const selection = editor.state.selection.constructor.near(editor.state.doc.resolve(start));
      tr.setSelection(selection);
      
      // Étendre la sélection pour couvrir tout le bloc
      const extendedSelection = editor.state.selection.constructor.near(editor.state.doc.resolve(end));
      tr.setSelection(extendedSelection);
      
      // Appliquer la sélection
      editor.view.dispatch(tr);
      
      // Vérifier la sélection après application
      const newSelection = editor.state.selection;
      console.log('✅ Sélection appliquée:', {
        from: newSelection.from,
        to: newSelection.to,
        empty: newSelection.empty,
        nodeSize: newSelection.nodeSize
      });
      
      console.log('🚀 Bloc sélectionné pour drag:', {
        nodeType: node.type.name,
        start,
        end,
        content: node.textContent?.substring(0, 50) + '...'
      });
      
      // Déclencher le drag and drop natif de ProseMirror
      // On simule un événement de drag sur la sélection
      const selectionElement = editor.view.domAtPos(newSelection.from).node as HTMLElement;
      if (selectionElement) {
        // Rendre l'élément draggable
        selectionElement.draggable = true;
        
        // Déclencher le drag
        const dragEvent = new DragEvent('dragstart', {
          bubbles: true,
          cancelable: true,
          dataTransfer: new DataTransfer()
        });
        
        // Dispatch l'événement sur l'élément sélectionné
        selectionElement.dispatchEvent(dragEvent);
      }
    }

    element.addEventListener('mousedown', onMouseDown);
    element.draggable = false; // Pas de drag sur l'élément handle lui-même
    
    // Empêcher le handle de perdre la référence au nœud
    element.addEventListener('mouseenter', () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('🖱️ Handle mouseenter - keeping node reference');
      }
    });
    
    element.addEventListener('mouseleave', (e) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('🖱️ Handle mouseleave');
      }
    });

    return [
      new Plugin({
        key: new PluginKey('dragHandle'),

        state: {
          init() {
            return { locked: false };
          },
          apply(tr, value, oldState, newState) {
            const isLocked = tr.getMeta('lockDragHandle');
            const toggleLocked = tr.getMeta('toggleDragHandle');
            const hideDragHandle = tr.getMeta('hideDragHandle');

            if (isLocked !== undefined) {
              locked = isLocked;
            }
            if (toggleLocked) {
              locked = !locked;
            }
            if (hideDragHandle) {
              hideHandle();
              locked = false;
              currentNode = null;
              currentNodePos = -1;
              options.onNodeChange?.({ editor, node: null, pos: -1 });
              return value;
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
                element.draggable = false;
                return;
              } else {
                element.draggable = true;
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

              // Store latest mouse coords and schedule a single RAF per frame
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
                  direction: 'right',
                  editor,
                });

                // Skip if there is no node next to coords
                if (!nodeData.resultElement) {
                  return;
                }

                let domNode = nodeData.resultElement as HTMLElement;
                domNode = getOuterDomNode(view, domNode);

                // Skip if domNode is editor dom
                if (domNode === view.dom) {
                  return;
                }

                // We only want Element
                if (domNode?.nodeType !== 1) {
                  return;
                }

                const domNodePos = view.posAtDOM(domNode, 0);
                const outerNode = getOuterNode(editor.state.doc, domNodePos);

                if (outerNode !== currentNode) {
                  const outerNodePos = getOuterNodePos(editor.state.doc, domNodePos);

                  console.log('🎯 Nouveau nœud détecté:', {
                    nodeType: outerNode?.type.name,
                    pos: outerNodePos,
                    domNodePos,
                    content: outerNode?.textContent?.substring(0, 50) + '...',
                    nodeSize: outerNode?.nodeSize
                  });

                  setCurrentNode(outerNode, outerNodePos);

                  if (editor) {
                    options.onNodeChange?.({ editor, node: outerNode, pos: outerNodePos });
                  }

                  // Set nodes clientRect
                  repositionDragHandle(domNode as Element);
                  showHandle();
                }
              });

              return false;
            },

            mouseleave(view, event) {
              if (locked) return false;
              
              // Ne pas cacher le handle si on survole le handle lui-même
              const relatedTarget = event.relatedTarget as HTMLElement;
              if (relatedTarget && (
                relatedTarget === element ||
                element.contains(relatedTarget)
              )) {
                return false;
              }
              
              hideHandle();
              setCurrentNode(null, -1);
              if (editor) {
                options.onNodeChange?.({ editor, node: null, pos: -1 });
              }
              return false;
            },

            keydown() {
              if (locked) return false;
              hideHandle();
              setCurrentNode(null, -1);
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

  // Traverse to top level node
  while (tmpDomNode?.parentNode) {
    if (tmpDomNode.parentNode === view.dom) {
      break;
    }
    tmpDomNode = tmpDomNode.parentNode as HTMLElement;
  }

  return tmpDomNode;
}

export default DragHandleExtension;