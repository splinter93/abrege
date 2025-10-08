/**
 * Extension Notion Drag Handle - MÉTHODE OFFICIELLE TIPTAP
 * Utilise view.dragging pour laisser ProseMirror gérer le déplacement
 */

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { NodeSelection } from '@tiptap/pm/state';
import { getSelectionRanges, NodeRangeSelection } from '@tiptap/extension-node-range';
import type { EditorView } from '@tiptap/pm/view';
import type { Node, Slice } from '@tiptap/pm/model';
import type { EditorState } from '@tiptap/pm/state';

/**
 * Type pour la propriété dragging de ProseMirror
 * Utilisée en interne par ProseMirror pour gérer le drag & drop
 */
interface DraggingInfo {
  slice: Slice;
  move: boolean;
}

export interface NotionDragHandleOptions {
  handleClass?: string;
  onNodeChange?: (options: { node: Node; pos: number; editor: EditorState }) => void;
}

let globalDragHandle: HTMLElement | null = null;
let currentView: EditorView | null = null;

// Version du handle pour forcer la recréation après changements de design
const HANDLE_VERSION = 'v3.4'; // Bouton + crée une ligne vide sous le bloc

function createDragHandle(): HTMLElement {
  // Créer le container pour les deux boutons (+ et ⋮⋮)
  const container = document.createElement('div');
  container.className = 'notion-handle-container';
  container.style.position = 'absolute';
  container.style.zIndex = '100';
  container.style.opacity = '0';
  container.style.transition = 'opacity 150ms ease';
  container.style.display = 'flex';
  container.style.gap = '4px';
  container.style.alignItems = 'center';
  
  // Créer le bouton "+" (à gauche)
  const plusBtn = document.createElement('button');
  plusBtn.className = 'notion-plus-btn';
  plusBtn.title = 'Ajouter un bloc';
  plusBtn.style.width = '28px';
  plusBtn.style.height = '28px';
  plusBtn.style.display = 'flex';
  plusBtn.style.alignItems = 'center';
  plusBtn.style.justifyContent = 'center';
  plusBtn.style.border = 'none';
  plusBtn.style.background = 'transparent';
  plusBtn.style.borderRadius = '4px';
  plusBtn.style.cursor = 'pointer';
  plusBtn.style.color = 'rgba(255, 255, 255, 0.5)';
  plusBtn.style.transition = 'all 150ms ease';
  plusBtn.innerHTML = `
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" data-v="3.2">
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  `;
  
  // FORCER la taille du SVG après création
  setTimeout(() => {
    const svg = plusBtn.querySelector('svg');
    if (svg) {
      svg.setAttribute('width', '20');
      svg.setAttribute('height', '20');
      svg.style.width = '20px';
      svg.style.height = '20px';
    }
  }, 0);
  
  // Hover effect sur le bouton +
  plusBtn.addEventListener('mouseenter', () => {
    plusBtn.style.background = 'rgba(255, 255, 255, 0.1)';
    plusBtn.style.color = 'rgba(255, 255, 255, 0.8)';
  });
  plusBtn.addEventListener('mouseleave', () => {
    plusBtn.style.background = 'transparent';
    plusBtn.style.color = 'rgba(255, 255, 255, 0.5)';
  });
  
  // Click sur le bouton + pour créer une ligne vide sous le bloc
  plusBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    
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
            
            // Placer le curseur dans le nouveau paragraphe (utiliser transaction.doc, pas doc)
            transaction.setSelection(
              state.selection.constructor.near(transaction.doc.resolve(afterPos + 1))
            );
            
            dispatch(transaction);
            currentView.focus();
          }
        } catch (error) {
          console.error('Erreur lors de la création de ligne:', error);
        }
      }
    }
  });
  
  // Créer le drag handle (⋮⋮) (à droite)
  const dragBtn = document.createElement('div');
  dragBtn.className = 'notion-drag-handle-btn';
  dragBtn.title = 'Glisser pour déplacer';
  dragBtn.style.width = '28px';
  dragBtn.style.height = '28px';
  dragBtn.style.display = 'flex';
  dragBtn.style.alignItems = 'center';
  dragBtn.style.justifyContent = 'center';
  dragBtn.style.cursor = 'grab';
  dragBtn.style.background = 'transparent';
  dragBtn.style.borderRadius = '4px';
  dragBtn.style.transition = 'all 150ms ease';
  dragBtn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 16 16" fill="rgba(255, 255, 255, 0.5)">
      <circle cx="5" cy="4" r="1.5"/>
      <circle cx="11" cy="4" r="1.5"/>
      <circle cx="5" cy="8" r="1.5"/>
      <circle cx="11" cy="8" r="1.5"/>
      <circle cx="5" cy="12" r="1.5"/>
      <circle cx="11" cy="12" r="1.5"/>
      </svg>
  `;
  
  // Hover effect cohérent avec le bouton +
  dragBtn.addEventListener('mouseenter', () => {
    dragBtn.style.background = 'rgba(255, 255, 255, 0.1)';
  });
  dragBtn.addEventListener('mouseleave', () => {
    dragBtn.style.background = 'transparent';
  });
  
  // Rendre le container draggable
  container.draggable = true;
  container.style.pointerEvents = 'auto';
  
  // Ajouter les boutons au container
  container.appendChild(plusBtn);
  container.appendChild(dragBtn);
  
  return container;
}

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
    const editor = this.editor;

    return [
      new Plugin({
        key: new PluginKey('notionDragHandle'),

        view(view: EditorView) {
          // ✅ FIX: Double requestAnimationFrame pour garantir le DOM monté
          // Résout le problème de race condition lors de la navigation Next.js
          currentView = view;
          
          // Double RAF: garantit que le DOM est complètement rendu et monté
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              // ✅ FIX: TOUJOURS détruire l'ancien handle pour forcer la recréation avec les nouveaux styles
              if (globalDragHandle) {
                if (globalDragHandle.parentNode) {
                  globalDragHandle.parentNode.removeChild(globalDragHandle);
                }
                globalDragHandle = null;
              }
              
              if (!globalDragHandle && view.dom && view.dom.parentElement) {
            globalDragHandle = createDragHandle();
                globalDragHandle.setAttribute('data-version', HANDLE_VERSION);
            
            const editorElement = view.dom.parentElement;
            if (editorElement) {
              editorElement.style.position = 'relative';
              editorElement.appendChild(globalDragHandle);

              // DRAGSTART: Utiliser la méthode officielle Tiptap
              globalDragHandle.addEventListener('dragstart', (e: DragEvent) => {
                const posStr = globalDragHandle?.getAttribute('data-node-pos');
                const pos = posStr ? parseInt(posStr) : -1;
                
                if (pos >= 0 && currentView && e.dataTransfer) {
                  const { doc } = currentView.state;
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
                  
                  // CRITICAL: Dire à ProseMirror qu'on drag
                  // ProseMirror va AUTOMATIQUEMENT gérer le drop/insert/delete !
                  // Type assertion nécessaire car dragging est une propriété interne de ProseMirror
                  (currentView as EditorView & { dragging?: DraggingInfo | null }).dragging = { slice, move: true };
                  
                  // Sélectionner le bloc
                  const tr = currentView.state.tr.setSelection(selection);
                  currentView.dispatch(tr);
                  
                  // Créer l'image de drag
                  const wrapper = document.createElement('div');
                  wrapper.style.position = 'absolute';
                  wrapper.style.top = '-10000px';
                  
                  const domNode = currentView.nodeDOM(from) as HTMLElement;
                  if (domNode) {
                    const cloned = domNode.cloneNode(true) as HTMLElement;
                    wrapper.appendChild(cloned);
                  }
                  
                  document.body.appendChild(wrapper);
                  e.dataTransfer.setDragImage(wrapper, 0, 0);
                  
                  // Cleanup
                  document.addEventListener('drop', () => {
                    if (wrapper.parentNode) {
                      wrapper.parentNode.removeChild(wrapper);
                    }
                  }, { once: true });
                }
              });

              // DRAGEND: Réinitialiser la sélection pour débloquer l'input
              globalDragHandle.addEventListener('dragend', () => {
                if (currentView) {
                  // Attendre un peu que ProseMirror finisse le drop
                  setTimeout(() => {
                    const { tr, doc } = currentView!.state;
                    const { TextSelection } = require('@tiptap/pm/state');
                    
                    // Créer une TextSelection vide à la position courante
                    const currentPos = currentView!.state.selection.from;
                    const selection = TextSelection.create(doc, currentPos);
                    tr.setSelection(selection);
                    currentView!.dispatch(tr);
                  }, 100);
                }
              });
            }
          }
            }); // Fin du 2ème RAF
          }); // Fin du 1er RAF

          // Retourner un objet de cleanup
          return {
            destroy: () => {
              if (globalDragHandle && globalDragHandle.parentNode) {
                globalDragHandle.parentNode.removeChild(globalDragHandle);
                globalDragHandle = null;
              }
              currentView = null;
            }
          };
        },

        props: {
          handleDOMEvents: {
            mousemove: (view: EditorView, event: MouseEvent) => {
              currentView = view;
              
              // ✅ FIX: Créer le handle si il n'existe pas encore (fallback de sécurité)
              // Utiliser RAF pour garantir le DOM prêt même dans le fallback
              // Détruire l'ancien handle s'il existe avec une version obsolète
              if (globalDragHandle && globalDragHandle.getAttribute('data-version') !== HANDLE_VERSION) {
                if (globalDragHandle.parentNode) {
                  globalDragHandle.parentNode.removeChild(globalDragHandle);
                }
                globalDragHandle = null;
              }
              
              if (!globalDragHandle && view.dom && view.dom.parentElement) {
                requestAnimationFrame(() => {
                  if (!globalDragHandle && view.dom && view.dom.parentElement) {
                    globalDragHandle = createDragHandle();
                    globalDragHandle.setAttribute('data-version', HANDLE_VERSION);
                    const editorElement = view.dom.parentElement;
                    if (editorElement) {
                      editorElement.style.position = 'relative';
                      editorElement.appendChild(globalDragHandle);
                      
                      // Ajouter les event listeners
                      globalDragHandle.addEventListener('dragstart', (e: DragEvent) => {
                    const posStr = globalDragHandle?.getAttribute('data-node-pos');
                    const pos = posStr ? parseInt(posStr) : -1;
                    
                    if (pos >= 0 && currentView && e.dataTransfer) {
                      const { doc } = currentView.state;
                      const $pos = doc.resolve(pos);
                      const node = $pos.nodeAfter;
                      
                      if (!node) return;
                      
                      const from = pos;
                      const to = pos + node.nodeSize;
                      const $from = doc.resolve(from);
                      const $to = doc.resolve(to);
                      
                      const ranges = getSelectionRanges($from, $to, 0);
                      
                      if (!ranges.length) {
                        return;
                      }
                      
                      const selection = NodeRangeSelection.create(doc, from, to);
                      const slice = selection.content();
                      
                      // Type assertion nécessaire car dragging est une propriété interne de ProseMirror
                      (currentView as EditorView & { dragging?: DraggingInfo | null }).dragging = { slice, move: true };
                      
                      const tr = currentView.state.tr.setSelection(selection);
                      currentView.dispatch(tr);
                      
                      const wrapper = document.createElement('div');
                      wrapper.style.position = 'absolute';
                      wrapper.style.top = '-10000px';
                      
                      const domNode = currentView.nodeDOM(from) as HTMLElement;
                      if (domNode) {
                        const cloned = domNode.cloneNode(true) as HTMLElement;
                        wrapper.appendChild(cloned);
                      }
                      
                      document.body.appendChild(wrapper);
                      e.dataTransfer.setDragImage(wrapper, 0, 0);
                      
                      document.addEventListener('drop', () => {
                        if (wrapper.parentNode) {
                          wrapper.parentNode.removeChild(wrapper);
                        }
                      }, { once: true });
                    }
                  });
                  
                  globalDragHandle.addEventListener('dragend', () => {
                    if (currentView) {
                      setTimeout(() => {
                        const { tr, doc } = currentView!.state;
                        const { TextSelection } = require('@tiptap/pm/state');
                        
                        const currentPos = currentView!.state.selection.from;
                        const selection = TextSelection.create(doc, currentPos);
                        tr.setSelection(selection);
                        currentView!.dispatch(tr);
                      }, 100);
                    }
                  });
                  }
                }
                });
              }

              // Positionner le handle (vérifier qu'il existe d'abord)
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

                if ($pos.depth > 0) {
                  node = $pos.node();
                  nodePos = $pos.before();
                }

                if (node && node.isBlock) {
                  const domNode = view.nodeDOM(nodePos);
                  
                  if (domNode && domNode instanceof HTMLElement) {
                    // Trouver l'élément de premier niveau
                    let targetElement = domNode;
                    while (targetElement.parentElement && targetElement.parentElement !== view.dom) {
                      targetElement = targetElement.parentElement;
                    }

                    const rect = targetElement.getBoundingClientRect();
                    const editorRect = view.dom.getBoundingClientRect();

                    // Positionner le container (+ à gauche du drag handle)
                    globalDragHandle.style.left = `${rect.left - editorRect.left - 75}px`;
                    globalDragHandle.style.top = `${rect.top - editorRect.top - 5}px`;
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
              if (!globalDragHandle) return false;
              
              const relatedTarget = event.relatedTarget as HTMLElement;
              if (relatedTarget && (relatedTarget === globalDragHandle || globalDragHandle.contains(relatedTarget))) {
                return false;
              }

              globalDragHandle.style.opacity = '0';
              
              return false;
            },
          },
        },
      }),
    ];
  },
});

export default NotionDragHandleExtension;
