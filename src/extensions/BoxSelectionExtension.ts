import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';

/**
 * Extension pour la sélection rectangulaire (box selection)
 * Permet de sélectionner du texte en créant un rectangle avec la souris
 */
const BoxSelectionExtension = Extension.create({
  name: 'boxSelection',

  addProseMirrorPlugins() {
    let isSelecting = false;
    let startPos: number | null = null;
    let endPos: number | null = null;
    let decorations = DecorationSet.empty;

    return [
      new Plugin({
        key: new PluginKey('boxSelection'),
        
        state: {
          init() {
            return {
              isSelecting: false,
              startPos: null,
              endPos: null,
              decorations: DecorationSet.empty
            };
          },
          
          apply(tr, state) {
            // Mettre à jour les positions si le document change
            if (tr.docChanged) {
              return {
                ...state,
                startPos: state.startPos ? tr.mapping.map(state.startPos) : null,
                endPos: state.endPos ? tr.mapping.map(state.endPos) : null
              };
            }
            return state;
          }
        },
        
        props: {
          handleDOMEvents: {
            mousedown: (view, event) => {
              // Vérifier si c'est un clic avec Alt (ou Cmd sur Mac)
              if (!event.altKey && !(event.metaKey && navigator.platform.includes('Mac'))) {
                return false;
              }
              
              event.preventDefault();
              
              const pos = view.posAtCoords({ left: event.clientX, top: event.clientY });
              if (!pos) return false;
              
              // Marquer le début de la sélection rectangulaire
              isSelecting = true;
              startPos = pos.pos;
              endPos = pos.pos;
              
              // Créer les décorations
              decorations = DecorationSet.create(view.state.doc, [
                Decoration.inline(pos.pos, pos.pos, {
                  class: 'box-selection-area'
                })
              ]);
              
              return true;
            },
            
            mousemove: (view, event) => {
              if (!isSelecting || !startPos) return false;
              
              const pos = view.posAtCoords({ left: event.clientX, top: event.clientY });
              if (!pos) return false;
              
              // Mettre à jour la position de fin
              endPos = pos.pos;
              
              // Mettre à jour les décorations
              const from = Math.min(startPos, endPos);
              const to = Math.max(startPos, endPos);
              
              decorations = DecorationSet.create(view.state.doc, [
                Decoration.inline(from, to, {
                  class: 'box-selection-area'
                })
              ]);
              
              return true;
            },
            
            mouseup: (view, event) => {
              if (!isSelecting) return false;
              
              // Finaliser la sélection rectangulaire
              if (startPos !== null && endPos !== null) {
                const from = Math.min(startPos, endPos);
                const to = Math.max(startPos, endPos);
                
                // Créer une sélection normale
                const selection = view.state.selection.constructor.near(view.state.doc.resolve(from));
                const tr = view.state.tr.setSelection(selection);
                
                // Étendre la sélection jusqu'à la position de fin
                const extendedSelection = view.state.selection.constructor.near(view.state.doc.resolve(to));
                const finalTr = tr.setSelection(extendedSelection);
                
                view.dispatch(finalTr);
              }
              
              // Nettoyer l'état
              isSelecting = false;
              startPos = null;
              endPos = null;
              decorations = DecorationSet.empty;
              
              return true;
            },
            
            mouseleave: (view, event) => {
              if (isSelecting) {
                // Annuler la sélection si on sort de l'éditeur
                isSelecting = false;
                startPos = null;
                endPos = null;
                decorations = DecorationSet.empty;
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

export default BoxSelectionExtension;