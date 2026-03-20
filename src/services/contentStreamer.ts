/**
 * 🌊 Content Streamer Service
 *
 * Streame le **nouveau contenu complet** (newContent) via Supabase Realtime Broadcast.
 *
 * Protocole :
 *   start  { mode: 'full_replace', totalLength }  → le client vide l'éditeur
 *   chunk  { data: string }                        → le client ajoute au fur et à mesure
 *   end    {}                                      → le client finalise (conversion Markdown)
 *   error  { metadata.error }                      → le client gère l'erreur
 *
 * Ce design est correct pour toutes les opérations (insert, replace, delete,
 * upsert_section) car il ne dépend plus d'un diff fragile.
 */

import { logApi } from '@/utils/logger';
import { sendStreamEvent } from '@/services/supabaseRealtimeBroadcast';
import type { ContentOperation } from '@/utils/contentApplyUtils';

export interface StreamOptions {
  /** Taille cible des chunks en caractères (défaut : 80) */
  chunkSize?: number;
  /** Délai entre chunks en ms pour l'effet "typing" (défaut : 15) */
  delayMs?: number;
}

class ContentStreamer {
  private static instance: ContentStreamer;

  private constructor() {}

  static getInstance(): ContentStreamer {
    if (!ContentStreamer.instance) {
      ContentStreamer.instance = new ContentStreamer();
    }
    return ContentStreamer.instance;
  }

  /**
   * Découpe une chaîne en chunks respectant les limites de mots.
   */
  private chunkContent(content: string, chunkSize: number): string[] {
    if (!content) return [];

    const chunks: string[] = [];
    let current = '';

    for (const word of content.split(/(\s+)/)) {
      if (current.length + word.length > chunkSize && current.length > 0) {
        chunks.push(current);
        current = word;
      } else {
        current += word;
      }
    }

    if (current.length > 0) chunks.push(current);
    return chunks;
  }

  /**
   * Streame le nouveau contenu complet vers les clients écoutant cette note.
   *
   * @param noteId      - ID de la note cible
   * @param newContent  - Nouveau contenu Markdown complet (après application des ops)
   * @param options     - Taille des chunks, délai
   * @param _ops        - Opérations appliquées (conservé pour signature API — non utilisé)
   * @param _opResults  - Résultats des ops (conservé pour signature API — non utilisé)
   */
  async streamContent(
    noteId: string,
    _oldContent: string,
    newContent: string,
    _ops: ContentOperation[],
    options?: StreamOptions,
    _opResults?: Array<{ id: string; range_before?: { start: number; end: number }; range_after?: { start: number; end: number } }>
  ): Promise<void> {
    const chunkSize = options?.chunkSize ?? 80;
    const delayMs = options?.delayMs ?? 15;

    logApi.info('[ContentStreamer] Starting full_replace stream', {
      noteId,
      contentLength: newContent.length,
      chunkSize,
      delayMs
    });

    if (!newContent) {
      logApi.warn('[ContentStreamer] Empty newContent — nothing to stream', { noteId });
      return;
    }

    const chunks = this.chunkContent(newContent, chunkSize);

    if (chunks.length === 0) {
      logApi.warn('[ContentStreamer] No chunks generated', { noteId });
      return;
    }

    try {
      // ── Signal de début : le client doit vider son éditeur ───────────────────
      const startSent = await sendStreamEvent(noteId, 'start', {
        mode: 'full_replace',
        totalLength: newContent.length,
        metadata: { source: 'editNoteContent', timestamp: Date.now() }
      });

      if (!startSent) {
        throw new Error('Supabase Realtime broadcast failed on start signal');
      }

      logApi.info('[ContentStreamer] Streaming chunks', {
        noteId,
        chunksCount: chunks.length,
        totalLength: newContent.length
      });

      // ── Chunks ───────────────────────────────────────────────────────────────
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const isLast = i === chunks.length - 1;

        const sent = await sendStreamEvent(noteId, 'chunk', {
          data: chunk,
          metadata: { timestamp: Date.now(), source: 'editNoteContent' }
        });

        if (!sent && i === 0) {
          throw new Error('Supabase Realtime broadcast failed on first chunk');
        }

        if (!isLast && delayMs > 0) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }

      // ── Signal de fin ────────────────────────────────────────────────────────
      const endSent = await sendStreamEvent(noteId, 'end', {
        metadata: { timestamp: Date.now(), source: 'editNoteContent' }
      });

      if (!endSent) {
        throw new Error('Supabase Realtime broadcast failed on end signal');
      }

      logApi.info('[ContentStreamer] Stream completed', {
        noteId,
        chunksCount: chunks.length
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logApi.error('[ContentStreamer] Stream failed', { noteId, error: errorMessage });

      // Broadcast erreur (best-effort, non bloquant)
      await sendStreamEvent(noteId, 'error', {
        metadata: { timestamp: Date.now(), source: 'editNoteContent', error: errorMessage }
      });

      throw error; // Rethrow → fallback DB dans editNoteContent
    }
  }
}

export const contentStreamer = ContentStreamer.getInstance();
