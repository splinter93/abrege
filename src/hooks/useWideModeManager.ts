import { useCallback, useEffect } from 'react';

/**
 * Hook pour gérer le changement de wide_mode dans l'éditeur
 * Change dynamiquement la variable CSS --editor-content-width
 */
export const useWideModeManager = (isWideMode: boolean | null | undefined) => {
  
  // Fonction pour changer le mode large
  const changeWideMode = useCallback((wideMode: boolean) => {
    try {
      // Changer la variable CSS --editor-content-width
      const newWidth = wideMode ? 'var(--editor-content-width-wide)' : 'var(--editor-content-width-normal)';
      document.documentElement.style.setProperty('--editor-content-width', newWidth);
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`[WideModeManager] 📏 Mode large changé: ${wideMode ? 'ON' : 'OFF'} → ${newWidth}`);
      }
      
    } catch (error) {
      console.error('[WideModeManager] ❌ Erreur lors du changement de mode large:', error);
    }
  }, []);

  // Appliquer le mode actuel au chargement et quand il change
  useEffect(() => {
    if (typeof isWideMode === 'boolean') {
      changeWideMode(isWideMode);
    }
  }, [isWideMode, changeWideMode]);

  return { changeWideMode };
}; 