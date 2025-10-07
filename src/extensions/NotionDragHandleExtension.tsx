/**
 * Extension Notion Drag Handle - MÉTHODE OFFICIELLE TIPTAP
 * Utilise view.dragging pour laisser ProseMirror gérer le déplacement
 */

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { NodeSelection } from '@tiptap/pm/state';
import { getSelectionRanges, NodeRangeSelection } from '@tiptap/extension-node-range';
import type { EditorView } from '@tiptap/pm/view';

export interface NotionDragHandleOptions {
  handleClass?: string;
  onNodeChange?: (options: { node: any; pos: number; editor: any }) => void;
}

let globalDragHandle: HTMLElement | null = null;
let currentView: EditorView | null = null;

function createDragHandle(): HTMLElement {
  const handle = document.createElement('div');
  handle.className = 'notion-drag-handle';
  handle.draggable = true;
  handle.innerHTML = `
    <div class="notion-drag-handle-btn" title="Glisser pour déplacer">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <circle cx="4" cy="4" r="1.5"/>
        <circle cx="10" cy="4" r="1.5"/>
        <circle cx="4" cy="8" r="1.5"/>
        <circle cx="10" cy="8" r="1.5"/>
        <circle cx="4" cy="12" r="1.5"/>
        <circle cx="10" cy="12" r="1.5"/>
      </svg>
    </div>
  `;
  
  handle.style.position = 'absolute';
  handle.style.zIndex = '100';
  handle.style.opacity = '0';
  handle.style.transition = 'opacity 150ms ease';
  handle.style.pointerEvents = 'auto';
  handle.style.cursor = 'grab';
  
  return handle;
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

        props: {
          handleDOMEvents: {
            mousemove: (view: EditorView, event: MouseEvent) => {
              currentView = view;
              
              if (!globalDragHandle) {
                globalDragHandle = createDragHandle();
                
                const editorElement = view.dom.parentElement;
                if (editorElement) {
                  editorElement.style.position = 'relative';
                  editorElement.appendChild(globalDragHandle);
                  
                  console.log('✅ Handle créé');

                  // DRAGSTART: Utiliser la méthode officielle Tiptap
                  globalDragHandle.addEventListener('dragstart', (e: DragEvent) => {
                    const posStr = globalDragHandle?.getAttribute('data-node-pos');
                    const pos = posStr ? parseInt(posStr) : -1;
                    
                    console.log('🚀 DRAGSTART, pos:', pos);
                    
                    if (pos >= 0 && currentView && e.dataTransfer) {
                      const { doc } = currentView.state;
                      const $pos = doc.resolve(pos);
                      const node = $pos.nodeAfter;
                      
                      if (!node) return;
                      
                      console.log('  📦 Node:', { type: node.type.name, size: node.nodeSize });
                      
                      // Créer les ranges avec getSelectionRanges (méthode Tiptap)
                      const from = pos;
                      const to = pos + node.nodeSize;
                      const $from = doc.resolve(from);
                      const $to = doc.resolve(to);
                      
                      const ranges = getSelectionRanges($from, $to, 0);
                      
                      if (!ranges.length) {
                        console.log('  ❌ Pas de ranges');
                        return;
                      }
                      
                      console.log('  ✅ Ranges créés:', ranges.length);
                      
                      // Créer la sélection et la slice
                      const selection = NodeRangeSelection.create(doc, from, to);
                      const slice = selection.content();
                      
                      console.log('  ✅ Slice créée, size:', slice.size);
                      
                      // CRITICAL: Dire à ProseMirror qu'on drag
                      // ProseMirror va AUTOMATIQUEMENT gérer le drop/insert/delete !
                      (currentView as any).dragging = { slice, move: true };
                      
                      console.log('  ✅ view.dragging défini, ProseMirror prend le relais !');
                      
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
                    console.log('✅ Dragend - réinitialisation de la sélection');
                    
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
                        
                        console.log('🔄 Sélection text rétablie - espace fonctionne à nouveau');
                      }, 100);
                    }
                  });
                }
              }

              if (!globalDragHandle) return false;

              // Positionner le handle
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

                    globalDragHandle.style.left = `${rect.left - editorRect.left - 40}px`;
                    // Aligner en haut du bloc avec un petit offset
                    globalDragHandle.style.top = `${rect.top - editorRect.top + 2}px`;
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
                        editor: view.state as any,
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
