/**
 * 🎯 Service de Polling Ciblé et Ponctuel
 * 
 * Principe : 1 Action UI = 1 Polling Ciblé = 1 Mise à jour UI
 * Plus de polling continu inefficace !
 */

import { useFileSystemStore } from '@/store/useFileSystemStore';
import { simpleLogger as logger } from '@/utils/logger';

export type EntityType = 'notes' | 'folders' | 'classeurs';
export type OperationType = 
  | 'CREATE' | 'UPDATE' | 'DELETE' | 'MOVE' | 'RENAME'
  | 'note_created' | 'note_updated' | 'note_deleted' | 'note_moved' | 'note_renamed'
  | 'folder_created' | 'folder_updated' | 'folder_deleted' | 'folder_moved' | 'folder_renamed'
  | 'classeur_created' | 'classeur_updated' | 'classeur_deleted' | 'classeur_renamed';

interface PollingConfig {
  endpoint: string;
  storeUpdate: (data: unknown) => void;
  entityType: EntityType;
}

interface ApiResponse {
  success?: boolean;
  notes?: unknown[];
  folders?: unknown[];
  classeurs?: unknown[];
  error?: string;
}

class TargetedPollingService {
  private static instance: TargetedPollingService;
  private isPolling = false;
  private userToken: string | null = null;

  private constructor() {}

  static getInstance(): TargetedPollingService {
    if (!TargetedPollingService.instance) {
      TargetedPollingService.instance = new TargetedPollingService();
    }
    return TargetedPollingService.instance;
  }

  /**
   * 🔧 Initialiser le service avec le token utilisateur
   */
  initialize(userToken: string): void {
    if (!userToken || typeof userToken !== 'string') {
      throw new Error('Token utilisateur invalide');
    }
    this.userToken = userToken;
    console.log('[TargetedPolling] ✅ Service initialisé avec token:', !!userToken);
    logger.dev('[TargetedPolling] ✅ Service initialisé');
  }

  /**
   * 🔧 Initialiser le service avec le token actuel de la session
   */
  private async initializeWithCurrentToken(): Promise<void> {
    try {
      const { data: { session } } = await import('@/supabaseClient').then(m => m.supabase.auth.getSession());
      const token = session?.access_token;
      
      if (token && typeof token === 'string') {
        this.userToken = token;
        logger.dev('[TargetedPolling] ✅ Token récupéré depuis la session');
      } else {
        logger.warn('[TargetedPolling] ⚠️ Aucun token dans la session');
      }
    } catch (error) {
      logger.error('[TargetedPolling] ❌ Erreur récupération token:', error);
    }
  }

  /**
   * 🎯 Polling ciblé pour les notes
   */
  async pollNotesOnce(operation: OperationType = 'UPDATE'): Promise<void> {
    if (this.isPolling) {
      logger.dev('[TargetedPolling] ⏳ Polling déjà en cours, ignoré');
      return;
    }

    // Vérifier que le token est disponible
    if (!this.userToken) {
      logger.warn('[TargetedPolling] ⚠️ Token non disponible, récupération...');
      await this.initializeWithCurrentToken();
      if (!this.userToken) {
        logger.error('[TargetedPolling] ❌ Impossible de récupérer le token');
        return;
      }
    }

    try {
      this.isPolling = true;
      logger.dev(`[TargetedPolling] 🎯 Polling notes (${operation})`);

      const response = await fetch('/api/v2/note/recent', {
        headers: {
          'Authorization': `Bearer ${this.userToken}`,
          'X-Client-Type': 'targeted-polling'
        }
      });

      if (this.validateApiResponse(response)) {
        const data = await this.parseApiResponse(response);
        if (data) {
          this.updateNotesStore(data);
          logger.dev(`[TargetedPolling] ✅ Notes mises à jour (${data.notes?.length || 0} notes)`);
        }
      }
    } catch (error) {
      logger.error('[TargetedPolling] ❌ Erreur polling notes:', error);
    } finally {
      this.isPolling = false;
    }
  }

