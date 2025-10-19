import type { 
  BatchApiConfig, 
  BatchApiPayload, 
  BatchApiResponse,
  RoundContext 
} from '../types/groqTypes';
import { simpleLogger as logger } from '@/utils/logger';

/**
 * État de session refetché
 */
interface SessionState {
  sequence: number;
  updated_at: string;
  messages?: Array<{ id: string; [key: string]: unknown }>;
}

/**
 * Client pour l'API batch atomique
 * Gère la persistance des messages tool et la récupération des conflits
 */
export class GroqBatchApiClient {
  private config: BatchApiConfig;
  private sessionLocks: Map<string, { lockId: string; expiresAt: string }>;

  constructor(config: BatchApiConfig) {
    this.config = config;
    this.sessionLocks = new Map();
  }

  /**
   * Persiste un batch de messages de manière atomique
   */
  async persistBatch(
    payload: BatchApiPayload,
    roundContext: RoundContext
  ): Promise<BatchApiResponse> {
    const { sessionId, roundId, operationId } = payload;
    
    try {
      logger.info(`[GroqBatchApiClient] 💾 Persistance du batch pour le round ${roundId}`);
      logger.dev(`[GroqBatchApiClient] 📦 Payload:`, {
        sessionId,
        operationId,
        messagesCount: payload.messages.length,
        roundId
      });

      // Vérifier le verrou de session
      if (!this.acquireSessionLock(sessionId, roundId)) {
        throw new Error(`Session ${sessionId} verrouillée par un autre round`);
      }

      try {
        // Appel à l'API batch
        const response = await this.callBatchApi(payload);
        
        if (response.success) {
          logger.info(`[GroqBatchApiClient] ✅ Batch persisté avec succès: ${response.operationId}`);
          this.releaseSessionLock(sessionId);
          return response;
        } else {
          throw new Error(`Échec de la persistance: ${response.error}`);
        }
      } catch (error) {
        this.releaseSessionLock(sessionId);
        throw error;
      }

    } catch (error) {
      logger.error(`[GroqBatchApiClient] ❌ Erreur lors de la persistance du batch:`, error);
      throw error;
    }
  }

  /**
   * Appelle l'API batch avec gestion des conflits
   */
  private async callBatchApi(payload: BatchApiPayload): Promise<BatchApiResponse> {
    const { sessionId, operationId } = payload;
    
    try {
      // Récupérer le token d'authentification et l'updated_at
      const { token, updatedAt } = await this.getSessionAuth(sessionId);
      
      // Construire les headers
      const headers = {
        'Authorization': `Bearer ${token}`,
        'If-Match': updatedAt,
        'Idempotency-Key': operationId,
        'Content-Type': 'application/json'
      };

      logger.dev(`[GroqBatchApiClient] 🔌 Appel API batch:`, {
        url: `${this.config.baseUrl}/api/ui/chat-sessions/${sessionId}/messages/batch`,
        operationId,
        headers: { ...headers, 'Authorization': 'Bearer ***' }
      });

      // Appel à l'API
      const response = await fetch(`${this.config.baseUrl}/api/ui/chat-sessions/${sessionId}/messages/batch`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this.config.timeout)
      });

      if (response.status === 409) {
        // Conflit détecté, refetch et replay
        logger.warn(`[GroqBatchApiClient] ⚠️ Conflit 409 détecté pour ${operationId}`);
        return await this.handleConflict(sessionId, operationId, payload);
      }

      if (!response.ok) {
        throw new Error(`API batch error: ${response.status} ${response.statusText}`);
      }

      const result: BatchApiResponse = await response.json();
      
      // Vérifier la réponse
      if (!result.operationId || result.operationId !== operationId) {
        throw new Error(`Mismatch operationId: attendu ${operationId}, reçu ${result.operationId}`);
      }

