import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { Transaction, EditorState } from '@tiptap/pm/state';

export const TrailingNodeExtension = Extension.create({
  name: 'trailingNode',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('trailingNode'),
        appendTransaction: (transactions: Transaction[], oldState: EditorState, newState: EditorState) => {
          const { doc, tr } = newState;
          let shouldAppend = false;
          let pos = null;

          // Vérifier si on a besoin d'ajouter un paragraphe vide à la fin
          if (doc.content.size === 0) {
            shouldAppend = true;
            pos = 0;
          } else {
            const lastNode = doc.lastChild;
            if (lastNode && lastNode.type.name !== 'paragraph') {
              shouldAppend = true;
              pos = doc.content.size;
            }
          }

          if (shouldAppend && pos !== null) {
            return tr.insert(pos, this.editor.schema.nodes.paragraph.create());
          }

          return null;
        },
      }),
    ];
  },
});