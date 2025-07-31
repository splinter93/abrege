import { createClient } from '@supabase/supabase-js';
import { logApi } from '@/utils/logger';

// Configuration Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types pour l'API LLM
interface CreateNoteData {
  source_title: string;
  notebook_id: string;
  markdown_content?: string;
  header_image?: string;
  folder_id?: string | null;
}

interface UpdateNoteData {
  source_title?: string;
  markdown_content?: string;
  html_content?: string;
  header_image?: string;
  folder_id?: string | null;
  description?: string;
}

interface CreateFolderData {
  name: string;
  notebook_id: string;
  parent_id?: string | null;
}

interface UpdateFolderData {
  name?: string;
  parent_id?: string | null;
}

interface CreateClasseurData {
  name: string;
  description?: string;
  icon?: string;
}

interface UpdateClasseurData {
  name?: string;
  description?: string;
  icon?: string;
  position?: number;
}

interface MergeNoteData {
  targetNoteId: string;
  mergeStrategy: 'append' | 'prepend' | 'replace';
}

interface ApiError extends Error {
  status?: number;
  statusText?: string;
}

/**
 * Service API LLM unifié pour les interactions avec les LLMs
 * Utilise les endpoints v2 avec monitoring spécifique
 * Supporte les références par UUID ou slug pour tous les endpoints
 */
export class LLMApi {
  private static instance: LLMApi;

  static getInstance(): LLMApi {
    if (!LLMApi.instance) {
      LLMApi.instance = new LLMApi();
    }
    return LLMApi.instance;
  }

  /**
   * Créer une note via API LLM
   */
  async createNote(noteData: CreateNoteData) {
    const startTime = Date.now();
    const context = { operation: 'v2_llm_note_create', component: 'LLMApi' };
    
    logApi('v2_llm_note_create', '🚀 Début création note LLM', context);
    
    try {
      const response = await fetch('/api/v2/note/create', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Client-Type': 'llm'
        },
        body: JSON.stringify(noteData)
      });

      if (!response.ok) {
        const error = new Error(`Erreur création note LLM: ${response.statusText}`) as ApiError;
        error.status = response.status;
        error.statusText = response.statusText;
        throw error;
      }

      const result = await response.json();
      const apiTime = Date.now() - startTime;
      logApi('v2_llm_note_create', `✅ Note LLM créée en ${apiTime}ms`, context);
      
