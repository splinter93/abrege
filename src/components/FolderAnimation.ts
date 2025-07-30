import { Variants, Transition } from 'framer-motion';

// ============================================================================
// ANIMATIONS DES ÉLÉMENTS DE FICHIER
// ============================================================================

/**
 * Variants pour l'animation d'apparition/disparition des fichiers
 * Utilisé dans FileItem.tsx
 */
export const fileItemVariants: Variants = {
  initial: { 
    opacity: 0, 
    scale: 0.92 
  },
  animate: { 
    opacity: 1, 
    scale: 1 
  },
  exit: { 
    opacity: 0, 
    scale: 0.92 
  }
};

/**
 * Transition pour les animations de fichiers
 * Utilisé dans FileItem.tsx
 */
export const fileItemTransition: Transition = {
  duration: 0.38,
  ease: 'easeOut'
};

// ============================================================================
// ANIMATIONS DES ÉLÉMENTS DE DOSSIER
// ============================================================================

/**
 * Variants pour l'animation d'apparition/disparition des dossiers
 * Pour une future utilisation dans FolderItem.tsx
 */
export const folderItemVariants: Variants = {
  initial: { 
    opacity: 0, 
    scale: 0.95,
    y: 10
  },
  animate: { 
    opacity: 1, 
    scale: 1,
    y: 0
  },
  exit: { 
    opacity: 0, 
    scale: 0.95,
    y: -10
  }
};

/**
 * Transition pour les animations de dossiers
 * Pour une future utilisation dans FolderItem.tsx
 */
export const folderItemTransition: Transition = {
  duration: 0.3,
  ease: 'easeOut'
};

// ============================================================================
// ANIMATIONS DE LA LISTE DES ÉLÉMENTS
// ============================================================================

/**
 * Variants pour l'animation de la liste des dossiers
 * Pour une future utilisation avec AnimatePresence
 */
export const folderListVariants: Variants = {
  initial: { 
    opacity: 0 
  },
  animate: { 
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1
    }
  },
  exit: { 
    opacity: 0,
    transition: {
      staggerChildren: 0.02,
      staggerDirection: -1
    }
  }
};

/**
 * Variants pour l'animation de la liste des fichiers
 * Pour une future utilisation avec AnimatePresence
 */
export const fileListVariants: Variants = {
  initial: { 
    opacity: 0 
  },
  animate: { 
    opacity: 1,
    transition: {
      staggerChildren: 0.03,
      delayChildren: 0.05
    }
  },
  exit: { 
    opacity: 0,
    transition: {
      staggerChildren: 0.02,
      staggerDirection: -1
    }
  }
};

// ============================================================================
// ANIMATIONS DE RENOMMAGE
// ============================================================================

/**
 * Variants pour l'animation du champ de renommage
 * Pour une future utilisation dans les composants de renommage
 */
export const renameInputVariants: Variants = {
  initial: { 
    opacity: 0, 
    scale: 0.98 
  },
  animate: { 
    opacity: 1, 
    scale: 1 
  },
  exit: { 
    opacity: 0, 
    scale: 0.98 
  }
};

/**
 * Transition pour les animations de renommage
 */
export const renameInputTransition: Transition = {
  duration: 0.2,
  ease: 'easeOut'
};

// ============================================================================
// ANIMATIONS DE DRAG AND DROP
// ============================================================================

/**
 * Variants pour l'animation de drag over
 * Pour une future utilisation dans les composants de drag & drop
 */
export const dragOverVariants: Variants = {
  initial: { 
    scale: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)'
  },
  animate: { 
    scale: 1.01,
    borderColor: 'rgba(255, 106, 0, 0.3)',
    transition: {
      duration: 0.15,
      ease: 'easeOut'
    }
  },
  exit: { 
    scale: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    transition: {
      duration: 0.1,
      ease: 'easeOut'
    }
  }
};

// ============================================================================
// ANIMATIONS DE CHARGEMENT
// ============================================================================

