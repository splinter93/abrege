import type { Editor } from '@tiptap/react';

export interface InsertTableOptions {
  rows?: number;
  cols?: number;
  withHeaderRow?: boolean;
}

const DEFAULT_TABLE_OPTIONS: Required<InsertTableOptions> = {
  rows: 3,
  cols: 3,
  withHeaderRow: true,
};

export function insertDefaultTable(editor: Editor | null, options?: InsertTableOptions): boolean {
  if (!editor) {
    return false;
  }

  const config = {
    ...DEFAULT_TABLE_OPTIONS,
    ...options,
  };

  return editor.chain().focus().insertTable(config).run();
}

