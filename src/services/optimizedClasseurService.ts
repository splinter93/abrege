import { supabase } from '@/supabaseClient';
import { simpleLogger } from '@/utils/logger';
import { useFileSystemStore } from '@/store/useFileSystemStore';
import type { Classeur, Folder, Note } from '@/store/useFileSystemStore';

/** Plafonds requête — évite timeouts / saturation mémoire (pagination complète = roadmap) */
const MAX_CLASSEURS = 50;
const MAX_FOLDERS_PER_CLASSEUR = 200;
const MAX_NOTES_PER_CLASSEUR = 300;

// ==========================================================================
// TYPES
// ==========================================================================

interface ClasseurWithContent {
  id: string;
  name: string;
  description?: string;
  emoji?: string;
  position: number;
  slug?: string;
  created_at: string;
  updated_at: string;
  dossiers: Array<{
    id: string;
    name: string;
    position: number;
    parent_id?: string;
    created_at: string;
  }>;
  notes: Array<{
    id: string;
    source_title: string;
    folder_id?: string;
    markdown_content?: string;
    html_content?: string;
    position?: number;
    visibility?: string;
    created_at: string;
    updated_at: string;
    slug?: string;
    source_type?: import('@/types/supabase').NoteSourceType | null;
  }>;
}

interface PerformanceMetrics {
  totalTime: number;
  classeursTime: number;
  contentTime: number;
  storeUpdateTime: number;
}

interface CacheEntry {
  data: ClasseurWithContent[];
  timestamp: number;
  loading: boolean;
  error?: string;
}

// ==========================================================================
// SERVICE OPTIMISÉ - VERSION PRODUCTION
// ==========================================================================

export class OptimizedClasseurService {
  private static instance: OptimizedClasseurService;
  private cache = new Map<string, CacheEntry>();
  private readonly CACHE_TTL = 30000; // 30 secondes
  private readonly MAX_CACHE_SIZE = 100; // Limite de taille du cache
  private readonly RETRY_ATTEMPTS = 3;
  private readonly RETRY_DELAY = 1000; // 1 seconde

  constructor() {
    // 🔧 OPTIMISATION: Nettoyage automatique du cache toutes les 5 minutes
    setInterval(() => this.cleanupExpiredCache(), 5 * 60 * 1000);
    
    // 🔧 OPTIMISATION: Nettoyage au démarrage
    this.cleanupExpiredCache();
    
    simpleLogger.dev('[OptimizedClasseurService] 🚀 Service initialisé avec nettoyage automatique');
  }

  static getInstance(): OptimizedClasseurService {
    if (!OptimizedClasseurService.instance) {
      OptimizedClasseurService.instance = new OptimizedClasseurService();
    }
    return OptimizedClasseurService.instance;
  }

  /**
   * 🔧 OPTIMISATION: Validation des données avant traitement
   */
  private validateClasseurData(data: unknown): data is ClasseurWithContent[] {
    // Vérifier que c'est un tableau
    if (!Array.isArray(data)) {
      simpleLogger.warn('[OptimizedClasseurService] ⚠️ Données reçues ne sont pas un tableau:', typeof data);
      return false;
    }

    // Vérifier chaque classeur individuellement
    return data.every((classeur, index) => {
      // Vérifier la structure de base du classeur
      if (!classeur || typeof classeur.id !== 'string' || typeof classeur.name !== 'string') {
        simpleLogger.warn(`[OptimizedClasseurService] ⚠️ Classeur ${index} invalide:`, classeur);
        return false;
      }

      // Vérifier que dossiers et notes sont des tableaux (même vides)
      if (!Array.isArray(classeur.dossiers) || !Array.isArray(classeur.notes)) {
        simpleLogger.warn(`[OptimizedClasseurService] ⚠️ Classeur ${classeur.id} a des dossiers/notes invalides:`, {
          dossiers: typeof classeur.dossiers,
          notes: typeof classeur.notes
        });
        return false;
      }

      // Vérifier chaque dossier s'il y en a
      if (classeur.dossiers.length > 0) {
        const invalidDossiers = classeur.dossiers.filter((d: { id?: unknown; name?: unknown }) => !d || typeof d.id !== 'string' || typeof d.name !== 'string');
        if (invalidDossiers.length > 0) {
          simpleLogger.warn(`[OptimizedClasseurService] ⚠️ Classeur ${classeur.id} a des dossiers invalides:`, invalidDossiers);
          return false;
        }
      }

      // Vérifier chaque note s'il y en a
      if (classeur.notes.length > 0) {
        const invalidNotes = classeur.notes.filter((n: { id?: unknown; source_title?: unknown }) => !n || typeof n.id !== 'string' || typeof n.source_title !== 'string');
        if (invalidNotes.length > 0) {
          simpleLogger.warn(`[OptimizedClasseurService] ⚠️ Classeur ${classeur.id} a des notes invalides:`, invalidNotes);
          return false;
        }
      }

      return true;
    });
  }

