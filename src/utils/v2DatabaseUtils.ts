/**
 * Wrapper de compatibilité pour V2DatabaseUtils
 * Délègue toutes les méthodes aux modules refactorés
 * 
 * Conformité GUIDE-EXCELLENCE-CODE.md:
 * - Max 300 lignes par fichier
 * - Wrapper léger qui délègue aux modules
 */

// Re-exporter tous les types
export type {
  ApiContext,
  CreateNoteData,
  UpdateNoteData,
  CreateFolderData,
  UpdateFolderData,
  CreateClasseurData,
  UpdateClasseurData,
  ShareSettings,
  AgentData,
  ContentOperation
} from './database/types/databaseTypes';

// Importer les types pour les signatures de méthodes
import type {
  ApiContext,
  CreateNoteData,
  UpdateNoteData,
  CreateFolderData,
  UpdateFolderData,
  CreateClasseurData,
  UpdateClasseurData,
  ShareSettings,
  AgentData,
  ContentOperation
} from './database/types/databaseTypes';

// Importer le type SupabaseClient
import type { SupabaseClient } from '@supabase/supabase-js';

// Importer tous les modules
import * as noteQueries from './database/queries/noteQueries';
import * as noteMutations from './database/mutations/noteMutations';
import * as noteContentMutations from './database/mutations/noteContentMutations';
import * as noteSectionMutations from './database/mutations/noteSectionMutations';
import * as classeurQueries from './database/queries/classeurQueries';
import * as classeurMutations from './database/mutations/classeurMutations';
import * as dossierQueries from './database/queries/dossierQueries';
import * as dossierMutations from './database/mutations/dossierMutations';
import * as agentQueries from './database/queries/agentQueries';
import * as agentMutations from './database/mutations/agentMutations';
import * as userQueries from './database/queries/userQueries';
import * as trashQueries from './database/queries/trashQueries';
import * as trashMutations from './database/mutations/trashMutations';
import * as searchQueries from './database/search/searchQueries';
import * as utilsQueries from './database/queries/utilsQueries';

export class V2DatabaseUtils {
  // NOTES - Queries
  static async getNoteContent(ref: string, userId: string, context: ApiContext) { return noteQueries.getNoteContent(ref, userId, context); }
  static async getNote(noteId: string, userId: string, context: ApiContext) { return noteQueries.getNote(noteId, userId, context); }
  static async getTableOfContents(ref: string, userId: string, context: ApiContext) { return noteQueries.getTableOfContents(ref, userId, context); }
  static async getNoteStatistics(ref: string, userId: string, context: ApiContext) { return noteQueries.getNoteStatistics(ref, userId, context); }
  static async getNoteShareSettings(ref: string, userId: string, context: ApiContext) { return noteQueries.getNoteShareSettings(ref, userId, context); }
  static async getRecentNotes(limit: number = 10, userId: string, context: ApiContext) { return noteQueries.getRecentNotes(limit, userId, context); }
  static async getNoteTOC(ref: string, userId: string, context: ApiContext) { return noteQueries.getNoteTOC(ref, userId, context); }

  // NOTES - Mutations
  static async createNote(data: CreateNoteData, userId: string, context: ApiContext) { return noteMutations.createNote(data, userId, context); }
  static async updateNote(ref: string, data: UpdateNoteData, userId: string, context: ApiContext) { return noteMutations.updateNote(ref, data, userId, context); }
  static async deleteNote(ref: string, userId: string, context: ApiContext) { return noteMutations.deleteNote(ref, userId, context); }
  static async addContentToNote(ref: string, content: string, userId: string, context: ApiContext) { return noteContentMutations.addContentToNote(ref, content, userId, context); }
  static async moveNote(ref: string, targetFolderId: string | null, userId: string, context: ApiContext, targetClasseurId?: string) { return noteMutations.moveNote(ref, targetFolderId, userId, context, targetClasseurId); }
  static async insertContentToNote(ref: string, content: string, position: number, userId: string, context: ApiContext) { return noteContentMutations.insertContentToNote(ref, content, position, userId, context); }
  static async insertNoteContent(noteId: string, params: { content: string; position: number }, userId: string, context: ApiContext) { return noteContentMutations.insertNoteContent(noteId, params, userId, context); }
  static async addContentToSection(ref: string, sectionId: string, content: string, userId: string, context: ApiContext) { return noteSectionMutations.addContentToSection(ref, sectionId, content, userId, context); }
  static async clearSection(ref: string, sectionId: string, userId: string, context: ApiContext) { return noteSectionMutations.clearSection(ref, sectionId, userId, context); }
  static async eraseSection(ref: string, sectionId: string, userId: string, context: ApiContext) { return noteSectionMutations.eraseSection(ref, sectionId, userId, context); }
  static async publishNote(ref: string, visibility: 'private' | 'public' | 'link-private' | 'link-public' | 'limited' | 'scrivia', userId: string, context: ApiContext) { return noteContentMutations.publishNote(ref, visibility, userId, context); }
  static async updateNoteShareSettings(ref: string, settings: ShareSettings, userId: string, context: ApiContext) { return noteContentMutations.updateNoteShareSettings(ref, settings, userId, context); }
  static async applyContentOperations(ref: string, operations: ContentOperation[], userId: string, context: ApiContext) { return noteContentMutations.applyContentOperations(ref, operations, userId, context); }

