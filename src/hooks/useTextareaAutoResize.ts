/**
 * Hook pour gérer l'auto-resize du textarea
 * Ajuste automatiquement la hauteur selon le contenu
 * @module hooks/useTextareaAutoResize
 */

import { useEffect } from 'react';

interface UseTextareaAutoResizeOptions {
  message: string;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  minHeight?: number;
  maxHeight?: number;
}

/**
 * Hook pour auto-resize du textarea
 */
export function useTextareaAutoResize({
  message,
  textareaRef,
  minHeight = 18,
  maxHeight = 80
}: UseTextareaAutoResizeOptions) {
  
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      const newHeight = Math.max(minHeight, Math.min(scrollHeight, maxHeight));
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [message, textareaRef, minHeight, maxHeight]);
}
