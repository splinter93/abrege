/**
 * CanvasStateManager - Gestion d'état local-first pour le canvas
 * 
 * Responsabilités :
 * - Garder l'état du canvas en mémoire (pas en DB)
 * - Appliquer les opérations streaming
 * - Générer ACK/CONFLICT
 * - Checkpoint batch vers DB (10s / 50 ops / fermeture)
 */

import { ContentOperation } from '@/utils/contentApplyUtils';
import { calculateETag } from '@/utils/contentApplyUtils';
import { applyOperationsToContent, validateOperation } from '@/services/contentOperations';
import { logger, LogCategory } from '@/utils/logger';
import { sanitizeMarkdownContent } from '@/utils/markdownSanitizer.server';

// ============================================================================
// TYPES
// ============================================================================

export interface StreamOperation extends ContentOperation {
  op_id: string; // Identifiant unique pour idempotence
  client_version: string; // ETag connu du client
  timestamp: number; // Timestamp de l'op
}

export interface OpResult {
  op_id: string;
  status: 'ack' | 'conflict' | 'error';
  server_version?: string; // Nouvel ETag après application
  error?: string;
  reason?: string; // Pour CONFLICT
  expected_version?: string; // Pour CONFLICT
}

interface CanvasState {
  canvasId: string;
  noteId: string;
  userId: string;
  content: string; // Contenu en mémoire (source de vérité temporaire)
  etag: string; // Version courante
  pendingOps: StreamOperation[]; // Ops non checkpointées
  seenOpIds: Set<string>; // Pour idempotence
  lastCheckpoint: number; // Timestamp du dernier checkpoint
  lastActivity: number; // Pour cleanup
  isDirty: boolean; // A des modifications non sauvegardées
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  CHECKPOINT_INTERVAL_MS: 10 * 1000, // 10 secondes
  CHECKPOINT_OPS_THRESHOLD: 50, // 50 opérations
  CLEANUP_INTERVAL_MS: 5 * 60 * 1000, // 5 minutes
  STATE_TTL_MS: 30 * 60 * 1000, // 30 minutes d'inactivité
  MAX_PENDING_OPS: 100 // Limite de sécurité
};

// ============================================================================
// CANVAS STATE MANAGER (SINGLETON)
// ============================================================================

class CanvasStateManager {
  private states = new Map<string, CanvasState>();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private checkpointTimers = new Map<string, NodeJS.Timeout>();

  constructor() {
    this.startCleanup();
    logger.info(LogCategory.API, '[CanvasStateManager] Service initialized');
  }

  /**
   * Initialise un état canvas (au premier accès)
   */
  async initializeState(
    canvasId: string,
    noteId: string,
    userId: string,
    initialContent: string,
    initialEtag: string
  ): Promise<void> {
    if (this.states.has(canvasId)) {
      logger.debug(LogCategory.API, '[CanvasStateManager] État déjà initialisé', { canvasId });
      // Mettre à jour l'activité
      const state = this.states.get(canvasId)!;
      state.lastActivity = Date.now();
      return;
    }

    const state: CanvasState = {
      canvasId,
      noteId,
      userId,
      content: initialContent,
      etag: initialEtag,
      pendingOps: [],
      seenOpIds: new Set(),
      lastCheckpoint: Date.now(),
      lastActivity: Date.now(),
      isDirty: false
    };

    this.states.set(canvasId, state);

    logger.info(LogCategory.API, '[CanvasStateManager] État initialisé', {
      canvasId,
      noteId,
      userId,
      contentLength: initialContent.length,
      etag: initialEtag
    });

    // Démarrer le timer de checkpoint auto
    this.scheduleCheckpoint(canvasId);
  }

