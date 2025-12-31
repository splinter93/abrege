/**
 * Hook de gestion des thèmes du chat
 * Gère le switch entre dark, light et glass mode
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { logger, LogCategory } from '@/utils/logger';

/**
 * Thèmes disponibles pour le chat
 */
export type ChatTheme = 'dark' | 'light' | 'grey' | 'anthracite' | 'glass';

/**
 * Configuration des thèmes avec labels et classes CSS
 */
export const CHAT_THEMES = {
  dark: {
    value: 'dark' as const,
    label: 'Mode sombre',
    icon: '🌙',
    className: null, // Pas de classe = défaut
  },
  light: {
    value: 'light' as const,
    label: 'Mode clair',
    icon: '☀️',
    className: 'chat-theme-light',
  },
  grey: {
    value: 'grey' as const,
    label: 'Mode gris',
    icon: '⚪',
    className: 'chat-theme-grey',
  },
  anthracite: {
    value: 'anthracite' as const,
    label: 'Mode anthracite',
    icon: '⚫',
    className: 'chat-theme-anthracite',
  },
  glass: {
    value: 'glass' as const,
    label: 'Mode glass',
    icon: '✨',
    className: 'chat-theme-glass',
  },
} as const;

const STORAGE_KEY = 'scrivia-chat-theme';

/**
 * Hook pour gérer le thème du chat
 * @returns { theme, setTheme, availableThemes }
 */
export function useTheme() {
  const [theme, setThemeState] = useState<ChatTheme>('dark');
  const [mounted, setMounted] = useState(false);

  /**
   * Appliquer le thème au DOM
   */
  const applyTheme = useCallback((newTheme: ChatTheme) => {
    if (typeof window === 'undefined') return;

    // Retirer toutes les classes de thème
    document.body.classList.remove('chat-theme-light', 'chat-theme-grey', 'chat-theme-anthracite', 'chat-theme-glass');

    // Appliquer la nouvelle classe si nécessaire
    const themeConfig = CHAT_THEMES[newTheme];
    if (themeConfig.className) {
      document.body.classList.add(themeConfig.className);
    }

    logger.debug(LogCategory.EDITOR, `🎨 Thème appliqué: ${newTheme}`, {
      className: themeConfig.className || 'default',
      label: themeConfig.label,
    });
  }, []);

  /**
   * Changer le thème
   */
  const setTheme = useCallback((newTheme: ChatTheme) => {
    setThemeState(newTheme);
    applyTheme(newTheme);
    
    // Persister dans localStorage
    try {
      localStorage.setItem(STORAGE_KEY, newTheme);
      logger.info(LogCategory.EDITOR, `💾 Thème sauvegardé: ${newTheme}`);
    } catch (error) {
      logger.warn(LogCategory.EDITOR, '⚠️ Impossible de sauvegarder le thème', error);
    }
  }, [applyTheme]);

  /**
   * Détecter le thème préféré du système
   */
  const getSystemTheme = useCallback((): ChatTheme => {
    if (typeof window === 'undefined') return 'dark';
    
    const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return isDarkMode ? 'dark' : 'light';
  }, []);

  /**
   * Initialiser le thème au montage
   */
  useEffect(() => {
    setMounted(true);

    // 1. Essayer de récupérer depuis localStorage
    try {
      const savedTheme = localStorage.getItem(STORAGE_KEY) as ChatTheme | null;
      
      if (savedTheme && (savedTheme === 'dark' || savedTheme === 'light' || savedTheme === 'grey' || savedTheme === 'anthracite' || savedTheme === 'glass')) {
        logger.debug(LogCategory.EDITOR, `📂 Thème restauré: ${savedTheme}`);
        setThemeState(savedTheme);
        applyTheme(savedTheme);
        return;
      }
    } catch (error) {
      logger.warn(LogCategory.EDITOR, '⚠️ Impossible de lire le thème sauvegardé', error);
    }

    // 2. Sinon, utiliser la préférence système
    const systemTheme = getSystemTheme();
    logger.debug(LogCategory.EDITOR, `🖥️ Thème système: ${systemTheme}`);
    setThemeState(systemTheme);
    applyTheme(systemTheme);
  }, [applyTheme, getSystemTheme]);

  /**
   * Écouter les changements de préférence système
   */
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      // Ne changer que si l'utilisateur n'a pas de préférence sauvegardée
      const hasSavedPreference = localStorage.getItem(STORAGE_KEY);
      if (!hasSavedPreference) {
        const newTheme = e.matches ? 'dark' : 'light';
        logger.debug(LogCategory.EDITOR, `🔄 Préférence système changée: ${newTheme}`);
        setThemeState(newTheme);
        applyTheme(newTheme);
      }
    };

    // Compatibilité navigateurs
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      // Fallback pour anciens navigateurs
      mediaQuery.addListener(handleChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, [applyTheme]);

  return {
    /**
     * Thème actuellement actif
     */
    theme,
    
    /**
     * Fonction pour changer le thème
     */
    setTheme,
    
    /**
     * Liste des thèmes disponibles
     */
    availableThemes: Object.values(CHAT_THEMES),
    
    /**
     * Indique si le hook est monté (pour éviter hydration mismatch)
     */
    mounted,
  };
}


