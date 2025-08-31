import { Extension } from '@tiptap/core';
import { Plugin } from 'prosemirror-state';
import type { Transaction, EditorState } from 'prosemirror-state';
import type { Node as ProseMirrorNode } from 'prosemirror-model';

const TrailingNodeExtension = Extension.create({
  name: 'trailingNode',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        appendTransaction: (transactions: readonly Transaction[], oldState: EditorState, newState: EditorState) => {
          if (!transactions.some(transaction => transaction.docChanged)) {
            return null;
          }

          const { doc, tr, schema } = newState;
          const lastNode = doc.lastChild;
          
          if (lastNode && lastNode.type.name === 'codeBlock') {
            return tr.insert(doc.content.size, schema.nodes.paragraph.create());
          }
          
          return null;
        },
      }),
    ];
  },
});

export default TrailingNodeExtension;





