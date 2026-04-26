import { Extension } from '@tiptap/core';
import { Fragment, type Node as ProseMirrorNode } from '@tiptap/pm/model';
import { Plugin, PluginKey, type Transaction } from '@tiptap/pm/state';

interface ParagraphSplit {
  pos: number;
  node: ProseMirrorNode;
}

const splitParagraphOnBlankVisualLines = (node: ProseMirrorNode): ProseMirrorNode[][] | null => {
  const chunks: ProseMirrorNode[][] = [];
  let currentChunk: ProseMirrorNode[] = [];
  let consecutiveHardBreaks = 0;
  let hasBlankVisualLine = false;

  node.forEach((child) => {
    if (child.type.name === 'hardBreak') {
      consecutiveHardBreaks += 1;
      if (consecutiveHardBreaks >= 2) {
        hasBlankVisualLine = true;
        chunks.push(currentChunk);
        currentChunk = [];
      } else {
        currentChunk.push(child);
      }
      return;
    }

    consecutiveHardBreaks = 0;
    currentChunk.push(child);
  });

  chunks.push(currentChunk);

  if (!hasBlankVisualLine) {
    return null;
  }

  const nonEmptyChunks = chunks.filter((chunk) => chunk.length > 0);
  return nonEmptyChunks.length > 1 ? nonEmptyChunks : null;
};

const ParagraphBreakNormalizer = Extension.create({
  name: 'paragraphBreakNormalizer',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('paragraphBreakNormalizer'),
        appendTransaction: (transactions: readonly Transaction[], _oldState, newState) => {
          if (!transactions.some((transaction) => transaction.docChanged)) {
            return null;
          }

          const paragraphsToSplit: ParagraphSplit[] = [];
          newState.doc.descendants((node, pos) => {
            if (node.type.name === 'paragraph' && splitParagraphOnBlankVisualLines(node)) {
              paragraphsToSplit.push({ pos, node });
            }
          });

          if (paragraphsToSplit.length === 0) {
            return null;
          }

          const tr = newState.tr;
          paragraphsToSplit.reverse().forEach(({ pos, node }) => {
            const chunks = splitParagraphOnBlankVisualLines(node);
            if (!chunks) return;

            const replacementNodes = chunks.map((chunk) =>
              node.type.create(node.attrs, Fragment.fromArray(chunk), node.marks)
            );
            tr.replaceWith(pos, pos + node.nodeSize, replacementNodes);
          });

          return tr.docChanged ? tr : null;
        },
      }),
    ];
  },
});

export default ParagraphBreakNormalizer;
