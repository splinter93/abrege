/* eslint-env vitest */
import { renderHook, act } from '@testing-library/react';
import useEditorSave, { UseEditorSaveOptions } from './useEditorSave';
import { vi } from 'vitest';

describe('useEditorSave', () => {
  it('doit appeler onSave et gérer isSaving et lastSaved', async () => {
    const onSave = vi.fn();
    const editor = {
      getHTML: () => '<p>Contenu</p>',
      storage: { markdown: { getMarkdown: () => 'Contenu' } },
    };
    const headerImage = 'img.png';
    const titleAlign = 'left';
    const { result } = renderHook(() => useEditorSave({ onSave, editor, headerImage, titleAlign }));
    const before = result.current.lastSaved;

    act(() => {
      result.current.handleSave('Titre', 'Contenu', 'left');
    });

    expect(onSave).toHaveBeenCalledWith({
      title: 'Titre',
      markdown_content: 'Contenu',
      html_content: '<p>Contenu</p>',
      headerImage,
      titleAlign: 'left',
    });
    expect(result.current.isSaving).toBe(false);
    expect(result.current.lastSaved.getTime()).toBeGreaterThanOrEqual(before.getTime());
  });

  it('ne fait rien si onSave ou editor sont absents', () => {
    const { result } = renderHook(() => useEditorSave({} as UseEditorSaveOptions));
    act(() => {
      result.current.handleSave('Titre', 'Contenu', 'left');
    });
    // Pas d'erreur, pas de crash
    expect(result.current.isSaving).toBe(false);
  });
});