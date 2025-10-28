/**
 * Tests unitaires pour useNotesLoader
 * Focus: timeout 5s, retry, déduplication
 * @module hooks/__tests__/useNotesLoader
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useNotesLoader, type SelectedNote } from '../useNotesLoader';

describe('useNotesLoader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  describe('Timeout 5s', () => {
    it('should timeout and return partial results', async () => {
      const { result } = renderHook(() => useNotesLoader());

      const notes: SelectedNote[] = [
        { id: 'note-1', slug: 'note-1', title: 'Note 1' },
        { id: 'note-2', slug: 'note-2', title: 'Note 2' }
      ];

      // Mock: 1 note rapide, 1 note lente (2s)
      (global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('note-1')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              note: { id: 'note-1', slug: 'note-1', title: 'Note 1', markdown_content: 'Content 1' }
            })
          });
        }
        // note-2 prend 2s (plus que le timeout de 500ms)
        return new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            json: () => Promise.resolve({
              note: { id: 'note-2', slug: 'note-2', title: 'Note 2', markdown_content: 'Content 2' }
            })
          }), 2000)
        );
      });

      const loadResult = await result.current.loadNotes(notes, { 
        token: 'test-token', 
        timeoutMs: 500  // Timeout 500ms
      });

      // Vérifier: timeout atteint, au moins 1 note chargée
      expect(loadResult.stats.requested).toBe(2);
      expect(loadResult.stats.loaded).toBeGreaterThanOrEqual(1);
      expect(loadResult.stats.timedOut).toBe(true);
    }, 4000); // Test timeout 4s (500ms timeout + 2s promesses + cleanup)

    it('should load all notes successfully before timeout', async () => {
      const { result } = renderHook(() => useNotesLoader());

      const notes: SelectedNote[] = [
        { id: 'note-1', slug: 'note-1', title: 'Note 1' }
      ];

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          note: { id: 'note-1', slug: 'note-1', title: 'Note 1', markdown_content: 'Content 1' }
        })
      });

      const loadResult = await result.current.loadNotes(notes, { 
        token: 'test-token', 
        timeoutMs: 5000 
      });

      expect(loadResult.stats.requested).toBe(1);
      expect(loadResult.stats.loaded).toBe(1);
      expect(loadResult.stats.failed).toBe(0);
      expect(loadResult.stats.timedOut).toBe(false);
    });

    it('should allow custom timeout', async () => {
      const { result } = renderHook(() => useNotesLoader());

      const notes: SelectedNote[] = [
        { id: 'note-1', slug: 'note-1', title: 'Note 1' }
      ];

      // Mock réponse lente (200ms)
      (global.fetch as any).mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            json: () => Promise.resolve({
              note: { id: 'note-1', slug: 'note-1', title: 'Note 1', markdown_content: 'Content 1' }
            })
          }), 200)
        )
      );

      // Timeout très court (100ms) → devrait timeout
      const loadResult = await result.current.loadNotes(notes, { 
        token: 'test-token', 
        timeoutMs: 100 
      });

      expect(loadResult.stats.timedOut).toBe(true);
    }, 5000);
  });

  describe('Déduplication', () => {
    it('should deduplicate simultaneous loads of same notes', async () => {
      const { result } = renderHook(() => useNotesLoader());

      const notes: SelectedNote[] = [
        { id: 'note-1', slug: 'note-1', title: 'Note 1' }
      ];

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          note: { id: 'note-1', slug: 'note-1', title: 'Note 1', markdown_content: 'Content 1' }
        })
      });

      // Lancer 3 chargements simultanés des mêmes notes
      const promise1 = result.current.loadNotes(notes, { token: 'test-token' });
      const promise2 = result.current.loadNotes(notes, { token: 'test-token' });
      const promise3 = result.current.loadNotes(notes, { token: 'test-token' });

      await Promise.all([promise1, promise2, promise3]);

      // Vérifier qu'un seul fetch a été fait
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should NOT deduplicate different notes', async () => {
      const { result } = renderHook(() => useNotesLoader());

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          note: { markdown_content: 'Content' }
        })
      });

      const notes1: SelectedNote[] = [{ id: 'note-1', slug: 'note-1', title: 'Note 1' }];
      const notes2: SelectedNote[] = [{ id: 'note-2', slug: 'note-2', title: 'Note 2' }];

      await result.current.loadNotes(notes1, { token: 'test-token' });
      await result.current.loadNotes(notes2, { token: 'test-token' });

      // 2 notes différentes = 2 fetches
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Gestion erreurs', () => {
    it('should handle HTTP errors gracefully', async () => {
      const { result } = renderHook(() => useNotesLoader());

      const notes: SelectedNote[] = [
        { id: 'note-1', slug: 'note-1', title: 'Note 1' },
        { id: 'note-2', slug: 'note-2', title: 'Note 2' }
      ];

      // note-1 OK, note-2 error
      (global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('note-1')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              note: { id: 'note-1', slug: 'note-1', title: 'Note 1', markdown_content: 'Content 1' }
            })
          });
        }
        return Promise.resolve({
          ok: false,
          status: 404
        });
      });

      const loadResult = await result.current.loadNotes(notes, { token: 'test-token' });

      // 1 loaded, 1 failed
      expect(loadResult.stats.loaded).toBe(1);
      expect(loadResult.stats.failed).toBe(1);
      expect(loadResult.notes.length).toBe(1);
    });

    it('should handle missing markdown_content', async () => {
      const { result } = renderHook(() => useNotesLoader());

      const notes: SelectedNote[] = [
        { id: 'note-1', slug: 'note-1', title: 'Note 1' }
      ];

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          note: { id: 'note-1', slug: 'note-1', title: 'Note 1' } // Pas de markdown_content
        })
      });

      const loadResult = await result.current.loadNotes(notes, { token: 'test-token' });

      expect(loadResult.stats.loaded).toBe(0);
      expect(loadResult.stats.failed).toBe(1);
    });

    it('should handle network errors', async () => {
      const { result } = renderHook(() => useNotesLoader());

      const notes: SelectedNote[] = [
        { id: 'note-1', slug: 'note-1', title: 'Note 1' }
      ];

      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      const loadResult = await result.current.loadNotes(notes, { token: 'test-token' });

      expect(loadResult.stats.loaded).toBe(0);
      expect(loadResult.stats.failed).toBe(1);
    });
  });

  describe('Empty input', () => {
    it('should return empty result for empty notes array', async () => {
      const { result } = renderHook(() => useNotesLoader());

      const loadResult = await result.current.loadNotes([], { token: 'test-token' });

      expect(loadResult.notes).toEqual([]);
      expect(loadResult.stats).toEqual({
        requested: 0,
        loaded: 0,
        failed: 0,
        timedOut: false
      });
    });
  });

  describe('État isLoading', () => {
    it('should set isLoading during load', async () => {
      const { result } = renderHook(() => useNotesLoader());

      const notes: SelectedNote[] = [
        { id: 'note-1', slug: 'note-1', title: 'Note 1' }
      ];

      (global.fetch as any).mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            json: () => Promise.resolve({
              note: { id: 'note-1', slug: 'note-1', title: 'Note 1', markdown_content: 'Content 1' }
            })
          }), 100)
        )
      );

      // État initial
      expect(result.current.isLoading).toBe(false);

      // Lancer le chargement
      const loadPromise = result.current.loadNotes(notes, { token: 'test-token' });

      // Attendre que isLoading passe à true
      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      // Attendre la fin
      await loadPromise;

      // Attendre que isLoading repasse à false
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });
});