  // CLASSEURS - Queries
  static async getClasseurTree(notebookId: string, userId: string, context: ApiContext) { return classeurQueries.getClasseurTree(notebookId, userId, context); }
  static async getClasseurs(userId: string, context: ApiContext) { return classeurQueries.getClasseurs(userId, context); }
  static async getClasseur(classeurId: string, userId: string, context: ApiContext) { return classeurQueries.getClasseur(classeurId, userId, context); }
  static async getClasseursWithContent(userId: string, context: ApiContext) { return classeurQueries.getClasseursWithContent(userId, context); }
  static async listClasseurs(userId: string, context: ApiContext) { return classeurQueries.listClasseurs(userId, context); }

  // CLASSEURS - Mutations
  static async createClasseur(data: CreateClasseurData, userId: string, context: ApiContext) { return classeurMutations.createClasseur(data, userId, context); }
  static async updateClasseur(ref: string, data: UpdateClasseurData, userId: string, context: ApiContext, userToken?: string) { return classeurMutations.updateClasseur(ref, data, userId, context, userToken); }
  static async deleteClasseur(ref: string, userId: string, context: ApiContext) { return classeurMutations.deleteClasseur(ref, userId, context); }
  static async reorderClasseurs(classeurs: Array<{ id: string; position: number }>, userId: string, context: ApiContext) { return classeurMutations.reorderClasseurs(classeurs, userId, context); }

  // DOSSIERS - Queries
  static async getFolderTree(ref: string, userId: string, context: ApiContext) { return dossierQueries.getFolderTree(ref, userId, context); }
  static async getFolder(folderId: string, userId: string, context: ApiContext) { return dossierQueries.getFolder(folderId, userId, context); }

  // DOSSIERS - Mutations
  static async createFolder(data: CreateFolderData, userId: string, context: ApiContext, supabaseClient?: SupabaseClient) { return dossierMutations.createFolder(data, userId, context, supabaseClient); }
  static async updateFolder(ref: string, data: UpdateFolderData, userId: string, context: ApiContext) { return dossierMutations.updateFolder(ref, data, userId, context); }
  static async moveFolder(ref: string, targetParentId: string | null, userId: string, context: ApiContext, targetClasseurId?: string) { return dossierMutations.moveFolder(ref, targetParentId, userId, context, targetClasseurId); }
  static async deleteFolder(ref: string, userId: string, context: ApiContext) { return dossierMutations.deleteFolder(ref, userId, context); }

  // AGENTS - Queries
  static async listAgents(userId: string, context: ApiContext) { return agentQueries.listAgents(userId, context); }
  static async getAgent(agentId: string, userId: string, context: ApiContext) { return agentQueries.getAgent(agentId, userId, context); }

  // AGENTS - Mutations
  static async createAgent(data: AgentData, userId: string, context: ApiContext) { return agentMutations.createAgent(data, userId, context); }
  static async updateAgent(agentId: string, data: AgentData, userId: string, context: ApiContext) { return agentMutations.updateAgent(agentId, data, userId, context); }
  static async patchAgent(agentId: string, data: Partial<AgentData>, userId: string, context: ApiContext) { return agentMutations.patchAgent(agentId, data, userId, context); }
  static async deleteAgent(agentId: string, userId: string, context: ApiContext) { return agentMutations.deleteAgent(agentId, userId, context); }
  static async executeAgent(data: Record<string, unknown>, userId: string, context: ApiContext) { return agentMutations.executeAgent(data, userId, context); }

  // USERS - Queries
  static async getUserInfo(userId: string, context: ApiContext) { return userQueries.getUserInfo(userId, context); }
  static async getUserProfile(userId: string, context: ApiContext) { return userQueries.getUserProfile(userId, context); }
  static async getStats(userId: string, context: ApiContext) { return userQueries.getStats(userId, context); }

  // TRASH - Queries
  static async getTrash(userId: string, context: ApiContext) { return trashQueries.getTrash(userId, context); }

  // TRASH - Mutations
  static async restoreFromTrash(itemId: string, itemType: string, userId: string, context: ApiContext) { return trashMutations.restoreFromTrash(itemId, itemType, userId, context); }
  static async purgeTrash(userId: string, context: ApiContext) { return trashMutations.purgeTrash(userId, context); }
  static async deleteResource(resourceType: string, ref: string, userId: string, context: ApiContext) { return trashMutations.deleteResource(resourceType, ref, userId, context); }

  // SEARCH - Queries
  static async searchNotes(query: string, limit: number, offset: number, userId: string, context: ApiContext) { return searchQueries.searchNotes(query, limit, offset, userId, context); }
  static async searchClasseurs(query: string, limit: number, offset: number, userId: string, context: ApiContext) { return searchQueries.searchClasseurs(query, limit, offset, userId, context); }
  static async searchFiles(query: string, limit: number, offset: number, userId: string, context: ApiContext) { return searchQueries.searchFiles(query, limit, offset, userId, context); }
  static async searchContent(query: string, type: string = 'all', limit: number = 20, userId: string, context: ApiContext) { return searchQueries.searchContent(query, type, limit, userId, context); }

  // UTILS - Queries
  static async generateSlug(text: string, type: 'note' | 'classeur' | 'folder', userId: string, context: ApiContext, supabaseClient?: SupabaseClient) { return utilsQueries.generateSlug(text, type, userId, context, supabaseClient); }
  static async listTools(userId: string, context: ApiContext) { return utilsQueries.listTools(userId, context); }
  static async debugInfo(userId: string, context: ApiContext) { return utilsQueries.debugInfo(userId, context); }
}