  /**
   * Applique une opération streaming
   * Retourne ACK ou CONFLICT
   */
  async applyOperation(canvasId: string, op: StreamOperation): Promise<OpResult> {
    const state = this.states.get(canvasId);

    if (!state) {
      return {
        op_id: op.op_id,
        status: 'error',
        error: 'État canvas non initialisé'
      };
    }

    // 1. Idempotence : vérifier si op déjà vue
    if (state.seenOpIds.has(op.op_id)) {
      logger.debug(LogCategory.API, '[CanvasStateManager] Op déjà vue (idempotence)', {
        canvasId,
        op_id: op.op_id
      });
      return {
        op_id: op.op_id,
        status: 'ack',
        server_version: state.etag
      };
    }

    // 2. Vérifier la version (ETag)
    if (op.client_version !== state.etag) {
      logger.warn(LogCategory.API, '[CanvasStateManager] Conflit de version', {
        canvasId,
        op_id: op.op_id,
        client_version: op.client_version,
        server_version: state.etag
      });

      return {
        op_id: op.op_id,
        status: 'conflict',
        reason: 'etag_mismatch',
        expected_version: state.etag
      };
    }

    // 3. Valider l'opération
    const validation = validateOperation(op);
    if (!validation.valid) {
      logger.warn(LogCategory.API, '[CanvasStateManager] Validation échouée', {
        canvasId,
        op_id: op.op_id,
        error: validation.error
      });

      return {
        op_id: op.op_id,
        status: 'error',
        error: validation.error
      };
    }

    // 4. Sanitizer le contenu
    const sanitizedOp: StreamOperation = {
      ...op,
      content: op.content ? sanitizeMarkdownContent(op.content) : op.content
    };

    // 5. Appliquer l'opération en mémoire
    try {
      const result = await applyOperationsToContent(state.content, [sanitizedOp]);

      if (!result.success) {
        const failedResult = result.results.find(r => r.status === 'failed');
        return {
          op_id: op.op_id,
          status: 'error',
          error: failedResult?.error || 'Échec application opération'
        };
      }

      // 6. Mettre à jour l'état
      state.content = result.content;
      state.etag = calculateETag(result.content);
      state.pendingOps.push(sanitizedOp);
      state.seenOpIds.add(op.op_id);
      state.lastActivity = Date.now();
      state.isDirty = true;

      logger.info(LogCategory.API, '[CanvasStateManager] Opération appliquée', {
        canvasId,
        op_id: op.op_id,
        action: op.action,
        newEtag: state.etag,
        pendingOps: state.pendingOps.length
      });

      // 7. Trigger checkpoint si seuil atteint
      if (state.pendingOps.length >= CONFIG.CHECKPOINT_OPS_THRESHOLD) {
        logger.info(LogCategory.API, '[CanvasStateManager] Seuil atteint, checkpoint immédiat', {
          canvasId,
          pendingOps: state.pendingOps.length
        });
        // Checkpoint asynchrone (ne pas bloquer la réponse)
        this.checkpoint(canvasId).catch(err => {
          logger.error(LogCategory.API, '[CanvasStateManager] Checkpoint échoué', {
            canvasId,
            error: err instanceof Error ? err.message : 'Unknown error'
          });
        });
      }

      return {
        op_id: op.op_id,
        status: 'ack',
        server_version: state.etag
      };

    } catch (error) {
      logger.error(LogCategory.API, '[CanvasStateManager] Erreur application', {
        canvasId,
        op_id: op.op_id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        op_id: op.op_id,
        status: 'error',
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Checkpoint vers la DB (via applyContentOperations)
   */
  async checkpoint(canvasId: string): Promise<void> {
    const state = this.states.get(canvasId);

    if (!state || !state.isDirty || state.pendingOps.length === 0) {
      logger.debug(LogCategory.API, '[CanvasStateManager] Checkpoint skipped (rien à sauver)', {
        canvasId,
        exists: !!state,
        isDirty: state?.isDirty,
        pendingOps: state?.pendingOps.length || 0
      });
      return;
    }

    const startTime = Date.now();
    const opsToSave = [...state.pendingOps]; // Copie pour éviter les races

    logger.info(LogCategory.API, '[CanvasStateManager] Checkpoint démarré', {
      canvasId,
      opsCount: opsToSave.length,
      noteId: state.noteId
    });

    try {
      // Appeler l'endpoint content:apply en interne
      // Note: Ceci nécessite de faire un fetch vers notre propre API
      // Alternativement, on pourrait extraire la logique de persistence dans un service
      
      // Pour simplifier, on va directement mettre à jour la DB ici
      // (à améliorer : utiliser un service de persistence)
      
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
      
      const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      });

      // Mettre à jour la note en DB
      const { error: updateError } = await supabase
        .from('articles')
        .update({
          markdown_content: state.content,
          updated_at: new Date().toISOString()
        })
        .eq('id', state.noteId)
        .eq('user_id', state.userId);

      if (updateError) {
        throw new Error(`DB update failed: ${updateError.message}`);
      }

      // Succès : reset les ops pending
      state.pendingOps = [];
      state.lastCheckpoint = Date.now();
      state.isDirty = false;

      const duration = Date.now() - startTime;
      logger.info(LogCategory.API, '[CanvasStateManager] Checkpoint réussi', {
        canvasId,
        opsCount: opsToSave.length,
        duration,
        newEtag: state.etag
      });

    } catch (error) {
      logger.error(LogCategory.API, '[CanvasStateManager] Checkpoint échoué', {
        canvasId,
        opsCount: opsToSave.length,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      // Ne pas vider les ops en cas d'échec
      throw error;
    }
  }

  /**
   * Force un checkpoint immédiat (appelé à la fermeture du canvas)
   */
  async forceCheckpoint(canvasId: string): Promise<void> {
    logger.info(LogCategory.API, '[CanvasStateManager] Force checkpoint', { canvasId });
    await this.checkpoint(canvasId);
  }

  /**
   * Récupère l'état actuel d'un canvas
   */
  getState(canvasId: string): CanvasState | null {
    return this.states.get(canvasId) || null;
  }

  /**
   * Cleanup d'un canvas (appelé à la fermeture)
   */
  async cleanup(canvasId: string): Promise<void> {
    const state = this.states.get(canvasId);
    
    if (!state) {
      return;
    }

    logger.info(LogCategory.API, '[CanvasStateManager] Cleanup', {
      canvasId,
      pendingOps: state.pendingOps.length
    });

    // Checkpoint final si nécessaire
    if (state.isDirty && state.pendingOps.length > 0) {
      try {
        await this.checkpoint(canvasId);
      } catch (error) {
        logger.error(LogCategory.API, '[CanvasStateManager] Checkpoint final échoué', {
          canvasId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Arrêter le timer de checkpoint
    const timer = this.checkpointTimers.get(canvasId);
    if (timer) {
      clearTimeout(timer);
      this.checkpointTimers.delete(canvasId);
    }

    // Supprimer l'état
    this.states.delete(canvasId);

    logger.info(LogCategory.API, '[CanvasStateManager] Cleanup terminé', { canvasId });
  }

  /**
   * Planifie le prochain checkpoint auto
   */
  private scheduleCheckpoint(canvasId: string): void {
    // Annuler le timer existant
    const existingTimer = this.checkpointTimers.get(canvasId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Créer un nouveau timer
    const timer = setTimeout(async () => {
      logger.debug(LogCategory.API, '[CanvasStateManager] Auto-checkpoint', { canvasId });
      
      try {
        await this.checkpoint(canvasId);
      } catch (error) {
        logger.error(LogCategory.API, '[CanvasStateManager] Auto-checkpoint échoué', {
          canvasId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      // Re-planifier si l'état existe toujours
      if (this.states.has(canvasId)) {
        this.scheduleCheckpoint(canvasId);
      }
    }, CONFIG.CHECKPOINT_INTERVAL_MS);

    this.checkpointTimers.set(canvasId, timer);
  }

  /**
   * Cleanup automatique des états inactifs
   */
  private startCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      let cleanedCount = 0;

      this.states.forEach((state, canvasId) => {
        const inactiveDuration = now - state.lastActivity;

        if (inactiveDuration > CONFIG.STATE_TTL_MS) {
          logger.info(LogCategory.API, '[CanvasStateManager] Cleanup état inactif', {
            canvasId,
            inactiveDuration,
            pendingOps: state.pendingOps.length
          });

          // Cleanup asynchrone
          this.cleanup(canvasId).catch(err => {
            logger.error(LogCategory.API, '[CanvasStateManager] Cleanup échoué', {
              canvasId,
              error: err instanceof Error ? err.message : 'Unknown error'
            });
          });

          cleanedCount++;
        }
      });

      if (cleanedCount > 0) {
        logger.info(LogCategory.API, '[CanvasStateManager] Cleanup cycle terminé', {
          cleanedCount,
          remainingStates: this.states.size
        });
      }
    }, CONFIG.CLEANUP_INTERVAL_MS);
  }
}

// Singleton
export const canvasStateManager = new CanvasStateManager();

