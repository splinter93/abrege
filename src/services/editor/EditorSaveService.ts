/**
 * EditorSaveService - Service singleton pour la sauvegarde de notes avec protection race conditions
 * 
 * Conformité GUIDE-EXCELLENCE-CODE.md:
 * - Pattern runExclusive obligatoire (ligne 157-175)
 * - operation_id unique par requête
 * - Déduplication côté serveur
 * 
 * @module services/editor/EditorSaveService
 */

import { v2UnifiedApi } from '@/services/V2UnifiedApi';
import { logger, LogCategory } from '@/utils/logger';
import { isTemporaryCanvaNote } from '@/utils/editorHelpers';

/**
 * Générer un UUID v4
 * Utilise crypto.randomUUID() si disponible (navigateurs modernes, Node.js 14.17+)
 * Sinon, génère un UUID v4 simple
 */
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback: générer un UUID v4 simple
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Payload pour la sauvegarde d'une note
 */
export interface NoteUpdatePayload {
  source_title?: string;
  markdown_content?: string;
  html_content?: string;
  header_image?: string | undefined;
  header_image_offset?: number;
  header_image_blur?: number;
  header_image_overlay?: number;
  header_title_in_image?: boolean;
  a4_mode?: boolean;
  wide_mode?: boolean;
  slash_lang?: 'fr' | 'en';
  font_family?: string;
  [key: string]: unknown;
}

/**
 * Options pour la sauvegarde
 */
export interface SaveOptions {
  /** Callback pour mise à jour optimiste du store */
  updateNote?: (noteId: string, payload: NoteUpdatePayload) => void;
  /** Si true, skip l'appel API (pour notes temporaires) */
  skipApi?: boolean;
}

/**
 * Service singleton pour la sauvegarde de notes avec protection race conditions
 */
class EditorSaveService {
  private static instance: EditorSaveService;
  
  /**
   * Queues exclusives par noteId (pattern runExclusive)
   * Map<noteId, Promise<unknown>>
   */
  private queues = new Map<string, Promise<unknown>>();
  
  /**
   * Timeout par défaut pour les opérations (30 secondes)
   */
  private readonly DEFAULT_TIMEOUT = 30000;

  /**
   * Nombre maximum de tentatives de retry
   */
  private readonly MAX_RETRIES = 3;

  /**
   * Délai initial pour le backoff exponentiel (1 seconde)
   */
  private readonly INITIAL_RETRY_DELAY = 1000;

  private constructor() {
    // Singleton
  }

  /**
   * Obtenir l'instance singleton
   */
  static getInstance(): EditorSaveService {
    if (!EditorSaveService.instance) {
      EditorSaveService.instance = new EditorSaveService();
    }
    return EditorSaveService.instance;
  }

