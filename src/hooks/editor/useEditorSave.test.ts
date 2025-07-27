import { renderHook, act } from '@testing-library/react';
import { vi } from 'vitest';
import { useEditorSave } from './useEditorSave';
import { useFileSystemStore } from '@/store/useFileSystemStore';

// Mock Zustand store
vi.mock('@/store/useFileSystemStore', () => ({
  useFileSystemStore: vi.fn()
}));

describe('useEditorSave', () => {
  const mockUpdateNote = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    (useFileSystemStore as any).mockImplementation((selector: any) => {
      if (typeof selector === 'function') {
        return selector({
          updateNote: mockUpdateNote
        });
      }
      return mockUpdateNote;
    });
  });

  it('initialise avec les valeurs par défaut', () => {
    const { result } = renderHook(() => 
      useEditorSave({
        noteId: 'test-note',
        initialTitle: 'Titre initial',
        initialContent: 'Contenu initial'
      })
    );

    expect(result.current.title).toBe('Titre initial');
    expect(result.current.content).toBe('Contenu initial');
    expect(result.current.lastSaved).toBeNull();
    expect(result.current.isSaving).toBe(false);
    expect(result.current.hasUnsavedChanges).toBe(false);
  });

  it('met à jour le titre', () => {
    const { result } = renderHook(() => 
      useEditorSave({
        noteId: 'test-note',
        initialTitle: 'Titre initial',
        initialContent: 'Contenu initial'
      })
    );

    act(() => {
      result.current.setTitle('Nouveau titre');
    });

    expect(result.current.title).toBe('Nouveau titre');
    expect(result.current.hasUnsavedChanges).toBe(true);
  });

  it('met à jour le contenu', () => {
    const { result } = renderHook(() => 
      useEditorSave({
        noteId: 'test-note',
        initialTitle: 'Titre initial',
        initialContent: 'Contenu initial'
      })
    );

    act(() => {
      result.current.setContent('Nouveau contenu');
    });

    expect(result.current.content).toBe('Nouveau contenu');
    expect(result.current.hasUnsavedChanges).toBe(true);
  });

  it('détecte les changements non sauvegardés', () => {
    const { result } = renderHook(() => 
      useEditorSave({
        noteId: 'test-note',
        initialTitle: 'Titre initial',
        initialContent: 'Contenu initial'
      })
    );

    // Pas de changements initialement
    expect(result.current.hasUnsavedChanges).toBe(false);

    // Changement de titre
    act(() => {
      result.current.setTitle('Nouveau titre');
    });
    expect(result.current.hasUnsavedChanges).toBe(true);

    // Retour à la valeur initiale
    act(() => {
      result.current.setTitle('Titre initial');
    });
    expect(result.current.hasUnsavedChanges).toBe(false);
  });

  it('appelle la fonction de sauvegarde personnalisée', async () => {
    const mockOnSave = vi.fn();
    
    const { result } = renderHook(() => 
      useEditorSave({
        noteId: 'test-note',
        initialTitle: 'Titre initial',
        initialContent: 'Contenu initial',
        onSave: mockOnSave
      })
    );

    act(() => {
      result.current.setTitle('Nouveau titre');
    });

    await act(async () => {
      await result.current.save();
    });

    expect(mockOnSave).toHaveBeenCalledWith({
      title: 'Nouveau titre',
      content: 'Contenu initial'
    });
  });

  it('met à jour le store Zustand lors de la sauvegarde', async () => {
    const { result } = renderHook(() => 
      useEditorSave({
        noteId: 'test-note',
        initialTitle: 'Titre initial',
        initialContent: 'Contenu initial'
      })
    );

    act(() => {
      result.current.setTitle('Nouveau titre');
      result.current.setContent('Nouveau contenu');
    });

    await act(async () => {
      await result.current.save();
    });

    expect(mockUpdateNote).toHaveBeenCalledWith('test-note', {
      title: 'Nouveau titre',
      content: 'Nouveau contenu'
    });
  });

  it('met à jour lastSaved après sauvegarde', async () => {
    const { result } = renderHook(() => 
      useEditorSave({
        noteId: 'test-note',
        initialTitle: 'Titre initial',
        initialContent: 'Contenu initial'
      })
    );

    const beforeSave = result.current.lastSaved;

    act(() => {
      result.current.setTitle('Nouveau titre');
    });

    await act(async () => {
      await result.current.save();
    });

    expect(result.current.lastSaved).not.toBe(beforeSave);
    expect(result.current.lastSaved).toBeInstanceOf(Date);
  });

  it('ne sauvegarde pas s\'il n\'y a pas de changements', async () => {
    const mockOnSave = vi.fn();
    
    const { result } = renderHook(() => 
      useEditorSave({
        noteId: 'test-note',
        initialTitle: 'Titre initial',
        initialContent: 'Contenu initial',
        onSave: mockOnSave
      })
    );

    await act(async () => {
      await result.current.save();
    });

    expect(mockOnSave).not.toHaveBeenCalled();
    expect(mockUpdateNote).not.toHaveBeenCalled();
  });
}); 