  /**
   * 🎯 Polling ciblé pour les dossiers
   */
  async pollFoldersOnce(operation: OperationType = 'UPDATE'): Promise<void> {
    if (this.isPolling) {
      logger.dev('[TargetedPolling] ⏳ Polling déjà en cours, ignoré');
      return;
    }

    // Vérifier que le token est disponible
    if (!this.userToken) {
      logger.warn('[TargetedPolling] ⚠️ Token non disponible, récupération...');
      await this.initializeWithCurrentToken();
      if (!this.userToken) {
        logger.error('[TargetedPolling] ❌ Impossible de récupérer le token');
        return;
      }
    }

    try {
      this.isPolling = true;
      logger.dev(`[TargetedPolling] 🎯 Polling dossiers (${operation})`);

      const response = await fetch('/api/v2/classeurs/with-content', {
        headers: {
          'Authorization': `Bearer ${this.userToken}`,
          'X-Client-Type': 'targeted-polling'
        }
      });

      if (this.validateApiResponse(response)) {
        const data = await this.parseApiResponse(response);
        if (data) {
          this.updateFoldersStore(data);
          logger.dev(`[TargetedPolling] ✅ Dossiers mis à jour (${data.folders?.length || 0} dossiers)`);
        }
      }
    } catch (error) {
      logger.error('[TargetedPolling] ❌ Erreur polling dossiers:', error);
    } finally {
      this.isPolling = false;
    }
  }

  /**
   * 🎯 Polling ciblé pour les classeurs
   */
  async pollClasseursOnce(operation: OperationType = 'UPDATE'): Promise<void> {
    if (this.isPolling) {
      logger.dev('[TargetedPolling] ⏳ Polling déjà en cours, ignoré');
      return;
    }

    // Vérifier que le token est disponible
    if (!this.userToken) {
      logger.warn('[TargetedPolling] ⚠️ Token non disponible, récupération...');
      await this.initializeWithCurrentToken();
      if (!this.userToken) {
        logger.error('[TargetedPolling] ❌ Impossible de récupérer le token');
        return;
      }
    }

    try {
      this.isPolling = true;
      logger.dev(`[TargetedPolling] 🎯 Polling classeurs (${operation})`);

      const response = await fetch('/api/v2/classeurs/with-content', {
        headers: {
          'Authorization': `Bearer ${this.userToken}`,
          'X-Client-Type': 'targeted-polling'
        }
      });

      if (this.validateApiResponse(response)) {
        const data = await this.parseApiResponse(response);
        if (data) {
          this.updateClasseursStore(data);
          logger.dev(`[TargetedPolling] ✅ Classeurs mis à jour (${data.classeurs?.length || 0} classeurs)`);
        }
      }
    } catch (error) {
      logger.error('[TargetedPolling] ❌ Erreur polling classeurs:', error);
    } finally {
      this.isPolling = false;
    }
  }

  /**
   * 🎯 Polling ciblé pour tout (notes + dossiers + classeurs)
   */
  async pollAllOnce(operation: OperationType = 'UPDATE'): Promise<void> {
    logger.dev(`[TargetedPolling] 🎯 Polling complet (${operation})`);
    
    // Polling parallèle pour plus d'efficacité
    await Promise.all([
      this.pollNotesOnce(operation),
      this.pollFoldersOnce(operation),
      this.pollClasseursOnce(operation)
    ]);
  }

  /**
   * 🔄 Mettre à jour le store des notes
   */
  private updateNotesStore(data: ApiResponse): void {
    const store = useFileSystemStore.getState();
    
    if (data.notes && Array.isArray(data.notes)) {
      // Merge intelligent : mettre à jour/ajouter les notes
      data.notes.forEach((note: unknown) => {
        if (this.isValidNote(note)) {
          if (store.notes[note.id]) {
            // Mettre à jour une note existante
            store.updateNote(note.id, note);
          } else {
            // Ajouter une nouvelle note
            store.addNote(note);
          }
        }
      });
    }
  }

