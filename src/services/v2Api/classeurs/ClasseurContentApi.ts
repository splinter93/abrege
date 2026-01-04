/**
 * API pour le contenu des classeurs
 * Extrait de ClasseurApi pour respecter limite 300 lignes
 */

import { useFileSystemStore, type Note, type Classeur, type Folder } from '@/store/useFileSystemStore';
import { simpleLogger as logger } from '@/utils/logger';
import { ApiClient } from '../core/ApiClient';

export class ClasseurContentApi {
  private apiClient: ApiClient;

  constructor(apiClient: ApiClient) {
    this.apiClient = apiClient;
  }

  /**
   * Charger les classeurs avec leur contenu
   */
  async loadClasseursWithContent() {
    try {
      const headers = await this.apiClient.getAuthHeaders();
      const classeursResponse = await fetch(this.apiClient.buildUrl('/api/v2/classeurs'), {
        method: 'GET',
        headers
      });

      if (!classeursResponse.ok) {
        const errorText = await classeursResponse.text();
        throw new Error(`Erreur récupération classeurs: ${classeursResponse.status} ${classeursResponse.statusText} - ${errorText}`);
      }

      const classeursResult = await classeursResponse.json();
      
      const store = useFileSystemStore.getState();
      store.setClasseurs(classeursResult.classeurs || []);
      
      if (!classeursResult.classeurs || classeursResult.classeurs.length === 0) {
        return { success: true, classeurs: [] };
      }
      
      const allDossiers: Folder[] = [];
      const allNotes: Note[] = [];

      const isFolder = (f: unknown): f is Folder =>
        !!f && typeof f === 'object' && typeof (f as { id?: unknown }).id === 'string' && typeof (f as { name?: unknown }).name === 'string';
      const isNote = (n: unknown): n is Note =>
        !!n && typeof n === 'object' && typeof (n as { id?: unknown }).id === 'string' && typeof (n as { source_title?: unknown }).source_title === 'string';
      
      for (const classeur of classeursResult.classeurs) {
        try {
          const treeResponse = await fetch(this.apiClient.buildUrl(`/api/v2/classeur/${classeur.id}/tree`), {
            method: 'GET',
            headers
          });

          if (!treeResponse.ok) {
            throw new Error(`Erreur récupération arbre: ${treeResponse.status}`);
          }

          const treeResult = await treeResponse.json();
          
          if (treeResult.success && treeResult.tree) {
            const dossiers = Array.isArray(treeResult.tree.folders) ? treeResult.tree.folders : [];
            const notes = Array.isArray(treeResult.tree.notes) ? treeResult.tree.notes : [];
            
            dossiers.filter(isFolder).forEach((d: Folder) => allDossiers.push(d));
            notes.filter(isNote).forEach((n: Note) => allNotes.push(n));
          }
        } catch (treeError) {
          logger.warn(`[ClasseurContentApi] ⚠️ Erreur chargement arbre classeur ${classeur.id}:`, treeError);
        }
      }
      
      store.setFolders(allDossiers);
      store.setNotes(allNotes);
      
      return { success: true, classeurs: classeursResult.classeurs };
    } catch (error) {
      logger.error('[ClasseurContentApi] ❌ Erreur chargement classeurs avec contenu', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
}


