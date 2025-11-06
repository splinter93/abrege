/**
 * Context pour tracker la profondeur des note embeds
 * Prévention récursion infinie (Note A → B → C → stop)
 * 
 * Usage:
 * - Wrapper Editor avec <EmbedDepthProvider>
 * - Chaque NoteEmbedView incrémente la profondeur
 * - Si depth >= MAX_EMBED_DEPTH, afficher link au lieu d'embed
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import { MAX_EMBED_DEPTH } from '@/types/noteEmbed';

/**
 * Valeur du context
 */
interface EmbedDepthContextValue {
  /** Profondeur actuelle (0 = racine) */
  depth: number;
  /** Incrémenter la profondeur (retourne nouvelle profondeur) */
  incrementDepth: () => number;
  /** Décrémenter la profondeur */
  decrementDepth: () => void;
  /** Vérifier si profondeur max atteinte */
  isMaxDepthReached: () => boolean;
}

/**
 * Context React pour la profondeur des embeds
 */
const EmbedDepthContext = createContext<EmbedDepthContextValue | null>(null);

/**
 * Provider du context de profondeur
 */
export function EmbedDepthProvider({ children }: { children: React.ReactNode }) {
  const [depth, setDepth] = useState(0);

  const incrementDepth = useCallback(() => {
    const newDepth = depth + 1;
    setDepth(newDepth);
    return newDepth;
  }, [depth]);

  const decrementDepth = useCallback(() => {
    setDepth(prev => Math.max(0, prev - 1));
  }, []);

  const isMaxDepthReached = useCallback(() => {
    return depth >= MAX_EMBED_DEPTH;
  }, [depth]);

  const value: EmbedDepthContextValue = {
    depth,
    incrementDepth,
    decrementDepth,
    isMaxDepthReached
  };

  return (
    <EmbedDepthContext.Provider value={value}>
      {children}
    </EmbedDepthContext.Provider>
  );
}

/**
 * Hook pour accéder à la profondeur actuelle
 * @returns Profondeur et fonctions de gestion
 */
export function useEmbedDepth(): EmbedDepthContextValue {
  const context = useContext(EmbedDepthContext);
  
  if (!context) {
    // Fallback si hors Provider (ne devrait pas arriver)
    return {
      depth: 0,
      incrementDepth: () => 0,
      decrementDepth: () => {},
      isMaxDepthReached: () => false
    };
  }

  return context;
}

