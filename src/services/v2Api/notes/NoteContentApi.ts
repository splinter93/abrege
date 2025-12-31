/**
 * API pour le contenu des notes
 * Extrait de NoteApi pour respecter limite 300 lignes
 */

import { useFileSystemStore } from '@/store/useFileSystemStore';
import { simpleLogger as logger } from '@/utils/logger';
import { ApiClient } from '../core/ApiClient';

export class NoteContentApi {
  private apiClient: ApiClient;

  constructor(apiClient: ApiClient) {
    this.apiClient = apiClient;
  }

  /**
   * Ajouter du contenu à une note
   */
  async addContentToNote(ref: string, content: string) {
    if (process.env.NODE_ENV === 'development') {
      logger.dev('[NoteContentApi] ➕ Ajout contenu note');
    }
    
    try {
      const cleanRef = this.apiClient.cleanAndValidateId(ref, 'note');
      
      const headers = await this.apiClient.getAuthHeaders();
      const response = await fetch(this.apiClient.buildUrl(`/api/v2/note/${cleanRef}/insert-content`), {
        method: 'POST',
        headers,
        body: JSON.stringify({ content })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur ajout contenu note: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      
      const store = useFileSystemStore.getState();
      store.updateNote(cleanRef, { markdown_content: result.note.markdown_content });
      
      // Déclencher le polling ciblé
      try {
        const { triggerPollingAfterNoteAction } = await import('@/services/uiActionPolling');
        await triggerPollingAfterNoteAction('note_updated');
      } catch (error) {
        logger.warn('[NoteContentApi] ⚠️ Erreur déclenchement polling ciblé:', error);
      }
      
      return result;
    } catch (error) {
      logger.error('[NoteContentApi] ❌ Erreur ajout contenu note', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Récupérer le contenu d'une note
   */
  async getNoteContent(ref: string) {
    if (process.env.NODE_ENV === 'development') {
      logger.dev('[NoteContentApi] 📖 Récupération contenu note');
    }
    
    try {
      const cleanRef = this.apiClient.cleanAndValidateId(ref, 'note');
      
      const headers = await this.apiClient.getAuthHeaders();
      const response = await fetch(this.apiClient.buildUrl(`/api/v2/note/${cleanRef}?fields=content`), {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur récupération contenu note: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      logger.error('[NoteContentApi] ❌ Erreur récupération contenu note', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
}

