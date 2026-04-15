import { supabase } from '@/supabaseClient';
import { simpleLogger as logger } from '@/utils/logger';

// ==========================================================================
// TYPES
// ==========================================================================

export interface NoteMetadata {
  id: string;
  source_title: string;
  folder_id?: string;
  classeur_id?: string;
  created_at: string;
  updated_at: string;
  slug?: string;
  header_image?: string;
  header_image_offset?: number;
  header_image_blur?: number;
  header_image_overlay?: number;
  header_title_in_image?: boolean;
  wide_mode?: boolean;
  font_family?: string;
  source_type?: import('@/types/supabase').NoteSourceType | null;
  share_settings?: {
    visibility?: string;
    invited_users?: string[];
    allow_edit?: boolean;
    allow_comments?: boolean;
  };
  public_url?: string;
}

interface NoteContent {
  id: string;
  markdown_content: string;
  html_content?: string;
}

interface NoteCache {
  metadata: NoteMetadata;
  content?: NoteContent;
  timestamp: number;
}

// ==========================================================================
// SERVICE OPTIMISÉ
// ==========================================================================

export class OptimizedNoteService {
  private static instance: OptimizedNoteService;
  private metadataCache = new Map<string, NoteCache>();
  private contentCache = new Map<string, NoteCache>();
  
  // TTL différent pour métadonnées et contenu
  private readonly METADATA_TTL = 60000; // 1 minute pour les métadonnées
  private readonly CONTENT_TTL = 300000; // 5 minutes pour le contenu

  static getInstance(): OptimizedNoteService {
    if (!OptimizedNoteService.instance) {
      OptimizedNoteService.instance = new OptimizedNoteService();
    }
    return OptimizedNoteService.instance;
  }

  private async getBearerToken(): Promise<string> {
    const { data, error } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (error || !token) {
      throw new Error('Authentication required');
    }
    return token;
  }

