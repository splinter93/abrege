/**
 * Gestionnaire de reconnexion pour XAI Voice Service
 * Extrait de xaiVoiceService.ts pour réduire la taille du fichier principal
 */

import { logger, LogCategory } from '@/utils/logger';

/**
 * Options pour le reconnect manager
 */
export interface ReconnectManagerOptions {
  maxAttempts: number;
  token: string | null;
  connect: (token: string, callbacks?: unknown) => Promise<void>;
  callbacks: unknown;
}

/**
 * Gestionnaire de reconnexion
 */
export class ReconnectManager {
  private reconnectAttempts = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private readonly maxAttempts: number;
  private token: string | null;
  private readonly connect: (token: string, callbacks?: unknown) => Promise<void>;
  private readonly callbacks: unknown;

  constructor(options: ReconnectManagerOptions) {
    this.maxAttempts = options.maxAttempts;
    this.token = options.token;
    this.connect = options.connect;
    this.callbacks = options.callbacks;
  }

  /**
   * Réinitialiser le compteur de tentatives
   */
  reset(): void {
    this.reconnectAttempts = 0;
    this.clearReconnectTimeout();
  }

  /**
   * Tenter une reconnexion si nécessaire
   */
  attemptReconnect(closeCode: number): void {
    // Tentative de reconnexion si ce n'est pas une fermeture volontaire
    if (closeCode !== 1000 && this.reconnectAttempts < this.maxAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
      logger.info(LogCategory.AUDIO, `[XAIVoiceService] Tentative de reconnexion ${this.reconnectAttempts}/${this.maxAttempts} dans ${delay}ms`);

      this.reconnectTimeout = setTimeout(() => {
        if (this.token) {
          this.connect(this.token, this.callbacks).catch((err) => {
            logger.error(LogCategory.AUDIO, '[XAIVoiceService] Erreur reconnexion', undefined, err instanceof Error ? err : new Error(String(err)));
          });
        }
      }, delay);
    }
  }

  /**
   * Nettoyer le timeout de reconnexion
   */
  clearReconnectTimeout(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  /**
   * Obtenir le timeout de reconnexion (pour cleanup externe)
   */
  getReconnectTimeout(): NodeJS.Timeout | null {
    return this.reconnectTimeout;
  }

  /**
   * Mettre à jour le token
   */
  setToken(token: string | null): void {
    this.token = token;
  }
}

