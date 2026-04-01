/**
 * 🎨 CANVA NOTE SERVICE V2
 * 
 * Architecture propre avec table canva_sessions
 * Lien vers chat_sessions + notes DB reelles (is_canva_draft)
 * 
 * @module CanvaNoteService
 */

import { logger, LogCategory } from '@/utils/logger';
import { supabase } from '@/supabaseClient';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { CanvaSession } from '@/types/canva';
import { SlugAndUrlService } from '@/services/slugAndUrlService';
import { v2UnifiedApi } from '@/services/V2UnifiedApi';
type AnySupabaseClient = ReturnType<typeof import('@supabase/supabase-js').createClient>;

/**
 * Options pour la création d'une note canva
 */
type CanvaSessionStatus = 'open' | 'closed' | 'saved' | 'deleted';

interface CreateCanvaNoteOptions {
  title?: string;
  initialContent?: string;
  classeurId?: string | null;
  folderId?: string | null;
  metadata?: Record<string, unknown>;
}

interface OpenSessionParams {
  chatSessionId: string;
  userId: string;
  noteId?: string;
  createIfMissing?: boolean;
  title?: string;
  classeurId?: string | null;
  metadata?: Record<string, unknown>;
  initialContent?: string;
}

/**
 * Type pour le row de DB avec JOIN sur articles
 * Utilisé pour mapper les résultats de Supabase vers CanvaSession
 */
interface CanvaSessionRow {
  id: string;
  chat_session_id: string;
  note_id: string;
  user_id: string;
  title?: string;
  status: string;
  created_at: string;
  closed_at: string | null;
  saved_at: string | null;
  metadata: Record<string, unknown> | null;
  note?: {
    source_title?: string;
    slug?: string;
    classeur_id?: string;
    updated_at?: string;
    header_image?: string;
  };
}

/**
 * Service centralisé pour la gestion des canvases
 */
export class CanvaNoteService {
  private static sessionLocks = new Map<string, Promise<void>>();

  private static resolveClient(clientOverride?: SupabaseClient): SupabaseClient {
    return (clientOverride ?? (supabase as SupabaseClient));
  }

