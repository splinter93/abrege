import { supabase } from '@/supabaseClient';
import { simpleLogger as logger } from '@/utils/logger';

// ==========================================================================
// TYPES
// ==========================================================================

interface NoteMetadata {
  id: string;
  source_title: string;
  folder_id?: string;
  created_at: string;
  updated_at: string;
  slug?: string;
  header_image?: string;
  wide_mode?: boolean;
  font_family?: string;
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
      logger.dev(`[OptimizedNoteService] 📖 Récupération métadonnées note: ${noteRef}`);
      const startTime = Date.now();

      // Résoudre la référence (UUID ou slug)
      const noteId = await this.resolveNoteRef(noteRef, userId);
      
      // Récupérer seulement les métadonnées (pas le contenu)
      const { data: note, error } = await supabase
        .from('articles')
        .select('id, source_title, folder_id, created_at, updated_at, slug, header_image, wide_mode, font_family')
        .eq('id', noteId)
        .eq('user_id', userId)
        .single();

      if (error || !note) {
        throw new Error(`Note non trouvée: ${noteRef}`);
      }

      const metadata: NoteMetadata = {
        id: note.id,
        source_title: note.source_title,
        folder_id: note.folder_id,
        created_at: note.created_at,
        updated_at: note.updated_at,
        slug: note.slug,
        header_image: note.header_image,
        wide_mode: note.wide_mode,
        font_family: note.font_family
      };

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
      logger.dev(`[OptimizedNoteService] 📖 Récupération contenu note: ${noteRef}`);
      const startTime = Date.now();

      // Résoudre la référence (UUID ou slug)
      const noteId = await this.resolveNoteRef(noteRef, userId);
      
      // Récupérer le contenu complet
      const { data: note, error } = await supabase
        .from('articles')
        .select('id, markdown_content, html_content')
        .eq('id', noteId)
        .eq('user_id', userId)
        .single();

      if (error || !note) {
        throw new Error(`Note non trouvée: ${noteRef}`);
      }

      const content: NoteContent = {
        id: note.id,
        markdown_content: note.markdown_content || '',
        html_content: note.html_content
      };

      // 💾 Mettre en cache
      this.contentCache.set(cacheKey, {
        metadata: { id: note.id } as NoteMetadata, // Métadonnées minimales
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
      logger.dev(`[OptimizedNoteService] 📖 Récupération note complète: ${noteRef}`);
      const startTime = Date.now();

      // Résoudre la référence (UUID ou slug)
      const noteId = await this.resolveNoteRef(noteRef, userId);
      
      // Récupérer tout en une seule requête
      const { data: note, error } = await supabase
        .from('articles')
        .select('id, source_title, folder_id, created_at, updated_at, slug, header_image, wide_mode, font_family, markdown_content, html_content')
        .eq('id', noteId)
        .eq('user_id', userId)
        .single();

      if (error || !note) {
        throw new Error(`Note non trouvée: ${noteRef}`);
      }

      const result = {
        id: note.id,
        source_title: note.source_title,
        folder_id: note.folder_id,
        created_at: note.created_at,
        updated_at: note.updated_at,
        slug: note.slug,
        header_image: note.header_image,
        wide_mode: note.wide_mode,
        font_family: note.font_family,
        markdown_content: note.markdown_content || '',
        html_content: note.html_content
      };

      // 💾 Mettre en cache séparément
      const metadataCacheKey = `metadata_${noteRef}_${userId}`;
      const contentCacheKey = `content_${noteRef}_${userId}`;
      
      this.metadataCache.set(metadataCacheKey, {
        metadata: result,
        timestamp: Date.now()
      });
      
      this.contentCache.set(contentCacheKey, {
        metadata: { id: note.id } as NoteMetadata,
        content: { id: note.id, markdown_content: result.markdown_content, html_content: result.html_content },
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
   * Résoudre une référence (UUID ou slug) vers un ID de note
   */
  private async resolveNoteRef(noteRef: string, userId: string): Promise<string> {
    // Si c'est déjà un UUID, le retourner directement
    if (noteRef.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return noteRef;
    }

    // Sinon, résoudre le slug
    const { data: note, error } = await supabase
      .from('articles')
      .select('id')
      .eq('slug', noteRef)
      .eq('user_id', userId)
      .single();

    if (error || !note) {
      throw new Error(`Note non trouvée: ${noteRef}`);
    }

    return note.id;
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