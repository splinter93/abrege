/**
 * Hook global pour gérer le raccourci CMD+P (ou Ctrl+P) partout dans l'application
 * 
 * Fonctionnalités :
 * - Détecte CMD+P / Ctrl+P globalement
 * - Ouvre/ferme le menu de commande
 * - Guards pour éviter les conflits (input, textarea, contenteditable)
 * 
 * Conformité GUIDE-EXCELLENCE-CODE.md :
 * - Hook isolé et réutilisable
 * - Guards stricts pour éviter conflits
 * - Documentation claire
 */

import { useEffect, useState } from 'react';

interface UseGlobalCommandPaletteOptions {
  enabled?: boolean;
}

interface UseGlobalCommandPaletteReturn {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

/**
 * Hook pour gérer le raccourci global CMD+P
 */
export function useGlobalCommandPalette(
  options: UseGlobalCommandPaletteOptions = {}
): UseGlobalCommandPaletteReturn {
  const { enabled = true } = options;
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    // ✅ Écouter l'événement personnalisé déclenché par le script inline
    // Le script inline intercepte CMD+P très tôt et bloque l'impression du navigateur
    const handleCustomEvent = () => {
      setIsOpen((prev) => !prev);
    };

    // ✅ Fallback : Écouter aussi directement au cas où le script inline ne fonctionne pas
    const handleKeyDown = (e: KeyboardEvent) => {
      // CMD+P (Mac) ou Ctrl+P (Windows/Linux)
      const isPKey = (e.key === 'p' || e.key === 'P' || e.code === 'KeyP');
      const isCommandP = (e.metaKey || e.ctrlKey) && isPKey && !e.shiftKey && !e.altKey;

      if (!isCommandP) {
        return;
      }

      // Guards : Ne pas ouvrir le menu si dans un input/textarea avec du texte
      const activeElement = document.activeElement;
      const isInInput = activeElement?.tagName === 'INPUT';
      const isInTextarea = activeElement?.tagName === 'TEXTAREA';
      
      if (isInInput) {
        return;
      }
      
      if (isInTextarea) {
        const textarea = activeElement as HTMLTextAreaElement;
        if (textarea.value.trim().length > 0) {
          return;
        }
      }
      
      const isInEditable = activeElement?.getAttribute('contenteditable') === 'true' ||
                           activeElement?.closest('[contenteditable="true"]') !== null;
      
      if (isInEditable) {
        const editable = activeElement as HTMLElement;
        if (editable.textContent && editable.textContent.trim().length > 0) {
          return;
        }
      }

      // ✅ CRITIQUE : Appeler preventDefault pour bloquer l'impression du navigateur
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      // Ouvrir le menu de commande
      setIsOpen((prev) => !prev);
    };

    // Écouter l'événement personnalisé (prioritaire, déclenché par le script inline)
    window.addEventListener('command-palette:open', handleCustomEvent);
    
    // Fallback : Écouter aussi directement (au cas où)
    document.addEventListener('keydown', handleKeyDown, true);
    
    return () => {
      window.removeEventListener('command-palette:open', handleCustomEvent);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [enabled]);

  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);
  const toggle = () => setIsOpen((prev) => !prev);

  return {
    isOpen,
    open,
    close,
    toggle
  };
}

