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
   * Extrait le contenu ajouté depuis les opérations appliquées
   * Utilise les ranges des opérations pour extraire précisément le contenu ajouté
   */
  private extractAddedContent(
    oldContent: string,
    newContent: string,
    ops: ContentOperation[],
    opResults: Array<{ id: string; range_before?: { start: number; end: number }; range_after?: { start: number; end: number } }>
  ): string {
    if (oldContent === newContent) {
      return '';
    }

    // ✅ FIX: Utiliser les ranges des opérations pour extraire précisément le contenu ajouté
    // Si on a des résultats d'opérations avec ranges, utiliser ceux-ci
    const addedChunks: string[] = [];
    
    for (let i = 0; i < ops.length; i++) {
      const op = ops[i];
      const result = opResults[i];
      
      // Si l'opération est un insert/replace et qu'on a les ranges
      if ((op.action === 'insert' || op.action === 'replace') && result?.range_after) {
        const { start, end } = result.range_after;
        // Extraire le contenu ajouté depuis le nouveau contenu
        if (start >= 0 && end > start && end <= newContent.length) {
          const chunk = newContent.slice(start, end);
          if (chunk.length > 0) {
            addedChunks.push(chunk);
          }
        }
      }
    }
    
    // Si on a extrait des chunks depuis les ranges, les concaténer
    if (addedChunks.length > 0) {
      // ✅ FIX: Pour les insertions multiples, on doit gérer l'ordre et les positions
      // Pour l'instant, on concatène simplement (peut être amélioré avec tri par position)
      return addedChunks.join('');
    }
    
    // ✅ FALLBACK: Si pas de ranges, utiliser un diff simple mais amélioré
      // Cas simple : ajout à la fin
      if (newContent.startsWith(oldContent)) {
        return newContent.slice(oldContent.length);
      }

    // Cas : ajout au début
    if (newContent.endsWith(oldContent)) {
      return newContent.slice(0, newContent.length - oldContent.length);
    }
    
    // Cas complexe : trouver le préfixe et suffixe communs
      let commonPrefix = 0;
    let commonSuffix = 0;
      const minLength = Math.min(oldContent.length, newContent.length);
    
    // Préfixe commun
      for (let i = 0; i < minLength; i++) {
        if (oldContent[i] === newContent[i]) {
          commonPrefix++;
        } else {
          break;
        }
      }

    // Suffixe commun
    for (let i = 0; i < minLength - commonPrefix; i++) {
      const oldIdx = oldContent.length - 1 - i;
      const newIdx = newContent.length - 1 - i;
      if (oldContent[oldIdx] === newContent[newIdx]) {
        commonSuffix++;
      } else {
        break;
      }
    }
    
    // Extraire la partie ajoutée (entre préfixe et suffixe communs)
    const addedStart = commonPrefix;
    const addedEnd = newContent.length - commonSuffix;
    
    if (addedEnd > addedStart) {
      return newContent.slice(addedStart, addedEnd);
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
    options?: StreamOptions,
    opResults?: Array<{ id: string; range_before?: { start: number; end: number }; range_after?: { start: number; end: number } }>
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
        position,
        hasOpResults: !!opResults
      });

      // ✅ FIX: Extraire le contenu ajouté en utilisant les résultats d'opérations si disponibles
      const addedContent = this.extractAddedContent(oldContent, newContent, ops, opResults || []);

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

      // ✅ AUDIT: Vérifier les listeners AVANT de streamer
      const listenerCountBefore = streamBroadcastService.getListenerCount(noteId);
      logApi.info('[ContentStreamer] Streaming chunks', {
        noteId,
        chunksCount: chunks.length,
        totalLength: addedContent.length,
        listenerCount: listenerCountBefore
      });

      if (listenerCountBefore === 0) {
        logApi.warn('[ContentStreamer] ⚠️ NO LISTENERS REGISTERED - chunks will not be delivered', {
          noteId,
          chunksCount: chunks.length
      });
      }

      // Stream chaque chunk avec délai
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const isLast = i === chunks.length - 1;

        // ✅ AUDIT: Logger chaque broadcast
        const listenerCount = streamBroadcastService.getListenerCount(noteId);
        if (i === 0) {
          logApi.info('[ContentStreamer] 📡 Broadcasting first chunk', {
            noteId,
            chunkLength: chunk.length,
            listenerCount,
            position
          });
        }

        // Broadcast le chunk
        const deliveredCount = await streamBroadcastService.broadcast(noteId, {
          type: 'chunk',
          data: chunk,
          position,
          metadata: {
            timestamp: Date.now(),
            source: 'editNoteContent',
            chunkIndex: i,
            totalChunks: chunks.length
          }
        });

        // ✅ AUDIT: Vérifier que le chunk a été livré
        if (deliveredCount === 0 && listenerCount > 0) {
          logApi.error('[ContentStreamer] ❌ Chunk broadcasted but NOT delivered to any listener', {
            noteId,
            chunkIndex: i,
            listenerCount,
            chunkLength: chunk.length
          });
        }

        // Délai entre chunks (sauf le dernier)
        if (!isLast && delayMs > 0) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }

      // Signal de fin
      const endListenerCount = streamBroadcastService.getListenerCount(noteId);
      const endDeliveredCount = await streamBroadcastService.broadcast(noteId, {
        type: 'end',
        metadata: {
          timestamp: Date.now(),
          source: 'editNoteContent',
          totalChunks: chunks.length
        }
      });

      logApi.info('[ContentStreamer] Stream completed', {
        noteId,
        chunksCount: chunks.length,
        listenerCount: endListenerCount,
        endDeliveredCount
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
            source: 'editNoteContent'
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

