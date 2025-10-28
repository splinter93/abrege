import { V2UnifiedApi } from './V2UnifiedApi';
// Import supprimé car plus utilisé après migration vers V2UnifiedApi
import { simpleLogger as logger } from '@/utils/logger';
import type { 
  CreateClasseurRequest, 
  UpdateClasseurRequest, 
  CreateFolderRequest, 
  CreateNoteRequest
} from '@/types/dossiers';
import type { Classeur, Folder, Note } from '@/store/useFileSystemStore';

/**
 * Interface pour les données sanitizables
 */
interface SanitizableData {
  name?: string;
  source_title?: string;
  description?: string;
  [key: string]: unknown;
}

/**
 * Service dédié à la gestion des dossiers, classeurs et notes
 * Utilise l'API V2 unifiée avec gestion optimiste du store
 */
export class DossierService {
  private static instance: DossierService;
  private api: V2UnifiedApi;

  private constructor() {
    this.api = V2UnifiedApi.getInstance();
  }

  static getInstance(): DossierService {
    if (!DossierService.instance) {
      DossierService.instance = new DossierService();
    }
    return DossierService.instance;
  }

  // ==========================================================================
  // GESTION DES CLASSEURS
  // ==========================================================================

  /**
   * Créer un nouveau classeur avec mise à jour optimiste
   */
  async createClasseur(data: CreateClasseurRequest, _userId: string): Promise<Classeur> {
    try {
      logger.dev('[DossierService] 🚀 Création classeur via V2UnifiedApi:', data);
      
      // 🔧 CORRECTION: Utiliser V2UnifiedApi au lieu de l'ancien OptimizedApi
      const { V2UnifiedApi } = await import('@/services/V2UnifiedApi');
      const v2Api = V2UnifiedApi.getInstance();
      
      // ✅ V2UnifiedApi gère automatiquement l'optimisme et la mise à jour du store
      const result = await v2Api.createClasseur(data);
      
      logger.dev('[DossierService] ✅ Classeur créé via V2UnifiedApi:', result.classeur.id);
      return result.classeur;
    } catch (error) {
      logger.error('[DossierService] ❌ Erreur création classeur:', error);
      throw error;
    }
  }

  /**
   * Mettre à jour un classeur existant
   */
  async updateClasseur(
    classeurId: string, 
    data: UpdateClasseurRequest, 
    _userId: string
  ): Promise<Classeur> {
    try {
      logger.dev('[DossierService] 🔄 Mise à jour classeur via V2UnifiedApi:', { classeurId, data });
      
      // 🔧 CORRECTION: Utiliser V2UnifiedApi au lieu de l'ancien OptimizedApi
      const { V2UnifiedApi } = await import('@/services/V2UnifiedApi');
      const v2Api = V2UnifiedApi.getInstance();
      
      // ✅ V2UnifiedApi gère automatiquement la mise à jour du store
      const result = await v2Api.updateClasseur(classeurId, data);
      
      logger.dev('[DossierService] ✅ Classeur mis à jour via V2UnifiedApi:', classeurId);
      return result.classeur;
    } catch (error) {
      logger.error('[DossierService] ❌ Erreur mise à jour classeur:', error);
      throw error;
    }
  }

  /**
   * Supprimer un classeur
   */
  async deleteClasseur(classeurId: string, _userId: string): Promise<void> {
    try {
      logger.dev('[DossierService] 🗑️ Suppression classeur via V2UnifiedApi:', classeurId);
      
      // 🔧 CORRECTION: Utiliser V2UnifiedApi au lieu de l'ancien OptimizedApi
      const { V2UnifiedApi } = await import('@/services/V2UnifiedApi');
      const v2Api = V2UnifiedApi.getInstance();
      
      // ✅ V2UnifiedApi gère automatiquement la suppression du store et la gestion du classeur actif
      await v2Api.deleteClasseur(classeurId);
      
      logger.dev('[DossierService] ✅ Classeur supprimé via V2UnifiedApi:', classeurId);
    } catch (error) {
      logger.error('[DossierService] ❌ Erreur suppression classeur:', error);
      throw error;
    }
  }

