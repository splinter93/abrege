/**
 * Constantes pour l'éditeur
 * Valeurs de configuration centralisées pour maintenir la cohérence
 */

/**
 * Délais de debounce (en millisecondes)
 */
export const DEBOUNCE_DELAYS = {
  /** Délai pour la sauvegarde automatique */
  AUTOSAVE: 500,
  
  /** Délai pour la mise à jour de la TOC */
  TOC_UPDATE: 300,
  
  /** Délai pour la synchronisation realtime */
  REALTIME_SYNC: 100,
  
  /** Délai pour la recherche dans le menu slash */
  SLASH_SEARCH: 150,
} as const;

/**
 * Timeouts pour les opérations asynchrones (en millisecondes)
 */
export const TIMEOUTS = {
  /** Timeout pour la mise à jour du flag isUpdatingFromStore */
  STORE_UPDATE_FLAG: 100,
  
  /** Timeout pour la réinitialisation de l'état après erreur */
  ERROR_RESET: 200,
} as const;

/**
 * Configuration de l'image d'en-tête par défaut
 */
export const DEFAULT_HEADER_IMAGE_CONFIG = {
  /** Offset vertical par défaut (0-100) */
  offset: 50,
  
  /** Flou par défaut (0-5) */
  blur: 0,
  
  /** Overlay par défaut (0-5) */
  overlay: 0,
  
  /** Titre dans l'image par défaut */
  titleInImage: false,
} as const;

/**
 * Configuration des menus contextuels
 */
export const CONTEXT_MENU_CONFIG = {
  /** Décalage horizontal du menu kebab (en px) */
  kebabMenuOffsetLeft: 143,
  
  /** Décalage vertical du menu kebab (en px) */
  kebabMenuOffsetTop: 4,
} as const;

/**
 * Messages d'erreur standardisés
 */
export const ERROR_MESSAGES = {
  SAVE_FONT: 'Erreur lors de la sauvegarde de la police',
  SAVE_WIDE_MODE: 'Erreur lors de la sauvegarde du mode large',
  SAVE_A4_MODE: 'Erreur lors de la sauvegarde du mode A4',
  SAVE_SLASH_LANG: 'Erreur lors de la sauvegarde de la langue slash',
  SAVE_HEADER_IMAGE_OFFSET: "Erreur lors de la sauvegarde de l'offset d'image",
  SAVE_HEADER_IMAGE_BLUR: "Erreur lors de la sauvegarde du flou d'image",
  SAVE_HEADER_IMAGE_OVERLAY: "Erreur lors de la sauvegarde de l'overlay d'image",
  SAVE_HEADER_TITLE_IN_IMAGE: "Erreur lors de la sauvegarde du titre dans l'image",
  UPDATE_SHARE_SETTINGS: 'Erreur mise à jour partage',
  AUTHENTICATION_REQUIRED: 'Authentification requise',
} as const;

/**
 * Messages de succès standardisés
 */
export const SUCCESS_MESSAGES = {
  SHARE_SETTINGS_UPDATED: 'Paramètres de partage mis à jour !',
} as const;

