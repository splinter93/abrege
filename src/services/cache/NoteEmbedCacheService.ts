/**
 * Service de cache pour les embeds de notes
 * Cache le contenu HTML généré des notes pour réduire la latence
 * 
 * Conforme GUIDE-EXCELLENCE-CODE.md :
 * - Cache avec TTL (1 heure)
 * - Fallback mémoire si Redis indisponible
 * - Invalidation automatique lors de mise à jour note
 */

import { DistributedCache, DEFAULT_CACHE_CONFIG } from './DistributedCache';
import { logger, LogCategory } from '@/utils/logger';

export interface NoteEmbed {
  noteId: string;
  htmlContent: string;
  markdownContent: string;
  title: string;
  updatedAt: string;
}

/**
 * Service de cache pour les embeds de notes
 */
export class NoteEmbedCacheService {
  private cache: DistributedCache;
  private readonly ttl = 60 * 60 * 1000; // 1 heure

  constructor() {
    this.cache = DistributedCache.getInstance(DEFAULT_CACHE_CONFIG);
  }

  /**
   * Récupère un embed de note depuis le cache
   */
  async get(noteId: string): Promise<NoteEmbed | null> {
    try {
      const key = `note:embed:${noteId}`;
      const cached = await this.cache.get<NoteEmbed>(key);
      
      if (cached) {
        logger.debug(LogCategory.API, '[NoteEmbedCache] Cache hit', {
          noteId: noteId.substring(0, 8) + '...'
        });
        return cached;
      }
      
      return null;
    } catch (error) {
      logger.error(LogCategory.API, '[NoteEmbedCache] Erreur récupération cache', {
        noteId: noteId.substring(0, 8) + '...',
        error: error instanceof Error ? error.message : 'Unknown error'
      }, error instanceof Error ? error : undefined);
      return null;
    }
  }

  /**
   * Met en cache un embed de note
   */
  async set(noteId: string, embed: NoteEmbed): Promise<void> {
    try {
      const key = `note:embed:${noteId}`;
      await this.cache.set(key, embed, this.ttl);
      
      logger.debug(LogCategory.API, '[NoteEmbedCache] Cache set', {
        noteId: noteId.substring(0, 8) + '...',
        ttl: this.ttl
      });
    } catch (error) {
      logger.error(LogCategory.API, '[NoteEmbedCache] Erreur mise en cache', {
        noteId: noteId.substring(0, 8) + '...',
        error: error instanceof Error ? error.message : 'Unknown error'
      }, error instanceof Error ? error : undefined);
      // Ne pas bloquer si le cache échoue
    }
  }

  /**
   * Invalide le cache pour une note spécifique
   */
  async invalidate(noteId: string): Promise<void> {
    try {
      const key = `note:embed:${noteId}`;
      await this.cache.delete(key);
      
      logger.debug(LogCategory.API, '[NoteEmbedCache] Cache invalidé', {
        noteId: noteId.substring(0, 8) + '...'
      });
    } catch (error) {
      logger.error(LogCategory.API, '[NoteEmbedCache] Erreur invalidation cache', {
        noteId: noteId.substring(0, 8) + '...',
        error: error instanceof Error ? error.message : 'Unknown error'
      }, error instanceof Error ? error : undefined);
    }
  }

  /**
   * Invalide le cache pour plusieurs notes
   */
  async invalidateBatch(noteIds: string[]): Promise<void> {
    await Promise.all(noteIds.map(id => this.invalidate(id)));
  }
}

/**
 * Instance singleton du service de cache Note Embed
 */
export const noteEmbedCacheService = new NoteEmbedCacheService();