  /**
   * Mettre à jour les positions des classeurs
   */
  async updateClasseurPositions(
    updates: Array<{ id: string; position: number }>, 
    _userId: string
  ): Promise<void> {
    try {
      logger.dev('[DossierService] 🔄 Mise à jour positions classeurs via V2UnifiedApi:', updates);
      
      // 🔧 CORRECTION: Utiliser V2UnifiedApi au lieu de l'ancien OptimizedApi
      const { V2UnifiedApi } = await import('@/services/V2UnifiedApi');
      const v2Api = V2UnifiedApi.getInstance();
      
      // ✅ V2UnifiedApi gère automatiquement la mise à jour du store
      await v2Api.reorderClasseurs(updates);
      
      logger.dev('[DossierService] ✅ Positions classeurs mises à jour via V2UnifiedApi');
    } catch (error) {
      logger.error('[DossierService] ❌ Erreur mise à jour positions classeurs:', error);
      throw error;
    }
  }

  // ==========================================================================
  // GESTION DES DOSSIERS
  // ==========================================================================

  /**
   * Créer un nouveau dossier
   */
  async createFolder(data: CreateFolderRequest, _userId: string): Promise<Folder> {
    try {
      logger.dev('[DossierService] 🚀 Création dossier via V2UnifiedApi:', data);
      
      // 🔧 CORRECTION: Utiliser V2UnifiedApi au lieu de l'ancien OptimizedApi
      const { V2UnifiedApi } = await import('@/services/V2UnifiedApi');
      const v2Api = V2UnifiedApi.getInstance();
      
      // ✅ V2UnifiedApi gère automatiquement l'optimisme et la mise à jour du store
      const result = await v2Api.createFolder(data);
      
      logger.dev('[DossierService] ✅ Dossier créé via V2UnifiedApi:', result.folder.id);
      return result.folder;
    } catch (error) {
      logger.error('[DossierService] ❌ Erreur création dossier:', error);
      throw error;
    }
  }

  // ==========================================================================
  // GESTION DES NOTES
  // ==========================================================================

  /**
   * Créer une nouvelle note
   */
  async createNote(data: CreateNoteRequest, _userId: string): Promise<Note> {
    try {
      logger.dev('[DossierService] 🚀 Création note via V2UnifiedApi:', data);
      
      // 🔧 CORRECTION: Utiliser V2UnifiedApi au lieu de l'ancien OptimizedApi
      const { V2UnifiedApi } = await import('@/services/V2UnifiedApi');
      const v2Api = V2UnifiedApi.getInstance();
      
      // ✅ V2UnifiedApi gère automatiquement l'optimisme et la mise à jour du store
      const result = await v2Api.createNote(data);
      
      // 🔒 SÉCURITÉ: Vérifier le succès avant d'accéder à result.note
      if (!result.success || !result.note) {
        throw new Error(result.error || 'Erreur lors de la création de la note');
      }
      
      logger.dev('[DossierService] ✅ Note créée via V2UnifiedApi:', result.note.id);
      return result.note;
    } catch (error) {
      logger.error('[DossierService] ❌ Erreur création note:', error);
      throw error;
    }
  }

  // ==========================================================================
  // UTILITAIRES
  // ==========================================================================

  /**
   * Valider les données d'entrée
   */
  private validateInput(data: Record<string, unknown>, requiredFields: string[]): void {
    for (const field of requiredFields) {
      if (!data[field] || (typeof data[field] === 'string' && !(data[field] as string).trim())) {
        throw new Error(`Champ requis manquant: ${field}`);
      }
    }
  }

  /**
   * Nettoyer les données d'entrée
   */
  private sanitizeInput(data: SanitizableData): SanitizableData {
    const sanitized = { ...data };
    
    // Nettoyer les chaînes
    if (typeof sanitized.name === 'string') sanitized.name = sanitized.name.trim();
    if (typeof sanitized.source_title === 'string') sanitized.source_title = sanitized.source_title.trim();
    if (typeof sanitized.description === 'string') sanitized.description = sanitized.description.trim();
    
    return sanitized;
  }
} 