import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';

/**
 * Extension pour le drag and drop des blocs (code, mermaid, séparateurs, etc.)
 * Permet de sélectionner et déplacer des blocs entiers
 */
const BlockDragDropExtension = Extension.create({
  name: 'blockDragDrop',

  addProseMirrorPlugins() {
    let selectedBlock: number | null = null;
    let isDragging = false;
    let decorations = DecorationSet.empty;

    return [
      new Plugin({
        key: new PluginKey('blockDragDrop'),
        
        state: {
          init() {
            return {
              selectedBlock: null,
              isDragging: false,
              decorations: DecorationSet.empty
            };
          },
          
          apply(tr, state) {
            // Mettre à jour les positions si le document change
            if (tr.docChanged) {
              return {
                ...state,
                selectedBlock: state.selectedBlock ? tr.mapping.map(state.selectedBlock) : null,
                decorations: state.decorations.map(tr.mapping, tr.doc)
              };
            }
            return state;
          }
        },
        
        props: {
          handleDOMEvents: {
            mousedown: (view, event) => {
              const target = event.target as HTMLElement;
              if (!target) return false;
              
              // Vérifier si on clique sur un bloc draggable
              const blockElement = target.closest('[data-block-type]') || 
                                 target.closest('.mermaid-container') ||
                                 target.closest('.code-block') ||
                                 target.closest('.callout') ||
                                 target.closest('hr') ||
                                 target.closest('.ProseMirror > div');
              
              if (!blockElement) return false;
              
              // Trouver la position du bloc dans le document
              const pos = view.posAtDOM(blockElement, 0);
              if (pos === null) return false;
              
              const $pos = view.state.doc.resolve(pos);
              const node = $pos.parent;
              
              // Vérifier si c'est un bloc draggable
              const blockTypes = ['codeBlock', 'mermaid', 'callout', 'horizontalRule', 'paragraph', 'heading'];
              if (!blockTypes.includes(node.type.name)) return false;
              
              // Sélectionner le bloc entier
              const start = $pos.before();
              const end = $pos.after();
              
              const selection = view.state.selection.constructor.near(view.state.doc.resolve(start));
              const tr = view.state.tr.setSelection(selection);
              
              // Étendre la sélection pour couvrir tout le bloc
              const extendedSelection = view.state.selection.constructor.near(view.state.doc.resolve(end));
              const finalTr = tr.setSelection(extendedSelection);
              
              view.dispatch(finalTr);
              
              // Marquer comme sélectionné
              selectedBlock = start;
              decorations = DecorationSet.create(view.state.doc, [
                Decoration.node(start, end, {
                  class: 'block-selected'
                })
              ]);
              
              return true;
            },
            
            mousemove: (view, event) => {
              if (!selectedBlock) return false;
              
              // Ajouter un feedback visuel pendant le drag
              const target = event.target as HTMLElement;
              if (target && target.closest('.ProseMirror')) {
                target.classList.add('block-dragging');
              }
              
              return false;
            },
            
            mouseup: (view, event) => {
              if (!selectedBlock) return false;
              
              // Nettoyer le feedback visuel
              const target = event.target as HTMLElement;
              if (target) {
                target.classList.remove('block-dragging');
              }
              
              // Finaliser le drag
              selectedBlock = null;
              decorations = DecorationSet.empty;
              
              return true;
            },
            
            keydown: (view, event) => {
              // Supprimer le bloc sélectionné avec Delete ou Backspace
              if (event.key === 'Delete' || event.key === 'Backspace') {
                const { selection } = view.state;
                if (selection.empty) return false;
                
                // Vérifier si on a sélectionné un bloc entier
                const $from = selection.$from;
                const $to = selection.$to;
                
                if ($from.pos === $from.before() && $to.pos === $to.after()) {
                  // C'est un bloc entier, le supprimer
                  const tr = view.state.tr.deleteSelection();
                  view.dispatch(tr);
                  return true;
                }
              }
              
              return false;
            }
          },
          
          decorations: (state) => {
            return decorations;
          }
        }
      })
    ];
  }
});

export default BlockDragDropExtension;