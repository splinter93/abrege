/**
 * Utilitaire de logging centralisé
 * Remplace les console.log dispersés par un système unifié
 */

export const logger = {
  /**
   * Log en développement uniquement
   */
  dev: (message: string, ...args: unknown[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEV] ${message}`, ...args);
    }
  },

  /**
   * Log d'erreur (toujours affiché)
   */
  error: (message: string, error?: unknown) => {
    console.error(`[ERROR] ${message}`, error);
  },

  /**
   * Log d'avertissement (toujours affiché)
   */
  warn: (message: string, ...args: unknown[]) => {
    console.warn(`[WARN] ${message}`, ...args);
  },

  /**
   * Log d'information (toujours affiché)
   */
  info: (message: string, ...args: unknown[]) => {
    console.info(`[INFO] ${message}`, ...args);
  },

  /**
   * Log de debug (développement uniquement)
   */
  debug: (message: string, ...args: unknown[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  },

  /**
   * Log pour le realtime (développement uniquement)
   */
  realtime: (message: string, ...args: unknown[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[REALTIME] ${message}`, ...args);
    }
  },

  /**
   * Log pour l'API (développement uniquement)
   */
  api: (message: string, ...args: unknown[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[API] ${message}`, ...args);
    }
  },

  /**
   * Log pour Zustand (développement uniquement)
   */
  zustand: (message: string, ...args: unknown[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[ZUSTAND] ${message}`, ...args);
    }
  },
}; 