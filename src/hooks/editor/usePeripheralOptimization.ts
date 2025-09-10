import { useCallback, useEffect, useRef, useState } from 'react';
import { debounce } from 'lodash';

/**
 * Hook pour optimiser les performances des composants périphériques de l'éditeur
 * Gère le debouncing, la mémorisation et les mises à jour conditionnelles
 */
export function usePeripheralOptimization() {
  const [isEditorFocused, setIsEditorFocused] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(0);
  const updateCountRef = useRef(0);

  // Debounced update function
  const debouncedUpdate = useCallback(
    debounce((callback: () => void) => {
      callback();
      setLastUpdate(Date.now());
    }, 100),
    []
  );

  // Écouter les événements de l'éditeur
  useEffect(() => {
    const handleEditorFocus = () => setIsEditorFocused(true);
    const handleEditorBlur = () => setIsEditorFocused(false);
    const handleContentUpdate = () => {
      updateCountRef.current++;
      debouncedUpdate(() => {
        // Mise à jour des composants périphériques
      });
    };

    document.addEventListener('editor-focus-changed', handleEditorFocus);
    document.addEventListener('editor-blur-changed', handleEditorBlur);
    document.addEventListener('editor-content-updated', handleContentUpdate);

    return () => {
      document.removeEventListener('editor-focus-changed', handleEditorFocus);
      document.removeEventListener('editor-blur-changed', handleEditorBlur);
      document.removeEventListener('editor-content-updated', handleContentUpdate);
    };
  }, [debouncedUpdate]);

  // Fonction pour vérifier si une mise à jour est nécessaire
  const shouldUpdate = useCallback((lastKnownUpdate: number) => {
    return lastKnownUpdate < lastUpdate;
  }, [lastUpdate]);

  // Fonction pour obtenir les métriques de performance
  const getPerformanceMetrics = useCallback(() => {
    return {
      isEditorFocused,
      lastUpdate,
      updateCount: updateCountRef.current,
      isStale: lastUpdate < Date.now() - 5000 // 5 secondes
    };
  }, [isEditorFocused, lastUpdate]);

  return {
    isEditorFocused,
    shouldUpdate,
    getPerformanceMetrics,
    debouncedUpdate
  };
}
