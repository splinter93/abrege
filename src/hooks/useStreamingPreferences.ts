'use client';

import { useState, useEffect, useCallback } from 'react';

interface StreamingPreferences {
  enabled: boolean;
  lineDelay: number; // Délai entre chaque ligne en millisecondes
  autoAdjust: boolean; // Ajustement automatique selon la longueur du message
}

const DEFAULT_PREFERENCES: StreamingPreferences = {
  enabled: true,
  lineDelay: 600, // 600ms par défaut
  autoAdjust: true
};

const STORAGE_KEY = 'chat-streaming-preferences';

export const useStreamingPreferences = () => {
  const [preferences, setPreferences] = useState<StreamingPreferences>(DEFAULT_PREFERENCES);
  const [isLoaded, setIsLoaded] = useState(false);

  // Charger les préférences depuis le localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setPreferences({ ...DEFAULT_PREFERENCES, ...parsed });
      }
    } catch (error) {
      console.warn('Failed to load streaming preferences:', error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Sauvegarder les préférences dans le localStorage
  const savePreferences = useCallback((newPreferences: Partial<StreamingPreferences>) => {
    const updated = { ...preferences, ...newPreferences };
    setPreferences(updated);
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.warn('Failed to save streaming preferences:', error);
    }
  }, [preferences]);

  // Activer/désactiver le streaming
  const toggleStreaming = useCallback(() => {
    savePreferences({ enabled: !preferences.enabled });
  }, [preferences.enabled, savePreferences]);

  // Modifier le délai entre les lignes
  const setLineDelay = useCallback((delay: number) => {
    savePreferences({ lineDelay: delay });
  }, [savePreferences]);

  // Activer/désactiver l'ajustement automatique
  const toggleAutoAdjust = useCallback(() => {
    savePreferences({ autoAdjust: !preferences.autoAdjust });
  }, [preferences.autoAdjust, savePreferences]);

  // Obtenir le délai ajusté selon la longueur du contenu
  const getAdjustedDelay = useCallback((content: string): number => {
    if (!preferences.autoAdjust) {
      return preferences.lineDelay;
    }

    const charCount = content.length;
    const lineCount = content.split('\n').filter(l => l.trim()).length;

    // Ajustement basé sur la longueur et le nombre de lignes
    if (charCount < 200 && lineCount < 5) {
      return Math.max(300, preferences.lineDelay * 0.7); // Plus rapide pour les messages courts
    } else if (charCount > 1000 || lineCount > 15) {
      return Math.min(1200, preferences.lineDelay * 1.3); // Plus lent pour les messages longs
    }

    return preferences.lineDelay;
  }, [preferences.lineDelay, preferences.autoAdjust]);

  // Réinitialiser aux valeurs par défaut
  const resetToDefaults = useCallback(() => {
    setPreferences(DEFAULT_PREFERENCES);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to reset streaming preferences:', error);
    }
  }, []);

  return {
    preferences,
    isLoaded,
    toggleStreaming,
    setLineDelay,
    toggleAutoAdjust,
    getAdjustedDelay,
    resetToDefaults,
    savePreferences
  };
}; 