/**
 * Service de lock opérationnel pour prévenir les race conditions
 * Pattern runExclusive par sessionId
 * 
 * Garantit qu'une seule opération (sendMessage, editMessage) s'exécute à la fois
 * par session de chat pour éviter les doublons et conflits de sequence_number.
 */

import { simpleLogger as logger } from '@/utils/logger';

/**
 * Options pour runExclusive
 */
export interface ExclusiveOperationOptions {
  /**
   * Timeout en ms (défaut: 30s)
   */
  timeout?: number;
  
  /**
   * Nom de l'opération pour logging
   */
  operationName?: string;
}

/**
 * Erreur de timeout
 */
export class OperationTimeoutError extends Error {
  constructor(sessionId: string, operationName: string, timeout: number) {
    super(`Operation ${operationName} timeout after ${timeout}ms for session ${sessionId}`);
    this.name = 'OperationTimeoutError';
  }
}

/**
 * Service de lock pour opérations chat exclusives
 * 
 * Pattern GUIDE-compliant:
 * - Singleton
 * - Queue par ressource (sessionId)
 * - Timeout configurable
 * - Logging structuré
 */
export class ChatOperationLock {
  private static instance: ChatOperationLock;
  
  /**
   * Map des queues par sessionId
   * Chaque promise représente l'opération en cours
   */
  private queues = new Map<string, Promise<unknown>>();
  
  /**
   * Timeout par défaut: 30s
   */
  private readonly DEFAULT_TIMEOUT = 30000;

  private constructor() {}

  /**
   * Récupère l'instance singleton
   */
  static getInstance(): ChatOperationLock {
    if (!ChatOperationLock.instance) {
      ChatOperationLock.instance = new ChatOperationLock();
    }
    return ChatOperationLock.instance;
  }

  /**
   * Exécute une fonction de manière exclusive pour une session
   * 
   * Flow:
   * 1. Attend que l'opération précédente se termine
   * 2. Exécute la nouvelle opération
   * 3. Libère le lock
   * 
   * @param sessionId - ID de la session (clé de lock)
   * @param fn - Fonction async à exécuter
   * @param options - Options (timeout, nom)
   * @returns Résultat de la fonction
   * @throws {OperationTimeoutError} Si timeout dépassé
   */
  async runExclusive<T>(
    sessionId: string,
    fn: () => Promise<T>,
    options: ExclusiveOperationOptions = {}
  ): Promise<T> {
    const { timeout = this.DEFAULT_TIMEOUT, operationName = 'unknown' } = options;
    
    // Récupérer la promesse précédente ou créer une resolved
    const previousOperation = this.queues.get(sessionId) || Promise.resolve();
    
    // Créer une nouvelle promesse pour cette opération
    let releaseNext: (value: unknown) => void;
    const nextOperation = new Promise(resolve => {
      releaseNext = resolve;
    });
    
    // Enregistrer dans la queue
    this.queues.set(sessionId, previousOperation.then(() => nextOperation));
    
    const startTime = Date.now();
    
    try {
      // Attendre l'opération précédente
      await previousOperation;
      
      const waitTime = Date.now() - startTime;
      if (waitTime > 1000) {
        logger.dev('[ChatOperationLock] ⏱️ Operation waited', {
          sessionId: sessionId.substring(0, 8),
          operationName,
          waitTime: `${waitTime}ms`
        });
      }
      
      // Exécuter avec timeout
      const result = await Promise.race([
        fn(),
        new Promise<never>((_, reject) => 
          setTimeout(
            () => reject(new OperationTimeoutError(sessionId, operationName, timeout)),
            timeout
          )
        )
      ]);
      
      const totalTime = Date.now() - startTime;
      logger.dev('[ChatOperationLock] ✅ Operation completed', {
        sessionId: sessionId.substring(0, 8),
        operationName,
        totalTime: `${totalTime}ms`
      });
      
      return result;
      
    } catch (error) {
      const totalTime = Date.now() - startTime;
      logger.error('[ChatOperationLock] ❌ Operation failed', {
        sessionId: sessionId.substring(0, 8),
        operationName,
        totalTime: `${totalTime}ms`,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
      
    } finally {
      // Libérer le lock pour l'opération suivante
      releaseNext!(null);
      
      // Nettoyage: supprimer si c'était la dernière opération
      // Utiliser setImmediate pour garantir que le nettoyage se fait après la libération
      await Promise.resolve();
      if (this.queues.get(sessionId) === nextOperation) {
        this.queues.delete(sessionId);
      }
    }
  }

  /**
   * Vérifie si une session a une opération en cours
   */
  isLocked(sessionId: string): boolean {
    return this.queues.has(sessionId);
  }

  /**
   * Retourne le nombre de sessions avec opérations en cours
   * Utile pour monitoring/debugging
   */
  getActiveSessionsCount(): number {
    return this.queues.size;
  }

  /**
   * Force la libération d'un lock (usage debug uniquement)
   * ⚠️ Peut causer des race conditions si utilisé en production
   */
  forceRelease(sessionId: string): void {
    logger.warn('[ChatOperationLock] ⚠️ Force release', { sessionId: sessionId.substring(0, 8) });
    this.queues.delete(sessionId);
  }

  /**
   * Réinitialise tous les locks (usage tests uniquement)
   */
  resetAll(): void {
    logger.warn('[ChatOperationLock] ⚠️ Reset all locks');
    this.queues.clear();
  }
}

/**
 * Instance singleton exportée
 */
export const chatOperationLock = ChatOperationLock.getInstance();

