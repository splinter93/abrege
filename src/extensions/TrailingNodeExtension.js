import { Extension } from '@tiptap/core';
import { Plugin } from 'prosemirror-state';

const TrailingNodeExtension = Extension.create({
  name: 'trailingNode',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        appendTransaction: (transactions, oldState, newState) => {
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