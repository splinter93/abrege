/**
 * V2UnifiedApi - Wrapper pour compatibilité
 * Délègue aux modules refactorés
 * 
 * Conformité GUIDE-EXCELLENCE-CODE.md:
 * - Wrapper léger qui délègue aux modules < 300 lignes
 * - Compatibilité 100% avec l'API existante
 */

// Re-exporter les types
export type {
  CreateNoteData,
  UpdateNoteData,
  CreateFolderData,
  UpdateFolderData,
  CreateClasseurData,
  UpdateClasseurData
} from './v2Api/types';

// Importer les modules refactorés
import { ApiClient } from './v2Api/core/ApiClient';
import { NoteApi } from './v2Api/notes/NoteApi';
import { NoteContentApi } from './v2Api/notes/NoteContentApi';
import { FolderApi } from './v2Api/folders/FolderApi';
import { ClasseurApi } from './v2Api/classeurs/ClasseurApi';
import { ClasseurContentApi } from './v2Api/classeurs/ClasseurContentApi';
import type { CreateNoteData, UpdateNoteData, CreateFolderData, UpdateFolderData, CreateClasseurData, UpdateClasseurData } from './v2Api/types';

/**
 * Classe wrapper pour compatibilité avec code existant
 * Toutes les méthodes délèguent aux modules refactorés
 */
export class V2UnifiedApi {
  private static instance: V2UnifiedApi;
  private apiClient: ApiClient;
  private noteApi: NoteApi;
  private noteContentApi: NoteContentApi;
  private folderApi: FolderApi;
  private classeurApi: ClasseurApi;
  private classeurContentApi: ClasseurContentApi;

  private constructor() {
    this.apiClient = new ApiClient();
    this.noteApi = new NoteApi(this.apiClient);
    this.noteContentApi = new NoteContentApi(this.apiClient);
    this.folderApi = new FolderApi(this.apiClient);
    this.classeurApi = new ClasseurApi(this.apiClient);
    this.classeurContentApi = new ClasseurContentApi(this.apiClient);
  }

  static getInstance(): V2UnifiedApi {
    if (!V2UnifiedApi.instance) {
      V2UnifiedApi.instance = new V2UnifiedApi();
    }
    return V2UnifiedApi.instance;
  }

  // ============================================================================
  // NOTES
  // ============================================================================

  async createNote(noteData: CreateNoteData) {
    return this.noteApi.createNote(noteData);
  }

  async updateNote(noteId: string, updateData: UpdateNoteData) {
    return this.noteApi.updateNote(noteId, updateData);
  }

  async deleteNote(noteId: string, externalToken?: string) {
    return this.noteApi.deleteNote(noteId, externalToken);
  }

  async moveNote(noteId: string, targetFolderId: string | null, targetClasseurId?: string) {
    return this.noteApi.moveNote(noteId, targetFolderId, targetClasseurId);
  }

  async addContentToNote(ref: string, content: string) {
    return this.noteContentApi.addContentToNote(ref, content);
  }

  async getNoteContent(ref: string) {
    return this.noteContentApi.getNoteContent(ref);
  }

  // ============================================================================
  // FOLDERS
  // ============================================================================

  async createFolder(folderData: CreateFolderData) {
    return this.folderApi.createFolder(folderData);
  }

  async updateFolder(folderId: string, updateData: UpdateFolderData) {
    return this.folderApi.updateFolder(folderId, updateData);
  }

  async deleteFolder(folderId: string) {
    return this.folderApi.deleteFolder(folderId);
  }

  async moveFolder(folderId: string, targetParentId: string | null, targetClasseurId?: string) {
    return this.folderApi.moveFolder(folderId, targetParentId, targetClasseurId);
  }

  // ============================================================================
  // CLASSEURS
  // ============================================================================

  async createClasseur(classeurData: CreateClasseurData) {
    return this.classeurApi.createClasseur(classeurData);
  }

  async updateClasseur(classeurId: string, updateData: UpdateClasseurData) {
    return this.classeurApi.updateClasseur(classeurId, updateData);
  }

  async deleteClasseur(classeurId: string) {
    return this.classeurApi.deleteClasseur(classeurId);
  }

  async getClasseurTree(classeurId: string) {
    return this.classeurApi.getClasseurTree(classeurId);
  }

  async getClasseurs() {
    return this.classeurApi.getClasseurs();
  }

  async reorderClasseurs(classeurs: Array<{ id: string; position: number }>) {
    return this.classeurApi.reorderClasseurs(classeurs);
  }

  async loadClasseursWithContent() {
    return this.classeurContentApi.loadClasseursWithContent();
  }
}

// Export de l'instance singleton
export const v2UnifiedApi = V2UnifiedApi.getInstance();

