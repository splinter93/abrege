import { TableKit } from '@tiptap/extension-table';
import { TableCell as BaseTableCell } from '@tiptap/extension-table-cell';
import { TableHeader as BaseTableHeader } from '@tiptap/extension-table-header';
import type { AnyExtension } from '@tiptap/core';

export const ScriviaTableKit = TableKit.extend({
  addExtensions() {
    const parentExtensions = (this.parent?.() as AnyExtension[]) ?? [];

    const filtered = parentExtensions.filter((extension) => {
      const name = (extension as { name?: string }).name;
      return name !== 'tableCell' && name !== 'tableHeader';
    });

    return [
      ...filtered,
      BaseTableCell.extend({
        content: 'paragraph block*',
      }),
      BaseTableHeader.extend({
        content: 'paragraph block*',
      }),
    ];
  },
});

export default ScriviaTableKit;

