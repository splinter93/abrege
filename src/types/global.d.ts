/**
 * Déclarations TypeScript globales
 * Étend les types globaux comme Window avec des propriétés personnalisées
 */

/**
 * API de polling ciblé exposée sur window
 */
export interface TargetedPollingAPI {
  pollNotes: (noteIds: string[]) => Promise<void>;
  pollFolders: (folderIds: string[]) => Promise<void>;
  pollClasseurs: (classeurIds: string[]) => Promise<void>;
  pollAll: () => Promise<void>;
}

/**
 * Paramètres d'événement Google Analytics
 */
export interface GTagEventParams {
  event_category?: string;
  event_label?: string;
  value?: number;
  description?: string;
  fatal?: boolean;
  [key: string]: unknown;
}

/**
 * Fonction Google Analytics gtag
 */
export type GTag = {
  (command: 'event', eventName: string, eventParams?: GTagEventParams): void;
  (command: 'config', targetId: string, config?: Record<string, unknown>): void;
  (command: 'set', params: Record<string, unknown>): void;
  (command: string, ...args: unknown[]): void;
};

/**
 * Extensions de l'interface Window globale
 */
declare global {
  interface Window {
    /**
     * API de polling ciblé pour rafraîchir les données
     * @see TargetedPollingManager.tsx
     */
    targetedPolling?: TargetedPollingAPI;
    
    /**
     * Google Analytics gtag function
     * @see https://developers.google.com/analytics/devguides/collection/gtagjs
     */
    gtag?: GTag;
    
    /**
     * Data layer pour Google Tag Manager
     */
    dataLayer?: unknown[];
  }
}

// Nécessaire pour que ce fichier soit traité comme un module
export {};



