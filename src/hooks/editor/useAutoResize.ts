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
  const visibilityCheckAttempts = useRef(0);
  const MAX_VISIBILITY_CHECKS = 5;

  // Fonction simple pour ajuster la hauteur
  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // 🔧 ROBUSTESSE: Vérifier que le textarea est visible et a une largeur
    // Évite les calculs incorrects si le textarea n'est pas encore rendu
    const rect = textarea.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      // Le textarea n'est pas encore visible, réessayer plus tard (avec limite)
      if (visibilityCheckAttempts.current < MAX_VISIBILITY_CHECKS) {
        visibilityCheckAttempts.current++;
        requestAnimationFrame(adjustHeight);
      } else {
        // Après plusieurs tentatives, forcer minHeight pour éviter l'attente infinie
        textarea.style.height = `${minHeight}px`;
        visibilityCheckAttempts.current = 0; // Reset pour les prochaines fois
      }
      return;
    }
    
    // Reset le compteur si le textarea est visible
    visibilityCheckAttempts.current = 0;

    // ✅ Ne pas modifier textarea.value si l'utilisateur est en train de taper
    // Le nettoyage des sauts de ligne se fait dans EditorTitle.onChange
    // Ici, on ajuste seulement la hauteur sans toucher à la valeur

    // Sauvegarder les styles actuels
    const currentPadding = textarea.style.padding || window.getComputedStyle(textarea).padding;
    const currentBoxSizing = textarea.style.boxSizing || window.getComputedStyle(textarea).boxSizing;
    
    // 🔧 ROBUSTESSE: S'assurer que box-sizing est border-box pour un calcul précis
    if (currentBoxSizing !== 'border-box') {
      textarea.style.boxSizing = 'border-box';
    }
    
    // Reset à auto pour calculer la hauteur naturelle (prend en compte le word-wrap)
    textarea.style.height = 'auto';
    textarea.style.padding = '0'; // Supprimer temporairement le padding
    
    // 🔧 ROBUSTESSE: Forcer un reflow pour s'assurer que scrollHeight est calculé correctement
    void textarea.offsetHeight;
    
    // Calculer la nouvelle hauteur basée sur scrollHeight (prend en compte le word-wrap automatique)
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
  }, [minHeight, maxHeight, value]);

  // Ajuster la hauteur quand la valeur change
  useEffect(() => {
    // 🔧 FIX FLICKER: Utiliser requestAnimationFrame pour s'assurer que le DOM est rendu
    requestAnimationFrame(() => {
      adjustHeight();
    });
  }, [value, adjustHeight]);

  // Ajuster la hauteur quand le mode wide change
  useEffect(() => {
    // Délai pour laisser le CSS s'appliquer
    const timer = setTimeout(() => {
      requestAnimationFrame(adjustHeight);
    }, 150);
    return () => clearTimeout(timer);
  }, [wideMode, adjustHeight]);

  // 🔧 FIX FLICKER: Ajuster la hauteur au montage avec un délai pour s'assurer que tout est rendu
  // Utilise plusieurs tentatives pour gérer les cas de chargement lent
  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 3;
    
    const tryAdjust = () => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      
      const rect = textarea.getBoundingClientRect();
      if (rect.width === 0 && attempts < maxAttempts) {
        // Le textarea n'est pas encore visible, réessayer
        attempts++;
        setTimeout(() => {
          requestAnimationFrame(tryAdjust);
        }, 100);
        return;
      }
      
      // Le textarea est visible, ajuster la hauteur
      adjustHeight();
    };
    
    const timer = setTimeout(() => {
      requestAnimationFrame(tryAdjust);
    }, 50); // Délai initial réduit, mais avec retry
    
    return () => clearTimeout(timer);
  }, [adjustHeight]);

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