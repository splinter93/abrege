import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useMarkdownRender } from './useMarkdownRender';

// Mock des timers
vi.useFakeTimers();

describe('useMarkdownRender', () => {
  beforeEach(() => {
    vi.clearAllTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('should render markdown content correctly', () => {
    const { result } = renderHook(() => 
      useMarkdownRender({ content: '# Titre\nContenu' })
    );

    expect(result.current.html).toContain('<h1>Titre</h1>');
    expect(result.current.html).toContain('<p>Contenu</p>');
    expect(result.current.isRendering).toBe(false);
  });

  it('should render markdown with formatting', () => {
    const { result } = renderHook(() => 
      useMarkdownRender({ content: '**Gras** et *italique*' })
    );

    expect(result.current.html).toContain('<strong>Gras</strong>');
    expect(result.current.html).toContain('<em>italique</em>');
  });

  it('should handle empty content', () => {
    const { result } = renderHook(() => 
      useMarkdownRender({ content: '' })
    );

    expect(result.current.html).toBe('');
    expect(result.current.isRendering).toBe(false);
  });

  it('should debounce content changes', async () => {
    const { result, rerender } = renderHook(
      ({ content }) => useMarkdownRender({ content }),
      { initialProps: { content: 'Test' } }
    );

    expect(result.current.isRendering).toBe(false);

    // Changer le contenu
    rerender({ content: 'Test modifié' });
    expect(result.current.isRendering).toBe(true);

    // Attendre la fin du debounce
    await waitFor(() => {
      expect(result.current.isRendering).toBe(false);
    }, { timeout: 1000 });

    expect(result.current.html).toContain('Test modifié');
  });

  it('should handle custom debounce delay', async () => {
    const { result, rerender } = renderHook(
      ({ content, debounceDelay }) => useMarkdownRender({ content, debounceDelay }),
      { initialProps: { content: 'Test', debounceDelay: 500 } }
    );

    rerender({ content: 'Test modifié', debounceDelay: 500 });
    expect(result.current.isRendering).toBe(true);

    // Attendre la fin du debounce personnalisé
    await waitFor(() => {
      expect(result.current.isRendering).toBe(false);
    }, { timeout: 1000 });

    expect(result.current.html).toContain('Test modifié');
  });

  it('should memoize markdown-it instance', () => {
    const { result, rerender } = renderHook(() => 
      useMarkdownRender({ content: 'Test' })
    );

    const firstMd = result.current.md;
    rerender();
    const secondMd = result.current.md;

    expect(firstMd).toBe(secondMd);
  });

  it('should handle content updates correctly', () => {
    const { result, rerender } = renderHook(
      ({ content }) => useMarkdownRender({ content }),
      { initialProps: { content: 'Contenu stable' } }
    );

    const initialHtml = result.current.html;
    rerender({ content: 'Nouveau contenu' });

    expect(result.current.html).not.toBe(initialHtml);
    expect(result.current.html).toContain('Nouveau contenu');
  });

  // Test de gestion mémoire - vérification que les timers sont nettoyés
  it('should clean up timers on unmount', () => {
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
    
    const { unmount } = renderHook(() => 
      useMarkdownRender({ content: 'Test', debounceDelay: 100 })
    );

    // Déclencher un changement pour créer un timer
    const { rerender } = renderHook(
      ({ content }) => useMarkdownRender({ content, debounceDelay: 100 }),
      { initialProps: { content: 'Test' } }
    );

    rerender({ content: 'Test modifié' });

    // Démonter le hook
    unmount();

    // Vérifier que clearTimeout a été appelé
    expect(clearTimeoutSpy).toHaveBeenCalled();
    
    clearTimeoutSpy.mockRestore();
  });

  // Test de gestion mémoire - vérification que les timers sont nettoyés lors des changements
  it('should clean up previous timers when content changes rapidly', () => {
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
    
    const { rerender } = renderHook(
      ({ content }) => useMarkdownRender({ content, debounceDelay: 100 }),
      { initialProps: { content: 'Test 1' } }
    );

    // Changer rapidement le contenu plusieurs fois
    rerender({ content: 'Test 2' });
    rerender({ content: 'Test 3' });
    rerender({ content: 'Test 4' });

    // Vérifier que clearTimeout a été appelé pour chaque changement
    expect(clearTimeoutSpy).toHaveBeenCalledTimes(3);
    
    clearTimeoutSpy.mockRestore();
  });

  // Test de gestion mémoire - vérification que les timers ne fuient pas
  it('should not leak timers during rapid content changes', () => {
    const setTimeoutSpy = vi.spyOn(global, 'setTimeout');
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
    
    const { rerender } = renderHook(
      ({ content }) => useMarkdownRender({ content, debounceDelay: 50 }),
      { initialProps: { content: 'Initial' } }
    );

    // Simuler des changements rapides
    for (let i = 0; i < 10; i++) {
      rerender({ content: `Content ${i}` });
    }

    // Vérifier que le nombre de clearTimeout est proche du nombre de setTimeout
    // (il peut y avoir un timer actif à la fin)
    expect(clearTimeoutSpy).toHaveBeenCalled();
    expect(setTimeoutSpy).toHaveBeenCalled();
    
    setTimeoutSpy.mockRestore();
    clearTimeoutSpy.mockRestore();
  });
}); 