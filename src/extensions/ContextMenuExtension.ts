import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';

/**
 * Extension pour gérer le menu contextuel Notion-like
 * Détecte les clics droits et gère les actions sur les blocs
 */
const ContextMenuExtension = Extension.create({
  name: 'contextMenu',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('contextMenu'),
        
        props: {
          handleDOMEvents: {
            contextmenu: (view, event) => {
              // Empêcher le menu contextuel par défaut
              event.preventDefault();
              
              // Obtenir la position du clic
              const coords = { x: event.clientX, y: event.clientY };
              
              // Obtenir le type de nœud à la position du clic
              const pos = view.posAtCoords({ left: event.clientX, top: event.clientY });
              if (!pos) return false;
              
              const { state } = view;
              const $pos = state.doc.resolve(pos.pos);
              const node = $pos.parent;
              const nodeType = node.type.name;
              
              // Vérifier s'il y a une sélection
              const hasSelection = !state.selection.empty;
              
              // Déclencher l'événement personnalisé pour ouvrir le menu contextuel
              const customEvent = new CustomEvent('tiptap-context-menu', {
                detail: {
                  coords,
                  nodeType,
                  hasSelection,
                  position: pos.pos
                }
              });
              
              document.dispatchEvent(customEvent);
              
              return true;
            }
          }
        }
      })
    ];
  }
});

export default ContextMenuExtension;
