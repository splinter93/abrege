/**
 * Service de cache pour les métadonnées des notes embedées
 * Singleton avec TTL et LRU eviction
 * 
 * Responsabilités:
 * - Cache Map<noteId, metadata> avec expiration
 * - Éviction LRU si > MAX_CACHE_ENTRIES
 * - Invalidation manuelle si update détecté
 * 
 * Standard GAFAM: Thread-safe, memory-efficient, debuggable
 */

import type { NoteEmbedMetadata, CachedNoteEmbed } from '@/types/noteEmbed';
import { CACHE_TTL_MS, MAX_CACHE_ENTRIES } from '@/types/noteEmbed';
import { simpleLogger as logger } from '@/utils/logger';

/**
 * Service singleton pour le cache des note embeds
 */
export class NoteEmbedCacheService {
  private static instance: NoteEmbedCacheService | null = null;
  
  /** Cache principal (Map garantit ordre insertion pour LRU) */
  private cache: Map<string, CachedNoteEmbed> = new Map();
  
  /** Compteur d'accès pour stats */
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0
  };

  private cleanupInterval: NodeJS.Timeout | null = null;

  private constructor() {
    logger.dev('[NoteEmbedCache] ✅ Service initialisé');
    
    // ✅ Cleanup automatique toutes les 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired();
    }, 5 * 60 * 1000); // 5 minutes
  }

  /**
   * Récupérer l'instance singleton
   */
  static getInstance(): NoteEmbedCacheService {
    if (!NoteEmbedCacheService.instance) {
      NoteEmbedCacheService.instance = new NoteEmbedCacheService();
    }
    return NoteEmbedCacheService.instance;
  }

  /**
   * Récupérer une note du cache
   * @param noteId - ID de la note
   * @returns Metadata si en cache et non expirée, null sinon
   */
  get(noteId: string): NoteEmbedMetadata | null {
    const cached = this.cache.get(noteId);
    
    if (!cached) {
      this.stats.misses++;
      logger.dev('[NoteEmbedCache] ❌ Cache miss:', noteId);
      return null;
    }

    // Vérifier expiration
    const now = Date.now();
    if (now > cached.expiresAt) {
      this.cache.delete(noteId);
      this.stats.misses++;
      logger.dev('[NoteEmbedCache] ⏰ Cache expiré:', noteId);
      return null;
    }

    // Cache hit - déplacer en fin (LRU)
    this.cache.delete(noteId);
    this.cache.set(noteId, cached);
    
    this.stats.hits++;
    logger.dev('[NoteEmbedCache] ✅ Cache hit:', noteId);
    return cached.metadata;
  }

  /**
   * Mettre une note en cache
   * @param noteId - ID de la note
   * @param metadata - Métadonnées à cacher
   */
  set(noteId: string, metadata: NoteEmbedMetadata): void {
    const now = Date.now();
    
    // Éviction LRU si cache plein
    if (this.cache.size >= MAX_CACHE_ENTRIES) {
      // Map itère dans l'ordre d'insertion, la première entrée est la plus ancienne
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
        this.stats.evictions++;
        logger.dev('[NoteEmbedCache] 🗑️ Éviction LRU:', oldestKey);
      }
    }

    const cached: CachedNoteEmbed = {
      metadata,
      fetchedAt: now,
      expiresAt: now + CACHE_TTL_MS
    };

    this.cache.set(noteId, cached);
    logger.dev('[NoteEmbedCache] 💾 Ajout cache:', noteId);
  }

  /**
   * Invalider une note du cache (quand elle est modifiée)
   * @param noteId - ID de la note à invalider
   */
  invalidate(noteId: string): void {
    const existed = this.cache.delete(noteId);
    if (existed) {
      logger.dev('[NoteEmbedCache] ♻️ Cache invalidé:', noteId);
    }
  }

  /**
   * Vider tout le cache
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    logger.dev('[NoteEmbedCache] 🧹 Cache vidé:', size, 'entrées');
  }

  /**
   * Récupérer les statistiques du cache
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: MAX_CACHE_ENTRIES,
      hits: this.stats.hits,
      misses: this.stats.misses,
      evictions: this.stats.evictions,
      hitRate: this.stats.hits + this.stats.misses > 0
        ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(1) + '%'
        : '0%'
    };
  }

  /**
   * Nettoyer les entrées expirées (appel périodique recommandé)
   */
  cleanupExpired(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [noteId, cached] of this.cache.entries()) {
      if (now > cached.expiresAt) {
        this.cache.delete(noteId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.dev('[NoteEmbedCache] 🧹 Cleanup:', cleaned, 'entrées expirées');
    }

    return cleaned;
  }
}

/** Instance singleton exportée */
export const noteEmbedCache = NoteEmbedCacheService.getInstance();