/**
 * Variants pour l'animation de chargement
 * Pour une future utilisation dans les états de loading
 */
export const loadingVariants: Variants = {
  initial: { 
    opacity: 0,
    y: 10
  },
  animate: { 
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: 'easeOut'
    }
  },
  exit: { 
    opacity: 0,
    y: -10,
    transition: {
      duration: 0.2,
      ease: 'easeIn'
    }
  }
};

// ============================================================================
// ANIMATIONS D'ERREUR
// ============================================================================

/**
 * Variants pour l'animation d'erreur
 * Pour une future utilisation dans les états d'erreur
 */
export const errorVariants: Variants = {
  initial: { 
    opacity: 0,
    scale: 0.95
  },
  animate: { 
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.3,
      ease: 'easeOut'
    }
  },
  exit: { 
    opacity: 0,
    scale: 0.95,
    transition: {
      duration: 0.2,
      ease: 'easeIn'
    }
  }
};

// ============================================================================
// ANIMATIONS D'ÉTAT VIDE
// ============================================================================

/**
 * Variants pour l'animation d'état vide
 * Pour une future utilisation dans les états vides
 */
export const emptyStateVariants: Variants = {
  initial: { 
    opacity: 0,
    y: 20
  },
  animate: { 
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: 'easeOut'
    }
  },
  exit: { 
    opacity: 0,
    y: -20,
    transition: {
      duration: 0.3,
      ease: 'easeIn'
    }
  }
};

// ============================================================================
// TRANSITIONS GÉNÉRIQUES
// ============================================================================

/**
 * Transition rapide pour les interactions utilisateur
 */
export const quickTransition: Transition = {
  duration: 0.15,
  ease: 'easeOut'
};

/**
 * Transition moyenne pour les animations de contenu
 */
export const mediumTransition: Transition = {
  duration: 0.3,
  ease: 'easeOut'
};

/**
 * Transition lente pour les animations d'état
 */
export const slowTransition: Transition = {
  duration: 0.5,
  ease: 'easeOut'
};

/**
 * Transition CSS pour les interactions hover (utilisée dans le CSS)
 * Correspond à transition: all 0.2s ease-out
 */
export const hoverTransition: Transition = {
  duration: 0.2,
  ease: 'easeOut'
};

/**
 * Transition CSS pour les changements de couleur (utilisée dans le CSS)
 * Correspond à transition: color 0.2s ease-out
 */
export const colorTransition: Transition = {
  duration: 0.2,
  ease: 'easeOut'
};

// ============================================================================
// ANIMATIONS DE CONTENEUR
// ============================================================================

/**
 * Variants pour l'animation du conteneur principal
 * Pour une future utilisation dans FolderManager
 */
export const containerVariants: Variants = {
  initial: { 
    opacity: 0 
  },
  animate: { 
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: 'easeOut'
    }
  },
  exit: { 
    opacity: 0,
    transition: {
      duration: 0.2,
      ease: 'easeIn'
    }
  }
};

/**
 * Variants pour l'animation du contenu
 * Pour une future utilisation dans FolderContent
 */
export const contentVariants: Variants = {
  initial: { 
    opacity: 0,
    y: 10
  },
  animate: { 
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: 'easeOut',
      staggerChildren: 0.05
    }
  },
  exit: { 
    opacity: 0,
    y: -10,
    transition: {
      duration: 0.3,
      ease: 'easeIn'
    }
  }
};

// ============================================================================
// ANIMATIONS DE GRILLE (EXPANSION/RÉTRACTION)
// ============================================================================

/**
 * Variants pour l'animation d'expansion de la grille
 * Utilisé quand des éléments sont ajoutés à la grille
 */
