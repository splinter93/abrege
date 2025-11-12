/**
 * 🎨 CANVA NOTE SERVICE
 * 
 * Gestion des notes "orphelines" pour le système Canva.
 * Une note orpheline existe en DB mais est invisible dans l'UI
 * jusqu'à ce qu'elle soit explicitement attachée à un classeur.
 * 
 * @module CanvaNoteService
 */

import { logger, LogCategory } from '@/utils/logger';
import { v2UnifiedApi } from '@/services/v2UnifiedApi';

/**
 * Options pour la création d'une note orpheline
 */
interface CreateOrphanNoteOptions {
  title?: string;
  initialContent?: string;
}

/**
 * Service centralisé pour la gestion des notes Canva
 */
export class CanvaNoteService {
  /**
   * 📝 Créer une note orpheline (invisible dans sidebar)
   * 
   * Une note orpheline a:
   * - classeur_id = NULL
   * - folder_id = NULL
   * - markdown_content = "" (ou initialContent)
   * 
   * Elle existe en DB mais n'apparaît pas dans l'UI jusqu'au "save".
   * 
   * @param userId - ID utilisateur authentifié
   * @param options - Options de création (titre, contenu initial)
   * @returns ID de la note créée
   * 
   * @example
   * ```ts
   * const noteId = await CanvaNoteService.createOrphanNote(user.id, {
   *   title: "Brouillon article"
   * });
   * ```
   */
  static async createOrphanNote(
    userId: string,
    options?: CreateOrphanNoteOptions
  ): Promise<string> {
    try {
      const noteTitle = options?.title || this.generateDefaultTitle();
      const initialContent = options?.initialContent || '';

      logger.info(LogCategory.EDITOR, '[CanvaNoteService] Creating orphan note', {
        userId,
        title: noteTitle,
        hasInitialContent: !!options?.initialContent
      });

      // Créer note via API V2 avec notebook_id = null
      const result = await v2UnifiedApi.createNote(
        {
          source_title: noteTitle,
          markdown_content: initialContent,
          notebook_id: null, // ← Note orpheline
          folder_id: null
        },
        userId
      );

      logger.info(LogCategory.EDITOR, '[CanvaNoteService] ✅ Orphan note created', {
        noteId: result.note.id,
        title: noteTitle
      });

      return result.note.id;

    } catch (error) {
      logger.error(LogCategory.EDITOR, '[CanvaNoteService] ❌ Failed to create orphan note', error);
      throw new Error(`Failed to create canva note: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 💾 Attacher une note orpheline à un classeur (= "sauvegarder")
   * 
   * Rend la note visible dans la sidebar en lui assignant un classeur.
   * 
   * @param noteId - ID de la note orpheline
   * @param classeurId - ID du classeur cible
   * @param folderId - ID du dossier cible (optionnel)
   * @param userId - ID utilisateur authentifié
   * 
   * @example
   * ```ts
   * await CanvaNoteService.attachToClasseur(
   *   noteId,
   *   "classeur-123",
   *   "folder-456",
   *   user.id
   * );
   * ```
   */
  static async attachToClasseur(
    noteId: string,
    classeurId: string,
    folderId: string | null,
    userId: string
  ): Promise<void> {
    try {
      logger.info(LogCategory.EDITOR, '[CanvaNoteService] Attaching note to classeur', {
        noteId,
        classeurId,
        folderId
      });

      await v2UnifiedApi.updateNote(
        noteId,
        {
          classeur_id: classeurId,
          folder_id: folderId
        },
        userId
      );

      logger.info(LogCategory.EDITOR, '[CanvaNoteService] ✅ Note attached', {
        noteId,
        classeurId
      });

    } catch (error) {
      logger.error(LogCategory.EDITOR, '[CanvaNoteService] ❌ Failed to attach note', error);
      throw new Error(`Failed to save canva note: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 🗑️ Supprimer une note orpheline
   * 
   * Utilisé quand l'utilisateur ferme le canva sans sauvegarder.
   * 
   * @param noteId - ID de la note à supprimer
   * @param userId - ID utilisateur authentifié
   * 
   * @example
   * ```ts
   * await CanvaNoteService.deleteOrphanNote(noteId, user.id);
   * ```
   */
  static async deleteOrphanNote(
    noteId: string,
    userId: string
  ): Promise<void> {
    try {
      logger.info(LogCategory.EDITOR, '[CanvaNoteService] Deleting orphan note', {
        noteId
      });

      await v2UnifiedApi.deleteNote(noteId, userId);

      logger.info(LogCategory.EDITOR, '[CanvaNoteService] ✅ Orphan note deleted', {
        noteId
      });

    } catch (error) {
      logger.error(LogCategory.EDITOR, '[CanvaNoteService] ❌ Failed to delete orphan note', error);
      // Non-bloquant : si la note n'existe plus, c'est pas grave
      logger.debug(LogCategory.EDITOR, '[CanvaNoteService] Delete failed but continuing', {
        noteId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * 📋 Récupérer toutes les notes orphelines d'un utilisateur
   * 
   * Utilisé pour la récupération de brouillons après crash.
   * 
   * @param userId - ID utilisateur authentifié
   * @returns Liste des notes orphelines avec leurs métadonnées
   * 
   * @example
   * ```ts
   * const orphans = await CanvaNoteService.listOrphanNotes(user.id);
   * if (orphans.length > 0) {
   *   // Proposer de récupérer
   * }
   * ```
   */
  static async listOrphanNotes(userId: string): Promise<Array<{
    id: string;
    title: string;
    created_at: string;
    updated_at: string;
    markdown_content: string;
  }>> {
    try {
      logger.debug(LogCategory.EDITOR, '[CanvaNoteService] Listing orphan notes', {
        userId
      });

      // Récupérer notes avec classeur_id = NULL
      const result = await v2UnifiedApi.searchNotes(
        {
          userId,
          classeurId: null // Filtre pour orphelines
        }
      );

      logger.info(LogCategory.EDITOR, '[CanvaNoteService] ✅ Found orphan notes', {
        count: result.notes?.length || 0
      });

      return result.notes || [];

    } catch (error) {
      logger.error(LogCategory.EDITOR, '[CanvaNoteService] ❌ Failed to list orphan notes', error);
      return []; // Fallback gracieux
    }
  }

  /**
   * 🧹 Nettoyer les notes orphelines anciennes
   * 
   * Supprimer notes orphelines plus vieilles que X jours (cron job).
   * 
   * @param userId - ID utilisateur authentifié
   * @param olderThanDays - Age minimum en jours (défaut: 7)
   * @returns Nombre de notes supprimées
   * 
   * @example
   * ```ts
   * // Supprimer notes orphelines > 7 jours
   * const deleted = await CanvaNoteService.cleanupOldOrphans(user.id, 7);
   * ```
   */
  static async cleanupOldOrphans(
    userId: string,
    olderThanDays: number = 7
  ): Promise<number> {
    try {
      const orphans = await this.listOrphanNotes(userId);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      let deletedCount = 0;

      for (const orphan of orphans) {
        const createdAt = new Date(orphan.created_at);
        if (createdAt < cutoffDate) {
          await this.deleteOrphanNote(orphan.id, userId);
          deletedCount++;
        }
      }

      logger.info(LogCategory.EDITOR, '[CanvaNoteService] ✅ Cleanup completed', {
        deletedCount,
        olderThanDays
      });

      return deletedCount;

    } catch (error) {
      logger.error(LogCategory.EDITOR, '[CanvaNoteService] ❌ Cleanup failed', error);
      return 0;
    }
  }

  /**
   * 🎨 Générer un titre par défaut pour un canva
   * 
   * Format: "Canva — JJ/MM HH:MM"
   */
  private static generateDefaultTitle(): string {
    const now = new Date();
    return `Canva — ${now.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })}`;
  }
}

