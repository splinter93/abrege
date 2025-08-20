import { supabase } from '@/supabaseClient';
import { simpleLogger as logger } from '@/utils/logger';
import { useFileSystemStore } from '@/store/useFileSystemStore';

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
    updated_at: string;
  }>;
  notes: Array<{
    id: string;
    source_title: string;
    folder_id?: string;
    created_at: string;
    updated_at: string;
    slug?: string;
  }>;
}

interface PerformanceMetrics {
  totalTime: number;
  classeursTime: number;
  contentTime: number;
  storeUpdateTime: number;
}

// ==========================================================================
// SERVICE OPTIMISÉ
// ==========================================================================

export class OptimizedClasseurService {
  private static instance: OptimizedClasseurService;
  private cache = new Map<string, { data: ClasseurWithContent[]; timestamp: number }>();
  private readonly CACHE_TTL = 30000; // 30 secondes

  static getInstance(): OptimizedClasseurService {
    if (!OptimizedClasseurService.instance) {
      OptimizedClasseurService.instance = new OptimizedClasseurService();
    }
    return OptimizedClasseurService.instance;
  }

  /**
   * Chargement ultra-optimisé des classeurs avec tout leur contenu
   * Utilise des requêtes parallèles et de la mise en cache
   */
  async loadClasseursWithContentOptimized(userId: string): Promise<ClasseurWithContent[]> {
    const startTime = Date.now();
    const cacheKey = `classeurs_${userId}`;
    
    // 🔍 Vérifier le cache
    const cached = this.cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
      logger.dev('[OptimizedClasseurService] 🚀 Données récupérées du cache');
      return cached.data;
    }

    try {
      logger.dev('[OptimizedClasseurService] 🚀 Début chargement optimisé des classeurs');

      // 🚀 Étape 1: Récupérer tous les classeurs en une seule requête
      const classeursStart = Date.now();
      const { data: classeurs, error: classeursError } = await supabase
        .from('classeurs')
        .select('id, name, description, emoji, position, slug, created_at, updated_at')
        .eq('user_id', userId)
        .order('position', { ascending: true });

      if (classeursError) {
        throw new Error(`Erreur récupération classeurs: ${classeursError.message}`);
      }

      const classeursTime = Date.now() - classeursStart;
      logger.dev(`[OptimizedClasseurService] ✅ ${classeurs?.length || 0} classeurs récupérés en ${classeursTime}ms`);

      if (!classeurs || classeurs.length === 0) {
        return [];
      }

      // 🚀 Étape 2: Chargement parallèle de tout le contenu
      const contentStart = Date.now();
      const contentPromises = classeurs.map(async (classeur) => {
        try {
          // Charger dossiers et notes en parallèle pour chaque classeur
          const [dossiersResult, notesResult] = await Promise.all([
            this.getDossiersForClasseur(classeur.id),
            this.getNotesForClasseur(classeur.id)
          ]);

          return {
            ...classeur,
            dossiers: dossiersResult,
            notes: notesResult
          };
        } catch (error) {
          logger.warn(`[OptimizedClasseurService] ⚠️ Erreur chargement classeur ${classeur.id}:`, error);
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
      const store = useFileSystemStore.getState();
      
      // Mettre à jour les classeurs
      store.setClasseurs(classeursWithContent);
      
      // Extraire et mettre à jour tous les dossiers et notes
      const allDossiers = classeursWithContent.flatMap(c => c.dossiers);
      const allNotes = classeursWithContent.flatMap(c => c.notes);
      
      store.setFolders(allDossiers);
      store.setNotes(allNotes);
      
      const storeUpdateTime = Date.now() - storeStart;

      // 📊 Métriques de performance
      const totalTime = Date.now() - startTime;
      const metrics: PerformanceMetrics = {
        totalTime,
        classeursTime,
        contentTime,
        storeUpdateTime
      };

      logger.dev(`[OptimizedClasseurService] 🎯 Performance:`, {
        total: `${totalTime}ms`,
        classeurs: `${classeursTime}ms`,
        content: `${contentTime}ms`,
        store: `${storeUpdateTime}ms`
      });

      // 💾 Mettre en cache
      this.cache.set(cacheKey, {
        data: classeursWithContent,
        timestamp: Date.now()
      });

      return classeursWithContent;

    } catch (error) {
      logger.error('[OptimizedClasseurService] ❌ Erreur chargement optimisé:', error);
      throw error;
    }
  }

  /**
   * Récupérer les dossiers d'un classeur spécifique
   */
  private async getDossiersForClasseur(classeurId: string) {
    const { data, error } = await supabase
      .from('folders')
      .select('id, name, position, parent_id, created_at, updated_at')
      .eq('notebook_id', classeurId)
      .order('position', { ascending: true });

    if (error) {
      logger.warn(`[OptimizedClasseurService] ⚠️ Erreur dossiers classeur ${classeurId}:`, error);
      return [];
    }

    return data || [];
  }

  /**
   * Récupérer les notes d'un classeur spécifique
   */
  private async getNotesForClasseur(classeurId: string) {
    const { data, error } = await supabase
      .from('articles')
      .select('id, source_title, folder_id, created_at, updated_at, slug')
      .or(`classeur_id.eq.${classeurId},notebook_id.eq.${classeurId}`)
      .order('created_at', { ascending: false });

    if (error) {
      logger.warn(`[OptimizedClasseurService] ⚠️ Erreur notes classeur ${classeurId}:`, error);
      return [];
    }

    return data || [];
  }

  /**
   * Invalider le cache pour forcer un rechargement
   */
  invalidateCache(userId: string) {
    const cacheKey = `classeurs_${userId}`;
    this.cache.delete(cacheKey);
    logger.dev('[OptimizedClasseurService] 🗑️ Cache invalidé pour:', userId);
  }

  /**
   * Nettoyer le cache expiré
   */
  private cleanupExpiredCache() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if ((now - value.timestamp) > this.CACHE_TTL) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Obtenir les statistiques du cache
   */
  getCacheStats() {
    return {
      totalCacheSize: this.cache.size
    };
  }
}

// ==========================================================================
// EXPORT
// ==========================================================================

export const optimizedClasseurService = OptimizedClasseurService.getInstance();
export default optimizedClasseurService; 