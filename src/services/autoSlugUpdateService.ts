import { SlugGenerator } from '@/utils/slugGenerator';
import { logApi } from '@/utils/logger';
import type { SupabaseClient } from '@supabase/supabase-js';

export type ResourceType = 'note' | 'folder' | 'classeur';

export interface SlugUpdateResult {
  success: boolean;
  newSlug: string;
  oldSlug?: string;
  error?: string;
}

/**
 * Service pour la mise à jour automatique des slugs lors du renommage
 * Gère les notes, dossiers et classeurs de manière unifiée
 */
export class AutoSlugUpdateService {
  
  /**
   * Met à jour automatiquement le slug d'une ressource si son nom a changé
   */
        static async updateSlugIfNameChanged(
        resourceType: ResourceType,
        resourceId: string,
        newName: string,
        userId: string,
        supabase: SupabaseClient,
        _context?: Record<string, unknown>
      ): Promise<SlugUpdateResult> {
    try {
              logApi.info(`🔄 Vérification mise à jour slug pour ${resourceType} ${resourceId}`, _context);
      
      // 1. Récupérer l'état courant de la ressource
      const currentResource = await this.getCurrentResource(resourceType, resourceId, userId, supabase);
      if (!currentResource) {
        return {
          success: false,
          newSlug: '',
          error: `Ressource ${resourceType} non trouvée`
        };
      }
      
      // 2. Vérifier si le nom a réellement changé
      if (currentResource.name === newName) {
        logApi.info(`✅ Nom inchangé pour ${resourceType} ${resourceId}, pas de mise à jour du slug`, _context);
              return {
        success: true,
        newSlug: currentResource.slug || '',
        oldSlug: currentResource.slug || undefined
      };
      }
      
      // 3. Générer le nouveau slug
      const newSlug = await SlugGenerator.generateSlug(
        newName,
        resourceType,
        userId,
        resourceId,
        supabase
      );
      
      // 4. Mettre à jour le slug en base
      const updateResult = await this.updateSlugInDatabase(
        resourceType,
        resourceId,
        newSlug,
        userId,
        supabase
      );
      
      if (updateResult.success) {
        logApi.info(`✅ Slug mis à jour pour ${resourceType} ${resourceId}: "${currentResource.slug}" → "${newSlug}"`, _context);
        return {
          success: true,
          newSlug,
          oldSlug: currentResource.slug || undefined
        };
      } else {
        return {
          success: false,
          newSlug: '',
          error: updateResult.error
        };
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logApi.error(`❌ Erreur mise à jour slug pour ${resourceType} ${resourceId}: ${errorMessage}`, error);
      return {
        success: false,
        newSlug: '',
        error: errorMessage
      };
    }
  }
  
  /**
   * Récupère l'état courant d'une ressource
   */
  private static async getCurrentResource(
    resourceType: ResourceType,
    resourceId: string,
    userId: string,
    supabase: SupabaseClient
  ): Promise<{ name: string; slug: string | null } | null> {
    try {
      switch (resourceType) {
        case 'note': {
          const { data, error } = await supabase
            .from('articles')
            .select('source_title, slug')
            .eq('id', resourceId)
            .eq('user_id', userId)
            .single();
          
          if (error || !data) return null;
          
          return {
            name: data.source_title,
            slug: data.slug
          };
        }
        
        case 'folder': {
          const { data, error } = await supabase
            .from('folders')
            .select('name, slug')
            .eq('id', resourceId)
            .eq('user_id', userId)
            .single();
          
          if (error || !data) return null;
          
          return {
            name: data.name,
            slug: data.slug
          };
        }
        
        case 'classeur': {
          const { data, error } = await supabase
            .from('classeurs')
            .select('name, slug')
            .eq('id', resourceId)
            .eq('user_id', userId)
            .single();
          
          if (error || !data) return null;
          
          return {
            name: data.name,
            slug: data.slug
          };
        }
        
        default:
          return null;
      }
    } catch (error) {
      console.error('Erreur getCurrentResource:', error);
      return null;
    }
  }
  
  /**
   * Met à jour le slug en base de données
   */
  private static async updateSlugInDatabase(
    resourceType: ResourceType,
    resourceId: string,
    newSlug: string,
    userId: string,
    supabase: SupabaseClient
  ): Promise<{ success: boolean; error?: string }> {
    const tableName = this.getTableName(resourceType);
    
    const { error } = await supabase
      .from(tableName)
      .update({ slug: newSlug })
      .eq('id', resourceId)
      .eq('user_id', userId);
    
    if (error) {
      return {
        success: false,
        error: `Erreur mise à jour base: ${error.message}`
      };
    }
    
    return { success: true };
  }
  
  /**
   * Retourne le nom de la table pour un type de ressource
   */
  private static getTableName(resourceType: ResourceType): string {
    switch (resourceType) {
      case 'note': return 'articles';
      case 'folder': return 'folders';
      case 'classeur': return 'classeurs';
    }
  }
  
  /**
   * Retourne le nom du champ pour un type de ressource
   */
  private static getNameField(resourceType: ResourceType): string {
    switch (resourceType) {
      case 'note': return 'source_title';
      case 'folder': return 'name';
      case 'classeur': return 'name';
    }
  }
  
  /**
   * Met à jour le slug d'une note (utilise SlugAndUrlService pour la compatibilité)
   */
  static async updateNoteSlug(
    noteId: string,
    newTitle: string,
    userId: string,
    supabase: SupabaseClient,
    context?: Record<string, unknown>
  ): Promise<SlugUpdateResult> {
    try {
      // Utiliser SlugAndUrlService pour les notes (plus complet avec URLs publiques)
      const { SlugAndUrlService } = await import('@/services/slugAndUrlService');
      const result = await SlugAndUrlService.updateNoteSlugAndUrl(
        noteId,
        newTitle,
        userId,
        supabase as unknown as SupabaseClient<unknown, { PostgrestVersion: string }, never, never, { PostgrestVersion: string }>
      );
      
      return {
        success: true,
        newSlug: result.slug,
        oldSlug: undefined // SlugAndUrlService ne retourne pas l'ancien slug
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logApi.error(`❌ Erreur mise à jour slug note ${noteId}: ${errorMessage}`, error);
      return {
        success: false,
        newSlug: '',
        error: errorMessage
      };
    }
  }
  
  /**
   * Met à jour le slug d'un dossier
   */
  static async updateFolderSlug(
    folderId: string,
    newName: string,
    userId: string,
    supabase: SupabaseClient,
    context?: Record<string, unknown>
  ): Promise<SlugUpdateResult> {
    return this.updateSlugIfNameChanged('folder', folderId, newName, userId, supabase, context);
  }
  
  /**
   * Met à jour le slug d'un classeur
   */
  static async updateClasseurSlug(
    classeurId: string,
    newName: string,
    userId: string,
    supabase: SupabaseClient,
    context?: Record<string, unknown>
  ): Promise<SlugUpdateResult> {
    return this.updateSlugIfNameChanged('classeur', classeurId, newName, userId, supabase, context);
  }
} 