import type { Editor } from '@tiptap/react';
import { Fragment, type Node as ProseMirrorNode } from '@tiptap/pm/model';
import { TextSelection } from '@tiptap/pm/state';

type HeadingLevel = 1 | 2 | 3;
type BlockFormat = { type: 'paragraph' } | { type: 'heading'; level: HeadingLevel };

interface VisualLineChunk {
  fromOffset: number;
  toOffset: number;
  nodes: ProseMirrorNode[];
}

const collapseSelectionToActiveTextBlock = (editor: Editor) => {
  return editor.chain().focus().command(({ state, tr }) => {
    if (state.selection.empty) {
      return true;
    }

    const position = Math.max(1, Math.min(state.selection.$head.pos, tr.doc.content.size));
    tr.setSelection(TextSelection.near(tr.doc.resolve(position)));
    return true;
  });
};

const splitCurrentParagraphVisualLine = (editor: Editor, format: BlockFormat): boolean => {
  return editor.chain().focus().command(({ state, tr }) => {
    const { schema } = state;
    const $head = state.selection.$head;
    let depth = $head.depth;

    while (depth > 0 && !$head.node(depth).isTextblock) {
      depth -= 1;
    }

    if (depth === 0) {
      return false;
    }

    const parent = $head.node(depth);
    if (parent.type.name !== 'paragraph') {
      return false;
    }

    const hasHardBreak = parent.content.content.some((child) => child.type.name === 'hardBreak');
    if (!hasHardBreak) {
      return false;
    }

    const chunks: VisualLineChunk[] = [];
    let currentStart = 0;
    let currentNodes: ProseMirrorNode[] = [];

    parent.forEach((child, offset) => {
      if (child.type.name === 'hardBreak') {
        chunks.push({ fromOffset: currentStart, toOffset: offset, nodes: currentNodes });
        currentStart = offset + child.nodeSize;
        currentNodes = [];
        return;
      }

      currentNodes.push(child);
    });
    chunks.push({ fromOffset: currentStart, toOffset: parent.content.size, nodes: currentNodes });

    const nonEmptyChunks = chunks.filter((chunk) => chunk.nodes.length > 0);
    if (nonEmptyChunks.length <= 1) {
      return false;
    }

    const parentOffset = $head.parentOffset;
    const targetChunk =
      nonEmptyChunks.find((chunk) => parentOffset >= chunk.fromOffset && parentOffset <= chunk.toOffset) ??
      nonEmptyChunks.find((chunk) => parentOffset < chunk.fromOffset) ??
      nonEmptyChunks[nonEmptyChunks.length - 1];

    const replacementNodes = nonEmptyChunks.map((chunk) => {
      const content = Fragment.fromArray(chunk.nodes);
      if (chunk === targetChunk && format.type === 'heading') {
        return schema.nodes.heading.create({ level: format.level }, content);
      }

      return schema.nodes.paragraph.create(null, content);
    });

    const blockStart = $head.before(depth);
    const blockEnd = $head.after(depth);
    tr.replaceWith(blockStart, blockEnd, replacementNodes);

    const targetIndex = nonEmptyChunks.indexOf(targetChunk);
    const targetStart = replacementNodes
      .slice(0, targetIndex)
      .reduce((position, node) => position + node.nodeSize, blockStart);
    const targetNode = replacementNodes[targetIndex];
    const selectionPosition = Math.min(targetStart + targetNode.nodeSize - 1, targetStart + 1);
    tr.setSelection(TextSelection.near(tr.doc.resolve(selectionPosition)));
    return true;
  }).run();
};

export const toggleCurrentBlockHeading = (editor: Editor | null | undefined, level: HeadingLevel) => {
  if (!editor) return;
  if (splitCurrentParagraphVisualLine(editor, { type: 'heading', level })) return;
  collapseSelectionToActiveTextBlock(editor).toggleHeading({ level }).run();
};

export const setCurrentBlockParagraph = (editor: Editor | null | undefined) => {
  if (!editor) return;
  if (splitCurrentParagraphVisualLine(editor, { type: 'paragraph' })) return;
  collapseSelectionToActiveTextBlock(editor).setParagraph().run();
};