export const gridExpandVariants: Variants = {
  initial: { 
    height: 'auto',
    opacity: 0.8
  },
  animate: { 
    height: 'auto',
    opacity: 1,
    transition: {
      duration: 0.4,
      ease: 'easeOut',
      staggerChildren: 0.08
    }
  },
  exit: { 
    height: 'auto',
    opacity: 0.8,
    transition: {
      duration: 0.3,
      ease: 'easeIn'
    }
  }
};

/**
 * Variants pour l'animation de rétraction de la grille
 * Utilisé quand des éléments sont supprimés de la grille
 */
export const gridShrinkVariants: Variants = {
  initial: { 
    height: 'auto',
    opacity: 1
  },
  animate: { 
    height: 'auto',
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: 'easeOut'
    }
  },
  exit: { 
    height: 'auto',
    opacity: 0.8,
    transition: {
      duration: 0.25,
      ease: 'easeIn',
      staggerChildren: 0.05,
      staggerDirection: -1
    }
  }
};

/**
 * Variants pour l'animation de réorganisation de la grille
 * Utilisé quand l'ordre des éléments change
 */
export const gridReorderVariants: Variants = {
  initial: { 
    opacity: 0.9,
    scale: 0.98
  },
  animate: { 
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.35,
      ease: 'easeOut'
    }
  },
  exit: { 
    opacity: 0.9,
    scale: 0.98,
    transition: {
      duration: 0.25,
      ease: 'easeIn'
    }
  }
};

/**
 * Variants pour l'animation de ligne de grille
 * Utilisé pour les changements de layout (ajout/suppression de lignes)
 */
export const gridRowVariants: Variants = {
  initial: { 
    opacity: 0,
    y: 10,
    scale: 0.95
  },
  animate: { 
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: 'easeOut'
    }
  },
  exit: { 
    opacity: 0,
    y: -10,
    scale: 0.95,
    transition: {
      duration: 0.3,
      ease: 'easeIn'
    }
  }
};

/**
 * Variants pour l'animation de colonne de grille
 * Utilisé pour les changements de layout horizontal
 */
export const gridColumnVariants: Variants = {
  initial: { 
    opacity: 0,
    x: 10,
    scale: 0.95
  },
  animate: { 
    opacity: 1,
    x: 0,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: 'easeOut'
    }
  },
  exit: { 
    opacity: 0,
    x: -10,
    scale: 0.95,
    transition: {
      duration: 0.3,
      ease: 'easeIn'
    }
  }
};

/**
 * Transition fluide pour les animations de grille
 */
export const gridTransition: Transition = {
  duration: 0.4,
  ease: 'easeOut'
};

/**
 * Transition rapide pour les réorganisations de grille
 */
export const gridReorderTransition: Transition = {
  duration: 0.35,
  ease: 'easeOut'
};

// ============================================================================
// ANIMATIONS DES CLASSEUR TABS
// ============================================================================

/**
 * Variants pour l'animation d'apparition/disparition des classeur tabs
 * Utilisé dans ClasseurTabs.tsx
 */
export const classeurTabVariants: Variants = {
  initial: { 
    opacity: 0, 
    scale: 0.9,
    x: -20
  },
  animate: { 
    opacity: 1, 
    scale: 1,
    x: 0,
    transition: {
      duration: 0.3,
      ease: 'easeOut'
    }
  },
  exit: { 
    opacity: 0, 
    scale: 0.9,
    x: 20,
    transition: {
      duration: 0.25,
      ease: 'easeIn'
    }
  }
};

/**
 * Variants pour l'animation de la liste des classeur tabs
 * Pour une future utilisation avec AnimatePresence
 */
export const classeurTabsListVariants: Variants = {
  initial: { 
    opacity: 0 
  },
  animate: { 
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1
    }
  },
  exit: { 
    opacity: 0,
    transition: {
      staggerChildren: 0.03,
      staggerDirection: -1
    }
  }
};

/**
 * Transition pour les animations de classeur tabs
 */
export const classeurTabTransition: Transition = {
  duration: 0.3,
  ease: 'easeOut'
}; 