import { useMemo, useRef } from 'react';
import { createMarkdownIt } from '@/utils/markdownItConfig';

interface UseMarkdownRenderProps {
  content: string;
  debounceDelay?: number;
  disableDebounce?: boolean;
}

interface UseMarkdownRenderReturn {
  html: string;
  isRendering: boolean;
  md: unknown;
}

/**
 * Hook optimisé pour le rendu markdown en streaming
 * Suppression du debounce pour un rendu instantané
 * Optimisation des performances pour éviter les saccades
 */
export const useMarkdownRender = ({
  content,
  debounceDelay = 0,
  disableDebounce = true // Désactivé par défaut pour le streaming
}: UseMarkdownRenderProps): UseMarkdownRenderReturn => {
  // Memoize markdown-it instance une seule fois
  const mdRef = useRef<ReturnType<typeof createMarkdownIt> | null>(null);
  if (!mdRef.current) {
    mdRef.current = createMarkdownIt();
  }

  // Rendu direct sans debounce pour le streaming
  const html = useMemo(() => {
    if (!content) return '';
    return mdRef.current!.render(content);
  }, [content]);

  return {
    html,
    isRendering: false, // Pas de state de rendu pour éviter les re-renders
    md: mdRef.current
  };
}; 