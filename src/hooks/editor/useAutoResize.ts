import { useRef, useEffect, useCallback } from 'react';

interface UseAutoResizeProps {
  value: string;
  minHeight?: number;
  maxHeight?: number;
  wideMode?: boolean;
}

interface UseAutoResizeReturn {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}

/**
 * Hook simple et fiable pour l'auto-ajustement de hauteur des textarea
 * Version complètement refaite - plus simple et plus robuste
 */
export const useAutoResize = ({
  value,
  minHeight = 45,
  maxHeight = 200,
  wideMode
}: UseAutoResizeProps): UseAutoResizeReturn => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fonction simple pour ajuster la hauteur
  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Sauvegarder le padding actuel
    const currentPadding = textarea.style.padding;
    
    // Reset à auto pour calculer la hauteur naturelle
    textarea.style.height = 'auto';
    textarea.style.padding = '0'; // Supprimer temporairement le padding
    
    // Calculer la nouvelle hauteur
    const scrollHeight = textarea.scrollHeight;
    const newHeight = Math.max(minHeight, Math.min(scrollHeight, maxHeight));
    
    // Restaurer le padding et appliquer la nouvelle hauteur
    textarea.style.padding = currentPadding;
    textarea.style.height = `${newHeight}px`;
    
    // Laisser le container s'adapter automatiquement
    const container = textarea.closest('.editor-title-wrapper') as HTMLElement;
    if (container) {
      // Supprimer la hauteur forcée pour laisser le container s'adapter
      container.style.height = 'auto';
    }
  }, [minHeight, maxHeight]);

  // Ajuster la hauteur quand la valeur change
  useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  // Ajuster la hauteur quand le mode wide change
  useEffect(() => {
    // Délai pour laisser le CSS s'appliquer
    const timer = setTimeout(adjustHeight, 150);
    return () => clearTimeout(timer);
  }, [wideMode, adjustHeight]);

  // Ajuster la hauteur sur les événements du textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const handleResize = () => {
      requestAnimationFrame(adjustHeight);
    };

    // Écouter tous les événements qui peuvent changer la hauteur
    textarea.addEventListener('input', handleResize);
    textarea.addEventListener('paste', handleResize);
    textarea.addEventListener('cut', handleResize);
    textarea.addEventListener('keyup', handleResize);

    return () => {
      textarea.removeEventListener('input', handleResize);
      textarea.removeEventListener('paste', handleResize);
      textarea.removeEventListener('cut', handleResize);
      textarea.removeEventListener('keyup', handleResize);
    };
  }, [adjustHeight]);

  return {
    textareaRef
  };
}; 