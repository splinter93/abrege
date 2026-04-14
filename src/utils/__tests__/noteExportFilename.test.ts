import { describe, expect, it } from 'vitest';
import { noteExportFilename } from '../noteExportFilename';

describe('noteExportFilename', () => {
  it('slugifies title and strips leading dot from extension', () => {
    expect(noteExportFilename('Ma Note 2024', 'html')).toBe('ma_note_2024.html');
    expect(noteExportFilename('Test', '.pdf')).toBe('test.pdf');
  });

  it('uses "note" when title has no alphanumeric characters', () => {
    expect(noteExportFilename('@@@', 'txt')).toBe('note.txt');
    expect(noteExportFilename('   ', 'md')).toBe('note.md');
  });
});
