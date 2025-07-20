import { renderHook, act, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { useFolderManagerState } from './useFolderManagerState';
import * as supabase from '../services/supabase';

// Mock Supabase client complet
vi.mock('../supabaseClient', () => ({
  supabase: {
    channel: vi.fn(() => ({
      on: vi.fn(() => ({
        subscribe: vi.fn()
      }))
    })),
    removeChannel: vi.fn(),
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: [] }))
        }))
      }))
    }))
  }
}));

const initialFolders = [
  { id: 'f1', name: 'Dossier 1', classeur_id: 'c1', type: 'folder', position: 0 },
  { id: 'f2', name: 'Dossier 2', classeur_id: 'c1', type: 'folder', position: 1 },
];
const initialFiles = [
  { id: 'a1', source_title: 'Note 1', source_type: 'markdown', classeur_id: 'c1', type: 'file', position: 0 },
  { id: 'a2', source_title: 'Note 2', source_type: 'markdown', classeur_id: 'c1', type: 'file', position: 1 },
];

describe('useFolderManagerState', () => {
  beforeEach(() => {
    vi.spyOn(supabase, 'getFolders').mockImplementation(async () => [...initialFolders]);
    vi.spyOn(supabase, 'getArticles').mockImplementation(async () => [...initialFiles]);
    vi.spyOn(supabase, 'createFolder').mockImplementation(async (data) => ({ ...data, id: 'f3', type: 'folder', position: 2 }));
    vi.spyOn(supabase, 'createArticle').mockImplementation(async (data) => ({ ...data, id: 'a3', type: 'file', position: 2 }));
    vi.spyOn(supabase, 'renameItem').mockResolvedValue(undefined);
    vi.spyOn(supabase, 'updateItemPositions').mockResolvedValue(undefined);
    vi.spyOn(supabase, 'deleteFolder').mockResolvedValue(undefined);
    vi.spyOn(supabase, 'deleteArticle').mockResolvedValue(undefined);
  });

  it('charge les dossiers et fichiers initiaux', async () => {
    const { result } = renderHook(() => useFolderManagerState('c1'));
    await waitFor(() => {
      expect(result.current.folders).toHaveLength(2);
      expect(result.current.files).toHaveLength(2);
    });
  });

  it('crée un dossier', async () => {
    const { result } = renderHook(() => useFolderManagerState('c1'));
    await waitFor(() => result.current.folders.length === 2);
    await act(async () => {
      await result.current.createFolder('Nouveau dossier');
    });
    await waitFor(() => {
      expect(result.current.folders.some(f => f.name === 'Nouveau dossier')).toBe(true);
    });
  });

  it('crée un fichier', async () => {
    const { result } = renderHook(() => useFolderManagerState('c1'));
    await waitFor(() => result.current.files.length === 2);
    await act(async () => {
      await result.current.createFile('Nouvelle note');
    });
    await waitFor(() => {
      expect(result.current.files.some(f => f.source_title === 'Nouvelle note')).toBe(true);
    });
  });

  it('renomme un dossier', async () => {
    const { result } = renderHook(() => useFolderManagerState('c1'));
    await waitFor(() => result.current.folders.length === 2);
    await act(async () => {
      await result.current.startRename('f1', 'folder');
      await result.current.submitRename('f1', 'Renommé', 'folder');
    });
    await waitFor(() => {
      const folder = result.current.folders.find(f => f.id === 'f1');
      expect(folder?.name).toBe('Renommé');
    });
  });

  it('ne renomme rien si id inexistant', async () => {
    const { result } = renderHook(() => useFolderManagerState('c1'));
    await waitFor(() => result.current.folders.length === 2);
    await act(async () => {
      await result.current.startRename('notfound', 'folder');
      await result.current.submitRename('notfound', 'Test', 'folder');
    });
    await waitFor(() => {
      expect(result.current.folders.find(f => f.id === 'notfound')).toBeUndefined();
    });
  });

  it('réordonne les dossiers', async () => {
    const { result } = renderHook(() => useFolderManagerState('c1'));
    await waitFor(() => result.current.folders.length === 2);
    const reversed = [...result.current.folders].reverse();
    await act(async () => {
      await result.current.reorderFolders(reversed);
    });
    await waitFor(() => {
      expect(result.current.folders[0]?.id).toBe('f2');
      expect(result.current.folders[1]?.id).toBe('f1');
    });
  });

  it('réordonne les fichiers', async () => {
    const { result } = renderHook(() => useFolderManagerState('c1'));
    await waitFor(() => result.current.files.length === 2);
    const reversed = [...result.current.files].reverse();
    await act(async () => {
      await result.current.reorderFiles(reversed);
    });
    await waitFor(() => {
      expect(result.current.files[0]?.id).toBe('a2');
      expect(result.current.files[1]?.id).toBe('a1');
    });
  });

  it('navigue dans les dossiers', async () => {
    const { result } = renderHook(() => useFolderManagerState('c1'));
    await waitFor(() => result.current.folders.length === 2);
    act(() => {
      result.current.goToFolder('f1');
    });
    expect(result.current.currentFolderId).toBe('f1');
    act(() => {
      result.current.goBack();
    });
    expect(result.current.currentFolderId).toBeNull();
  });

  it('supprime un dossier', async () => {
    const { result } = renderHook(() => useFolderManagerState('c1'));
    await waitFor(() => result.current.folders.length === 2);
    await act(async () => {
      await result.current.deleteFolder('f1');
    });
    await waitFor(() => {
      expect(result.current.folders.find(f => f.id === 'f1')).toBeUndefined();
    });
  });

  it('supprime un fichier', async () => {
    const { result } = renderHook(() => useFolderManagerState('c1'));
    await waitFor(() => result.current.files.length === 2);
    await act(async () => {
      await result.current.deleteFile('a1');
    });
    await waitFor(() => {
      expect(result.current.files.find(f => f.id === 'a1')).toBeUndefined();
    });
  });

  it('gère le reorder sur tableau vide', async () => {
    const { result } = renderHook(() => useFolderManagerState('c1'));
    await waitFor(() => result.current.folders.length === 2 && result.current.files.length === 2);
    await act(async () => {
      await result.current.reorderFolders([]);
      await result.current.reorderFiles([]);
    });
    await waitFor(() => {
      expect(result.current.folders).toEqual([]);
      expect(result.current.files).toEqual([]);
    });
  });
}); 