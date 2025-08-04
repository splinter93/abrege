import { useMemo, useRef, useState, useEffect } from 'react';
import { createMarkdownIt } from '@/utils/markdownItConfig';

interface UseMarkdownRenderProps {
  content: string;
}

interface UseMarkdownRenderReturn {
  html: string;
  isRendering: boolean;
  md: unknown;
}

/**
 * Hook de rendu Markdown, fiabilisé pour le streaming.
 * La clé est de ne jamais planter sur du markdown partiel et de forcer
 * le rendu à chaque changement de contenu.
 */
export const useMarkdownRender = ({
  content,
}: UseMarkdownRenderProps): UseMarkdownRenderReturn => {
  const mdRef = useRef<ReturnType<typeof createMarkdownIt> | null>(null);

  // Initialisation paresseuse et unique de markdown-it
  if (!mdRef.current) {
    mdRef.current = createMarkdownIt();
  }

  // Utiliser useMemo pour éviter les re-renders inutiles
  const { html, isRendering } = useMemo(() => {
    try {
      const rendered = mdRef.current!.render(content);
      return {
        html: rendered,
        isRendering: false
      };
    } catch (error) {
      console.error('Erreur de rendu Markdown (partiel, attendu):', error);
      // En cas d'erreur (ex: markdown partiel), on affiche le contenu brut
      // La prochaine mise à jour corrigera probablement le rendu.
      return {
        html: content,
        isRendering: false
      };
    }
  }, [content]);

  return {
    html,
    isRendering,
    md: mdRef.current
  };
}; 