/**
 * API pour les notes
 * Extrait de V2UnifiedApi pour respecter limite 300 lignes
 */

import { useFileSystemStore, type Note } from '@/store/useFileSystemStore';
import { simpleLogger as logger } from '@/utils/logger';
import { ApiClient } from '../core/ApiClient';
import type { CreateNoteData, UpdateNoteData } from '../types';

export class NoteApi {
  private apiClient: ApiClient;

  constructor(apiClient: ApiClient) {
    this.apiClient = apiClient;
  }

  /**
   * Créer une note
   */
  async createNote(noteData: CreateNoteData) {
    const startTime = Date.now();
    
    try {
      const headers = await this.apiClient.getAuthHeaders();
      const response = await fetch(this.apiClient.buildUrl('/api/v2/note/create'), {
        method: 'POST',
        headers,
        body: JSON.stringify(noteData)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Erreur lors de la création de la note');
      }

      // Déclencher le polling ciblé
      try {
        const { triggerPollingAfterNoteAction } = await import('@/services/uiActionPolling');
        await triggerPollingAfterNoteAction('note_created');
      } catch (error) {
        logger.warn('[NoteApi] ⚠️ Erreur déclenchement polling ciblé:', error);
      }

      const duration = Date.now() - startTime;
      return {
        success: true,
        note: result.note,
        duration
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
        duration
      };
    }
  }

  /**
   * Mettre à jour une note avec mise à jour optimiste
   */
  async updateNote(noteId: string, updateData: UpdateNoteData) {
    const startTime = Date.now();
    const store = useFileSystemStore.getState();
    let cleanNoteId = noteId;
    let previousNote: Note | null = null;
    let optimisticNote: Note | null = null;
    
    try {
      cleanNoteId = this.apiClient.cleanAndValidateId(noteId, 'note');
      
      const cleanData = Object.fromEntries(
        Object.entries(updateData).filter(([, value]) => value !== undefined)
      );
      
      // Mise à jour optimiste immédiate
      const currentNote = store.notes[cleanNoteId];
      previousNote = currentNote ? { ...currentNote } : null;
      
      const sanitizedUpdateData: Partial<Note> = {
        ...cleanData,
      };
      
      if (!('header_image' in cleanData) && currentNote?.header_image !== undefined) {
        delete sanitizedUpdateData.header_image;
      } else if (cleanData.header_image === null) {
        sanitizedUpdateData.header_image = undefined;
      }
      
      optimisticNote = {
        ...currentNote,
        ...sanitizedUpdateData,
        updated_at: new Date().toISOString()
      } as Note;
      store.updateNote(cleanNoteId, optimisticNote);

      // Appel vers l'endpoint API V2
      const headers = await this.apiClient.getAuthHeaders();
      const response = await fetch(this.apiClient.buildUrl(`/api/v2/note/${cleanNoteId}/update`), {
        method: 'PUT',
        headers,
        body: JSON.stringify(cleanData)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Erreur lors de la mise à jour de la note');
      }

      // Synchroniser le store avec la réponse serveur
      if (result.note) {
        const keysToSync = new Set<string>([...Object.keys(cleanData), 'updated_at']);
        const changedFields: Partial<typeof result.note> = {};
        
        for (const key in result.note) {
          if (!keysToSync.has(key)) continue;
          const keyName = key as Extract<keyof typeof result.note, string>;
          const nextValue = result.note[keyName];
          const optimisticValue = optimisticNote && typeof optimisticNote === 'object'
            ? (optimisticNote as unknown as Record<string, unknown>)[key]
            : undefined;
          const valuesAreEqual = nextValue === optimisticValue ||
            (nextValue === null && optimisticValue === undefined) ||
            (nextValue === undefined && optimisticValue === null);

          if (!valuesAreEqual) {
            changedFields[keyName] = nextValue;
          }
        }
        
        if (!('header_image' in cleanData) && optimisticNote?.header_image !== undefined) {
          delete changedFields.header_image;
        }
        
        if (Object.keys(changedFields).length > 0) {
          store.updateNote(cleanNoteId, changedFields);
        }
      }

      const duration = Date.now() - startTime;
      return {
        success: true,
        note: result.note,
        duration
      };

    } catch (error) {
      // Rollback en cas d'erreur
      if (previousNote) {
        store.updateNote(cleanNoteId, previousNote);
      }

      const duration = Date.now() - startTime;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
        duration
      };
    }
  }

  /**
   * Supprimer une note
   */
  async deleteNote(noteId: string, externalToken?: string) {
    const startTime = Date.now();
    
    try {
      const cleanNoteId = this.apiClient.cleanAndValidateId(noteId, 'note');
      
      let headers: HeadersInit;
      if (externalToken) {
        headers = {
          'Content-Type': 'application/json',
          'X-Client-Type': 'v2_unified_api',
          'Authorization': `Bearer ${externalToken}`
        };
      } else {
        headers = await this.apiClient.getAuthHeaders();
      }
      
      const response = await fetch(this.apiClient.buildUrl(`/api/v2/delete/note/${cleanNoteId}`), {
        method: 'DELETE',
        headers
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Erreur lors de la suppression de la note');
      }

      const { useFileSystemStore } = await import('@/store/useFileSystemStore');
      const store = useFileSystemStore.getState();
      
      const remainingNotes = { ...store.notes };
      delete remainingNotes[cleanNoteId];
      store.setNotes(Object.values(remainingNotes));

      return {
        success: true,
        duration: Date.now() - startTime
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Déplacer une note
   */
  async moveNote(noteId: string, targetFolderId: string | null, targetClasseurId?: string) {
    try {
      const cleanNoteId = this.apiClient.cleanAndValidateId(noteId, 'note');
      
      const headers = await this.apiClient.getAuthHeaders();
      const payload: { target_folder_id: string | null; target_notebook_id?: string } = { 
        target_folder_id: targetFolderId 
      };
      if (targetClasseurId) {
        payload.target_notebook_id = targetClasseurId;
      }
      
      const response = await fetch(this.apiClient.buildUrl(`/api/v2/note/${cleanNoteId}/move`), {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur déplacement note: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();

      const store = useFileSystemStore.getState();
      const currentNote = store.notes[cleanNoteId];
      const noteClasseurId = targetClasseurId || currentNote?.classeur_id;
      
      store.moveNote(cleanNoteId, targetFolderId, noteClasseurId ?? undefined);
      
      try {
        const { triggerPollingAfterNoteAction } = await import('@/services/uiActionPolling');
        await triggerPollingAfterNoteAction('note_moved');
      } catch (error) {
        logger.warn('[NoteApi] ⚠️ Erreur déclenchement polling ciblé:', error);
      }
      
      return result;
    } catch (error) {
      logger.error('[NoteApi] ❌ Erreur déplacement note', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

}

