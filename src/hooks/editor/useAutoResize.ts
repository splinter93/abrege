import { useRef, useEffect } from 'react';

interface UseAutoResizeProps {
  value: string;
  minHeight?: number;
  maxHeight?: number;
}

interface UseAutoResizeReturn {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}

/**
 * Hook pour l'auto-ajustement de hauteur des textarea
 * Extrait la logique d'auto-resize depuis EditorTitle.tsx
 */
export const useAutoResize = ({
  value,
  minHeight = 45,
  maxHeight = 200
}: UseAutoResizeProps): UseAutoResizeReturn => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Reset height to minimum
      textarea.style.height = `${minHeight}px`;
      
      // Calculate new height based on content
      const scrollHeight = textarea.scrollHeight;
      const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
      
      textarea.style.height = `${newHeight}px`;
    }
  }, [value, minHeight, maxHeight]);

  return {
    textareaRef
  };
}; 