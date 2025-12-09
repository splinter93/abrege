/**
 * Service de base de données optimisé pour les performances
 * Requêtes avec jointures et cache intelligent
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { distributedCache } from '../cache/DistributedCache';
import { simpleLogger as logger } from '@/utils/logger';

export interface OptimizedQueryOptions {
  useCache?: boolean;
  cacheTtl?: number;
  includeDeleted?: boolean;
  limit?: number;
  offset?: number;
}

export interface ClasseurWithContent {
  id: string;
  name: string;
  description?: string;
  emoji?: string;
  position: number;
  slug: string;
  created_at: string;
  updated_at: string;
  folders: FolderWithContent[];
  notes: NoteSummary[];
  statistics: {
    total_folders: number;
    total_notes: number;
    total_size: number;
  };
}

export interface FolderWithContent {
  id: string;
  name: string;
  slug: string;
  description?: string;
  position: number;
  parent_folder_id?: string;
  classeur_id: string;
  created_at: string;
  updated_at: string;
  notes: NoteSummary[];
  subfolders: FolderWithContent[];
  statistics: {
    total_notes: number;
    total_subfolders: number;
  };
}

export interface NoteSummary {
  id: string;
  source_title: string;
  slug: string;
  header_image?: string;
  created_at: string;
  updated_at: string;
  folder_id?: string;
  classeur_id: string;
  content_size: number;
}

export interface NoteDetailed extends NoteSummary {
  markdown_content?: string;
  html_content?: string;
  visibility?: string;
  public_url?: string;
  position?: number;
  etag?: string;
  classeurs?: { id: string; name: string; slug: string } | null;
  folders?: { id: string; name: string; slug: string } | null;
}

export interface ClasseurSummary {
  id: string;
  name: string;
  slug: string;
  description?: string;
  emoji?: string;
  position?: number;
  created_at: string;
  updated_at: string;
}

export interface FolderSummary {
  id: string;
  name: string;
  slug: string;
  description?: string;
  classeur_id: string;
  parent_folder_id?: string;
  position?: number;
  created_at: string;
  updated_at: string;
}

// Types pour les données brutes de la base de données
interface RawClasseurData {
  id: string;
  name: string;
  description?: string;
  emoji?: string;
  position: number;
  slug: string;
  created_at: string;
  updated_at: string;
  folders?: RawFolderData[];
  articles?: RawNoteData[];
}

interface RawFolderData {
  id: string;
  name: string;
  slug: string;
  description?: string;
  position: number;
  parent_folder_id?: string;
  classeur_id: string;
  created_at: string;
  updated_at: string;
}

interface RawNoteData {
  id: string;
  source_title: string;
  slug: string;
  header_image?: string;
  created_at: string;
  updated_at: string;
  folder_id?: string;
  classeur_id: string;
  markdown_content?: string;
}

export class OptimizedDatabaseService {
  private static instance: OptimizedDatabaseService;
  private supabase: SupabaseClient;
  private cache: typeof distributedCache;

  private constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    
    this.supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    this.cache = distributedCache;
  }

  public static getInstance(): OptimizedDatabaseService {
    if (!OptimizedDatabaseService.instance) {
      OptimizedDatabaseService.instance = new OptimizedDatabaseService();
    }
    return OptimizedDatabaseService.instance;
  }

  /**
   * Récupérer un classeur avec tout son contenu en une seule requête optimisée
   */
  async getClasseurWithContent(
    classeurId: string, 
    userId: string, 
    options: OptimizedQueryOptions = {}
  ): Promise<ClasseurWithContent | null> {
    const { useCache = true, cacheTtl } = options;
    const cacheKey = `classeur:${classeurId}:${userId}`;

    try {
      // 1. Vérifier le cache
      if (useCache) {
        const cached = await this.cache.get<ClasseurWithContent>(cacheKey);
        if (cached) {
          logger.dev(`[OptimizedDatabaseService] 📦 Classeur cache HIT: ${classeurId}`);
          return cached;
        }
      }

      // 2. Requête optimisée avec jointures
      const { data: classeur, error: classeurError } = await this.supabase
        .from('classeurs')
        .select(`
          id, name, description, emoji, position, slug, created_at, updated_at,
          folders!inner(
            id, name, slug, description, position, parent_folder_id, classeur_id, created_at, updated_at,
            articles!inner(
              id, source_title, slug, header_image, created_at, updated_at, folder_id, classeur_id,
              markdown_content
            )
          ),
          articles!inner(
            id, source_title, slug, header_image, created_at, updated_at, folder_id, classeur_id,
            markdown_content
          )
        `)
        .eq('id', classeurId)
        .eq('user_id', userId)
        .single();

      if (classeurError) {
        logger.error(`[OptimizedDatabaseService] ❌ Error fetching classeur ${classeurId}:`, classeurError);
        return null;
      }

      // 3. Construire la structure optimisée
      const result = this.buildClasseurStructure(classeur);

      // 4. Mettre en cache
      if (useCache) {
        await this.cache.set(cacheKey, result, cacheTtl);
        logger.dev(`[OptimizedDatabaseService] 💾 Classeur cached: ${classeurId}`);
      }

      return result;
    } catch (error) {
      logger.error(`[OptimizedDatabaseService] ❌ Error getting classeur ${classeurId}:`, error);
      return null;
    }
  }

  /**
   * Récupérer tous les classeurs d'un utilisateur avec contenu optimisé
   */
  async getAllClasseursWithContent(
    userId: string, 
    options: OptimizedQueryOptions = {}
  ): Promise<ClasseurWithContent[]> {
    const { useCache = true, cacheTtl, limit = 50, offset = 0 } = options;
    const cacheKey = `classeurs:all:${userId}:${limit}:${offset}`;

    try {
      // 1. Vérifier le cache
      if (useCache) {
        const cached = await this.cache.get<ClasseurWithContent[]>(cacheKey);
        if (cached) {
          logger.dev(`[OptimizedDatabaseService] 📦 Classeurs cache HIT: ${cached.length} classeurs`);
          return cached;
        }
      }

      // 2. Requête optimisée avec jointures
      const { data: classeurs, error } = await this.supabase
        .from('classeurs')
        .select(`
          id, name, description, emoji, position, slug, created_at, updated_at,
          folders(
            id, name, slug, description, position, parent_folder_id, classeur_id, created_at, updated_at,
            articles(
              id, source_title, slug, header_image, created_at, updated_at, folder_id, classeur_id,
              markdown_content
            )
          ),
          articles(
            id, source_title, slug, header_image, created_at, updated_at, folder_id, classeur_id,
            markdown_content
          )
        `)
        .eq('user_id', userId)
        .order('position', { ascending: true })
        .range(offset, offset + limit - 1);

      if (error) {
        logger.error(`[OptimizedDatabaseService] ❌ Error fetching classeurs:`, error);
        return [];
      }

      // 3. Construire les structures optimisées
      const results = classeurs.map(classeur => this.buildClasseurStructure(classeur));

      // 4. Mettre en cache
      if (useCache) {
        await this.cache.set(cacheKey, results, cacheTtl);
        logger.dev(`[OptimizedDatabaseService] 💾 Classeurs cached: ${results.length} classeurs`);
      }

      return results;
    } catch (error) {
      logger.error(`[OptimizedDatabaseService] ❌ Error getting classeurs:`, error);
      return [];
    }
  }

  /**
   * Récupérer une note avec ses métadonnées optimisées
   */
  async getNoteOptimized(
    noteId: string, 
    userId: string, 
    options: OptimizedQueryOptions = {}
  ): Promise<NoteDetailed | null> {
    const { useCache = true, cacheTtl } = options;
    const cacheKey = `note:${noteId}:${userId}`;

    try {
      // 1. Vérifier le cache
      if (useCache) {
        const cached = await this.cache.get<NoteDetailed>(cacheKey);
        if (cached) {
          logger.dev(`[OptimizedDatabaseService] 📦 Note cache HIT: ${noteId}`);
          return cached;
        }
      }

      // 2. Requête optimisée
      const { data: note, error } = await this.supabase
        .from('articles')
        .select(`
          id, source_title, slug, markdown_content, html_content, header_image,
          visibility, public_url, classeur_id, folder_id, position, created_at, updated_at, etag, content_size,
          classeurs(id, name, slug),
          folders(id, name, slug)
        `)
        .eq('user_id', userId)
        .or(`id.eq.${noteId},slug.eq.${noteId}`)
        .single();

      if (error) {
        logger.error(`[OptimizedDatabaseService] ❌ Error fetching note ${noteId}:`, error);
        return null;
      }

      const typedNote: NoteDetailed = {
        ...(note as unknown as NoteDetailed),
        content_size: (note as any)?.content_size ?? 0,
      };

      // 3. Mettre en cache
      if (useCache) {
        await this.cache.set(cacheKey, typedNote, cacheTtl);
        logger.dev(`[OptimizedDatabaseService] 💾 Note cached: ${noteId}`);
      }

      return typedNote;
    } catch (error) {
      logger.error(`[OptimizedDatabaseService] ❌ Error getting note ${noteId}:`, error);
      return null;
    }
  }

  /**
   * Recherche optimisée avec index
   */
  async searchContentOptimized(
    query: string,
    userId: string,
    options: OptimizedQueryOptions & {
      type?: 'all' | 'notes' | 'classeurs' | 'folders';
      classeurId?: string;
    } = {}
  ): Promise<{
    notes: NoteSummary[];
    classeurs: ClasseurSummary[];
    folders: FolderSummary[];
    total: number;
  }> {
    const { useCache = true, cacheTtl, type = 'all', classeurId, limit = 20 } = options;
    const cacheKey = `search:${query}:${userId}:${type}:${classeurId || 'all'}:${limit}`;

    try {
      // 1. Vérifier le cache
      if (useCache) {
        const cached = await this.cache.get<{
          notes: NoteSummary[];
          classeurs: ClasseurSummary[];
          folders: FolderSummary[];
          total: number;
        }>(cacheKey);
        if (cached) {
          logger.dev(`[OptimizedDatabaseService] 📦 Search cache HIT: "${query}"`);
          return cached;
        }
      }

      const results = {
        notes: [] as NoteSummary[],
        classeurs: [] as ClasseurSummary[],
        folders: [] as FolderSummary[],
        total: 0,
      };

      // 2. Recherche dans les notes (optimisée avec index)
      if (type === 'all' || type === 'notes') {
        let notesQuery = this.supabase
          .from('articles')
          .select('id, source_title, slug, header_image, created_at, updated_at, folder_id, classeur_id, markdown_content')
          .eq('user_id', userId)
          .eq('is_deleted', false)
          .or(`source_title.ilike.%${query}%,markdown_content.ilike.%${query}%`)
          .limit(limit);

        if (classeurId) {
          notesQuery = notesQuery.eq('classeur_id', classeurId);
        }

        const { data: notes, error: notesError } = await notesQuery;
        if (!notesError && notes) {
          results.notes = notes.map(note => ({
            ...note,
            content_size: note.markdown_content?.length || 0,
          }));
        }
      }

      // 3. Recherche dans les classeurs
      if (type === 'all' || type === 'classeurs') {
        const { data: classeurs, error: classeursError } = await this.supabase
          .from('classeurs')
          .select('id, name, description, slug, created_at, updated_at')
          .eq('user_id', userId)
          .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
          .limit(limit);

        if (!classeursError && classeurs) {
          results.classeurs = classeurs;
        }
      }

      // 4. Recherche dans les dossiers
      if (type === 'all' || type === 'folders') {
        let foldersQuery = this.supabase
          .from('folders')
          .select('id, name, description, slug, classeur_id, created_at, updated_at')
          .eq('user_id', userId)
          .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
          .limit(limit);

        if (classeurId) {
          foldersQuery = foldersQuery.eq('classeur_id', classeurId);
        }

        const { data: folders, error: foldersError } = await foldersQuery;
        if (!foldersError && folders) {
          results.folders = folders;
        }
      }

      results.total = results.notes.length + results.classeurs.length + results.folders.length;

      // 5. Mettre en cache
      if (useCache) {
        await this.cache.set(cacheKey, results, cacheTtl);
        logger.dev(`[OptimizedDatabaseService] 💾 Search cached: "${query}"`);
      }

      return results;
    } catch (error) {
      logger.error(`[OptimizedDatabaseService] ❌ Error searching "${query}":`, error);
      return {
        notes: [],
        classeurs: [],
        folders: [],
        total: 0,
      };
    }
  }

  /**
   * Construire la structure optimisée d'un classeur
   */
  private buildClasseurStructure(classeur: RawClasseurData): ClasseurWithContent {
    const folders = classeur.folders || [];
    const notes = classeur.articles || [];

    // Organiser les dossiers en arbre
    const folderMap = new Map<string, FolderWithContent>();
    const rootFolders: FolderWithContent[] = [];

    folders.forEach((folder: RawFolderData) => {
      const folderWithContent: FolderWithContent = {
        ...folder,
        notes: [],
        subfolders: [],
        statistics: {
          total_notes: 0,
          total_subfolders: 0,
        },
      };
      folderMap.set(folder.id, folderWithContent);
    });

    // Construire l'arbre des dossiers
    folders.forEach((folder: RawFolderData) => {
      const folderWithContent = folderMap.get(folder.id);
      if (folderWithContent && folder.parent_folder_id && folderMap.has(folder.parent_folder_id)) {
        const parentFolder = folderMap.get(folder.parent_folder_id);
        if (parentFolder) {
          parentFolder.subfolders.push(folderWithContent);
          parentFolder.statistics.total_subfolders++;
        }
      } else if (folderWithContent) {
        rootFolders.push(folderWithContent);
      }
    });

    // Organiser les notes
    const rootNotes: NoteSummary[] = [];
    notes.forEach((note: RawNoteData) => {
      const noteSummary: NoteSummary = {
        ...note,
        content_size: note.markdown_content?.length || 0,
      };

      if (note.folder_id && folderMap.has(note.folder_id)) {
        const folder = folderMap.get(note.folder_id);
        if (folder) {
          folder.notes.push(noteSummary);
          folder.statistics.total_notes++;
        }
      } else {
        rootNotes.push(noteSummary);
      }
    });

    // Calculer les statistiques du classeur
    const totalFolders = folders.length;
    const totalNotes = notes.length;
    const totalSize = notes.reduce((sum: number, note: RawNoteData) => sum + (note.markdown_content?.length || 0), 0);

    return {
      id: classeur.id,
      name: classeur.name,
      description: classeur.description,
      emoji: classeur.emoji,
      position: classeur.position,
      slug: classeur.slug,
      created_at: classeur.created_at,
      updated_at: classeur.updated_at,
      folders: rootFolders,
      notes: rootNotes,
      statistics: {
        total_folders: totalFolders,
        total_notes: totalNotes,
        total_size: totalSize,
      },
    };
  }

  /**
   * Invalider le cache pour un utilisateur
   */
  async invalidateUserCache(userId: string): Promise<void> {
    try {
      // Invalider tous les caches liés à l'utilisateur
      const patterns = [
        `classeur:*:${userId}`,
        `classeurs:all:${userId}:*`,
        `note:*:${userId}`,
        `search:*:${userId}:*`,
      ];

      for (const pattern of patterns) {
        // TODO: Implémenter la suppression par pattern avec Redis
        logger.dev(`[OptimizedDatabaseService] 🗑️ Cache invalidation pattern: ${pattern}`);
      }

      logger.info(`[OptimizedDatabaseService] 🗑️ User cache invalidated: ${userId}`);
    } catch (error) {
      logger.error(`[OptimizedDatabaseService] ❌ Error invalidating user cache:`, error);
    }
  }

  /**
   * Obtenir les statistiques de performance
   */
  getPerformanceStats(): {
    cacheHitRate: number;
    averageQueryTime: number;
    totalQueries: number;
  } {
    // TODO: Implémenter les statistiques de performance
    return {
      cacheHitRate: 0,
      averageQueryTime: 0,
      totalQueries: 0,
    };
  }
}

/**
 * Instance singleton du service de base de données optimisé
 */
export const optimizedDatabaseService = OptimizedDatabaseService.getInstance();
