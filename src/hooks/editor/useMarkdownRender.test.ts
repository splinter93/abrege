import { renderHook, act } from '@testing-library/react';
import { vi } from 'vitest';
import { useMarkdownRender } from '@/hooks/editor/useMarkdownRender';

// Mock markdown-it
vi.mock('@/utils/markdownItConfig', () => ({
  createMarkdownIt: vi.fn(() => ({
    render: vi.fn((content: string) => `<p>${content}</p>`)
  }))
}));

describe('useMarkdownRender', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initialise avec le contenu fourni', () => {
    const { result } = renderHook(() => 
      useMarkdownRender({ content: '# Titre\nContenu' })
    );

    expect(result.current.html).toBe('<p># Titre\nContenu</p>');
    expect(result.current.isRendering).toBe(false);
  });

  it('rend le markdown en HTML', () => {
    const { result } = renderHook(() => 
      useMarkdownRender({ content: '**Gras** et *italique*' })
    );

    expect(result.current.html).toBe('<p>**Gras** et *italique*</p>');
  });

  it('gère le contenu vide', () => {
    const { result } = renderHook(() => 
      useMarkdownRender({ content: '' })
    );

    expect(result.current.html).toBe('');
  });

  it('débounce les changements de contenu', async () => {
    const { result, rerender } = renderHook(
      ({ content }) => useMarkdownRender({ content }),
      { initialProps: { content: 'Contenu initial' } }
    );

    // Changement immédiat
    rerender({ content: 'Nouveau contenu' });
    
    // Le contenu HTML ne change pas immédiatement
    expect(result.current.html).toBe('<p>Contenu initial</p>');
    expect(result.current.isRendering).toBe(true);

    // Attendre le debounce
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 350));
    });

    expect(result.current.html).toBe('<p>Nouveau contenu</p>');
    expect(result.current.isRendering).toBe(false);
  });

  it('permet de configurer le délai de debounce', async () => {
    const { result, rerender } = renderHook(
      ({ content, debounceDelay }) => useMarkdownRender({ content, debounceDelay }),
      { initialProps: { content: 'Contenu initial', debounceDelay: 100 } }
    );

    rerender({ content: 'Nouveau contenu', debounceDelay: 100 });
    
    // Attendre le debounce personnalisé
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 150));
    });

    expect(result.current.html).toBe('<p>Nouveau contenu</p>');
  });

  it('nettoie le timer lors du démontage', () => {
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
    
    const { unmount } = renderHook(() => 
      useMarkdownRender({ content: 'Test' })
    );

    unmount();
    
    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  it('mémorise l\'instance markdown-it', () => {
    const { result, rerender } = renderHook(() => 
      useMarkdownRender({ content: 'Test' })
    );

    const firstMd = result.current.md;
    
    rerender();
    
    expect(result.current.md).toBe(firstMd);
  });

  it('mémorise le rendu HTML pour le même contenu', () => {
    const { result, rerender } = renderHook(() => 
      useMarkdownRender({ content: 'Contenu stable' })
    );

    const firstHtml = result.current.html;
    
    rerender();
    
    expect(result.current.html).toBe(firstHtml);
  });
}); 