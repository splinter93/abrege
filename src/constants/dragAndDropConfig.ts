/**
 * Configuration commune pour le système de drag & drop
 * Centralise tous les paramètres de sensibilité et de comportement
 */

import { PointerSensor } from '@dnd-kit/core';

/**
 * Configuration des capteurs de drag & drop
 */
export const DRAG_SENSOR_CONFIG = {
  // Configuration pour les classeurs (plus sensible)
  classeurs: {
    distance: 15,
    delay: 200,
    tolerance: 8
  },
  
  // Configuration pour les dossiers/notes (moins sensible)
  items: {
    distance: 5,
    delay: 0,
    tolerance: 0
  }
} as const;

/**
 * Types de drag supportés
 */
export const DRAG_TYPES = {
  CLASSEUR: 'classeur',
  FOLDER: 'folder',
  FILE: 'file'
} as const;

/**
 * Types de données de drag
 */
export const DRAG_DATA_TYPES = {
  JSON: 'application/json',
  ITEM_ID: 'itemId',
  ITEM_TYPE: 'itemType'
} as const;

/**
 * Événements personnalisés
 */
export const CUSTOM_EVENTS = {
  DROP_TO_CLASSEUR: 'drop-to-classeur'
} as const;

/**
 * Configuration des animations de drag
 */
export const DRAG_ANIMATION_CONFIG = {
  duration: 300,
  easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
  dropAnimation: {
    duration: 300,
    easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)'
  }
} as const;

/**
 * Configuration des zones de drag
 */
export const DRAG_ZONE_CONFIG = {
  margin: 5, // Marge de tolérance pour les zones de drop
  handleWidth: 20, // Largeur de la zone de drag des classeurs
  handleOpacity: 0.7 // Opacité de la zone de drag au hover
} as const;