  /**
   * Lecture note via API v2 (propriétaire + notes dans classeur partagé).
   * Ne pas interroger `articles` avec le client anon + user_id : RLS bloque les collaborateurs.
   */
  private async fetchNoteFromApi(
    noteRef: string,
    fields: 'metadata' | 'content' | 'all',
  ): Promise<Record<string, unknown>> {
    const token = await this.getBearerToken();
    const encodedRef = encodeURIComponent(noteRef);
    const response = await fetch(`/api/v2/note/${encodedRef}?fields=${fields}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = (await response.json().catch(() => ({}))) as {
      success?: boolean;
      note?: Record<string, unknown>;
      error?: string;
      detail?: string;
    };
    if (!response.ok || !json.success || !json.note) {
      const msg = json.error || json.detail || response.statusText || 'Erreur';
      throw new Error(`Note non trouvée: ${noteRef}${msg ? ` (${msg})` : ''}`);
    }
    return json.note;
  }

  private mapApiNoteToMetadata(note: Record<string, unknown>): NoteMetadata {
    const title =
      (typeof note.title === 'string' && note.title) ||
      (typeof note.source_title === 'string' && note.source_title) ||
      '';
    const id = String(note.id);
    return {
      id,
      source_title: title,
      folder_id: note.folder_id != null ? String(note.folder_id) : undefined,
      classeur_id: note.classeur_id != null ? String(note.classeur_id) : undefined,
      created_at: String(note.created_at || new Date().toISOString()),
      updated_at: String(note.updated_at || new Date().toISOString()),
      slug: typeof note.slug === 'string' ? note.slug : undefined,
      header_image: typeof note.header_image === 'string' ? note.header_image : undefined,
      header_image_offset:
        typeof note.header_image_offset === 'number' ? note.header_image_offset : undefined,
      header_image_blur:
        typeof note.header_image_blur === 'number' ? note.header_image_blur : undefined,
      header_image_overlay:
        typeof note.header_image_overlay === 'number' ? note.header_image_overlay : undefined,
      header_title_in_image:
        typeof note.header_title_in_image === 'boolean' ? note.header_title_in_image : undefined,
      wide_mode: typeof note.wide_mode === 'boolean' ? note.wide_mode : undefined,
      font_family: typeof note.font_family === 'string' ? note.font_family : undefined,
      source_type: note.source_type as NoteMetadata['source_type'],
      share_settings: note.share_settings as NoteMetadata['share_settings'],
      public_url: typeof note.public_url === 'string' ? note.public_url : undefined,
    };
  }

  private mapApiNoteToContent(note: Record<string, unknown>): NoteContent {
    return {
      id: String(note.id),
      markdown_content: typeof note.markdown_content === 'string' ? note.markdown_content : '',
      html_content: typeof note.html_content === 'string' ? note.html_content : undefined,
    };
  }

  /**
   * Récupérer uniquement les métadonnées d'une note (rapide)
   * Utilise le cache pour éviter les rechargements inutiles
   */
  async getNoteMetadata(noteRef: string, userId: string): Promise<NoteMetadata> {
    const cacheKey = `metadata_${noteRef}_${userId}`;
    
    // 🔍 Vérifier le cache des métadonnées
    const cached = this.metadataCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.METADATA_TTL) {
      logger.dev(`[OptimizedNoteService] 🚀 Métadonnées récupérées du cache pour: ${noteRef}`);
      return cached.metadata;
    }

    try {
      logger.dev(`[OptimizedNoteService] 📖 Récupération métadonnées note (API): ${noteRef}`);
      const startTime = Date.now();

      const note = await this.fetchNoteFromApi(noteRef, 'metadata');
      const metadata = this.mapApiNoteToMetadata(note);

      // 💾 Mettre en cache
      this.metadataCache.set(cacheKey, {
        metadata,
        timestamp: Date.now()
      });

      const totalTime = Date.now() - startTime;
      logger.dev(`[OptimizedNoteService] ✅ Métadonnées récupérées en ${totalTime}ms`);

      return metadata;

    } catch (error) {
      logger.error(`[OptimizedNoteService] ❌ Erreur récupération métadonnées: ${noteRef}`, error);
      throw error;
    }
  }

  /**
   * Récupérer le contenu complet d'une note
   * Utilise le cache et charge seulement si nécessaire
   */
  async getNoteContent(noteRef: string, userId: string): Promise<NoteContent> {
    const cacheKey = `content_${noteRef}_${userId}`;
    
    // 🔍 Vérifier le cache du contenu
    const cached = this.contentCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.CONTENT_TTL) {
      logger.dev(`[OptimizedNoteService] 🚀 Contenu récupéré du cache pour: ${noteRef}`);
      return cached.content!;
    }

    try {
      logger.dev(`[OptimizedNoteService] 📖 Récupération contenu note (API): ${noteRef}`);
      const startTime = Date.now();

      const note = await this.fetchNoteFromApi(noteRef, 'content');
      const content = this.mapApiNoteToContent(note);

      // 💾 Mettre en cache
      this.contentCache.set(cacheKey, {
        metadata: { id: content.id } as NoteMetadata,
        content,
        timestamp: Date.now()
      });

      const totalTime = Date.now() - startTime;
      logger.dev(`[OptimizedNoteService] ✅ Contenu récupéré en ${totalTime}ms`);

      return content;

    } catch (error) {
      logger.error(`[OptimizedNoteService] ❌ Erreur récupération contenu: ${noteRef}`, error);
      throw error;
    }
  }

  /**
   * Récupérer note complète (métadonnées + contenu) en une seule requête
   * Pour les cas où on a besoin de tout d'un coup
   */
  async getNoteComplete(noteRef: string, userId: string): Promise<NoteMetadata & NoteContent> {
    try {
      logger.dev(`[OptimizedNoteService] 📖 Récupération note complète (API): ${noteRef}`);
      const startTime = Date.now();

      const note = await this.fetchNoteFromApi(noteRef, 'all');
      const metadata = this.mapApiNoteToMetadata(note);
      const content = this.mapApiNoteToContent(note);

      const result = { ...metadata, ...content };

      // 💾 Mettre en cache séparément
      const metadataCacheKey = `metadata_${noteRef}_${userId}`;
      const contentCacheKey = `content_${noteRef}_${userId}`;
      
      this.metadataCache.set(metadataCacheKey, {
        metadata,
        timestamp: Date.now()
      });
      
      this.contentCache.set(contentCacheKey, {
        metadata: { id: metadata.id } as NoteMetadata,
        content,
        timestamp: Date.now()
      });

      const totalTime = Date.now() - startTime;
      logger.dev(`[OptimizedNoteService] ✅ Note complète récupérée en ${totalTime}ms`);

      return result;

    } catch (error) {
      logger.error(`[OptimizedNoteService] ❌ Erreur récupération note complète: ${noteRef}`, error);
      throw error;
    }
  }

  /**
   * Invalider le cache pour une note spécifique
   */
  invalidateNoteCache(noteRef: string, userId: string) {
    const metadataKey = `metadata_${noteRef}_${userId}`;
    const contentKey = `content_${noteRef}_${userId}`;
    
    this.metadataCache.delete(metadataKey);
    this.contentCache.delete(contentKey);
    
    logger.dev(`[OptimizedNoteService] 🗑️ Cache invalidé pour note: ${noteRef}`);
  }

  /**
   * Invalider tout le cache
   */
  invalidateAllCache() {
    this.metadataCache.clear();
    this.contentCache.clear();
    logger.dev('[OptimizedNoteService] 🗑️ Tout le cache invalidé');
  }

  /**
   * Nettoyer le cache expiré
   */
  cleanupExpiredCache() {
    const now = Date.now();
    
    // Nettoyer le cache des métadonnées
    for (const [key, value] of this.metadataCache.entries()) {
      if ((now - value.timestamp) > this.METADATA_TTL) {
        this.metadataCache.delete(key);
      }
    }
    
    // Nettoyer le cache du contenu
    for (const [key, value] of this.contentCache.entries()) {
      if ((now - value.timestamp) > this.CONTENT_TTL) {
        this.contentCache.delete(key);
      }
    }
  }

  /**
   * Obtenir les statistiques du cache
   */
  getCacheStats() {
    return {
      metadataCacheSize: this.metadataCache.size,
      contentCacheSize: this.contentCache.size,
      totalCacheSize: this.metadataCache.size + this.contentCache.size
    };
  }
}

// ==========================================================================
// EXPORT
// ==========================================================================

export const optimizedNoteService = OptimizedNoteService.getInstance();
export default optimizedNoteService; 