  /**
   * 📝 Créer un canva avec note DB et session
   * 
   * Architecture V2:
   * 1. Créer note DB (classeur_id = NULL, is_canva_draft = TRUE)
   * 2. Créer entrée canva_sessions (lien vers chat_sessions)
   * 
   * @param userId - ID utilisateur authentifié
   * @param chatSessionId - ID session chat (lien)
   * @param options - Options de création (titre, contenu initial)
   * @returns { canvaId, noteId }
   * 
   * @example
   * ```ts
   * const { canvaId, noteId } = await CanvaNoteService.createCanvaNote(
   *   user.id,
   *   chatSession.id,
   *   { title: "Article TypeScript" }
   * );
   * ```
   */
  static async createCanvaNote(
    userId: string,
    chatSessionId: string,
    options?: CreateCanvaNoteOptions,
    supabaseClient?: SupabaseClient
  ): Promise<{ canvaId: string; noteId: string }> {
    try {
      const client = this.resolveClient(supabaseClient);
      const slugClient = client as unknown as AnySupabaseClient;
      await this.ensureChatSessionOwnership(chatSessionId, userId, client);
      const noteTitle = options?.title || this.generateDefaultTitle();
      const initialContent = options?.initialContent || '';
      let targetClasseurId = options?.classeurId ?? null;
      let targetFolderId = options?.folderId ?? null;

      // Rejeter classeur / dossier inexistants ou hors compte (ex. LLM avec mauvais UUID) — évite FK 500
      if (targetClasseurId) {
        const { data: ownedClasseur } = await client
          .from('classeurs')
          .select('id')
          .eq('id', targetClasseurId)
          .eq('user_id', userId)
          .maybeSingle();
        if (!ownedClasseur) {
          logger.warn(
            LogCategory.EDITOR,
            '[CanvaNoteService] classeur_id invalide ou non autorisé — repli Quicknotes',
            { requestedClasseurId: targetClasseurId }
          );
          targetClasseurId = null;
          targetFolderId = null;
        }
      }

      if (targetFolderId) {
        const { data: folderRow } = await client
          .from('folders')
          .select('id, classeur_id')
          .eq('id', targetFolderId)
          .eq('user_id', userId)
          .maybeSingle();
        if (!folderRow) {
          logger.warn(LogCategory.EDITOR, '[CanvaNoteService] folder_id invalide, ignoré', {
            targetFolderId
          });
          targetFolderId = null;
        } else if (targetClasseurId && folderRow.classeur_id !== targetClasseurId) {
          logger.warn(LogCategory.EDITOR, '[CanvaNoteService] folder_id hors du classeur demandé, ignoré', {
            targetFolderId,
            expectedClasseurId: targetClasseurId,
            folderClasseurId: folderRow.classeur_id
          });
          targetFolderId = null;
        } else if (!targetClasseurId) {
          targetClasseurId = folderRow.classeur_id as string;
        }
      }

      // Si aucun classeur spécifié, utiliser Quicknotes > dossier Canvas
      if (!targetClasseurId && !targetFolderId) {
        try {
          const { getOrCreateQuicknotesFoldersServer } = await import(
            '@/utils/quicknotesUtils'
          );
          const quicknotesFolders = await getOrCreateQuicknotesFoldersServer(userId, client);
          targetClasseurId = quicknotesFolders.quicknotesClasseurId;
          targetFolderId = quicknotesFolders.canvasFolderId;
          logger.info(LogCategory.EDITOR, '[CanvaNoteService] Utilisation Quicknotes > Canvas', {
            classeurId: targetClasseurId,
            folderId: targetFolderId,
          });
        } catch (err) {
          logger.warn(LogCategory.EDITOR, '[CanvaNoteService] Erreur Quicknotes, note orpheline', {
            error: err instanceof Error ? err.message : String(err),
          });
          // Continuer avec null (note orpheline) si Quicknotes non disponible
        }
      }

      const sessionMetadata = options?.metadata ?? {};

      logger.info(LogCategory.EDITOR, '[CanvaNoteService] Creating canva note', {
        userId,
        chatSessionId,
        title: noteTitle,
        hasInitialContent: !!options?.initialContent
      });

      // 1. Générer slug unique (sans noteId car note pas encore créée)
      const { slug } = await SlugAndUrlService.generateSlugAndUpdateUrl(
        noteTitle,
        userId,
        undefined, // noteId pas encore créé
        slugClient
      );

      // 2. Créer note DB avec flag canva draft (direct Supabase)
      const { data: note, error: noteError } = await client
        .from('articles')
        .insert({
          source_title: noteTitle,
          markdown_content: initialContent,
          html_content: initialContent,
          classeur_id: targetClasseurId,
          folder_id: targetFolderId,
          user_id: userId,
          slug,
          public_url: null, // Sera généré après avoir le noteId
          font_family: 'Manrope',
          is_canva_draft: true // Flag pour exclure notes récentes
        })
        .select('id')
        .single();

      if (noteError || !note) {
        logger.error(LogCategory.EDITOR, '[CanvaNoteService] Failed to create note', noteError);
        throw new Error(noteError?.message || 'Failed to create note');
      }

      const noteId = note.id;

      // 3. Générer URL publique permanente avec noteId
      const { publicUrl } = await SlugAndUrlService.generateSlugAndUpdateUrl(
        noteTitle,
        userId,
        noteId,
        slugClient
      );

      // 4. Mettre à jour la note avec l'URL publique
      if (publicUrl) {
        await client
          .from('articles')
          .update({ public_url: publicUrl })
          .eq('id', noteId);
      }

      logger.info(LogCategory.EDITOR, '[CanvaNoteService] ✅ Note created', {
        noteId,
        title: noteTitle,
        publicUrl
      });

      // 5. Créer session canva (title vient du JOIN avec articles)
      const { data: canvaSession, error: canvaError } = await client
        .from('canva_sessions')
        .insert({
          chat_session_id: chatSessionId,
          note_id: noteId,
          user_id: userId,
          status: 'open',
          metadata: Object.keys(sessionMetadata).length > 0 ? sessionMetadata : null
        })
        .select()
        .single();

      if (canvaError) {
        // Rollback: supprimer note créée
        const { error: rollbackError } = await client
          .from('articles')
          .delete()
          .eq('id', noteId)
          .eq('user_id', userId);

        if (rollbackError) {
          logger.warn(LogCategory.EDITOR, '[CanvaNoteService] Failed to rollback note', {
            noteId,
            error: {
              message: rollbackError.message,
              details: rollbackError.details
            }
          });
        }
        
        logger.error(LogCategory.EDITOR, '[CanvaNoteService] Failed to create canva session', canvaError);
        throw new Error(canvaError.message || 'Failed to create canva session');
      }

      logger.info(LogCategory.EDITOR, '[CanvaNoteService] ✅ Canva session created', {
        canvaId: canvaSession.id,
        noteId,
        chatSessionId
      });

      return {
        canvaId: canvaSession.id,
        noteId
      };

    } catch (error) {
      logger.error(LogCategory.EDITOR, '[CanvaNoteService] ❌ Failed to create canva', error);
      throw new Error(`Failed to create canva: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 💾 Sauvegarder un canva (attacher à classeur + update status)
   * 
   * Architecture V2:
   * 1. Update note: is_canva_draft = FALSE + classeur_id
   * 2. Update canva_session: status = 'saved'
   * 
   * @param canvaId - ID canva_session
   * @param classeurId - ID du classeur cible
   * @param folderId - ID du dossier cible (optionnel)
   * @param userId - ID utilisateur authentifié
   * 
   * @example
   * ```ts
   * await CanvaNoteService.saveCanva(
   *   canvaId,
   *   "classeur-123",
   *   "folder-456",
   *   user.id
   * );
   * ```
   */
  static async saveCanva(
    canvaId: string,
    classeurId: string,
    folderId: string | null | undefined,
    userId: string,
    supabaseClient?: SupabaseClient
  ): Promise<void> {
    try {
      const client = this.resolveClient(supabaseClient);
      // 1. Récupérer canva session
      const { data: canvaSession, error: fetchError } = await client
        .from('canva_sessions')
        .select('*')
        .eq('id', canvaId)
        .eq('user_id', userId)
        .single();

      if (fetchError || !canvaSession) {
        throw new Error('Canva session not found');
      }

      logger.info(LogCategory.EDITOR, '[CanvaNoteService] Saving canva', {
        canvaId,
        noteId: canvaSession.note_id,
        classeurId,
        folderId
      });

      // 2. Update note: is_canva_draft = false + classeur_id
      await v2UnifiedApi.updateNote(
        canvaSession.note_id,
        {
          classeur_id: classeurId,
          folder_id: folderId ?? null,
          is_canva_draft: false // Note devient visible
        }
      );

      // 3. Update canva_session: status = saved
      const { error: updateError } = await client
        .from('canva_sessions')
        .update({
          status: 'saved',
          saved_at: new Date().toISOString()
        })
        .eq('id', canvaId)
        .eq('user_id', userId);

      if (updateError) {
        throw updateError;
      }

      logger.info(LogCategory.EDITOR, '[CanvaNoteService] ✅ Canva saved', {
        canvaId,
        noteId: canvaSession.note_id,
        classeurId
      });

    } catch (error) {
      logger.error(LogCategory.EDITOR, '[CanvaNoteService] ❌ Failed to save canva', error);
      throw new Error(`Failed to save canva: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 🔄 Récupérer les canvases d'une session chat
   * 
   * ✅ JOIN avec articles pour titre à jour (source_title)
   * ✅ Retourne titre synchronisé depuis note DB
   * 
   * @param chatSessionId - ID session chat
   * @param userId - ID utilisateur authentifié
   * @returns Liste des canva sessions avec titre à jour
   */
  static async getCanvasForSession(
    chatSessionId: string,
    userId: string,
    supabaseClient?: SupabaseClient,
    options?: {
      statuses?: CanvaSessionStatus[];
    }
  ): Promise<CanvaSession[]> {
    try {
      const client = this.resolveClient(supabaseClient);
      // ✅ Par défaut : afficher TOUS les canevas sauf deleted
      // Le status ne contrôle PAS la visibilité dans le menu (un canva existe = toujours visible)
      // Status = état métier uniquement : open/closed (UI), saved (classeur), deleted (supprimé)
      const allowedStatuses =
        options?.statuses && options.statuses.length > 0
          ? options.statuses
          : (['open', 'closed', 'saved'] as CanvaSessionStatus[]);
      
      // JOIN avec articles pour titre à jour
      let query = client
        .from('canva_sessions')
        .select(`
          *,
          note:articles!inner(
            source_title,
            slug,
            updated_at,
            header_image,
            classeur_id
          )
        `)
        .eq('chat_session_id', chatSessionId)
        .eq('user_id', userId);

      if (allowedStatuses.length === 1) {
        query = query.eq('status', allowedStatuses[0]);
      } else {
        query = query.in('status', allowedStatuses);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        logger.error(LogCategory.EDITOR, '[CanvaNoteService] Supabase query error', {
          error: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          chatSessionId,
          userId
        });
        throw error;
      }

      // Mapper résultat pour synchroniser titre
      const canvaSessions: CanvaSession[] = (data || []).map((row: CanvaSessionRow) =>
        this.mapRowToSession(row)
      );

      logger.info(LogCategory.EDITOR, '[CanvaNoteService] Fetched canvases with updated titles', {
        chatSessionId,
        statuses: allowedStatuses,
        count: canvaSessions.length,
        titles: canvaSessions.map(c => c.title)
      });

      return canvaSessions;

    } catch (error) {
      logger.error(LogCategory.EDITOR, '[CanvaNoteService] ❌ Failed to get canvases', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        chatSessionId,
        userId
      });
      return [];
    }
  }

  /**
   * 📂 Ouvrir une note existante en canva
   * 
   * Crée une session canva pour une note déjà existante
   * (sans créer nouvelle note)
   * 
   * @param noteId - ID note existante
   * @param chatSessionId - ID session chat
   * @param userId - ID utilisateur
   * @returns { canvaId, noteId }
   */
  static async openExistingNoteAsCanva(
    noteId: string,
    chatSessionId: string,
    userId: string,
    supabaseClient?: SupabaseClient
  ): Promise<{ canvaId: string; noteId: string }> {
    try {
      const client = this.resolveClient(supabaseClient);

      // 1. Récupérer titre de la note
      const { data: note, error: noteError } = await client
        .from('articles')
        .select('source_title, user_id')
        .eq('id', noteId)
        .eq('user_id', userId) // Sécurité: vérifier ownership
        .single();

      if (noteError || !note) {
        throw new Error('Note introuvable ou accès refusé');
      }

      // 2. ✅ Vérifier si un canva_session existe déjà pour cette note
      // Constraint UNIQUE(note_id) : une note = un seul canva max
      const { data: existingSession, error: checkError } = await client
        .from('canva_sessions')
        .select('id, chat_session_id, status')
        .eq('note_id', noteId)
        .eq('user_id', userId)
        .maybeSingle();

      if (checkError) {
        logger.error(LogCategory.EDITOR, '[CanvaNoteService] ❌ Erreur vérification canva existant', {
          error: checkError,
          noteId,
          errorCode: (checkError as { code?: string }).code,
          errorMessage: (checkError as { message?: string }).message,
          errorDetails: (checkError as { details?: string }).details
        });
        throw checkError;
      }

      // 3. Si canva_session existe déjà, le récupérer et mettre à jour
      if (existingSession) {
        logger.info(LogCategory.EDITOR, '[CanvaNoteService] 🔄 Canva session existante trouvée, mise à jour', {
          canvaId: existingSession.id,
          noteId,
          currentChatSession: existingSession.chat_session_id,
          newChatSession: chatSessionId,
          currentStatus: existingSession.status
        });

        // Mettre à jour : status='open' et chat_session_id si différent
        const updates: Record<string, unknown> = { status: 'open' };
        if (existingSession.chat_session_id !== chatSessionId) {
          updates.chat_session_id = chatSessionId;
        }

        const { data: updatedSession, error: updateError } = await client
          .from('canva_sessions')
          .update(updates)
          .eq('id', existingSession.id)
          .eq('user_id', userId)
          .select()
          .single();

        if (updateError) {
          logger.error(LogCategory.EDITOR, '[CanvaNoteService] ❌ Erreur mise à jour canva existant', {
            error: updateError,
            canvaId: existingSession.id,
            errorCode: (updateError as { code?: string }).code,
            errorMessage: (updateError as { message?: string }).message,
            errorDetails: (updateError as { details?: string }).details
          });
          throw updateError;
        }

        logger.info(LogCategory.EDITOR, '[CanvaNoteService] ✅ Canva session existante réouverte', {
          canvaId: updatedSession.id,
          noteId,
          title: note.source_title
        });

        return { canvaId: updatedSession.id, noteId };
      }

      // 4. Sinon, créer nouvelle session canva
      const { data: canvaSession, error: canvaError } = await client
        .from('canva_sessions')
        .insert({
          chat_session_id: chatSessionId,
          note_id: noteId,
          user_id: userId,
          status: 'open'
        })
        .select()
        .single();

      if (canvaError) {
        // ✅ Améliorer le logging pour voir la vraie erreur Supabase
        logger.error(LogCategory.EDITOR, '[CanvaNoteService] ❌ Erreur création canva session', {
          error: canvaError,
          noteId,
          chatSessionId,
          errorCode: (canvaError as { code?: string }).code,
          errorMessage: (canvaError as { message?: string }).message,
          errorDetails: (canvaError as { details?: string }).details,
          errorHint: (canvaError as { hint?: string }).hint
        });
        throw canvaError;
      }

      logger.info(LogCategory.EDITOR, '[CanvaNoteService] ✅ Nouvelle canva session créée', {
        canvaId: canvaSession.id,
        noteId,
        title: note.source_title
      });

      return { canvaId: canvaSession.id, noteId };

    } catch (error) {
      // ✅ Améliorer le logging d'erreur pour voir la vraie erreur Supabase
      const errorDetails = error instanceof Error 
        ? {
            message: error.message,
            name: error.name,
            stack: error.stack
          }
        : {
            type: typeof error,
            stringified: String(error),
            json: JSON.stringify(error, Object.getOwnPropertyNames(error))
          };

      logger.error(LogCategory.EDITOR, '[CanvaNoteService] ❌ Failed to open existing note as canva', {
        error,
        noteId,
        chatSessionId,
        errorDetails
      });

      // ✅ Construire un message d'erreur plus informatif
      let errorMessage = 'Failed to open note as canva';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        // Gérer les erreurs Supabase PostgrestError
        const supabaseError = error as { code?: string; message?: string; details?: string; hint?: string };
        if (supabaseError.code === '23505') {
          // Constraint unique violation
          errorMessage = 'Cette note est déjà associée à un canevas. Utilisez canva.list_sessions pour trouver le canevas existant.';
        } else if (supabaseError.message) {
          errorMessage = supabaseError.message;
        } else {
          errorMessage = JSON.stringify(error, Object.getOwnPropertyNames(error));
        }
      } else {
        errorMessage = String(error);
      }

      throw new Error(errorMessage);
    }
  }

  /**
   * 🔄 Mettre à jour le statut d'un canva
   * 
   * @param canvaId - ID canva_session
   * @param status - Nouveau statut
   * @param userId - ID utilisateur authentifié
   */
  static async updateCanvaStatus(
    canvaId: string,
    status: 'open' | 'closed' | 'saved' | 'deleted',
    userId: string,
    supabaseClient?: SupabaseClient
  ): Promise<void> {
    try {
      const client = this.resolveClient(supabaseClient);
      const updates: Record<string, unknown> = { status };

      // Ajouter timestamp selon statut
      if (status === 'closed') {
        updates.closed_at = new Date().toISOString();
      } else if (status === 'saved') {
        updates.saved_at = new Date().toISOString();
      }

      const { error } = await client
        .from('canva_sessions')
        .update(updates)
        .eq('id', canvaId)
        .eq('user_id', userId);

      if (error) {
        throw error;
      }

      logger.info(LogCategory.EDITOR, '[CanvaNoteService] ✅ Canva status updated', {
        canvaId,
        status
      });

    } catch (error) {
      logger.error(LogCategory.EDITOR, '[CanvaNoteService] ❌ Failed to update status', error);
      throw new Error(`Failed to update canva status: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 🗑️ Supprimer un canva (CASCADE: canva_session + note)
   * 
   * @param canvaId - ID canva_session
   * @param userId - ID utilisateur authentifié
   */
  static async deleteCanva(
    canvaId: string,
    userId: string,
    supabaseClient?: SupabaseClient
  ): Promise<void> {
    try {
      const client = this.resolveClient(supabaseClient);
      logger.info(LogCategory.EDITOR, '[CanvaNoteService] Deleting canva', {
        canvaId
      });

      // Supprimer canva_session (CASCADE supprime aussi la note)
      const { error } = await client
        .from('canva_sessions')
        .delete()
        .eq('id', canvaId)
        .eq('user_id', userId);

      if (error) {
        throw error;
      }

      logger.info(LogCategory.EDITOR, '[CanvaNoteService] ✅ Canva deleted', {
        canvaId
      });

    } catch (error) {
      logger.error(LogCategory.EDITOR, '[CanvaNoteService] ❌ Failed to delete canva', error);
      throw new Error(`Failed to delete canva: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 🧹 Nettoyer les canvases anciens (status closed > X jours)
   * 
   * @param userId - ID utilisateur authentifié
   * @param olderThanDays - Age minimum en jours (défaut: 7)
   * @returns Nombre de canvases supprimés
   */
  static async cleanupOldCanvases(
    userId: string,
    olderThanDays: number = 7,
    supabaseClient?: SupabaseClient
  ): Promise<number> {
    try {
      const client = this.resolveClient(supabaseClient);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      // Récupérer canvases fermés anciens
      const { data: oldCanvases, error: fetchError } = await client
        .from('canva_sessions')
        .select('id, closed_at')
        .eq('user_id', userId)
        .eq('status', 'closed')
        .lt('closed_at', cutoffDate.toISOString());

      if (fetchError) {
        throw fetchError;
      }

      let deletedCount = 0;

      for (const canva of oldCanvases || []) {
        await this.deleteCanva(canva.id, userId, client);
        deletedCount++;
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

  /**
   * 🔐 Ouvrir (ou créer) une session canva de façon atomique
   */
  static async openSession(
    params: OpenSessionParams,
    supabaseClient?: SupabaseClient
  ): Promise<CanvaSession> {
    const {
      chatSessionId,
      userId,
      noteId,
      createIfMissing = false,
      title,
      classeurId,
      metadata
    } = params;

    const client = this.resolveClient(supabaseClient);

    return this.runExclusive(chatSessionId, async () => {
      await this.ensureChatSessionOwnership(chatSessionId, userId, client);

      let created: { canvaId: string; noteId: string };

      if (noteId) {
        created = await this.openExistingNoteAsCanva(noteId, chatSessionId, userId, client);
      } else if (createIfMissing) {
        created = await this.createCanvaNote(
          userId,
          chatSessionId,
          {
            title,
            classeurId: classeurId ?? null,
            metadata,
            initialContent: params.initialContent ?? ''
          },
          client
        );
      } else {
        throw new Error('note_id est obligatoire lorsque create_if_missing est false');
      }

      const session = await this.getSessionById(created.canvaId, userId, client);
      if (!session) {
        throw new Error('Canva session introuvable après création');
      }

      return session;
    });
  }

  /**
   * 🚪 Fermer une session canva (pane)
   */
  static async closeSession(
    canvaSessionId: string,
    userId: string,
    supabaseClient?: SupabaseClient
  ): Promise<CanvaSession> {
    const client = this.resolveClient(supabaseClient);
    await this.updateCanvaStatus(canvaSessionId, 'closed', userId, client);
    const session = await this.getSessionById(canvaSessionId, userId, client);

    if (!session) {
      throw new Error('Canva session introuvable après fermeture');
    }

    return session;
  }

  /**
   * 🗑️ Supprimer une session canva (détacher note <-> chat)
   */
  static async deleteSession(
    canvaSessionId: string,
    userId: string,
    supabaseClient?: SupabaseClient
  ): Promise<void> {
    await this.deleteCanva(canvaSessionId, userId, supabaseClient);
  }

  /**
   * 🔍 Récupérer une session canva par ID (public pour API V2)
   */
  static async getSessionById(
    canvaSessionId: string,
    userId: string,
    supabaseClient?: SupabaseClient
  ): Promise<CanvaSession | null> {
    const client = this.resolveClient(supabaseClient);
    const { data, error } = await client
      .from('canva_sessions')
      .select(`
        *,
        note:articles!inner(
          source_title,
          slug,
          updated_at,
          header_image,
          classeur_id
        )
      `)
      .eq('id', canvaSessionId)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapRowToSession(data);
  }

  /**
   * 📝 Update session canva (status, metadata)
   * Utilisé par PATCH /api/v2/canva/sessions/:id
   */
  static async updateSession(
    canvaSessionId: string,
    userId: string,
    supabaseClient: SupabaseClient,
    updates: {
      status?: CanvaSessionStatus;
      metadata?: Record<string, unknown>;
    }
  ): Promise<CanvaSession> {
    const client = this.resolveClient(supabaseClient);

    // Verify ownership
    const existing = await this.getSessionById(canvaSessionId, userId, client);
    if (!existing) {
      throw new Error('Canva session introuvable ou non autorisée');
    }

    // Build update object
    const updateData: Record<string, unknown> = {};
    if (updates.status) {
      updateData.status = updates.status;
      if (updates.status === 'closed') {
        updateData.closed_at = new Date().toISOString();
      } else if (updates.status === 'saved') {
        updateData.saved_at = new Date().toISOString();
      }
    }
    if (updates.metadata) {
      updateData.metadata = updates.metadata;
    }

    const { data, error } = await client
      .from('canva_sessions')
      .update(updateData)
      .eq('id', canvaSessionId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to update canva session: ${error?.message}`);
    }

    // Re-fetch avec note pour cohérence
    const updated = await this.getSessionById(canvaSessionId, userId, client);
    if (!updated) {
      throw new Error('Failed to fetch updated session');
    }

    return updated;
  }

  private static mapRowToSession(row: CanvaSessionRow): CanvaSession {
    return {
      id: row.id,
      chat_session_id: row.chat_session_id,
      note_id: row.note_id,
      user_id: row.user_id,
      title: row.note?.source_title || row.title || this.generateDefaultTitle(),
      status: row.status as CanvaSession['status'], // Type assertion car DB retourne string
      created_at: row.created_at,
      closed_at: row.closed_at,
      saved_at: row.saved_at,
      metadata: {
        ...(row.metadata ?? {}),
        note_slug: row.note?.slug,
        classeur_id: row.note?.classeur_id,
        note_updated_at: row.note?.updated_at,
        header_image: row.note?.header_image
      }
    };
  }

  private static async ensureChatSessionOwnership(
    chatSessionId: string,
    userId: string,
    client: SupabaseClient
  ): Promise<void> {
    const { data, error } = await client
      .from('chat_sessions')
      .select('id')
      .eq('id', chatSessionId)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      throw new Error('Chat session introuvable ou accès refusé');
    }
  }

  private static async runExclusive<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const previous = this.sessionLocks.get(key) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    const chained = previous.then(() => current);
    this.sessionLocks.set(key, chained);

    await previous;
    try {
      return await fn();
    } finally {
      release();
      if (this.sessionLocks.get(key) === chained) {
        this.sessionLocks.delete(key);
      }
    }
  }
}

