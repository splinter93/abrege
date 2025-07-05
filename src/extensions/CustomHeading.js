import Heading from '@tiptap/extension-heading';
import { Plugin, PluginKey } from 'prosemirror-state';
import slugify from 'slugify';

const CustomHeading = Heading.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      id: {
        default: null,
        renderHTML: attributes => {
          if (!attributes.id) {
            return {};
          }
          return {
            id: attributes.id,
          };
        },
        parseHTML: element => element.getAttribute('id'),
      },
    };
  },
});

export const IdPlugin = new Plugin({
  key: new PluginKey('id-plugin'),
  appendTransaction: (transactions, oldState, newState) => {
    if (!transactions.some(transaction => transaction.docChanged)) {
      return null;
    }

    const tr = newState.tr;
    let modified = false;

    newState.doc.descendants((node, pos) => {
      if (node.type.name === 'heading') {
        const generatedId = slugify(`${node.textContent}-${node.attrs.level}`, { lower: true, strict: true });
        if (node.attrs.id !== generatedId) {
          tr.setNodeMarkup(pos, undefined, { ...node.attrs, id: generatedId });
          modified = true;
        }
      }
    });

    return modified ? tr : null;
  }
});

export default CustomHeading; 