import { createClient } from '@supabase/supabase-js';
import { logger, LogCategory } from '@/utils/logger';

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
  classeur_id?: string | null;
  is_canva_draft?: boolean;
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

  private constructor() {}

  static getInstance(): LLMApi {
    if (!LLMApi.instance) {
      LLMApi.instance = new LLMApi();
    }
    return LLMApi.instance;
  }

  /**
   * Récupère les headers d'authentification pour les appels API LLM
   * @private
   */
  private async getAuthHeaders(): Promise<HeadersInit> {
    try {
      logger.debug(LogCategory.API, '[LLM AUTH] 🔐 Début récupération headers...');
      
      const { supabase } = await import('@/supabaseClient');
      logger.debug(LogCategory.API, '[LLM AUTH] ✅ Supabase importé');
      
      const { data: { session } } = await supabase.auth.getSession();
      logger.debug(LogCategory.API, '[LLM AUTH] 📋 Session récupérée', {
        hasSession: !!session,
        hasAccessToken: !!session?.access_token,
        tokenLength: session?.access_token?.length || 0
      });
      
      const headers: HeadersInit = { 
        'Content-Type': 'application/json',
        'X-Client-Type': 'llm'
      };
      
      // ✅ Ajouter le token d'authentification si disponible
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
        logger.debug(LogCategory.API, '[LLM AUTH] ✅ Token ajouté aux headers');
      } else {
        logger.warn(LogCategory.API, '[LLM AUTH] ⚠️ Pas de token disponible - authentification échouera probablement');
      }
      
      logger.debug(LogCategory.API, '[LLM AUTH] 🔐 Headers finaux', {
        hasContentType: !!headers['Content-Type'],
        hasClientType: !!headers['X-Client-Type'],
        hasAuth: !!headers['Authorization']
      });
      
      return headers;
      
    } catch (error) {
      logger.error(LogCategory.API, '[LLM AUTH] ❌ Erreur récupération headers', {
        error: error instanceof Error ? error.message : 'Erreur inconnue',
        stack: error instanceof Error ? error.stack : 'Pas de stack trace'
      }, error instanceof Error ? error : undefined);
      
      // En cas d'erreur, retourner les headers de base
      const fallbackHeaders = { 
        'Content-Type': 'application/json',
        'X-Client-Type': 'llm'
      };
      
      logger.debug(LogCategory.API, '[LLM AUTH] 🔄 Utilisation headers de fallback', {
        hasContentType: !!fallbackHeaders['Content-Type'],
        hasClientType: !!fallbackHeaders['X-Client-Type']
      });
      return fallbackHeaders;
    }
  }

  /**
   * Créer une note via API LLM
   * @param noteData - Données de la note à créer
   */
  async createNote(noteData: CreateNoteData) {
    const startTime = Date.now();
    const context = { operation: 'v2_llm_note_create', component: 'LLMApi' };
    
    logger.info(LogCategory.API, '🚀 Début création note LLM', context);
    
    try {
      const headers = await this.getAuthHeaders();

      const response = await fetch('/api/v2/note/create', {
        method: 'POST',
        headers,
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
      logger.info(LogCategory.API, `✅ Note LLM créée en ${apiTime}ms`, context);
      
      return result;
    } catch (error) {
      logger.error(LogCategory.API, `❌ Erreur création note LLM: ${error}`, context, error instanceof Error ? error : undefined);
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
    
    logger.info(LogCategory.API,`🚀 Début mise à jour note LLM ${noteRef}`, context);
    
    try {
      const headers = await this.getAuthHeaders();

      const response = await fetch(`/api/v2/note/${noteRef}/update`, {
        method: 'PUT',
        headers,
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
      logger.info(LogCategory.API,`✅ Note LLM mise à jour en ${apiTime}ms`, context);
      
      return result;
    } catch (error) {
      logger.error(LogCategory.API,`❌ Erreur mise à jour note LLM: ${error}`, context);
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
    
    logger.info(LogCategory.API, `🚀 Début suppression note LLM ${noteRef}`, context);
    
    try {
      // ✅ DEBUG: Vérifier la référence reçue
      logger.debug(LogCategory.API, '[LLM DELETE] 🔍 Référence reçue', {
        noteRef,
        type: typeof noteRef,
        length: noteRef?.length,
        isUUID: noteRef?.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i) ? 'OUI' : 'NON',
        operation: context.operation,
        component: context.component
      });
      
      const headers = await this.getAuthHeaders();
      const headersRecord = headers as Record<string, string>;
      
      // ✅ DEBUG: Vérifier les headers d'authentification
      logger.debug(LogCategory.API, '[LLM DELETE] 🔐 Headers préparés', {
        hasContentType: !!headersRecord['Content-Type'],
        hasClientType: !!headersRecord['X-Client-Type'],
        hasAuth: !!headersRecord['Authorization'],
        operation: context.operation,
        component: context.component
      });
      
      // ✅ DEBUG: Construire l'URL et vérifier sa validité
      const deleteUrl = `/api/v2/delete/note/${noteRef}`;
      logger.debug(LogCategory.API, '[LLM DELETE] 🔗 URL construite', {
        url: deleteUrl,
        isValid: deleteUrl.includes(noteRef),
        noteRefInUrl: deleteUrl.split('/').includes(noteRef),
        operation: context.operation,
        component: context.component
      });
      
      // ✅ DEBUG: Vérifier que l'URL est valide
      try {
        new URL(deleteUrl, window.location.origin);
        logger.debug(LogCategory.API, '[LLM DELETE] ✅ URL valide', {
          operation: context.operation,
          component: context.component
        });
      } catch (urlError) {
        logger.error(LogCategory.API, '[LLM DELETE] ❌ URL invalide', {
          url: deleteUrl,
          error: urlError instanceof Error ? urlError.message : 'Unknown error',
          operation: context.operation,
          component: context.component
        }, urlError instanceof Error ? urlError : undefined);
        throw new Error(`URL invalide: ${deleteUrl}`);
      }

      logger.debug(LogCategory.API, '[LLM DELETE] 📡 Envoi requête DELETE...', {
        url: deleteUrl,
        operation: context.operation,
        component: context.component
      });
      const response = await fetch(deleteUrl, {
        method: 'DELETE',
        headers
      });

      // ✅ DEBUG: Analyser la réponse
      logger.debug(LogCategory.API, '[LLM DELETE] 📥 Réponse reçue', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        operation: context.operation,
        component: context.component
      });

      if (!response.ok) {
        // ✅ DEBUG: Analyser l'erreur en détail
        const errorText = await response.text();
        logger.error(LogCategory.API, '[LLM DELETE] ❌ Erreur HTTP', {
          status: response.status,
          statusText: response.statusText,
          errorText,
          containsFailedToParse: errorText.includes('Failed to parse'),
          containsURL: errorText.includes('URL'),
          containsParse: errorText.includes('parse'),
          operation: context.operation,
          component: context.component
        });
        
        const error = new Error(`Erreur suppression note LLM: ${response.statusText}`) as ApiError;
        error.status = response.status;
        error.statusText = response.statusText;
        throw error;
      }

      const result = await response.json();
      const apiTime = Date.now() - startTime;
      
      // ✅ DEBUG: Succès
      logger.info(LogCategory.API, '[LLM DELETE] ✅ Note supprimée avec succès', {
        result,
        apiTime: `${apiTime}ms`,
        operation: context.operation,
        component: context.component
      });
      
      logger.info(LogCategory.API, `✅ Note LLM supprimée en ${apiTime}ms`, context);
      return result;
      
    } catch (error) {
      // ✅ DEBUG: Erreur complète
      logger.error(LogCategory.API, '[LLM DELETE] 💥 Erreur complète', {
        error: error instanceof Error ? error.message : 'Erreur inconnue',
        stack: error instanceof Error ? error.stack : 'Pas de stack trace',
        noteRef,
        operation: context.operation,
        component: context.component
      }, error instanceof Error ? error : undefined);
      
      logger.error(LogCategory.API, `❌ Erreur suppression note LLM: ${error}`, context);
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
    
    logger.info(LogCategory.API,`🚀 Début déplacement note LLM ${noteRef}`, context);
    
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`/api/v2/note/${noteRef}/move`, {
        method: 'PUT',
        headers,
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
      logger.info(LogCategory.API,`✅ Note LLM déplacée en ${apiTime}ms`, context);

      return result;
    } catch (error) {
      logger.error(LogCategory.API,`❌ Erreur déplacement note LLM: ${error}`, context);
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
    
    logger.info(LogCategory.API,`🚀 Début fusion note LLM ${sourceNoteRef}`, context);
    
    // TODO: Implémenter la fusion de notes via l'API V2
    // Pour l'instant, cette fonctionnalité est désactivée
    throw new Error('Fusion de notes non implémentée - API LLM obsolète supprimée');
    
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`/api/v2/note/merge`, {
        method: 'POST',
        headers,
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
      logger.info(LogCategory.API,`✅ Note LLM fusionnée en ${apiTime}ms`, context);

      return result;
    } catch (error) {
      logger.error(LogCategory.API,`❌ Erreur fusion note LLM: ${error}`, context);
      throw error;
    }
  }

  /**
   * Ajouter du contenu à une note via content:apply (append à la fin)
   */
  async addContent(noteRef: string, content: string) {
    const startTime = Date.now();
    const context = { operation: 'v2_llm_note_add_content', component: 'LLMApi', noteRef };

    logger.info(LogCategory.API, '🚀 Début ajout contenu note LLM', context);

    try {
      const headers = await this.getAuthHeaders();
      const ops = [
        {
          id: `insert-${Date.now()}`,
          action: 'insert',
          target: { type: 'anchor', anchor: { name: 'doc_end' } },
          where: 'at',
          content
        }
      ];

      const response = await fetch(`/api/v2/note/${noteRef}/content:apply`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ ops })
      });

      if (!response.ok) {
        const error = new Error(`Erreur ajout contenu note LLM: ${response.statusText}`) as ApiError;
        error.status = response.status;
        error.statusText = response.statusText;
        throw error;
      }

      const result = await response.json();
      logger.info(LogCategory.API, `✅ Contenu ajouté en ${Date.now() - startTime}ms`, context);
      return result;
    } catch (error) {
      logger.error(LogCategory.API, '❌ Erreur ajout contenu note LLM', context);
      throw error;
    }
  }

  /**
   * Ajouter du contenu à une section spécifique via content:apply (cible heading par path/slug)
   */
  async addToSection(noteId: string, sectionId: string, content: string) {
    const startTime = Date.now();
    const context = { operation: 'v2_llm_note_add_to_section', component: 'LLMApi', noteId };

    logger.info(LogCategory.API, '🚀 Début ajout section LLM', context);

    try {
      const headers = await this.getAuthHeaders();
      const ops = [
        {
          id: `insert-${Date.now()}`,
          action: 'insert',
          target: { type: 'heading', heading: { path: [sectionId] } },
          where: 'inside_end',
          content
        }
      ];

      const response = await fetch(`/api/v2/note/${noteId}/content:apply`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ ops })
      });

      if (!response.ok) {
        const error = new Error(`Erreur ajout section LLM: ${response.statusText}`) as ApiError;
        error.status = response.status;
        error.statusText = response.statusText;
        throw error;
      }

      const result = await response.json();
      logger.info(LogCategory.API, `✅ Section LLM ajoutée en ${Date.now() - startTime}ms`, context);
      return result;
    } catch (error) {
      logger.error(LogCategory.API, '❌ Erreur ajout section LLM', context);
      throw error;
    }
  }

  /**
   * Vider une section via API LLM
   */
  async clearSection(noteId: string, sectionId: string) {
    const startTime = Date.now();
    const context = { operation: 'v2_llm_note_clear_section', component: 'LLMApi' };
    
    logger.info(LogCategory.API,`🚀 Début vidage section LLM ${noteId}`, context);
    
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`/api/v2/note/${noteId}/clear-section`, {
        method: 'POST',
        headers,
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
      logger.info(LogCategory.API,`✅ Section LLM vidée en ${apiTime}ms`, context);

      return result;
    } catch (error) {
      logger.error(LogCategory.API,`❌ Erreur vidage section LLM: ${error}`, context);
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
    
    logger.info(LogCategory.API,`🚀 Début mise à jour contenu note LLM ${noteRef}`, context);
    
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`/api/v2/note/${noteRef}/content/update`, {
        method: 'PUT',
        headers,
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
      logger.info(LogCategory.API,`✅ Contenu mis à jour en ${apiTime}ms`, context);

      return result;
    } catch (error) {
      logger.error(LogCategory.API,`❌ Erreur mise à jour contenu note LLM: ${error}`, context);
      throw error;
    }
  }

  /**
   * Changer la visibilité d'une note via API LLM (supporte UUID ou slug)
   * @param noteRef - UUID ou slug de la note
   * @param visibility - Niveau de visibilité
   */
  async publishNote(noteRef: string, visibility: 'private' | 'public' | 'link-private' | 'link-public' | 'limited' | 'scrivia') {
    const startTime = Date.now();
    const context = { operation: 'v2_llm_note_publish', component: 'LLMApi', noteRef };
    
    logger.info(LogCategory.API,`🚀 Début publication note LLM ${noteRef}`, context);
    
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`/api/v2/note/${noteRef}/publish`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ visibility })
      });

      if (!response.ok) {
        const error = new Error(`Erreur publication note LLM: ${response.statusText}`) as ApiError;
        error.status = response.status;
        error.statusText = response.statusText;
        throw error;
      }

      const result = await response.json();
      const apiTime = Date.now() - startTime;
      logger.info(LogCategory.API,`✅ Note LLM publiée en ${apiTime}ms`, context);

      return result;
    } catch (error) {
      logger.error(LogCategory.API,`❌ Erreur publication note LLM: ${error}`, context);
      throw error;
    }
  }

  /**
   * Créer un dossier via API LLM
   */
  async createFolder(folderData: CreateFolderData) {
    const startTime = Date.now();
    const context = { operation: 'v2_llm_folder_create', component: 'LLMApi' };
    
    logger.info(LogCategory.API,`🚀 Début création dossier LLM`, context);
    
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch('/api/v2/folder/create', {
        method: 'POST',
        headers,
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
      logger.info(LogCategory.API,`✅ Dossier LLM créé en ${apiTime}ms`, context);

      return result;
    } catch (error) {
      logger.error(LogCategory.API,`❌ Erreur création dossier LLM: ${error}`, context);
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
    
    logger.info(LogCategory.API,`🚀 Début mise à jour dossier LLM ${folderRef}`, context);
    
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`/api/v2/folder/${folderRef}/update`, {
        method: 'PUT',
        headers,
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
      logger.info(LogCategory.API,`✅ Dossier LLM mis à jour en ${apiTime}ms`, context);

      return result;
    } catch (error) {
      logger.error(LogCategory.API,`❌ Erreur mise à jour dossier LLM: ${error}`, context);
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
    
    logger.info(LogCategory.API,`🚀 Début suppression dossier LLM ${folderRef}`, context);
    
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`/api/v2/delete/folder/${folderRef}`, {
        method: 'DELETE',
        headers
      });

      if (!response.ok) {
        const error = new Error(`Erreur suppression dossier LLM: ${response.statusText}`) as ApiError;
        error.status = response.status;
        error.statusText = response.statusText;
        throw error;
      }

      const result = await response.json();
      const apiTime = Date.now() - startTime;
      logger.info(LogCategory.API,`✅ Dossier LLM supprimé en ${apiTime}ms`, context);

      return result;
    } catch (error) {
      logger.error(LogCategory.API,`❌ Erreur suppression dossier LLM: ${error}`, context);
      throw error;
    }
  }

  /**
   * Déplacer un dossier via API LLM (supporte UUID ou slug)
   * @param folderRef - UUID ou slug du dossier
   * @param targetParentRef - UUID ou slug du dossier parent de destination
   */
  async moveFolder(folderRef: string, targetParentRef: string, targetClasseurId?: string) {
    const startTime = Date.now();
    const context = { operation: 'v2_llm_folder_move', component: 'LLMApi', folderRef };
    
    logger.info(LogCategory.API,`🚀 Début déplacement dossier LLM ${folderRef}`, context);
    
    try {
      const headers = await this.getAuthHeaders();
      const payload: { target_folder_id: string; target_classeur_id?: string } = { target_folder_id: targetParentRef };
      if (targetClasseurId) {
        payload.target_classeur_id = targetClasseurId;
      }
      
      const response = await fetch(`/api/v2/folder/${folderRef}/move`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const error = new Error(`Erreur déplacement dossier LLM: ${response.statusText}`) as ApiError;
        error.status = response.status;
        error.statusText = response.statusText;
        throw error;
      }

      const result = await response.json();
      const apiTime = Date.now() - startTime;
      logger.info(LogCategory.API,`✅ Dossier LLM déplacé en ${apiTime}ms`, context);

      return result;
    } catch (error) {
      logger.error(LogCategory.API,`❌ Erreur déplacement dossier LLM: ${error}`, context);
      throw error;
    }
  }

  /**
   * Créer un classeur via API LLM
   */
  async createClasseur(classeurData: CreateClasseurData) {
    const startTime = Date.now();
    const context = { operation: 'v2_llm_classeur_create', component: 'LLMApi' };
    
    logger.info(LogCategory.API,`🚀 Début création classeur LLM`, context);
    
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch('/api/v2/classeur/create', {
        method: 'POST',
        headers,
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
      logger.info(LogCategory.API,`✅ Classeur LLM créé en ${apiTime}ms`, context);

      return result;
    } catch (error) {
      logger.error(LogCategory.API,`❌ Erreur création classeur LLM: ${error}`, context);
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
    
    logger.info(LogCategory.API,`🚀 Début mise à jour classeur LLM ${classeurRef}`, context);
    
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`/api/v2/classeur/${classeurRef}/update`, {
        method: 'PUT',
        headers,
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
      logger.info(LogCategory.API,`✅ Classeur LLM mis à jour en ${apiTime}ms`, context);

      return result;
    } catch (error) {
      logger.error(LogCategory.API,`❌ Erreur mise à jour classeur LLM: ${error}`, context);
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
    
    logger.info(LogCategory.API,`🚀 Début suppression classeur LLM ${classeurRef}`, context);
    
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`/api/v2/delete/classeur/${classeurRef}`, {
        method: 'DELETE',
        headers
      });

      if (!response.ok) {
        const error = new Error(`Erreur suppression classeur LLM: ${response.statusText}`) as ApiError;
        error.status = response.status;
        error.statusText = response.statusText;
        throw error;
      }

      const result = await response.json();
      const apiTime = Date.now() - startTime;
      logger.info(LogCategory.API,`✅ Classeur LLM supprimé en ${apiTime}ms`, context);

      return result;
    } catch (error) {
      logger.error(LogCategory.API,`❌ Erreur suppression classeur LLM: ${error}`, context);
      throw error;
    }
  }

  /**
   * Réorganiser les classeurs via API LLM
   */
  async reorderClasseurs(updatedClasseurs: { id: string; position: number }[]) {
    const startTime = Date.now();
    const context = { operation: 'v2_llm_classeur_reorder', component: 'LLMApi' };
    
    logger.info(LogCategory.API,`🚀 Début réorganisation classeurs LLM`, context);
    
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch('/api/v2/classeur/reorder', {
        method: 'PUT',
        headers,
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
      logger.info(LogCategory.API,`✅ Classeurs LLM réorganisés en ${apiTime}ms`, context);

      return result;
    } catch (error) {
      logger.error(LogCategory.API,`❌ Erreur réorganisation classeurs LLM: ${error}`, context);
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
    
    logger.info(LogCategory.API,`🚀 Début récupération contenu note LLM ${noteRef}`, context);
    
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`/api/v2/note/${noteRef}?fields=content`, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        const error = new Error(`Erreur récupération contenu note LLM: ${response.statusText}`) as ApiError;
        error.status = response.status;
        error.statusText = response.statusText;
        throw error;
      }

      const result = await response.json();
      const apiTime = Date.now() - startTime;
      logger.info(LogCategory.API,`✅ Contenu note LLM récupéré en ${apiTime}ms`, context);

      return result;
    } catch (error) {
      logger.error(LogCategory.API,`❌ Erreur récupération contenu note LLM: ${error}`, context);
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
    
    logger.info(LogCategory.API,`🚀 Début récupération métadonnées note LLM ${noteRef}`, context);
    
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`/api/v2/note/${noteRef}?fields=metadata`, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        const error = new Error(`Erreur récupération métadonnées note LLM: ${response.statusText}`) as ApiError;
        error.status = response.status;
        error.statusText = response.statusText;
        throw error;
      }

      const result = await response.json();
      const apiTime = Date.now() - startTime;
      logger.info(LogCategory.API,`✅ Métadonnées note LLM récupérées en ${apiTime}ms`, context);

      return result;
    } catch (error) {
      logger.error(LogCategory.API,`❌ Erreur récupération métadonnées note LLM: ${error}`, context);
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
    
    logger.info(LogCategory.API,`🚀 Début récupération insights note LLM ${noteRef}`, context);
    
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`/api/v2/note/${noteRef}/insights`, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        const error = new Error(`Erreur récupération insights note LLM: ${response.statusText}`) as ApiError;
        error.status = response.status;
        error.statusText = response.statusText;
        throw error;
      }

      const result = await response.json();
      const apiTime = Date.now() - startTime;
      logger.info(LogCategory.API,`✅ Insights note LLM récupérés en ${apiTime}ms`, context);

      return result;
    } catch (error) {
      logger.error(LogCategory.API,`❌ Erreur récupération insights note LLM: ${error}`, context);
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
    
    logger.info(LogCategory.API,`🚀 Début récupération arborescence dossier LLM ${folderRef}`, context);
    
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`/api/v2/folder/${folderRef}/tree`, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        const error = new Error(`Erreur récupération arborescence dossier LLM: ${response.statusText}`) as ApiError;
        error.status = response.status;
        error.statusText = response.statusText;
        throw error;
      }

      const result = await response.json();
      const apiTime = Date.now() - startTime;
      logger.info(LogCategory.API,`✅ Arborescence dossier LLM récupérée en ${apiTime}ms`, context);

      return result;
    } catch (error) {
      logger.error(LogCategory.API,`❌ Erreur récupération arborescence dossier LLM: ${error}`, context);
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
    
    logger.info(LogCategory.API,`🚀 Début récupération arborescence classeur LLM ${classeurRef}`, context);
    
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`/api/v2/classeur/${classeurRef}/tree`, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        const error = new Error(`Erreur récupération arborescence classeur LLM: ${response.statusText}`) as ApiError;
        error.status = response.status;
        error.statusText = response.statusText;
        throw error;
      }

      const result = await response.json();
      const apiTime = Date.now() - startTime;
      logger.info(LogCategory.API,`✅ Arborescence classeur LLM récupérée en ${apiTime}ms`, context);

      return result;
    } catch (error) {
      logger.error(LogCategory.API,`❌ Erreur récupération arborescence classeur LLM: ${error}`, context);
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
    
    logger.info(LogCategory.API,`🚀 Début récupération notes utilisateur LLM ${userId}`, context);
    
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
      logger.info(LogCategory.API,`✅ Notes utilisateur LLM récupérées en ${apiTime}ms`, context);

      return { success: true, notes: data };
    } catch (error) {
      logger.error(LogCategory.API,`❌ Erreur récupération notes utilisateur LLM: ${error}`, context);
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
    
    logger.info(LogCategory.API,`🚀 Début récupération dossiers utilisateur LLM ${userId}`, context);
    
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
      logger.info(LogCategory.API,`✅ Dossiers utilisateur LLM récupérés en ${apiTime}ms`, context);

      return { success: true, folders: data };
    } catch (error) {
      logger.error(LogCategory.API,`❌ Erreur récupération dossiers utilisateur LLM: ${error}`, context);
      throw error;
    }
  }
}

// Instance singleton
export const llmApi = LLMApi.getInstance(); 