  /**
   * Exécuter une opération de sauvegarde de manière exclusive pour une note
   * Pattern runExclusive conforme GUIDE-EXCELLENCE-CODE.md ligne 157-175
   * 
   * @param noteId - ID de la note (clé de lock)
   * @param fn - Fonction async à exécuter
   * @returns Résultat de la fonction
   */
  private async runExclusive<T>(
    noteId: string,
    fn: () => Promise<T>
  ): Promise<T> {
    // Récupérer la promesse précédente ou créer une resolved
    const previousOperation = this.queues.get(noteId) || Promise.resolve();
    
    // Créer une nouvelle promesse pour cette opération
    let releaseNext: (value: unknown) => void;
    const nextOperation = new Promise(resolve => {
      releaseNext = resolve;
    });
    
    // Enregistrer dans la queue
    this.queues.set(noteId, previousOperation.then(() => nextOperation));
    
    const startTime = Date.now();
    
    try {
      // Attendre l'opération précédente
      await previousOperation;
      
      const waitTime = Date.now() - startTime;
      if (waitTime > 1000) {
        logger.dev(LogCategory.EDITOR, '[EditorSaveService] ⏱️ Save operation waited', {
          noteId: noteId.substring(0, 8),
          waitTime: `${waitTime}ms`
        });
      }
      
      // Exécuter avec timeout
      const result = await Promise.race([
        fn(),
        new Promise<never>((_, reject) => 
          setTimeout(
            () => reject(new Error(`Save operation timeout for note ${noteId.substring(0, 8)}`)),
            this.DEFAULT_TIMEOUT
          )
        )
      ]);
      
      const totalTime = Date.now() - startTime;
      logger.dev(LogCategory.EDITOR, '[EditorSaveService] ✅ Save operation completed', {
        noteId: noteId.substring(0, 8),
        totalTime: `${totalTime}ms`
      });
      
      return result;
      
    } catch (error) {
      const totalTime = Date.now() - startTime;
      logger.error(LogCategory.EDITOR, '[EditorSaveService] ❌ Save operation failed', {
        noteId: noteId.substring(0, 8),
        totalTime: `${totalTime}ms`,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
      
    } finally {
      // Libérer le lock pour l'opération suivante
      releaseNext!(null);
      
      // Nettoyage: supprimer si c'était la dernière opération
      await Promise.resolve();
      if (this.queues.get(noteId) === nextOperation) {
        this.queues.delete(noteId);
      }
    }
  }

  /**
   * Vérifier si une opération avec le même operation_id existe déjà (déduplication)
   * 
   * TODO: Implémenter endpoint API /api/editor/notes/check-operation
   * Pour l'instant, retourne toujours false (pas de déduplication côté serveur)
   * 
   * @param operationId - ID unique de l'opération
   * @returns true si l'opération existe déjà, false sinon
   */
  private async checkOperationExists(operationId: string): Promise<boolean> {
    // TODO: Implémenter endpoint API pour déduplication côté serveur
    // Pour l'instant, on s'appuie uniquement sur runExclusive côté client
    return false;
  }

  /**
   * Récupérer le token d'authentification
   */
  private async getAuthToken(): Promise<string> {
    try {
      const { supabase } = await import('@/supabaseClient');
      const { data: { session } } = await supabase.auth.getSession();
      return session?.access_token || '';
    } catch (error) {
      logger.error(LogCategory.EDITOR, '[EditorSaveService] Failed to get auth token', {
        error: error instanceof Error ? error.message : String(error)
      });
      return '';
    }
  }

  /**
   * Classe d'erreur pour les erreurs réseau
   */
  private isNetworkError(error: unknown): boolean {
    if (error instanceof Error) {
      // Erreurs réseau typiques
      return (
        error.message.includes('fetch') ||
        error.message.includes('network') ||
        error.message.includes('timeout') ||
        error.message.includes('ECONNREFUSED') ||
        error.message.includes('ENOTFOUND')
      );
    }
    return false;
  }

  /**
   * Sauvegarder avec retry logic et backoff exponentiel
   * Pattern conforme GUIDE-EXCELLENCE-CODE.md ligne 183-194 (catch spécifique NetworkError)
   * 
   * @param noteId - ID de la note
   * @param payload - Données à sauvegarder
   * @param operationId - ID unique de l'opération
   */
  private async saveWithRetry(
    noteId: string,
    payload: NoteUpdatePayload,
    operationId: string
  ): Promise<void> {
    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        // Appeler l'API avec operation_id pour déduplication côté serveur
        await v2UnifiedApi.updateNote(noteId, {
          ...payload,
          operation_id: operationId
        } as NoteUpdatePayload & { operation_id: string });

        // Succès, sortir de la boucle
        if (attempt > 0) {
          logger.info(LogCategory.EDITOR, '[EditorSaveService] ✅ Save succeeded after retry', {
            noteId: noteId.substring(0, 8),
            operationId,
            attempt: attempt + 1
          });
        }
        return;

      } catch (error) {
        const isNetworkErr = this.isNetworkError(error);
        const isLastAttempt = attempt === this.MAX_RETRIES - 1;

        // Si ce n'est pas une erreur réseau ou si c'est la dernière tentative, throw
        if (!isNetworkErr || isLastAttempt) {
          logger.error(LogCategory.EDITOR, '[EditorSaveService] ❌ Save failed (no retry)', {
            noteId: noteId.substring(0, 8),
            operationId,
            attempt: attempt + 1,
            isNetworkError: isNetworkErr,
            isLastAttempt,
            error: error instanceof Error ? error.message : String(error)
          });
          throw error;
        }

        // Calculer le délai de backoff exponentiel (2^attempt * INITIAL_RETRY_DELAY)
        const delay = Math.pow(2, attempt) * this.INITIAL_RETRY_DELAY;
        
        logger.warn(LogCategory.EDITOR, '[EditorSaveService] ⚠️ Save failed, retrying', {
          noteId: noteId.substring(0, 8),
          operationId,
          attempt: attempt + 1,
          maxRetries: this.MAX_RETRIES,
          delay: `${delay}ms`,
          error: error instanceof Error ? error.message : String(error)
        });

        // Attendre avant de réessayer (backoff exponentiel)
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * Sauvegarder une note avec protection race conditions et idempotence
   * 
   * @param noteId - ID de la note
   * @param payload - Données à sauvegarder
   * @param options - Options de sauvegarde
   * @returns Promise résolue quand la sauvegarde est terminée
   */
  async saveNote(
    noteId: string,
    payload: NoteUpdatePayload,
    options: SaveOptions = {}
  ): Promise<void> {
    // Générer un operation_id unique (UUID v4)
    const operationId = generateUUID();
    
    // Vérifier si c'est une note temporaire
    const isTemporary = isTemporaryCanvaNote(noteId);
    
    // Si note temporaire et skipApi, ne pas appeler l'API
    if (isTemporary && options.skipApi) {
      if (options.updateNote) {
        options.updateNote(noteId, payload);
      }
      logger.dev(LogCategory.EDITOR, '[EditorSaveService] Temporary note, skipping API', {
        noteId: noteId.substring(0, 8),
        operationId
      });
      return;
    }

    // Exécuter de manière exclusive (pattern runExclusive)
    return this.runExclusive(noteId, async () => {
      // Vérifier déduplication côté serveur
      const exists = await this.checkOperationExists(operationId);
      if (exists) {
        logger.info(LogCategory.EDITOR, '[EditorSaveService] ♻️ Operation already exists (deduplication)', {
          noteId: noteId.substring(0, 8),
          operationId
        });
        return;
      }

      // Mise à jour optimiste du store si fourni
      if (options.updateNote) {
        options.updateNote(noteId, payload);
      }

      // Si note temporaire, ne pas appeler l'API
      if (isTemporary) {
        logger.dev(LogCategory.EDITOR, '[EditorSaveService] Temporary note, skipping API', {
          noteId: noteId.substring(0, 8),
          operationId
        });
        return;
      }

      // Appeler l'API avec retry logic et backoff exponentiel
      await this.saveWithRetry(noteId, payload, operationId);

      logger.info(LogCategory.EDITOR, '[EditorSaveService] ✅ Note saved', {
        noteId: noteId.substring(0, 8),
        operationId,
        fields: Object.keys(payload)
      });
    });
  }

  /**
   * Vérifier si une note a une opération de sauvegarde en cours
   */
  isLocked(noteId: string): boolean {
    return this.queues.has(noteId);
  }

  /**
   * Retourne le nombre de notes avec opérations en cours
   * Utile pour monitoring/debugging
   */
  getActiveNotesCount(): number {
    return this.queues.size;
  }

  /**
   * Force la libération d'un lock (usage debug uniquement)
   * ⚠️ Peut causer des race conditions si utilisé en production
   */
  forceRelease(noteId: string): void {
    logger.warn(LogCategory.EDITOR, '[EditorSaveService] ⚠️ Force release', {
      noteId: noteId.substring(0, 8)
    });
    this.queues.delete(noteId);
  }

  /**
   * Réinitialise tous les locks (usage tests uniquement)
   */
  resetAll(): void {
    logger.warn(LogCategory.EDITOR, '[EditorSaveService] ⚠️ Reset all locks');
    this.queues.clear();
  }
}

/**
 * Instance singleton exportée
 */
export const editorSaveService = EditorSaveService.getInstance();

