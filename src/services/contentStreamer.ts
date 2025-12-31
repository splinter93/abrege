/**
 * 🌊 Content Streamer Service
 * 
 * Service pour streamer le contenu progressivement vers les clients
 * via StreamBroadcastService. Découpe intelligemment le contenu en chunks
 * et gère la position d'insertion.
 * 
 * Architecture:
 * - Découpage intelligent par mots/phrases
 * - Respect des limites de mots
 * - Délai configurable entre chunks
 * - Position d'insertion détectée depuis opérations
 */

import { logApi } from '@/utils/logger';
import { streamBroadcastService, type StreamEvent } from '@/services/streamBroadcastService';
import type { ContentOperation } from '@/utils/contentApplyUtils';

/**
 * Options de streaming
 */
export interface StreamOptions {
  chunkSize?: number; // Taille cible des chunks (défaut: 80)
  delayMs?: number; // Délai entre chunks en ms (défaut: 15)
  position?: 'end' | 'start' | 'cursor'; // Position d'insertion
}

/**
 * Service singleton pour streamer le contenu
 */
class ContentStreamer {
  private static instance: ContentStreamer;

  private constructor() {
    // Singleton pattern
  }

  static getInstance(): ContentStreamer {
    if (!ContentStreamer.instance) {
      ContentStreamer.instance = new ContentStreamer();
    }
    return ContentStreamer.instance;
  }

  /**
   * Découpe le contenu en chunks intelligents
   * Respecte les limites de mots/phrases
   */
  private chunkContent(content: string, chunkSize: number = 80): string[] {
    if (!content || content.length === 0) {
      return [];
    }

    const chunks: string[] = [];
    let current = '';

    // Découper par mots (incluant espaces)
    const words = content.split(/(\s+)/);

    for (const word of words) {
      // Si ajouter ce mot dépasse la taille, pousser le chunk actuel
      if (current.length + word.length > chunkSize && current.length > 0) {
        chunks.push(current);
        current = word;
      } else {
        current += word;
      }
    }

    // Ajouter le dernier chunk s'il n'est pas vide
    if (current.length > 0) {
      chunks.push(current);
    }

    return chunks;
  }

  /**
   * Détecte la position d'insertion depuis les opérations
   */
  private detectPosition(ops: ContentOperation[]): 'end' | 'start' | 'cursor' {
    // Parcourir les opérations pour trouver la position
    for (const op of ops) {
      if (op.target.type === 'position' && op.target.position) {
        const mode = op.target.position.mode;
        if (mode === 'start') {
          return 'start';
        }
        if (mode === 'end') {
          return 'end';
        }
        if (mode === 'offset') {
          return 'cursor';
        }
      }

      // Si action est insert avec where='at' et position end → end
      if (op.action === 'insert' && op.where === 'at') {
        if (op.target.type === 'position' && op.target.position?.mode === 'end') {
          return 'end';
        }
        if (op.target.type === 'position' && op.target.position?.mode === 'start') {
          return 'start';
        }
      }
    }

    // Par défaut : end
    return 'end';
  }

  /**
   * Extrait le contenu ajouté depuis le diff
   */
  private extractAddedContent(oldContent: string, newContent: string): string {
    if (oldContent === newContent) {
      return '';
    }

    // Si nouveau contenu est plus long, extraire la différence
    if (newContent.length > oldContent.length) {
      // Cas simple : ajout à la fin
      if (newContent.startsWith(oldContent)) {
        return newContent.slice(oldContent.length);
      }

      // Cas complexe : trouver le préfixe commun
      let commonPrefix = 0;
      const minLength = Math.min(oldContent.length, newContent.length);
      for (let i = 0; i < minLength; i++) {
        if (oldContent[i] === newContent[i]) {
          commonPrefix++;
        } else {
          break;
        }
      }

      // Extraire la partie ajoutée (simplifié : on prend la fin)
      // Pour un diff complet, utiliser une librairie de diff
      return newContent.slice(commonPrefix);
    }

    return '';
  }

  /**
   * Stream le contenu progressivement
   */
  async streamContent(
    noteId: string,
    oldContent: string,
    newContent: string,
    ops: ContentOperation[],
    options?: StreamOptions
  ): Promise<void> {
    console.log('🔍 [ContentStreamer] streamContent called', { noteId, oldLength: oldContent.length, newLength: newContent.length, timestamp: Date.now() });
    const chunkSize = options?.chunkSize ?? 80;
    const delayMs = options?.delayMs ?? 15;
    const position = options?.position ?? this.detectPosition(ops);

    try {
      logApi.info('[ContentStreamer] Starting stream', {
        noteId,
        oldLength: oldContent.length,
        newLength: newContent.length,
        opsCount: ops.length,
        position
      });

      // Extraire le contenu ajouté
      const addedContent = this.extractAddedContent(oldContent, newContent);

      if (!addedContent || addedContent.length === 0) {
        logApi.warn('[ContentStreamer] No content to stream', { noteId });
        return;
      }

      // Découper en chunks
      const chunks = this.chunkContent(addedContent, chunkSize);

      if (chunks.length === 0) {
        logApi.warn('[ContentStreamer] No chunks generated', { noteId });
        return;
      }

      logApi.info('[ContentStreamer] Streaming chunks', {
        noteId,
        chunksCount: chunks.length,
        totalLength: addedContent.length
      });

      // Stream chaque chunk avec délai
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const isLast = i === chunks.length - 1;

        // Broadcast le chunk
        await streamBroadcastService.broadcast(noteId, {
          type: 'chunk',
          data: chunk,
          position,
          metadata: {
            timestamp: Date.now(),
            source: 'editNoteContent'
          }
        });

        // Délai entre chunks (sauf le dernier)
        if (!isLast && delayMs > 0) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }

      // Signal de fin
      await streamBroadcastService.broadcast(noteId, {
        type: 'end',
        metadata: {
          timestamp: Date.now(),
          source: 'editNoteContent'
        }
      });

      logApi.info('[ContentStreamer] Stream completed', {
        noteId,
        chunksCount: chunks.length
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logApi.error('[ContentStreamer] Stream failed', {
        noteId,
        error: errorMessage
      });

      // Broadcast erreur (non bloquant)
      try {
        await streamBroadcastService.broadcast(noteId, {
          type: 'error',
          metadata: {
            timestamp: Date.now(),
            source: 'editNoteContent',
            error: errorMessage
          }
        });
      } catch (broadcastError) {
        logApi.error('[ContentStreamer] Failed to broadcast error', {
          noteId,
          error: broadcastError instanceof Error ? broadcastError.message : 'Unknown'
        });
      }
    }
  }
}

// Export singleton instance
export const contentStreamer = ContentStreamer.getInstance();

