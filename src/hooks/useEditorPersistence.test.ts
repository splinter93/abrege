import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEditorPersistence } from './useEditorPersistence';
import { useFileSystemStore } from '../store/useFileSystemStore';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('useEditorPersistence', () => {
  beforeEach(() => {
    // Reset le store avant chaque test
    useFileSystemStore.setState({
      currentNote: null,
      hasUnsavedChanges: false,
    });
    
    // Reset les mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Nettoyer localStorage après chaque test
    localStorageMock.clear();
  });

  describe('saveNoteLocally', () => {
    it('devrait sauvegarder une note localement', () => {
      const { result } = renderHook(() => useEditorPersistence());

      act(() => {
        result.current.saveNoteLocally('test-id', 'Test Title', 'Test Content');
      });

      const state = useFileSystemStore.getState();
      expect(state.currentNote).toEqual({
        id: 'test-id',
        title: 'Test Title',
        content: 'Test Content',
        lastModified: expect.any(Number),
      });
      expect(state.hasUnsavedChanges).toBe(true);
    });
  });

  describe('restorePersistedNote', () => {
    it('devrait restaurer une note persistée', () => {
      // Sauvegarder d'abord une note
      useFileSystemStore.setState({
        currentNote: {
          id: 'test-id',
          title: 'Test Title',
          content: 'Test Content',
          lastModified: Date.now(),
        },
        hasUnsavedChanges: true,
      });

      const { result } = renderHook(() => useEditorPersistence());

      const restoredNote = result.current.restorePersistedNote('test-id');
      
      expect(restoredNote).toEqual({
        id: 'test-id',
        title: 'Test Title',
        content: 'Test Content',
        lastModified: expect.any(Number),
      });
    });

    it('devrait retourner null si aucune note persistée', () => {
      const { result } = renderHook(() => useEditorPersistence());

      const restoredNote = result.current.restorePersistedNote('test-id');
      
      expect(restoredNote).toBeNull();
    });
  });

  describe('hasUnsavedChangesForNote', () => {
    it('devrait retourner true si des changements non sauvegardés existent pour la note', () => {
      useFileSystemStore.setState({
        currentNote: {
          id: 'test-id',
          title: 'Test Title',
          content: 'Test Content',
          lastModified: Date.now(),
        },
        hasUnsavedChanges: true,
      });

      const { result } = renderHook(() => useEditorPersistence());

      expect(result.current.hasUnsavedChangesForNote('test-id')).toBe(true);
    });

    it('devrait retourner false si aucun changement non sauvegardé', () => {
      useFileSystemStore.setState({
        currentNote: null,
        hasUnsavedChanges: false,
      });

      const { result } = renderHook(() => useEditorPersistence());

      expect(result.current.hasUnsavedChangesForNote('test-id')).toBe(false);
    });
  });

  describe('clearAfterSave', () => {
    it('devrait nettoyer l\'état persisté après sauvegarde', () => {
      // Sauvegarder d'abord une note
      useFileSystemStore.setState({
        currentNote: {
          id: 'test-id',
          title: 'Test Title',
          content: 'Test Content',
          lastModified: Date.now(),
        },
        hasUnsavedChanges: true,
      });

      const { result } = renderHook(() => useEditorPersistence());

      act(() => {
        result.current.clearAfterSave();
      });

      const state = useFileSystemStore.getState();
      expect(state.currentNote).toBeNull();
      expect(state.hasUnsavedChanges).toBe(false);
    });
  });

  describe('updateNoteContent', () => {
    it('devrait mettre à jour le contenu de la note persistée', () => {
      useFileSystemStore.setState({
        currentNote: {
          id: 'test-id',
          title: 'Test Title',
          content: 'Old Content',
          lastModified: Date.now(),
        },
        hasUnsavedChanges: false,
      });

      const { result } = renderHook(() => useEditorPersistence());

      act(() => {
        result.current.updateNoteContent('New Content');
      });

      const state = useFileSystemStore.getState();
      expect(state.currentNote?.content).toBe('New Content');
      expect(state.hasUnsavedChanges).toBe(true);
    });
  });

  describe('updateNoteTitle', () => {
    it('devrait mettre à jour le titre de la note persistée', () => {
      useFileSystemStore.setState({
        currentNote: {
          id: 'test-id',
          title: 'Old Title',
          content: 'Test Content',
          lastModified: Date.now(),
        },
        hasUnsavedChanges: false,
      });

      const { result } = renderHook(() => useEditorPersistence());

      act(() => {
        result.current.updateNoteTitle('New Title');
      });

      const state = useFileSystemStore.getState();
      expect(state.currentNote?.title).toBe('New Title');
      expect(state.hasUnsavedChanges).toBe(true);
    });
  });
}); 