      return result;
    } catch (error) {
      logApi('v2_llm_note_create', `❌ Erreur création note LLM: ${error}`, context);
      throw error;
    }
  }

  /**
   * Mettre à jour une note via API LLM (supporte UUID ou slug)
   * @param noteRef - UUID ou slug de la note
   */
  async updateNote(noteRef: string, updateData: UpdateNoteData) {
    const startTime = Date.now();
    const context = { operation: 'v2_llm_note_update', component: 'LLMApi', noteRef };
    
    logApi('v2_llm_note_update', `🚀 Début mise à jour note LLM ${noteRef}`, context);
    
    try {
      const response = await fetch(`/api/v2/note/${noteRef}/update`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'X-Client-Type': 'llm'
        },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const error = new Error(`Erreur mise à jour note LLM: ${response.statusText}`) as ApiError;
        error.status = response.status;
        error.statusText = response.statusText;
        throw error;
      }

      const result = await response.json();
      const apiTime = Date.now() - startTime;
      logApi('v2_llm_note_update', `✅ Note LLM mise à jour en ${apiTime}ms`, context);
      
      return result;
    } catch (error) {
      logApi('v2_llm_note_update', `❌ Erreur mise à jour note LLM: ${error}`, context);
      throw error;
    }
  }

  /**
   * Supprimer une note via API LLM (supporte UUID ou slug)
   * @param noteRef - UUID ou slug de la note
   */
  async deleteNote(noteRef: string) {
    const startTime = Date.now();
    const context = { operation: 'v2_llm_note_delete', component: 'LLMApi', noteRef };
    
    logApi('v2_llm_note_delete', `🚀 Début suppression note LLM ${noteRef}`, context);
    
    try {
      const response = await fetch(`/api/v2/note/${noteRef}/delete`, {
        method: 'DELETE',
        headers: { 'X-Client-Type': 'llm' }
      });

      if (!response.ok) {
        const error = new Error(`Erreur suppression note LLM: ${response.statusText}`) as ApiError;
        error.status = response.status;
        error.statusText = response.statusText;
        throw error;
      }

      const result = await response.json();
      const apiTime = Date.now() - startTime;
      logApi('v2_llm_note_delete', `✅ Note LLM supprimée en ${apiTime}ms`, context);

      return result;
    } catch (error) {
      logApi('v2_llm_note_delete', `❌ Erreur suppression note LLM: ${error}`, context);
      throw error;
    }
  }

  /**
   * Déplacer une note via API LLM (supporte UUID ou slug)
   * @param noteRef - UUID ou slug de la note
   * @param targetFolderRef - UUID ou slug du dossier de destination
   */
  async moveNote(noteRef: string, targetFolderRef: string) {
    const startTime = Date.now();
    const context = { operation: 'v2_llm_note_move', component: 'LLMApi', noteRef };
    
    logApi('v2_llm_note_move', `🚀 Début déplacement note LLM ${noteRef}`, context);
    
    try {
      const response = await fetch(`/api/v2/note/${noteRef}/move`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'X-Client-Type': 'llm'
        },
        body: JSON.stringify({ folder_id: targetFolderRef })
      });

      if (!response.ok) {
        const error = new Error(`Erreur déplacement note LLM: ${response.statusText}`) as ApiError;
        error.status = response.status;
        error.statusText = response.statusText;
        throw error;
      }

      const result = await response.json();
      const apiTime = Date.now() - startTime;
      logApi('v2_llm_note_move', `✅ Note LLM déplacée en ${apiTime}ms`, context);

      return result;
    } catch (error) {
      logApi('v2_llm_note_move', `❌ Erreur déplacement note LLM: ${error}`, context);
      throw error;
    }
  }

  /**
   * Fusionner une note avec une autre via API LLM (supporte UUID ou slug)
   * @param sourceNoteRef - UUID ou slug de la note source
   * @param mergeData - Données de fusion
   */
  async mergeNote(sourceNoteRef: string, mergeData: MergeNoteData) {
    const startTime = Date.now();
    const context = { operation: 'v2_llm_note_merge', component: 'LLMApi', sourceNoteRef };
    
    logApi('v2_llm_note_merge', `🚀 Début fusion note LLM ${sourceNoteRef}`, context);
    
    try {
      const response = await fetch(`/api/v2/note/${sourceNoteRef}/merge`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Client-Type': 'llm'
        },
        body: JSON.stringify(mergeData)
      });

      if (!response.ok) {
        const error = new Error(`Erreur fusion note LLM: ${response.statusText}`) as ApiError;
        error.status = response.status;
        error.statusText = response.statusText;
        throw error;
      }

      const result = await response.json();
      const apiTime = Date.now() - startTime;
      logApi('v2_llm_note_merge', `✅ Note LLM fusionnée en ${apiTime}ms`, context);

      return result;
    } catch (error) {
      logApi('v2_llm_note_merge', `❌ Erreur fusion note LLM: ${error}`, context);
      throw error;
    }
  }

  /**
   * Ajouter du contenu à une note via API LLM (supporte UUID ou slug)
   * @param noteRef - UUID ou slug de la note
   * @param content - Contenu à ajouter
   */
  async addContent(noteRef: string, content: string) {
    const startTime = Date.now();
    const context = { operation: 'v2_llm_note_add_content', component: 'LLMApi', noteRef };
    
    logApi('v2_llm_note_add_content', `🚀 Début ajout contenu note LLM ${noteRef}`, context);
    
    try {
      const response = await fetch(`/api/v2/note/${noteRef}/add-content`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Client-Type': 'llm'
        },
        body: JSON.stringify({ content })
      });

      if (!response.ok) {
        const error = new Error(`Erreur ajout contenu note LLM: ${response.statusText}`) as ApiError;
        error.status = response.status;
        error.statusText = response.statusText;
        throw error;
      }

      const result = await response.json();
      const apiTime = Date.now() - startTime;
      logApi('v2_llm_note_add_content', `✅ Contenu ajouté en ${apiTime}ms`, context);

      return result;
    } catch (error) {
      logApi('v2_llm_note_add_content', `❌ Erreur ajout contenu note LLM: ${error}`, context);
      throw error;
    }
  }

  /**
   * Ajouter du contenu à une section spécifique via API LLM
   */
  async addToSection(noteId: string, sectionId: string, content: string) {
    const startTime = Date.now();
    const context = { operation: 'v2_llm_note_add_to_section', component: 'LLMApi' };
    
    logApi('v2_llm_note_add_to_section', `🚀 Début ajout section LLM ${noteId}`, context);
    
    try {
      const response = await fetch(`/api/v2/note/${noteId}/add-to-section`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Client-Type': 'llm'
        },
        body: JSON.stringify({ sectionId, content })
      });

      if (!response.ok) {
        const error = new Error(`Erreur ajout section LLM: ${response.statusText}`) as ApiError;
        error.status = response.status;
        error.statusText = response.statusText;
        throw error;
      }

      const result = await response.json();
      const apiTime = Date.now() - startTime;
      logApi('v2_llm_note_add_to_section', `✅ Section LLM ajoutée en ${apiTime}ms`, context);

      return result;
    } catch (error) {
      logApi('v2_llm_note_add_to_section', `❌ Erreur ajout section LLM: ${error}`, context);
      throw error;
    }
  }

  /**
   * Vider une section via API LLM
   */
  async clearSection(noteId: string, sectionId: string) {
    const startTime = Date.now();
    const context = { operation: 'v2_llm_note_clear_section', component: 'LLMApi' };
    
    logApi('v2_llm_note_clear_section', `🚀 Début vidage section LLM ${noteId}`, context);
    
    try {
      const response = await fetch(`/api/v2/note/${noteId}/clear-section`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Client-Type': 'llm'
        },
        body: JSON.stringify({ sectionId })
      });

      if (!response.ok) {
        const error = new Error(`Erreur vidage section LLM: ${response.statusText}`) as ApiError;
        error.status = response.status;
        error.statusText = response.statusText;
        throw error;
      }

      const result = await response.json();
      const apiTime = Date.now() - startTime;
      logApi('v2_llm_note_clear_section', `✅ Section LLM vidée en ${apiTime}ms`, context);

      return result;
    } catch (error) {
      logApi('v2_llm_note_clear_section', `❌ Erreur vidage section LLM: ${error}`, context);
      throw error;
    }
  }

  /**
   * Remplacer le contenu d'une note via API LLM (supporte UUID ou slug)
   * @param noteRef - UUID ou slug de la note
   * @param content - Nouveau contenu
   */
  async updateContent(noteRef: string, content: string) {
    const startTime = Date.now();
    const context = { operation: 'v2_llm_note_content_update', component: 'LLMApi', noteRef };
    
    logApi('v2_llm_note_content_update', `🚀 Début mise à jour contenu note LLM ${noteRef}`, context);
    
    try {
      const response = await fetch(`/api/v2/note/${noteRef}/content/update`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'X-Client-Type': 'llm'
        },
        body: JSON.stringify({ content })
      });

      if (!response.ok) {
        const error = new Error(`Erreur mise à jour contenu note LLM: ${response.statusText}`) as ApiError;
        error.status = response.status;
        error.statusText = response.statusText;
        throw error;
      }

      const result = await response.json();
      const apiTime = Date.now() - startTime;
      logApi('v2_llm_note_content_update', `✅ Contenu mis à jour en ${apiTime}ms`, context);

      return result;
    } catch (error) {
      logApi('v2_llm_note_content_update', `❌ Erreur mise à jour contenu note LLM: ${error}`, context);
      throw error;
    }
  }

  /**
   * Publier/dépublier une note via API LLM (supporte UUID ou slug)
   * @param noteRef - UUID ou slug de la note
   * @param isPublished - Statut de publication
   */
  async publishNote(noteRef: string, isPublished: boolean) {
    const startTime = Date.now();
    const context = { operation: 'v2_llm_note_publish', component: 'LLMApi', noteRef };
    
    logApi('v2_llm_note_publish', `🚀 Début publication note LLM ${noteRef}`, context);
    
    try {
      const response = await fetch(`/api/v2/note/${noteRef}/publish`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Client-Type': 'llm'
        },
        body: JSON.stringify({ ispublished: isPublished })
      });

      if (!response.ok) {
        const error = new Error(`Erreur publication note LLM: ${response.statusText}`) as ApiError;
        error.status = response.status;
        error.statusText = response.statusText;
        throw error;
      }

      const result = await response.json();
      const apiTime = Date.now() - startTime;
      logApi('v2_llm_note_publish', `✅ Note LLM publiée en ${apiTime}ms`, context);

      return result;
    } catch (error) {
      logApi('v2_llm_note_publish', `❌ Erreur publication note LLM: ${error}`, context);
      throw error;
    }
  }

  /**
   * Créer un dossier via API LLM
   */
  async createFolder(folderData: CreateFolderData) {
    const startTime = Date.now();
    const context = { operation: 'v2_llm_folder_create', component: 'LLMApi' };
    
    logApi('v2_llm_folder_create', '🚀 Début création dossier LLM', context);
    
    try {
      const response = await fetch('/api/v2/folder/create', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Client-Type': 'llm'
        },
        body: JSON.stringify(folderData)
      });

      if (!response.ok) {
        const error = new Error(`Erreur création dossier LLM: ${response.statusText}`) as ApiError;
        error.status = response.status;
        error.statusText = response.statusText;
        throw error;
      }

      const result = await response.json();
      const apiTime = Date.now() - startTime;
      logApi('v2_llm_folder_create', `✅ Dossier LLM créé en ${apiTime}ms`, context);

      return result;
    } catch (error) {
      logApi('v2_llm_folder_create', `❌ Erreur création dossier LLM: ${error}`, context);
      throw error;
    }
  }

  /**
   * Mettre à jour un dossier via API LLM (supporte UUID ou slug)
   * @param folderRef - UUID ou slug du dossier
   */
  async updateFolder(folderRef: string, updateData: UpdateFolderData) {
    const startTime = Date.now();
    const context = { operation: 'v2_llm_folder_update', component: 'LLMApi', folderRef };
    
    logApi('v2_llm_folder_update', `🚀 Début mise à jour dossier LLM ${folderRef}`, context);
    
    try {
      const response = await fetch(`/api/v2/folder/${folderRef}/update`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'X-Client-Type': 'llm'
        },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const error = new Error(`Erreur mise à jour dossier LLM: ${response.statusText}`) as ApiError;
        error.status = response.status;
        error.statusText = response.statusText;
        throw error;
      }

      const result = await response.json();
      const apiTime = Date.now() - startTime;
      logApi('v2_llm_folder_update', `✅ Dossier LLM mis à jour en ${apiTime}ms`, context);

      return result;
    } catch (error) {
      logApi('v2_llm_folder_update', `❌ Erreur mise à jour dossier LLM: ${error}`, context);
      throw error;
    }
  }

  /**
   * Supprimer un dossier via API LLM (supporte UUID ou slug)
   * @param folderRef - UUID ou slug du dossier
   */
  async deleteFolder(folderRef: string) {
    const startTime = Date.now();
    const context = { operation: 'v2_llm_folder_delete', component: 'LLMApi', folderRef };
    
    logApi('v2_llm_folder_delete', `🚀 Début suppression dossier LLM ${folderRef}`, context);
    
    try {
      const response = await fetch(`/api/v2/folder/${folderRef}/delete`, {
        method: 'DELETE',
        headers: { 'X-Client-Type': 'llm' }
      });

      if (!response.ok) {
        const error = new Error(`Erreur suppression dossier LLM: ${response.statusText}`) as ApiError;
        error.status = response.status;
        error.statusText = response.statusText;
        throw error;
      }

      const result = await response.json();
      const apiTime = Date.now() - startTime;
      logApi('v2_llm_folder_delete', `✅ Dossier LLM supprimé en ${apiTime}ms`, context);

      return result;
    } catch (error) {
      logApi('v2_llm_folder_delete', `❌ Erreur suppression dossier LLM: ${error}`, context);
      throw error;
    }
  }

  /**
   * Déplacer un dossier via API LLM (supporte UUID ou slug)
   * @param folderRef - UUID ou slug du dossier
   * @param targetParentRef - UUID ou slug du dossier parent de destination
   */
  async moveFolder(folderRef: string, targetParentRef: string) {
    const startTime = Date.now();
    const context = { operation: 'v2_llm_folder_move', component: 'LLMApi', folderRef };
    
    logApi('v2_llm_folder_move', `🚀 Début déplacement dossier LLM ${folderRef}`, context);
    
    try {
      const response = await fetch(`/api/v2/folder/${folderRef}/move`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'X-Client-Type': 'llm'
        },
        body: JSON.stringify({ parent_id: targetParentRef })
      });

      if (!response.ok) {
        const error = new Error(`Erreur déplacement dossier LLM: ${response.statusText}`) as ApiError;
        error.status = response.status;
        error.statusText = response.statusText;
        throw error;
      }

      const result = await response.json();
      const apiTime = Date.now() - startTime;
      logApi('v2_llm_folder_move', `✅ Dossier LLM déplacé en ${apiTime}ms`, context);

      return result;
    } catch (error) {
      logApi('v2_llm_folder_move', `❌ Erreur déplacement dossier LLM: ${error}`, context);
      throw error;
    }
  }

  /**
   * Créer un classeur via API LLM
   */
  async createClasseur(classeurData: CreateClasseurData) {
    const startTime = Date.now();
    const context = { operation: 'v2_llm_classeur_create', component: 'LLMApi' };
    
    logApi('v2_llm_classeur_create', '🚀 Début création classeur LLM', context);
    
    try {
      const response = await fetch('/api/v2/classeur/create', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Client-Type': 'llm'
        },
        body: JSON.stringify(classeurData)
      });

      if (!response.ok) {
        const error = new Error(`Erreur création classeur LLM: ${response.statusText}`) as ApiError;
        error.status = response.status;
        error.statusText = response.statusText;
        throw error;
      }

      const result = await response.json();
      const apiTime = Date.now() - startTime;
      logApi('v2_llm_classeur_create', `✅ Classeur LLM créé en ${apiTime}ms`, context);

      return result;
    } catch (error) {
      logApi('v2_llm_classeur_create', `❌ Erreur création classeur LLM: ${error}`, context);
      throw error;
    }
  }

  /**
   * Mettre à jour un classeur via API LLM (supporte UUID ou slug)
   * @param classeurRef - UUID ou slug du classeur
   */
  async updateClasseur(classeurRef: string, updateData: UpdateClasseurData) {
    const startTime = Date.now();
    const context = { operation: 'v2_llm_classeur_update', component: 'LLMApi', classeurRef };
    
    logApi('v2_llm_classeur_update', `🚀 Début mise à jour classeur LLM ${classeurRef}`, context);
    
    try {
      const response = await fetch(`/api/v2/classeur/${classeurRef}/update`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'X-Client-Type': 'llm'
        },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const error = new Error(`Erreur mise à jour classeur LLM: ${response.statusText}`) as ApiError;
        error.status = response.status;
        error.statusText = response.statusText;
        throw error;
      }

      const result = await response.json();
      const apiTime = Date.now() - startTime;
      logApi('v2_llm_classeur_update', `✅ Classeur LLM mis à jour en ${apiTime}ms`, context);

      return result;
    } catch (error) {
      logApi('v2_llm_classeur_update', `❌ Erreur mise à jour classeur LLM: ${error}`, context);
      throw error;
    }
  }

  /**
   * Supprimer un classeur via API LLM (supporte UUID ou slug)
   * @param classeurRef - UUID ou slug du classeur
   */
  async deleteClasseur(classeurRef: string) {
    const startTime = Date.now();
    const context = { operation: 'v2_llm_classeur_delete', component: 'LLMApi', classeurRef };
    
    logApi('v2_llm_classeur_delete', `🚀 Début suppression classeur LLM ${classeurRef}`, context);
    
    try {
      const response = await fetch(`/api/v2/classeur/${classeurRef}/delete`, {
        method: 'DELETE',
        headers: { 'X-Client-Type': 'llm' }
      });

      if (!response.ok) {
        const error = new Error(`Erreur suppression classeur LLM: ${response.statusText}`) as ApiError;
        error.status = response.status;
        error.statusText = response.statusText;
        throw error;
      }

      const result = await response.json();
      const apiTime = Date.now() - startTime;
      logApi('v2_llm_classeur_delete', `✅ Classeur LLM supprimé en ${apiTime}ms`, context);

      return result;
    } catch (error) {
      logApi('v2_llm_classeur_delete', `❌ Erreur suppression classeur LLM: ${error}`, context);
      throw error;
    }
  }

  /**
   * Réorganiser les classeurs via API LLM
   */
  async reorderClasseurs(updatedClasseurs: { id: string; position: number }[]) {
    const startTime = Date.now();
    const context = { operation: 'v2_llm_classeur_reorder', component: 'LLMApi' };
    
    logApi('v2_llm_classeur_reorder', '🚀 Début réorganisation classeurs LLM', context);
    
    try {
      const response = await fetch('/api/v2/classeur/reorder', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'X-Client-Type': 'llm'
        },
        body: JSON.stringify({ classeurs: updatedClasseurs })
      });

      if (!response.ok) {
        const error = new Error(`Erreur réorganisation classeurs LLM: ${response.statusText}`) as ApiError;
        error.status = response.status;
        error.statusText = response.statusText;
        throw error;
      }

      const result = await response.json();
      const apiTime = Date.now() - startTime;
      logApi('v2_llm_classeur_reorder', `✅ Classeurs LLM réorganisés en ${apiTime}ms`, context);

      return result;
    } catch (error) {
      logApi('v2_llm_classeur_reorder', `❌ Erreur réorganisation classeurs LLM: ${error}`, context);
      throw error;
    }
  }

  // ============================================================================
  // READ-ONLY OPERATIONS (GET)
  // ============================================================================

  /**
   * Récupérer le contenu d'une note via API LLM (supporte UUID ou slug)
   * @param noteRef - UUID ou slug de la note
   */
  async getNoteContent(noteRef: string) {
    const startTime = Date.now();
    const context = { operation: 'v2_llm_note_content_get', component: 'LLMApi', noteRef };
    
    logApi('v2_llm_note_content_get', `🚀 Début récupération contenu note LLM ${noteRef}`, context);
    
    try {
      const response = await fetch(`/api/v2/note/${noteRef}/content`, {
        method: 'GET',
        headers: { 'X-Client-Type': 'llm' }
      });

      if (!response.ok) {
        const error = new Error(`Erreur récupération contenu note LLM: ${response.statusText}`) as ApiError;
        error.status = response.status;
        error.statusText = response.statusText;
        throw error;
      }

      const result = await response.json();
      const apiTime = Date.now() - startTime;
      logApi('v2_llm_note_content_get', `✅ Contenu note LLM récupéré en ${apiTime}ms`, context);

      return result;
    } catch (error) {
      logApi('v2_llm_note_content_get', `❌ Erreur récupération contenu note LLM: ${error}`, context);
      throw error;
    }
  }

  /**
   * Récupérer les métadonnées d'une note via API LLM (supporte UUID ou slug)
   * @param noteRef - UUID ou slug de la note
   */
  async getNoteMetadata(noteRef: string) {
    const startTime = Date.now();
    const context = { operation: 'v2_llm_note_metadata_get', component: 'LLMApi', noteRef };
    
    logApi('v2_llm_note_metadata_get', `🚀 Début récupération métadonnées note LLM ${noteRef}`, context);
    
    try {
      const response = await fetch(`/api/v2/note/${noteRef}/metadata`, {
        method: 'GET',
        headers: { 'X-Client-Type': 'llm' }
      });

      if (!response.ok) {
        const error = new Error(`Erreur récupération métadonnées note LLM: ${response.statusText}`) as ApiError;
        error.status = response.status;
        error.statusText = response.statusText;
        throw error;
      }

      const result = await response.json();
      const apiTime = Date.now() - startTime;
      logApi('v2_llm_note_metadata_get', `✅ Métadonnées note LLM récupérées en ${apiTime}ms`, context);

      return result;
    } catch (error) {
      logApi('v2_llm_note_metadata_get', `❌ Erreur récupération métadonnées note LLM: ${error}`, context);
      throw error;
    }
  }

  /**
   * Récupérer les insights d'une note via API LLM (supporte UUID ou slug)
   * @param noteRef - UUID ou slug de la note
   */
  async getNoteInsights(noteRef: string) {
    const startTime = Date.now();
    const context = { operation: 'v2_llm_note_insights_get', component: 'LLMApi', noteRef };
    
    logApi('v2_llm_note_insights_get', `🚀 Début récupération insights note LLM ${noteRef}`, context);
    
    try {
      const response = await fetch(`/api/v2/note/${noteRef}/insights`, {
        method: 'GET',
        headers: { 'X-Client-Type': 'llm' }
      });

      if (!response.ok) {
        const error = new Error(`Erreur récupération insights note LLM: ${response.statusText}`) as ApiError;
        error.status = response.status;
        error.statusText = response.statusText;
        throw error;
      }

      const result = await response.json();
      const apiTime = Date.now() - startTime;
      logApi('v2_llm_note_insights_get', `✅ Insights note LLM récupérés en ${apiTime}ms`, context);

      return result;
    } catch (error) {
      logApi('v2_llm_note_insights_get', `❌ Erreur récupération insights note LLM: ${error}`, context);
      throw error;
    }
  }

  /**
   * Récupérer l'arborescence d'un dossier via API LLM (supporte UUID ou slug)
   * @param folderRef - UUID ou slug du dossier
   */
  async getFolderTree(folderRef: string) {
    const startTime = Date.now();
    const context = { operation: 'v2_llm_folder_tree_get', component: 'LLMApi', folderRef };
    
    logApi('v2_llm_folder_tree_get', `🚀 Début récupération arborescence dossier LLM ${folderRef}`, context);
    
    try {
      const response = await fetch(`/api/v2/folder/${folderRef}/tree`, {
        method: 'GET',
        headers: { 'X-Client-Type': 'llm' }
      });

      if (!response.ok) {
        const error = new Error(`Erreur récupération arborescence dossier LLM: ${response.statusText}`) as ApiError;
        error.status = response.status;
        error.statusText = response.statusText;
        throw error;
      }

      const result = await response.json();
      const apiTime = Date.now() - startTime;
      logApi('v2_llm_folder_tree_get', `✅ Arborescence dossier LLM récupérée en ${apiTime}ms`, context);

      return result;
    } catch (error) {
      logApi('v2_llm_folder_tree_get', `❌ Erreur récupération arborescence dossier LLM: ${error}`, context);
      throw error;
    }
  }

  /**
   * Récupérer l'arborescence d'un classeur via API LLM (supporte UUID ou slug)
   * @param classeurRef - UUID ou slug du classeur
   */
  async getClasseurTree(classeurRef: string) {
    const startTime = Date.now();
    const context = { operation: 'v2_llm_classeur_tree_get', component: 'LLMApi', classeurRef };
    
    logApi('v2_llm_classeur_tree_get', `🚀 Début récupération arborescence classeur LLM ${classeurRef}`, context);
    
    try {
      const response = await fetch(`/api/v2/classeur/${classeurRef}/tree`, {
        method: 'GET',
        headers: { 'X-Client-Type': 'llm' }
      });

      if (!response.ok) {
        const error = new Error(`Erreur récupération arborescence classeur LLM: ${response.statusText}`) as ApiError;
        error.status = response.status;
        error.statusText = response.statusText;
        throw error;
      }

      const result = await response.json();
      const apiTime = Date.now() - startTime;
      logApi('v2_llm_classeur_tree_get', `✅ Arborescence classeur LLM récupérée en ${apiTime}ms`, context);

      return result;
    } catch (error) {
      logApi('v2_llm_classeur_tree_get', `❌ Erreur récupération arborescence classeur LLM: ${error}`, context);
      throw error;
    }
  }

  // ============================================================================
  // UTILITY METHODS (pour compatibilité avec l'existant)
  // ============================================================================

  /**
   * Récupérer toutes les notes d'un utilisateur (méthode utilitaire)
   * @param userId - ID de l'utilisateur
   */
  async getUserNotes(userId: string) {
    const startTime = Date.now();
    const context = { operation: 'v2_llm_user_notes_get', component: 'LLMApi', userId };
    
    logApi('v2_llm_user_notes_get', `🚀 Début récupération notes utilisateur LLM ${userId}`, context);
    
    try {
      const { data, error } = await supabase
        .from('articles')
        .select('id, source_title, created_at, updated_at, slug')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      const apiTime = Date.now() - startTime;
      logApi('v2_llm_user_notes_get', `✅ Notes utilisateur LLM récupérées en ${apiTime}ms`, context);

      return { success: true, notes: data };
    } catch (error) {
      logApi('v2_llm_user_notes_get', `❌ Erreur récupération notes utilisateur LLM: ${error}`, context);
      throw error;
    }
  }

  /**
   * Récupérer tous les dossiers d'un utilisateur (méthode utilitaire)
   * @param userId - ID de l'utilisateur
   */
  async getUserFolders(userId: string) {
    const startTime = Date.now();
    const context = { operation: 'v2_llm_user_folders_get', component: 'LLMApi', userId };
    
    logApi('v2_llm_user_folders_get', `🚀 Début récupération dossiers utilisateur LLM ${userId}`, context);
    
    try {
      const { data, error } = await supabase
        .from('folders')
        .select('id, name, created_at, updated_at, slug')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      const apiTime = Date.now() - startTime;
      logApi('v2_llm_user_folders_get', `✅ Dossiers utilisateur LLM récupérés en ${apiTime}ms`, context);

      return { success: true, folders: data };
    } catch (error) {
      logApi('v2_llm_user_folders_get', `❌ Erreur récupération dossiers utilisateur LLM: ${error}`, context);
      throw error;
    }
  }
}

// Instance singleton
export const llmApi = LLMApi.getInstance(); 