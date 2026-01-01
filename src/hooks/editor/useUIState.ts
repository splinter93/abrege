/**
 * useUIState - Hook pour l'état de l'interface utilisateur
 * 
 * Responsabilités:
 * - Mode preview
 * - Mode A4
 * - Mode full width
 * - Langue slash commands
 * - Visibilité toolbar
 */

import { useState, useCallback, useLayoutEffect, useMemo } from 'react';
import { logger, LogCategory } from '@/utils/logger';

export interface UIState {
  previewMode: boolean;
  a4Mode: boolean;
  fullWidth: boolean;
  slashLang: 'fr' | 'en';
  showToolbar: boolean; // Toggle toolbar (future user preference)
}

export interface UseUIStateOptions {
  initialA4Mode?: boolean;
  initialFullWidth?: boolean;
  initialSlashLang?: 'fr' | 'en';
  toolbarContext?: 'editor' | 'canvas'; // Contexte pour séparer localStorage
  forceShowToolbar?: boolean; // Force la toolbar visible (ignore localStorage)
}

export interface UseUIStateReturn {
  ui: UIState;
  setPreviewMode: (preview: boolean) => void;
  togglePreviewMode: () => void;
  setA4Mode: (a4: boolean) => void;
  setFullWidth: (fullWidth: boolean) => void;
  setSlashLang: (lang: 'fr' | 'en') => void;
  setShowToolbar: (show: boolean) => void;
  toggleToolbar: () => void;
}

/**
 * Hook pour gérer l'état de l'interface utilisateur
 */
export function useUIState(options: UseUIStateOptions = {}): UseUIStateReturn {
  // État UI
  const [previewMode, setPreviewMode] = useState(false);
  const [a4Mode, setA4Mode] = useState(options.initialA4Mode || false);
  const [fullWidth, setFullWidth] = useState(options.initialFullWidth || false);
  const [slashLang, setSlashLang] = useState<'fr' | 'en'>(options.initialSlashLang || 'en');
  
  // FIX: Séparer localStorage par contexte (editor vs canvas)
  const toolbarContext = options.toolbarContext || 'editor';
  
  // FIX: Toujours prioriser forceShowToolbar, même si localStorage dit autre chose
  const [showToolbar, setShowToolbar] = useState(() => {
    // Si forceShowToolbar est défini, l'utiliser directement (priorité absolue)
    if (options.forceShowToolbar !== undefined) {
      logger.debug(LogCategory.EDITOR, '[useUIState] Initial showToolbar depuis forceShowToolbar', {
        forceShowToolbar: options.forceShowToolbar,
        toolbarContext
      });
      return options.forceShowToolbar;
    }
    // LocalStorage temporaire - sera remplacé par user_preferences
    // Clé différente selon le contexte pour éviter les conflits
    if (typeof window !== 'undefined') {
      const storageKey = `editor-show-toolbar-${toolbarContext}`;
      const stored = localStorage.getItem(storageKey);
      const value = stored !== null ? stored === 'true' : true; // true par défaut
      logger.debug(LogCategory.EDITOR, '[useUIState] Initial showToolbar depuis localStorage', {
        storageKey,
        stored,
        value,
        toolbarContext
      });
      return value;
    }
    logger.debug(LogCategory.EDITOR, '[useUIState] Initial showToolbar par défaut (SSR)', {
      toolbarContext
    });
    return true;
  });
  
  // FIX: Synchroniser showToolbar si forceShowToolbar change (avec priorité absolue)
  // IMPORTANT: Utiliser useLayoutEffect pour garantir la synchronisation AVANT le render
  // Cela évite le flash de toolbar manquante lors du refresh
  useLayoutEffect(() => {
    // Si forceShowToolbar est défini, il a toujours la priorité absolue
    if (options.forceShowToolbar !== undefined) {
      // FIX: TOUJOURS forcer la valeur, même si identique
      // Cela garantit la cohérence et évite les problèmes de timing
      const targetValue = options.forceShowToolbar;
      setShowToolbar(prev => {
        if (prev !== targetValue) {
          logger.info(LogCategory.EDITOR, '[useUIState] 🔧 Force showToolbar update (useLayoutEffect)', {
            prev,
            targetValue,
            toolbarContext,
            timestamp: Date.now()
          });
        } else {
          // Même si identique, on force quand même pour garantir la cohérence
          logger.debug(LogCategory.EDITOR, '[useUIState] Force showToolbar (identique mais forcé)', {
            prev,
            targetValue,
            toolbarContext,
            timestamp: Date.now()
          });
        }
        // TOUJOURS retourner targetValue, même si identique
        return targetValue;
      });
    } else {
      logger.debug(LogCategory.EDITOR, '[useUIState] forceShowToolbar undefined, pas de synchronisation', {
        toolbarContext
      });
    }
  }, [options.forceShowToolbar, toolbarContext]);
  
  // FIX: Utiliser useMemo pour garantir que showToolbar est toujours true si forceShowToolbar === true
  // Cela évite les problèmes de timing où useLayoutEffect ne se déclenche pas assez tôt
  const finalShowToolbar = useMemo(() => {
    if (options.forceShowToolbar !== undefined) {
      logger.debug(LogCategory.EDITOR, '[useUIState] finalShowToolbar depuis forceShowToolbar', {
        forceShowToolbar: options.forceShowToolbar,
        toolbarContext,
        timestamp: Date.now()
      });
      return options.forceShowToolbar;
    }
    logger.debug(LogCategory.EDITOR, '[useUIState] finalShowToolbar depuis showToolbar state', {
      showToolbar,
      toolbarContext
    });
    return showToolbar;
  }, [options.forceShowToolbar, showToolbar, toolbarContext]);
  
  // Actions - UI
  const togglePreviewMode = useCallback(() => {
    setPreviewMode(prev => !prev);
  }, []);

  const toggleToolbar = useCallback(() => {
    // Si forceShowToolbar est défini, ne pas permettre le toggle
    if (options.forceShowToolbar !== undefined) {
      return; // Toolbar forcée, pas de toggle possible
    }
    setShowToolbar(prev => {
      const newValue = !prev;
      // Persister dans localStorage avec clé contextuelle
      if (typeof window !== 'undefined') {
        const storageKey = `editor-show-toolbar-${toolbarContext}`;
        localStorage.setItem(storageKey, String(newValue));
      }
      return newValue;
    });
  }, [toolbarContext, options.forceShowToolbar]);

  return {
    ui: {
      previewMode,
      a4Mode,
      fullWidth,
      slashLang,
      showToolbar: finalShowToolbar, // Utiliser finalShowToolbar qui priorise forceShowToolbar
    },
    setPreviewMode,
    togglePreviewMode,
    setA4Mode,
    setFullWidth,
    setSlashLang,
    setShowToolbar,
    toggleToolbar,
  };
}

