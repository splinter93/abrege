'use client';

import { useState, useEffect, useCallback } from 'react';

interface StreamingPreferences {
  enabled: boolean;
  wordDelay: number; // Délai entre chaque mot en millisecondes
  autoAdjust: boolean; // Ajustement automatique selon la longueur du message
}

const DEFAULT_PREFERENCES: StreamingPreferences = {
  enabled: true,
  wordDelay: 20, // 20ms par défaut (plus fluide)
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

  // Modifier le délai entre les mots
  const setWordDelay = useCallback((delay: number) => {
    savePreferences({ wordDelay: delay });
  }, [savePreferences]);

  // Activer/désactiver l'ajustement automatique
  const toggleAutoAdjust = useCallback(() => {
    savePreferences({ autoAdjust: !preferences.autoAdjust });
  }, [preferences.autoAdjust, savePreferences]);

  // Obtenir le délai ajusté selon la longueur du contenu
  const getAdjustedDelay = useCallback((content: string): number => {
    if (!preferences.autoAdjust) {
      return preferences.wordDelay;
    }

    const charCount = content.length;
    const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;

    // Ajustement basé sur la longueur et le nombre de mots
    if (charCount < 200 && wordCount < 20) {
      return Math.max(10, preferences.wordDelay * 0.7); // Plus rapide pour les messages courts
    } else if (charCount > 1000 || wordCount > 100) {
      return Math.min(50, preferences.wordDelay * 1.3); // Plus lent pour les messages longs
    }

    return preferences.wordDelay;
  }, [preferences.wordDelay, preferences.autoAdjust]);

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
    setWordDelay,
    toggleAutoAdjust,
    getAdjustedDelay,
    resetToDefaults,
    savePreferences
  };
}; 