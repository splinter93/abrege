import Heading from '@tiptap/extension-heading';
import { Plugin, PluginKey } from 'prosemirror-state';
import slugify from 'slugify';
import type { Node as ProseMirrorNode } from 'prosemirror-model';
import type { Transaction, EditorState } from 'prosemirror-state';

interface HeadingAttributes {
  level: number;
  id?: string;
}

const CustomHeading = Heading.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      id: {
        default: null,
        renderHTML: (attributes: HeadingAttributes) => {
          if (!attributes.id) {
            return {};
          }
          return {
            id: attributes.id,
          };
        },
        parseHTML: (element: HTMLElement) => element.getAttribute('id'),
      },
    };
  },
});

export const IdPlugin = new Plugin({
  key: new PluginKey('id-plugin'),
  appendTransaction: (transactions: readonly Transaction[], oldState: EditorState, newState: EditorState) => {
    if (!transactions.some(transaction => transaction.docChanged)) {
      return null;
    }

    const tr = newState.tr;
    let modified = false;

    newState.doc.descendants((node: ProseMirrorNode, pos: number) => {
      if (node.type.name === 'heading') {
        const attrs = node.attrs as HeadingAttributes;
        const generatedId = slugify(`${node.textContent}-${attrs.level}`, { lower: true, strict: true });
        if (attrs.id !== generatedId) {
          tr.setNodeMarkup(pos, undefined, { ...attrs, id: generatedId });
          modified = true;
        }
      }
    });

    return modified ? tr : null;
  }
});

export default CustomHeading;



