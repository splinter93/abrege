import { V2UnifiedApi } from './V2UnifiedApi';
import { useFileSystemStore } from '@/store/useFileSystemStore';
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
  async createClasseur(data: CreateClasseurRequest, userId: string): Promise<Classeur> {
    try {
      logger.dev('[DossierService] 🚀 Création classeur:', data);
      
      // Mise à jour optimiste immédiate
      const tempId = `temp_classeur_${Date.now()}`;
      const optimisticClasseur: Classeur = {
        id: tempId,
        name: data.name,
        description: data.description,
        icon: data.icon,
        emoji: data.emoji || '📚',
        position: 0,
        created_at: new Date().toISOString(),
        _optimistic: true
      };

      const store = useFileSystemStore.getState();
      store.addClasseurOptimistic(optimisticClasseur);

      // Appel API
      const result = await this.api.createClasseur(data, userId);
      
      // Remplacer l'optimiste par la vraie donnée
      store.updateClasseurOptimistic(tempId, result.classeur);
      
      logger.dev('[DossierService] ✅ Classeur créé:', result.classeur.id);
      return result.classeur;
    } catch (error) {
      // Annuler l'optimiste en cas d'erreur
      const store = useFileSystemStore.getState();
      store.removeClasseurOptimistic(`temp_classeur_${Date.now()}`);
      
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
    userId: string
  ): Promise<Classeur> {
    try {
      logger.dev('[DossierService] 🔄 Mise à jour classeur:', { classeurId, data });
      
      // Mise à jour optimiste immédiate
      const store = useFileSystemStore.getState();
      const currentClasseur = store.classeurs[classeurId];
      
      if (currentClasseur) {
        store.updateClasseur(classeurId, data);
      }

      // Appel API
      const result = await this.api.updateClasseur(classeurId, data, userId);
      
      logger.dev('[DossierService] ✅ Classeur mis à jour:', classeurId);
      return result.classeur;
    } catch (error) {
      // Restaurer l'état précédent en cas d'erreur
      logger.error('[DossierService] ❌ Erreur mise à jour classeur:', error);
      throw error;
    }
  }

  /**
   * Supprimer un classeur
   */
  async deleteClasseur(classeurId: string, userId: string): Promise<void> {
    let currentClasseur: Classeur | undefined;
    let wasActiveClasseur = false;
    
    try {
      logger.dev('[DossierService] 🗑️ Suppression classeur:', classeurId);
      
      // Mise à jour optimiste immédiate
      const store = useFileSystemStore.getState();
      currentClasseur = store.classeurs[classeurId];
      wasActiveClasseur = store.activeClasseurId === classeurId;
      
      if (currentClasseur) {
        store.removeClasseur(classeurId);
        
        // ✅ CORRECTION: Gérer le classeur actif si c'est celui qui est supprimé
        if (wasActiveClasseur) {
          const remainingClasseurs = Object.values(store.classeurs);
          if (remainingClasseurs.length > 0) {
            // Sélectionner le premier classeur restant
            store.setActiveClasseurId(remainingClasseurs[0].id);
            logger.dev('[DossierService] ✅ Classeur actif mis à jour:', remainingClasseurs[0].id);
          } else {
            // Aucun classeur restant
            store.setActiveClasseurId(null);
            logger.dev('[DossierService] ℹ️ Aucun classeur restant, activeClasseurId mis à null');
          }
        }
      }

      // Appel API
      await this.api.deleteClasseur(classeurId, userId);
      
      logger.dev('[DossierService] ✅ Classeur supprimé:', classeurId);
    } catch (error) {
      // Restaurer l'état précédent en cas d'erreur
      if (currentClasseur) {
        const store = useFileSystemStore.getState();
        store.addClasseur(currentClasseur);
        
        // Restaurer aussi l'état actif si nécessaire
        if (wasActiveClasseur) {
          store.setActiveClasseurId(classeurId);
        }
      }
      
      logger.error('[DossierService] ❌ Erreur suppression classeur:', error);
      throw error;
    }
  }

  /**
   * Mettre à jour les positions des classeurs
   */
  async updateClasseurPositions(
    updates: Array<{ id: string; position: number }>, 
    userId: string
  ): Promise<void> {
    try {
      logger.dev('[DossierService] 🔄 Mise à jour positions classeurs:', updates);
      
      // Mise à jour optimiste immédiate
      const store = useFileSystemStore.getState();
      updates.forEach(({ id, position }) => {
        if (store.classeurs[id]) {
          store.updateClasseur(id, { position });
        }
      });

      // Appel API pour chaque mise à jour
      const promises = updates.map(({ id, position }) => 
        this.api.updateClasseur(id, { position }, userId)
      );
      
      await Promise.all(promises);
      
      logger.dev('[DossierService] ✅ Positions classeurs mises à jour');
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
  async createFolder(data: CreateFolderRequest, userId: string): Promise<Folder> {
    try {
      logger.dev('[DossierService] 🚀 Création dossier:', data);
      
      // Mise à jour optimiste immédiate
      const tempId = `temp_folder_${Date.now()}`;
      const optimisticFolder: Folder = {
        id: tempId,
        name: data.name,
        parent_id: data.parent_id || null,
        classeur_id: data.notebook_id,
        position: 0,
        created_at: new Date().toISOString(),
        _optimistic: true
      };

      const store = useFileSystemStore.getState();
      store.addFolderOptimistic(optimisticFolder);

      // Appel API
      const result = await this.api.createFolder(data, userId);
      
      // Remplacer l'optimiste par la vraie donnée
      store.updateFolderOptimistic(tempId, result.folder);
      
      logger.dev('[DossierService] ✅ Dossier créé:', result.folder.id);
      return result.folder;
    } catch (error) {
      // Annuler l'optimiste en cas d'erreur
      const store = useFileSystemStore.getState();
      store.removeFolderOptimistic(`temp_folder_${Date.now()}`);
      
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
  async createNote(data: CreateNoteRequest, userId: string): Promise<Note> {
    try {
      logger.dev('[DossierService] 🚀 Création note:', data);
      
      // Mise à jour optimiste immédiate
      const tempId = `temp_note_${Date.now()}`;
      const optimisticNote: Note = {
        id: tempId,
        source_title: data.source_title,
        folder_id: data.folder_id || null,
        classeur_id: data.notebook_id,
        position: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        markdown_content: data.markdown_content || `# ${data.source_title}\n\nContenu de la note...`,
        _optimistic: true
      };

      const store = useFileSystemStore.getState();
      store.addNoteOptimistic(optimisticNote, tempId);

      // Appel API
      const result = await this.api.createNote(data, userId);
      
      // Remplacer l'optimiste par la vraie donnée
      store.updateNoteOptimistic(tempId, result.note);
      
      logger.dev('[DossierService] ✅ Note créée:', result.note.id);
      return result.note;
    } catch (error) {
      // Annuler l'optimiste en cas d'erreur
      const store = useFileSystemStore.getState();
      store.removeNoteOptimistic(`temp_note_${Date.now()}`);
      
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