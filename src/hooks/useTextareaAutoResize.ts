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
  maxHeight = 200 // ✅ AUGMENTÉ : 80px → 200px (réduit pour ne pas être coupé)
}: UseTextareaAutoResizeOptions) {
  
  useEffect(() => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      
      // ✅ FIX SACCADE : Calculer scrollHeight SANS rétracter
      // On met temporairement height à 'auto' pour mesurer le contenu réel
      const currentHeight = textarea.style.height;
      
      // Désactiver transition pour le calcul
      textarea.style.transition = 'none';
      textarea.style.height = 'auto';
      
      // Mesurer la hauteur nécessaire
      const scrollHeight = textarea.scrollHeight;
      const newHeight = Math.max(minHeight, Math.min(scrollHeight, maxHeight));
      
      // Remettre la hauteur actuelle (évite le flash)
      textarea.style.height = currentHeight;
      
      // Dans le prochain frame, appliquer la nouvelle hauteur avec transition
      requestAnimationFrame(() => {
        textarea.style.transition = 'height 0.3s cubic-bezier(0.22, 1, 0.36, 1)';
        textarea.style.height = `${newHeight}px`;
      });
    }
  }, [message, textareaRef, minHeight, maxHeight]);
}