  /**
   * 🔧 OPTIMISATION: Système de retry automatique
   */
  private async withRetry<T>(
    operation: () => Promise<T>, 
    operationName: string,
    maxAttempts: number = this.RETRY_ATTEMPTS
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt === maxAttempts) {
          simpleLogger.error(`[OptimizedClasseurService] ❌ ${operationName} échoué après ${maxAttempts} tentatives:`, lastError);
          throw lastError;
        }
        
        simpleLogger.warn(`[OptimizedClasseurService] ⚠️ ${operationName} échoué (tentative ${attempt}/${maxAttempts}), retry dans ${this.RETRY_DELAY}ms:`, lastError);
        
        // Attendre avant de réessayer
        await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY * attempt));
      }
    }
    
    throw lastError!;
  }

  /**
   * 🔧 OPTIMISATION: Protection contre les race conditions
   */
  private isUserLoading(userId: string): boolean {
    const entry = this.cache.get(`classeurs_${userId}`);
    return entry?.loading || false;
  }

  private setUserLoading(userId: string, loading: boolean): void {
    const cacheKey = `classeurs_${userId}`;
    const existing = this.cache.get(cacheKey);
    
    if (existing) {
      existing.loading = loading;
    } else if (loading) {
      this.cache.set(cacheKey, {
        data: [],
        timestamp: Date.now(),
        loading: true
      });
    }
  }

  /**
   * Chargement ultra-optimisé des classeurs avec tout leur contenu
   * Version production avec toutes les optimisations
   */
  async loadClasseursWithContentOptimized(userId: string): Promise<ClasseurWithContent[]> {
    const startTime = Date.now();
    const cacheKey = `classeurs_${userId}`;
    
    // 🔧 OPTIMISATION: Vérifier si un chargement est déjà en cours
    if (this.isUserLoading(userId)) {
      simpleLogger.dev(`[OptimizedClasseurService] ⏳ Chargement déjà en cours pour ${userId}, attente...`);
      
      // Attendre que le chargement se termine
      let attempts = 0;
      const maxWaitAttempts = 30; // 3 secondes max
      
      while (this.isUserLoading(userId) && attempts < maxWaitAttempts) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      
      // Vérifier le cache après attente
      const cached = this.cache.get(cacheKey);
      if (cached && !cached.loading && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
        simpleLogger.dev(`[OptimizedClasseurService] 🚀 Données récupérées du cache après attente`);
        return cached.data;
      }
    }
    
    // 🔍 Vérifier le cache
    const cached = this.cache.get(cacheKey);
    if (cached && !cached.loading && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
      simpleLogger.dev('[OptimizedClasseurService] 🚀 Données récupérées du cache');
      return cached.data;
    }

    // 🔧 OPTIMISATION: Marquer comme en cours de chargement
    this.setUserLoading(userId, true);

    try {
      simpleLogger.dev('[OptimizedClasseurService] 🚀 Début chargement optimisé des classeurs');

      // 🔧 OPTIMISATION: Utiliser le système de retry
      const result = await this.withRetry(
        () => this.performClasseurLoading(userId, startTime),
        'Chargement des classeurs'
      );

      // 🔧 OPTIMISATION: Mettre en cache avec validation
      simpleLogger.dev('[OptimizedClasseurService] 🔍 Validation des données reçues...');
      simpleLogger.dev('[OptimizedClasseurService] 📊 Données reçues:', {
        type: typeof result,
        isArray: Array.isArray(result),
        length: Array.isArray(result) ? result.length : 'N/A',
        sample: Array.isArray(result) && result.length > 0 ? result[0] : 'Aucun'
      });
      
      if (this.validateClasseurData(result)) {
        simpleLogger.dev('[OptimizedClasseurService] ✅ Validation réussie, mise en cache...');
        this.cache.set(cacheKey, {
          data: result,
          timestamp: Date.now(),
          loading: false
        });
        
        // 🔧 OPTIMISATION: Nettoyer le cache si nécessaire
        this.ensureCacheSizeLimit();
      } else {
        simpleLogger.error('[OptimizedClasseurService] ❌ Données invalides après chargement');
        simpleLogger.error('[OptimizedClasseurService] 🔍 Détails des données invalides:', result);
        throw new Error('Données invalides reçues du serveur');
      }

      return result;

    } catch (error) {
      // 🔧 OPTIMISATION: Mettre en cache l'erreur pour éviter les retry inutiles
      this.cache.set(cacheKey, {
        data: [],
        timestamp: Date.now(),
        loading: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      });
      
      simpleLogger.error('[OptimizedClasseurService] ❌ Erreur chargement optimisé:', error);
      throw error;
    } finally {
      // 🔧 OPTIMISATION: Toujours marquer comme terminé
      this.setUserLoading(userId, false);
    }
  }

  /**
   * 🔧 OPTIMISATION: Logique de chargement séparée pour le retry
   */
  private async performClasseurLoading(userId: string, startTime: number): Promise<ClasseurWithContent[]> {
    // 🚀 Étape 1: Récupérer tous les classeurs (exclure ceux en corbeille)
    const classeursStart = Date.now();
    const { data: classeurs, error: classeursError } = await supabase
      .from('classeurs')
      .select('id, name, description, emoji, position, slug, created_at, updated_at')
      .eq('user_id', userId)
      .eq('is_in_trash', false) // 🔧 CORRECTION: Exclure les classeurs en corbeille
      .order('position', { ascending: true })
      .limit(MAX_CLASSEURS);

    if (classeursError) {
      throw new Error(`Erreur récupération classeurs: ${classeursError.message}`);
    }

    const classeursTime = Date.now() - classeursStart;
    simpleLogger.dev(`[OptimizedClasseurService] ✅ ${classeurs?.length || 0} classeurs récupérés en ${classeursTime}ms`);
    if (classeurs && classeurs.length >= MAX_CLASSEURS) {
      simpleLogger.warn(
        `[OptimizedClasseurService] ⚠️ Plafond classeurs (${MAX_CLASSEURS}) atteint — d’autres classeurs peuvent être absents de l’UI`
      );
    }

    if (!classeurs || classeurs.length === 0) {
      // 🔧 OPTIMISATION: Mettre à jour le store même si aucun classeur
      this.updateStoreSafely([], [], []);
      return [];
    }

    // 🚀 Étape 2: Chargement parallèle de tout le contenu
    const contentStart = Date.now();
    simpleLogger.dev(`[OptimizedClasseurService] 🚀 Chargement contenu pour ${classeurs.length} classeurs...`);
    
    const contentPromises = classeurs.map(async (classeur) => {
      try {
        simpleLogger.dev(`[OptimizedClasseurService] 🔍 Chargement classeur ${classeur.id} (${classeur.name})...`);
        
        // Charger dossiers et notes en parallèle pour chaque classeur
        const [dossiersResult, notesResult] = await Promise.all([
          this.getDossiersForClasseur(classeur.id),
          this.getNotesForClasseur(classeur.id)
        ]);

        simpleLogger.dev(`[OptimizedClasseurService] ✅ Classeur ${classeur.id}: ${dossiersResult.length} dossiers, ${notesResult.length} notes`);

        return {
          ...classeur,
          dossiers: dossiersResult,
          notes: notesResult
        };
      } catch (error) {
        simpleLogger.warn(`[OptimizedClasseurService] ⚠️ Erreur chargement classeur ${classeur.id}:`, error);
        return {
          ...classeur,
          dossiers: [],
          notes: []
        };
      }
    });

    const classeursWithContent = await Promise.all(contentPromises);
    const contentTime = Date.now() - contentStart;

    // 🚀 Étape 3: Mise à jour du store Zustand
    const storeStart = Date.now();
    
    simpleLogger.dev(`[OptimizedClasseurService] 🔍 Store AVANT mise à jour:`, {
      classeurs: Object.keys(useFileSystemStore.getState().classeurs).length,
      folders: Object.keys(useFileSystemStore.getState().folders).length,
      notes: Object.keys(useFileSystemStore.getState().notes).length
    });
    
    // 🔧 OPTIMISATION: Mapper et valider les données
    const { mappedClasseurs, mappedFolders, mappedNotes } = this.mapDataForStore(classeursWithContent);
    
    // 🔧 OPTIMISATION: Mise à jour sécurisée du store
    this.updateStoreSafely(mappedClasseurs, mappedFolders, mappedNotes);
    
    const storeUpdateTime = Date.now() - storeStart;

    // 📊 Métriques de performance
    const totalTime = Date.now() - startTime;
    const metrics: PerformanceMetrics = {
      totalTime,
      classeursTime,
      contentTime,
      storeUpdateTime
    };

    simpleLogger.dev(`[OptimizedClasseurService] 🎯 Performance:`, {
      total: `${totalTime}ms`,
      classeurs: `${classeursTime}ms`,
      content: `${contentTime}ms`,
      store: `${storeUpdateTime}ms`
    });

    return classeursWithContent;
  }

  /**
   * 🔧 OPTIMISATION: Mapping sécurisé des données
   */
  private mapDataForStore(classeursWithContent: ClasseurWithContent[]) {
    const mappedClasseurs: Classeur[] = classeursWithContent.map(c => ({
      id: c.id,
      name: c.name,
      description: c.description,
      emoji: c.emoji,
      position: c.position,
      created_at: c.created_at
    }));

    const mappedFolders: Folder[] = classeursWithContent.flatMap(c => 
      c.dossiers.map(d => ({
        id: d.id,
        name: d.name,
        position: d.position,
        parent_id: d.parent_id,
        classeur_id: c.id,
        created_at: d.created_at
      }))
    );

    const mappedNotes: Note[] = classeursWithContent.flatMap(c => 
      c.notes.map(n => ({
        id: n.id,
        source_title: n.source_title,
        markdown_content: n.markdown_content ?? '',
        html_content: n.html_content ?? undefined,
        folder_id: n.folder_id ?? null,
        classeur_id: c.id,
        position: n.position ?? 0,
        created_at: n.created_at ?? new Date().toISOString(),
        updated_at: n.updated_at ?? new Date().toISOString(),
        slug: n.slug ?? '',
        visibility: n.visibility ?? undefined,
        source_type: n.source_type ?? null,
      }))
    );

    return { mappedClasseurs, mappedFolders, mappedNotes };
  }

  /**
   * 🔧 OPTIMISATION: Mise à jour sécurisée du store
   */
  private updateStoreSafely(classeurs: Classeur[], folders: Folder[], notes: Note[]) {
    try {
      const store = useFileSystemStore.getState();
      
      // Mise à jour atomique du store
      store.setClasseurs(classeurs);
      store.setFolders(folders);
      store.setNotes(notes);
      
      simpleLogger.dev(`[OptimizedClasseurService] 🔍 Store APRÈS mise à jour:`, {
        classeurs: Object.keys(store.classeurs).length,
        folders: Object.keys(store.folders).length,
        notes: Object.keys(store.notes).length,
        classeursIds: Object.keys(store.classeurs),
        foldersIds: Object.keys(store.folders),
        notesIds: Object.keys(store.notes)
      });
    } catch (error) {
      simpleLogger.error('[OptimizedClasseurService] ❌ Erreur mise à jour store:', error);
      throw new Error('Erreur lors de la mise à jour de l\'interface');
    }
  }

  /**
   * Récupérer les dossiers d'un classeur spécifique avec retry
   */
  private async getDossiersForClasseur(classeurId: string) {
    simpleLogger.dev(`[OptimizedClasseurService] 🔍 Récupération dossiers pour classeur ${classeurId}...`);
    
    return this.withRetry(async () => {
      const { data, error } = await supabase
        .from('folders')
        .select('id, name, position, parent_id, created_at')
        .eq('classeur_id', classeurId)
        .eq('is_in_trash', false) // 🔧 CORRECTION: Exclure les dossiers supprimés
        .order('position', { ascending: true })
        .limit(MAX_FOLDERS_PER_CLASSEUR);

      if (error) {
        throw new Error(`Erreur dossiers classeur ${classeurId}: ${error.message}`);
      }

      const rows = data || [];
      if (rows.length >= MAX_FOLDERS_PER_CLASSEUR) {
        simpleLogger.warn(
          `[OptimizedClasseurService] ⚠️ Plafond dossiers (${MAX_FOLDERS_PER_CLASSEUR}) pour classeur ${classeurId}`
        );
      }
      simpleLogger.dev(`[OptimizedClasseurService] ✅ ${rows.length} dossiers récupérés pour classeur ${classeurId}`);
      return rows;
    }, `Récupération dossiers classeur ${classeurId}`);
  }

  /**
   * Récupérer les notes d'un classeur spécifique avec retry
   */
  private async getNotesForClasseur(classeurId: string) {
    simpleLogger.dev(`[OptimizedClasseurService] 🔍 Récupération notes pour classeur ${classeurId}...`);
    
    return this.withRetry(async () => {
      const { data, error } = await supabase
        .from('articles')
        .select('id, source_title, folder_id, created_at, updated_at, slug, source_type')
        .eq('classeur_id', classeurId)
        .eq('is_in_trash', false) // 🔧 CORRECTION: Exclure les notes supprimées
        .order('created_at', { ascending: false })
        .limit(MAX_NOTES_PER_CLASSEUR);

      if (error) {
        throw new Error(`Erreur notes classeur ${classeurId}: ${error.message}`);
      }

      const rows = data || [];
      if (rows.length >= MAX_NOTES_PER_CLASSEUR) {
        simpleLogger.warn(
          `[OptimizedClasseurService] ⚠️ Plafond notes (${MAX_NOTES_PER_CLASSEUR}) pour classeur ${classeurId}`
        );
      }
      simpleLogger.dev(`[OptimizedClasseurService] ✅ ${rows.length} notes récupérées pour classeur ${classeurId}`);
      return rows;
    }, `Récupération notes classeur ${classeurId}`);
  }

  /**
   * 🔧 OPTIMISATION: Nettoyage automatique du cache expiré
   */
  private cleanupExpiredCache() {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [key, value] of this.cache.entries()) {
      if ((now - value.timestamp) > this.CACHE_TTL) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      simpleLogger.dev(`[OptimizedClasseurService] 🗑️ Cache nettoyé: ${cleanedCount} entrées expirées supprimées`);
    }
  }

  /**
   * 🔧 OPTIMISATION: Contrôle de la taille du cache
   */
  private ensureCacheSizeLimit() {
    if (this.cache.size > this.MAX_CACHE_SIZE) {
      // Supprimer les entrées les plus anciennes
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const toRemove = entries.slice(0, this.cache.size - this.MAX_CACHE_SIZE);
      toRemove.forEach(([key]) => this.cache.delete(key));
      
      simpleLogger.dev(`[OptimizedClasseurService] 🗑️ Cache limité: ${toRemove.length} entrées anciennes supprimées`);
    }
  }

  /**
   * Invalider le cache pour forcer un rechargement
   */
  invalidateCache(userId: string) {
    const cacheKey = `classeurs_${userId}`;
    this.cache.delete(cacheKey);
    simpleLogger.dev('[OptimizedClasseurService] 🗑️ Cache invalidé pour:', userId);
  }

  /**
   * 🔧 OPTIMISATION: Nettoyer tout le cache
   */
  clearAllCache() {
    const size = this.cache.size;
    this.cache.clear();
    simpleLogger.dev(`[OptimizedClasseurService] 🗑️ Cache complet vidé: ${size} entrées supprimées`);
  }

  /**
   * Obtenir les statistiques du cache
   */
  getCacheStats() {
    const now = Date.now();
    let expiredCount = 0;
    let loadingCount = 0;
    let errorCount = 0;
    
    for (const [_, value] of this.cache.entries()) {
      if ((now - value.timestamp) > this.CACHE_TTL) expiredCount++;
      if (value.loading) loadingCount++;
      if (value.error) errorCount++;
    }
    
    return {
      totalCacheSize: this.cache.size,
      expiredEntries: expiredCount,
      loadingEntries: loadingCount,
      errorEntries: errorCount,
      maxCacheSize: this.MAX_CACHE_SIZE,
      cacheTTL: this.CACHE_TTL
    };
  }

  /**
   * 🔧 OPTIMISATION: Vérifier la santé du service
   */
  async healthCheck(): Promise<{ healthy: boolean; details: Record<string, unknown> }> {
    try{
      const stats = this.getCacheStats();
      const hasErrors = stats.errorEntries > 0;
      const isOverloaded = stats.totalCacheSize > this.MAX_CACHE_SIZE * 0.8;
      
      return {
        healthy: !hasErrors && !isOverloaded,
        details: {
          ...stats,
          hasErrors,
          isOverloaded,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        healthy: false,
        details: {
          error: error instanceof Error ? error.message : 'Erreur inconnue',
          timestamp: new Date().toISOString()
        }
      };
    }
  }
}

// ==========================================================================
// EXPORT
// ==========================================================================

export const optimizedClasseurService = OptimizedClasseurService.getInstance();
export default optimizedClasseurService; 