  /**
   * 🔍 Valider qu'un objet est une note valide
   */
  private isValidNote(obj: unknown): obj is { id: string; [key: string]: unknown } {
    return (
      typeof obj === 'object' &&
      obj !== null &&
      'id' in obj &&
      typeof (obj as { id: unknown }).id === 'string'
    );
  }

  /**
   * 🔍 Valider qu'un objet est un dossier valide
   */
  private isValidFolder(obj: unknown): obj is { id: string; [key: string]: unknown } {
    return (
      typeof obj === 'object' &&
      obj !== null &&
      'id' in obj &&
      typeof (obj as { id: unknown }).id === 'string'
    );
  }

  /**
   * 🔍 Valider qu'un objet est un classeur valide
   */
  private isValidClasseur(obj: unknown): obj is { id: string; [key: string]: unknown } {
    return (
      typeof obj === 'object' &&
      obj !== null &&
      'id' in obj &&
      typeof (obj as { id: unknown }).id === 'string'
    );
  }

  /**
   * 🔄 Mettre à jour le store des dossiers
   */
  private updateFoldersStore(data: ApiResponse): void {
    const store = useFileSystemStore.getState();
    
    if (data.folders && Array.isArray(data.folders)) {
      // Merge intelligent : mettre à jour/ajouter les dossiers
      data.folders.forEach((folder: unknown) => {
        if (this.isValidFolder(folder)) {
          if (store.folders[folder.id]) {
            // Mettre à jour un dossier existant
            store.updateFolder(folder.id, folder);
          } else {
            // Ajouter un nouveau dossier
            store.addFolder(folder);
          }
        }
      });
    }
  }

  /**
   * 🔄 Mettre à jour le store des classeurs
   */
  private updateClasseursStore(data: ApiResponse): void {
    const store = useFileSystemStore.getState();
    
    if (data.classeurs && Array.isArray(data.classeurs)) {
      // Merge intelligent : mettre à jour/ajouter les classeurs
      data.classeurs.forEach((classeur: unknown) => {
        if (this.isValidClasseur(classeur)) {
          if (store.classeurs[classeur.id]) {
            // Mettre à jour un classeur existant
            store.updateClasseur(classeur.id, classeur);
          } else {
            // Ajouter un nouveau classeur
            store.addClasseur(classeur);
          }
        }
      });
    }

    // Mettre à jour aussi les dossiers et notes si présents
    if (data.folders && Array.isArray(data.folders)) {
      data.folders.forEach((folder: unknown) => {
        if (this.isValidFolder(folder)) {
          store.updateFolder(folder.id, folder);
        }
      });
    }

    if (data.notes && Array.isArray(data.notes)) {
      data.notes.forEach((note: unknown) => {
        if (this.isValidNote(note)) {
          store.updateNote(note.id, note);
        }
      });
    }
  }

  /**
   * 🔍 Vérifier si le service est en cours de polling
   */
  isCurrentlyPolling(): boolean {
    return this.isPolling;
  }

  /**
   * 🔧 Valider la réponse API
   */
  private validateApiResponse(response: Response): boolean {
    if (!response.ok) {
      logger.warn(`[TargetedPolling] ❌ Réponse API invalide: ${response.status} ${response.statusText}`);
      return false;
    }
    return true;
  }

  /**
   * 🔧 Parser la réponse JSON de manière sécurisée
   */
  private async parseApiResponse(response: Response): Promise<ApiResponse | null> {
    try {
      const data = await response.json();
      return data as ApiResponse;
    } catch (error) {
      logger.error('[TargetedPolling] ❌ Erreur parsing JSON:', error);
      return null;
    }
  }

  /**
   * 🛑 Arrêter le service (nettoyage)
   */
  stop(): void {
    this.isPolling = false;
    this.userToken = null;
    logger.dev('[TargetedPolling] 🛑 Service arrêté');
  }
}

// Export singleton
export const targetedPollingService = TargetedPollingService.getInstance();
