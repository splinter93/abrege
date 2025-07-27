import { useMemo, useState, useEffect } from 'react';
import { createMarkdownIt } from '@/utils/markdownItConfig';

interface UseMarkdownRenderProps {
  content: string;
  debounceDelay?: number;
}

interface UseMarkdownRenderReturn {
  html: string;
  isRendering: boolean;
  md: unknown; // markdown-it instance
}

/**
 * Hook pour le rendu markdown avec debounce
 * Extrait la logique de rendu depuis Editor.tsx
 */
export const useMarkdownRender = ({
  content,
  debounceDelay = 300
}: UseMarkdownRenderProps): UseMarkdownRenderReturn => {
  const [debouncedContent, setDebouncedContent] = useState(content);
  const [isRendering, setIsRendering] = useState(false);

  // Memoize markdown-it instance
  const md = useMemo(() => createMarkdownIt(), []);

  // Debounce content changes
  useEffect(() => {
    setIsRendering(true);
    const timer = setTimeout(() => {
      setDebouncedContent(content);
      setIsRendering(false);
    }, debounceDelay);

    return () => clearTimeout(timer);
  }, [content, debounceDelay]);

  // Memoize HTML rendering
  const html = useMemo(() => {
    if (!debouncedContent) return '';
    return md.render(debouncedContent);
  }, [md, debouncedContent]);

  return {
    html,
    isRendering,
    md
  };
}; 