      return result;

    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        throw new Error(`Timeout lors de l'appel API batch (${this.config.timeout}ms)`);
      }
      throw error;
    }
  }

  /**
   * Gère un conflit 409 en refetchant la session et en rejouant
   */
  private async handleConflict(
    sessionId: string, 
    operationId: string, 
    originalPayload: BatchApiPayload
  ): Promise<BatchApiResponse> {
    logger.info(`[GroqBatchApiClient] 🔄 Gestion du conflit pour ${operationId}`);
    
    try {
      // Refetch de la session pour obtenir l'état actuel
      const sessionState = await this.refetchSession(sessionId);
      
      // Vérifier si l'opération a déjà été appliquée
      if (await this.isOperationApplied(sessionId, operationId)) {
        logger.info(`[GroqBatchApiClient] ✅ Opération ${operationId} déjà appliquée`);
        return {
          success: true,
          applied: false, // Indique que c'était un replay
          operationId,
          messageIds: [],
          sequence: sessionState.sequence
        };
      }

      // Rejouer l'opération avec le nouvel état
      const replayPayload = this.buildReplayPayload(originalPayload, sessionState);
      
      logger.info(`[GroqBatchApiClient] 🔄 Replay de l'opération ${operationId}`);
      return await this.callBatchApi(replayPayload);

    } catch (error) {
      logger.error(`[GroqBatchApiClient] ❌ Erreur lors de la gestion du conflit:`, error);
      throw new Error(`Impossible de gérer le conflit: ${error}`);
    }
  }

  /**
   * Refetch la session depuis l'API
   */
  private async refetchSession(sessionId: string): Promise<SessionState> {
    try {
      const { token } = await this.getSessionAuth(sessionId);
      
      const response = await fetch(`${this.config.baseUrl}/api/ui/chat-sessions/${sessionId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error(`Impossible de refetch la session: ${response.status}`);
      }

      return await response.json() as SessionState;
    } catch (error) {
      throw new Error(`Erreur lors du refetch de la session: ${error}`);
    }
  }

  /**
   * Vérifie si une opération a déjà été appliquée
   */
  private async isOperationApplied(sessionId: string, operationId: string): Promise<boolean> {
    try {
      const { token } = await this.getSessionAuth(sessionId);
      
      const response = await fetch(`${this.config.baseUrl}/api/ui/chat-sessions/${sessionId}/operations/${operationId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.status === 404) {
        return false; // Opération non trouvée
      }

      if (!response.ok) {
        throw new Error(`Erreur lors de la vérification de l'opération: ${response.status}`);
      }

      const result = await response.json();
      return result.applied === true;
    } catch (error) {
      logger.warn(`[GroqBatchApiClient] ⚠️ Impossible de vérifier l'opération ${operationId}:`, error);
      return false; // En cas de doute, considérer comme non appliquée
    }
  }

  /**
   * Construit le payload de replay en tenant compte de l'état actuel
   */
  private buildReplayPayload(originalPayload: BatchApiPayload, sessionState: SessionState): BatchApiPayload {
    // Filtrer les messages qui n'existent pas déjà
    const existingMessageIds = new Set(sessionState.messages?.map((m) => m.id) || []);
    
    const filteredMessages = originalPayload.messages.filter(msg => {
      // Pour les messages tool, vérifier s'ils existent déjà
      if (msg.role === 'tool') {
        return !existingMessageIds.has(msg.tool_call_id);
      }
      return true;
    });

    return {
      ...originalPayload,
      messages: filteredMessages
    };
  }

  /**
   * Obtient l'authentification de la session
   */
  private async getSessionAuth(sessionId: string): Promise<{ token: string; updatedAt: string }> {
    // Cette méthode devrait être injectée ou configurée
    // Pour l'instant, on simule
    return {
      token: 'mock-token',
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Acquiert un verrou sur la session
   */
  private acquireSessionLock(sessionId: string, roundId: string): boolean {
    const existingLock = this.sessionLocks.get(sessionId);
    const now = new Date();
    
    if (existingLock) {
      // Vérifier si le verrou a expiré
      if (new Date(existingLock.expiresAt) > now) {
        logger.warn(`[GroqBatchApiClient] ⚠️ Session ${sessionId} verrouillée par ${existingLock.lockId}`);
        return false;
      }
      // Verrou expiré, le supprimer
      this.sessionLocks.delete(sessionId);
    }

    // Acquérir le verrou
    const lockId = roundId;
    const expiresAt = new Date(now.getTime() + this.config.timeout).toISOString();
    
    this.sessionLocks.set(sessionId, { lockId, expiresAt });
    
    logger.dev(`[GroqBatchApiClient] 🔒 Verrou acquis sur la session ${sessionId} par ${lockId}`);
    return true;
  }

  /**
   * Libère le verrou sur la session
   */
  private releaseSessionLock(sessionId: string): void {
    const lock = this.sessionLocks.get(sessionId);
    if (lock) {
      logger.dev(`[GroqBatchApiClient] 🔓 Verrou libéré sur la session ${sessionId} (${lock.lockId})`);
      this.sessionLocks.delete(sessionId);
    }
  }

  /**
   * Nettoie les verrous expirés
   */
  cleanupExpiredLocks(): void {
    const now = new Date();
    for (const [sessionId, lock] of this.sessionLocks.entries()) {
      if (new Date(lock.expiresAt) <= now) {
        logger.dev(`[GroqBatchApiClient] 🧹 Nettoyage du verrou expiré sur ${sessionId}`);
        this.sessionLocks.delete(sessionId);
      }
    }
  }

  /**
   * Obtient les statistiques des verrous
   */
  getLockStats(): { totalLocks: number; expiredLocks: number } {
    const now = new Date();
    let expiredCount = 0;
    
    for (const lock of this.sessionLocks.values()) {
      if (new Date(lock.expiresAt) <= now) {
        expiredCount++;
      }
    }

    return {
      totalLocks: this.sessionLocks.size,
      expiredLocks: expiredCount
    };
  }
} 