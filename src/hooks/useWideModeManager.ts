import { useCallback, useEffect, useRef } from 'react';
import { simpleLogger } from '@/utils/logger';

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
        simpleLogger.dev(`[WideModeManager] 📏 Mode large changé: ${wideMode ? 'ON' : 'OFF'} → ${newWidth}`);
      }
      
    } catch (error) {
      simpleLogger.error('[WideModeManager] ❌ Erreur lors du changement de mode large', error);
    }
  }, []);

  // Ref pour éviter re-renders inutiles
  const prevWideModeRef = useRef<boolean | null>(null);

  // Appliquer le mode actuel au chargement et quand il change
  useEffect(() => {
    // ✅ Skip si même valeur (évite logs répétés)
    if (typeof isWideMode === 'boolean' && isWideMode !== prevWideModeRef.current) {
      changeWideMode(isWideMode);
      prevWideModeRef.current = isWideMode;
    }
  }, [isWideMode, changeWideMode]);

  return { changeWideMode };
}; 