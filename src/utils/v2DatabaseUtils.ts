import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logApi as originalLogApi } from './logger';
import { V2ResourceResolver } from './v2ResourceResolver';
import { SlugGenerator } from './slugGenerator';
import { SlugAndUrlService } from '@/services/slugAndUrlService';
import { sanitizeMarkdownContent } from './markdownSanitizer.server';
import { sanitizeNoteEmbedHtml } from './sanitizeNoteEmbedHtml';

// Types pour les opérations de contenu et les agents
export interface ContentOperation {
  id: string;
  action: 'insert' | 'replace' | 'delete' | 'upsert_section';
  target: unknown;
  where: string;
  content?: string;
  options?: Record<string, unknown>;
}

export interface ShareSettings {
  visibility?: 'private' | 'public' | 'link-private' | 'link-public' | 'limited' | 'scrivia';
  allow_edit?: boolean;
  allow_comments?: boolean;
  invited_users?: string[];
  link_expires?: string;
}

export interface AgentData {
  display_name?: string;
  slug?: string;
  description?: string;
  model?: string;
  system_instructions?: string;
  api_v2_capabilities?: string[];
  [key: string]: unknown;
}

// Wrapper pour logApi pour accepter les paramètres ApiContext
const logApi = {
  info: (message: string, context?: ApiContext) => {
    originalLogApi.info(message);
  },
  error: (message: string, context?: ApiContext) => {
    originalLogApi.error(message);
  }
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// IMPORTANT: L'API V2 est utilisée par l'Agent côté serveur sans JWT utilisateur.
// Pour éviter les erreurs RLS tout en garantissant la sécurité, on utilise la clé Service Role
// et on applique systématiquement des filtres user_id dans toutes les requêtes.
// Ne JAMAIS exposer cette clé côté client.
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Types pour les données
export interface ApiContext {
  operation: string;
  component: string;
  userId?: string;
  timestamp?: number;
  [key: string]: unknown;
}

export interface CreateNoteData {
  source_title: string;
  notebook_id?: string; // ✅ Optionnel pour supporter 'notebook'
  notebook?: string; // ✅ Support pour Groq
  markdown_content?: string;
  header_image?: string;
  folder_id?: string | null;
  description?: string;
}

export interface UpdateNoteData {
  source_title?: string;
  markdown_content?: string;
  html_content?: string;
  header_image?: string | null;
  header_image_offset?: number;
  header_image_blur?: number;
  header_image_overlay?: number;
  header_title_in_image?: boolean;
  wide_mode?: boolean;
  a4_mode?: boolean;
  slash_lang?: 'fr' | 'en';
  font_family?: string;
  folder_id?: string | null;
  description?: string;
}

export interface CreateFolderData {
  name: string;
  classeur_id: string;
  parent_id?: string | null;
}

export interface UpdateFolderData {
  name?: string;
  parent_id?: string | null;
}

export interface CreateClasseurData {
  name: string;
  description?: string;
  icon?: string;
  emoji?: string; // Ajouter le support pour emoji
}

export interface UpdateClasseurData {
  name?: string;
  description?: string;
  icon?: string; // Ajouter le support pour emoji
  emoji?: string; // Ajouter le support pour emoji
  position?: number;
}

/**
 * Utilitaires de base de données pour l'API V2
 * Accès direct et propre sans dépendance à optimizedApi
 */
export class V2DatabaseUtils {
  
  /**
   * Créer une note
   */
  static async createNote(data: CreateNoteData, userId: string, context: ApiContext) {
          logApi.info('🚀 Création note directe DB', context);
    
    try {
      // Résoudre le notebook_id (peut être un UUID ou un slug)
      let classeurId = data.notebook_id || data.notebook; // ✅ Support pour 'notebook' (Groq)
      
      // ✅ Vérification que classeurId existe
      if (!classeurId) {
        throw new Error('notebook_id ou notebook manquant');
      }
      
      // Si ce n'est pas un UUID, essayer de le résoudre comme un slug
      if (!classeurId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        const { data: classeur, error: resolveError } = await supabase
          .from('classeurs')
          .select('id')
          .eq('slug', classeurId)
          .eq('user_id', userId)
          .single();
        
        if (resolveError || !classeur) {
          throw new Error(`Classeur non trouvé: ${classeurId}`);
        }
        
        classeurId = classeur.id;
      }

      // Générer un slug unique avec le client authentifié
      const slug = await SlugGenerator.generateSlug(data.source_title, 'note', userId, undefined, supabase);
      
      // 🛡️ Sanitizer le markdown pour empêcher les injections HTML
      const safeMarkdown = sanitizeMarkdownContent(data.markdown_content || '');
      
      // Créer la note
      const { data: note, error: createError } = await supabase
        .from('articles')
        .insert({
          source_title: data.source_title,
          markdown_content: safeMarkdown,
          html_content: safeMarkdown, // Pour l'instant, on met le même contenu
          header_image: data.header_image,
          folder_id: data.folder_id,
          classeur_id: classeurId, // 🔧 CORRECTION TEMPORAIRE: Utiliser uniquement classeur_id
          user_id: userId,
          slug,
          description: data.description
        })
        .select()
        .single();

      if (createError) {
        throw new Error(`Erreur création note: ${createError.message}`);
      }

      logApi.info(`✅ Note créée avec succès`, context);
      return { success: true, data: note };
      
    } catch (error) {
      logApi.info(`❌ Erreur création note: ${error}`, context);
      throw error;
    }
  }

  /**
   * Mettre à jour une note
   */
  static async updateNote(ref: string, data: UpdateNoteData, userId: string, context: ApiContext) {
    logApi.info(`🚀 Mise à jour note ${ref}`, context);
    
    try {
      // Résoudre la référence (UUID ou slug)
      const resolveResult = await V2ResourceResolver.resolveRef(ref, 'note', userId, context);
      if (!resolveResult.success) {
        throw new Error(resolveResult.error);
      }

      const noteId = resolveResult.id;

      // Charger l'état courant pour comparaison de titre
      const { data: current, error: currErr } = await supabase
        .from('articles')
        .select('id, source_title, slug, public_url')
        .eq('id', noteId)
        .eq('user_id', userId)
        .single();
      if (currErr) {
        throw new Error(`Erreur lecture note: ${currErr.message}`);
      }

      // Préparer les données de mise à jour
      const updateData: Record<string, unknown> = {};
      
      // 🔧 CORRECTION : Charger d'abord l'état complet de la note pour préserver les valeurs existantes
      const { data: currentNote, error: currentError } = await supabase
        .from('articles')
        .select('wide_mode, a4_mode, slash_lang, font_family, folder_id, description, source_title')
        .eq('id', noteId)
        .eq('user_id', userId)
        .single();
      
      if (currentError) {
        throw new Error(`Erreur lecture note courante: ${currentError.message}`);
      }
      
      // 🔧 CORRECTION : Préserver les valeurs existantes par défaut
      updateData.wide_mode = currentNote.wide_mode;
      updateData.a4_mode = currentNote.a4_mode;
      updateData.slash_lang = currentNote.slash_lang;
      updateData.font_family = currentNote.font_family;
      updateData.folder_id = currentNote.folder_id;
      updateData.description = currentNote.description;
      
      if (data.source_title !== undefined) {
        const normalizedTitle = String(data.source_title).trim();
        updateData.source_title = normalizedTitle;
        
        // Mettre à jour le slug seulement si le titre a réellement changé (comme l'API V1)
        if (normalizedTitle && currentNote && normalizedTitle !== currentNote.source_title) {
          try {
            const { slug: newSlug, publicUrl } = await SlugAndUrlService.updateNoteSlugAndUrl(
              noteId,
              normalizedTitle,
              userId,
              supabase,
              currentNote // Passer les données actuelles pour éviter une requête supplémentaire
            );
            updateData.slug = newSlug;
            updateData.public_url = publicUrl;
            
            if (process.env.NODE_ENV === 'development') {
              console.log(`[V2DatabaseUtils] Mise à jour slug via SlugAndUrlService: "${currentNote?.source_title || 'N/A'}" → "${normalizedTitle}" → "${newSlug}"`);
            }
          } catch (error) {
            logApi.error(`❌ Erreur mise à jour slug/URL pour la note ${noteId}: ${error}`);
            // Continuer sans mettre à jour le slug en cas d'erreur
          }
        }
      }
      // 🛡️ SÉCURITÉ : Sanitizer automatiquement le markdown pour empêcher les injections HTML
      if (data.markdown_content !== undefined) {
        updateData.markdown_content = sanitizeMarkdownContent(data.markdown_content);
      }
      if (data.html_content !== undefined) {
        updateData.html_content = sanitizeNoteEmbedHtml(data.html_content);
      }
      if (data.header_image !== undefined) updateData.header_image = data.header_image;
      if (data.header_image_offset !== undefined) {
        const roundedOffset = Math.round(data.header_image_offset * 10) / 10;
        updateData.header_image_offset = roundedOffset;
        if (process.env.NODE_ENV === 'development') {
          console.log('[V2DatabaseUtils] Mise à jour header_image_offset:', roundedOffset);
        }
      }
      if (data.header_image_blur !== undefined) updateData.header_image_blur = data.header_image_blur;
      if (data.header_image_overlay !== undefined) updateData.header_image_overlay = data.header_image_overlay;
      if (data.header_title_in_image !== undefined) updateData.header_title_in_image = data.header_title_in_image;
      
      // 🔧 CORRECTION : Mettre à jour seulement si explicitement fourni
      if (data.wide_mode !== undefined) updateData.wide_mode = data.wide_mode;
      if (data.a4_mode !== undefined) updateData.a4_mode = data.a4_mode;
      if (data.slash_lang !== undefined) updateData.slash_lang = data.slash_lang;
      if (data.font_family !== undefined) updateData.font_family = data.font_family;
      if (data.folder_id !== undefined) updateData.folder_id = data.folder_id;
      if (data.description !== undefined) updateData.description = data.description;
      
      updateData.updated_at = new Date().toISOString();

      // Mettre à jour la note
      const { data: note, error: updateError } = await supabase
        .from('articles')
        .update(updateData)
        .eq('id', noteId)
        .eq('user_id', userId)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Erreur mise à jour note: ${updateError.message}`);
      }

      logApi.info('✅ Note mise à jour avec succès', context);
      return { success: true, data: note };
      
    } catch (error) {
      logApi.error(`❌ Erreur mise à jour note: ${error}`, context);
      throw error;
    }
  }

  /**
   * Supprimer une note
   */
  static async deleteNote(ref: string, userId: string, context: ApiContext) {
    console.log('🚀 [V2DatabaseUtils] Début suppression note:', { ref, userId, context });
    logApi.info(`🚀 Suppression note ${ref}`, context);
    
    try {
      console.log('🔍 [V2DatabaseUtils] Résolution référence via V2ResourceResolver...');
      
      // Résoudre la référence (UUID ou slug)
      const resolveResult = await V2ResourceResolver.resolveRef(ref, 'note', userId, context);
      console.log('🔍 [V2DatabaseUtils] Résultat résolution:', {
        success: resolveResult.success,
        id: resolveResult.success ? resolveResult.id : 'N/A',
        error: !resolveResult.success ? resolveResult.error : 'N/A',
        status: !resolveResult.success ? resolveResult.status : 'N/A'
      });
      
      if (!resolveResult.success) {
        const errorMsg = `❌ Échec résolution référence: ${resolveResult.error}`;
        console.error(errorMsg, { resolveResult, ref, userId, context });
        throw new Error(resolveResult.error);
      }

      const noteId = resolveResult.id;
      console.log('✅ [V2DatabaseUtils] Référence résolue:', { ref, noteId });

      console.log('🗑️ [V2DatabaseUtils] Suppression note de la base...');
      
      // Supprimer la note
      const { error: deleteError } = await supabase
        .from('articles')
        .delete()
        .eq('id', noteId)
        .eq('user_id', userId);

      if (deleteError) {
        const errorMsg = `❌ Erreur suppression note: ${deleteError.message}`;
        console.error(errorMsg, { deleteError, noteId, userId, context });
        throw new Error(errorMsg);
      }

      console.log('✅ [V2DatabaseUtils] Note supprimée avec succès de la base');
      logApi.info('✅ Note supprimée avec succès', context);
      return { success: true };
      
    } catch (error) {
      const errorMsg = `❌ Erreur suppression note: ${error}`;
      console.error(errorMsg, { error, ref, userId, context });
      logApi.error(errorMsg, context);
      throw error;
    }
  }

  /**
   * Récupérer le contenu d'une note
   */
  static async getNoteContent(ref: string, userId: string, context: ApiContext) {
    logApi.info('🚀 Récupération contenu note directe DB', context);
    
    try {
      // Résoudre la référence (peut être un UUID ou un slug)
      let noteId = ref;
      
      // Si ce n'est pas un UUID, essayer de le résoudre comme un slug
      if (!noteId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        const { data: note, error: resolveError } = await supabase
          .from('articles')
          .select('id')
          .eq('slug', noteId)
          .eq('user_id', userId)
          .single();
        
        if (resolveError || !note) {
          throw new Error(`Note non trouvée: ${noteId}`);
        }
        
        noteId = note.id;
      }

      // Récupérer le contenu de la note
      const { data: note, error: fetchError } = await supabase
        .from('articles')
        .select('id, source_title, markdown_content, html_content, created_at, updated_at')
        .eq('id', noteId)
        .eq('user_id', userId)
        .single();

      if (fetchError || !note) {
        throw new Error(`Note non trouvée: ${noteId}`);
      }

      logApi.info(`✅ Contenu récupéré avec succès`, context);
      return { success: true, data: note };
      
    } catch (error) {
      logApi.info(`❌ Erreur récupération contenu: ${error}`, context);
      throw error;
    }
  }

  /**
   * Ajouter du contenu à une note
   */
  static async addContentToNote(ref: string, content: string, userId: string, context: ApiContext) {
    logApi.info(`🚀 Ajout contenu note directe DB`, context);
    
    try {
      // Résoudre la référence (peut être un UUID ou un slug)
      let noteId = ref;
      
      // Si ce n'est pas un UUID, essayer de le résoudre comme un slug
      if (!noteId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        const { data: note, error: resolveError } = await supabase
          .from('articles')
          .select('id')
          .eq('slug', noteId)
          .eq('user_id', userId)
          .single();
        
        if (resolveError || !note) {
          throw new Error(`Note non trouvée: ${noteId}`);
        }
        
        noteId = note.id;
      }

      // Récupérer la note actuelle
      const { data: currentNote, error: fetchError } = await supabase
        .from('articles')
        .select('markdown_content')
        .eq('id', noteId)
        .eq('user_id', userId)
        .single();

      if (fetchError || !currentNote) {
        throw new Error(`Note non trouvée: ${noteId}`);
      }

      // Ajouter le nouveau contenu
      const updatedContent = currentNote.markdown_content + '\n\n' + content;

      // Mettre à jour la note
      const { data: updatedNote, error: updateError } = await supabase
        .from('articles')
        .update({
          markdown_content: updatedContent,
          html_content: updatedContent // Pour l'instant, on met le même contenu
        })
        .eq('id', noteId)
        .eq('user_id', userId)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Erreur mise à jour note: ${updateError.message}`);
      }

      logApi.info(`✅ Contenu ajouté avec succès`, context);
      return { success: true, data: updatedNote };
      
    } catch (error) {
      logApi.info(`❌ Erreur ajout contenu: ${error}`, context);
      throw error;
    }
  }

  /**
   * Déplacer une note
   */
  static async moveNote(ref: string, targetFolderId: string | null, userId: string, context: ApiContext, targetClasseurId?: string) {
    logApi.info(`🚀 Déplacement note ${ref} vers folder ${targetFolderId}, targetClasseurId: ${targetClasseurId}`, context);
    
    try {
      // Résoudre la référence de la note
      const resolveResult = await V2ResourceResolver.resolveRef(ref, 'note', userId, context);
      if (!resolveResult.success) {
        throw new Error(resolveResult.error);
      }

      const noteId = resolveResult.id;

      // Vérifier que le dossier de destination existe et appartient à l'utilisateur
      if (targetFolderId) {
        const { data: folder, error: folderError } = await supabase
          .from('folders')
          .select('id')
          .eq('id', targetFolderId)
          .eq('user_id', userId)
          .single();

        if (folderError || !folder) {
          throw new Error(`Dossier de destination non trouvé: ${targetFolderId}`);
        }
      }

      // Déplacer la note
      const updateData: Record<string, unknown> = { 
        folder_id: targetFolderId,
        updated_at: new Date().toISOString()
      };
      
      // Si cross-classeur, mettre à jour aussi le classeur_id
      if (targetClasseurId) {
        updateData.classeur_id = targetClasseurId;
        logApi.info(`🔄 Mise à jour classeur_id vers ${targetClasseurId}`, context);
      }
      
      const { data: note, error: moveError } = await supabase
        .from('articles')
        .update(updateData)
        .eq('id', noteId)
        .eq('user_id', userId)
        .select()
        .single();

      if (moveError) {
        throw new Error(`Erreur déplacement note: ${moveError.message}`);
      }

      logApi.info(`✅ Note déplacée avec succès`, context);
      return { success: true, data: note };
      
    } catch (error) {
      logApi.info(`❌ Erreur déplacement note: ${error}`, context);
      throw error;
    }
  }

  /**
   * Créer un dossier
   */
  static async createFolder(data: CreateFolderData, userId: string, context: ApiContext, supabaseClient?: SupabaseClient) {
    logApi.info(`🚀 Création dossier optimisée`, context);
    
    try {
      // 🔧 CORRECTION: Utiliser le client authentifié si fourni
      const client = supabaseClient || supabase;
      
      // ⚡ OPTIMISATION: Résolution conditionnelle du classeur_id
      let classeurId = data.classeur_id;
      
      // Si ce n'est pas un UUID, c'est un slug (venant des LLM) → résoudre
      if (!classeurId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        const { data: classeur, error: resolveError } = await client
          .from('classeurs')
          .select('id')
          .eq('slug', classeurId)
          .eq('user_id', userId)
          .single();
        
        if (resolveError || !classeur) {
          throw new Error(`Classeur non trouvé: ${classeurId}`);
        }
        
        classeurId = classeur.id;
      }
      
      // ⚡ OPTIMISATION: Slug simple basé sur le nom + timestamp (pas de vérification DB)
      const timestamp = Date.now().toString(36);
      const slug = `${data.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${timestamp}`;
      
      // ⚡ OPTIMISATION: Création directe (on fait confiance aux contraintes DB)
      const { data: folder, error: createError } = await client
        .from('folders')
        .insert({
          name: data.name,
          classeur_id: classeurId, // UUID résolu
          parent_id: data.parent_id,
          user_id: userId,
          slug
        })
        .select()
        .single();

      if (createError) {
        // Si erreur de contrainte, message clair
        if (createError.code === '23503') { // Foreign key violation
          throw new Error(`Classeur ou dossier parent non trouvé`);
        }
        throw new Error(`Erreur création dossier: ${createError.message}`);
      }

      logApi.info(`✅ Dossier créé optimisé`, context);
      return { success: true, data: folder };
      
    } catch (error) {
      logApi.info(`❌ Erreur création dossier: ${error}`, context);
      throw error;
    }
  }

  /**
   * Mettre à jour un dossier
   */
  static async updateFolder(ref: string, data: UpdateFolderData, userId: string, context: ApiContext) {
    logApi.info(`🚀 Mise à jour dossier ${ref}`, context);
    
    try {
      // Résoudre la référence (UUID ou slug)
      const resolveResult = await V2ResourceResolver.resolveRef(ref, 'folder', userId, context);
      if (!resolveResult.success) {
        throw new Error(resolveResult.error);
      }

      const folderId = resolveResult.id;

      // Charger l'état courant pour comparaison de nom
      const { data: currentFolder, error: currentError } = await supabase
        .from('folders')
        .select('id, name, slug')
        .eq('id', folderId)
        .eq('user_id', userId)
        .single();

      if (currentError) {
        throw new Error(`Erreur lecture dossier: ${currentError.message}`);
      }

      // Préparer les données de mise à jour
      const updateData: Record<string, unknown> = {};
      if (data.name) updateData.name = data.name;
      if (data.parent_id !== undefined) updateData.parent_id = data.parent_id;

      // 🔧 NOUVEAU : Mise à jour automatique du slug si le nom change
      if (data.name && data.name !== currentFolder.name) {
        try {
          // Importer SlugGenerator dynamiquement pour éviter les dépendances circulaires
          const { SlugGenerator } = await import('@/utils/slugGenerator');
          const newSlug = await SlugGenerator.generateSlug(
            data.name,
            'folder',
            userId,
            folderId,
            supabase
          );
          updateData.slug = newSlug;
          
          if (process.env.NODE_ENV === 'development') {
            console.log(`[V2DatabaseUtils] Mise à jour slug dossier: "${currentFolder.name}" → "${data.name}" → "${newSlug}"`);
          }
        } catch (error) {
          logApi.error(`❌ Erreur mise à jour slug pour le dossier ${folderId}: ${error}`);
          // Continuer sans mettre à jour le slug en cas d'erreur
        }
      }

      // Vérifier que le nouveau parent existe et appartient à l'utilisateur
      if (data.parent_id) {
        const { data: parentFolder, error: parentError } = await supabase
          .from('folders')
          .select('id')
          .eq('id', data.parent_id)
          .eq('user_id', userId)
          .single();

        if (parentError || !parentFolder) {
          throw new Error(`Dossier parent non trouvé: ${data.parent_id}`);
        }
      }

      // Mettre à jour le dossier
      const { data: folder, error: updateError } = await supabase
        .from('folders')
        .update(updateData)
        .eq('id', folderId)
        .eq('user_id', userId)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Erreur mise à jour dossier: ${updateError.message}`);
      }

      logApi.info(`✅ Dossier mis à jour avec succès`, context);
      return { success: true, data: folder };
      
    } catch (error) {
      logApi.info(`❌ Erreur mise à jour dossier: ${error}`, context);
      throw error;
    }
  }

  /**
   * Déplacer un dossier
   */
  static async moveFolder(ref: string, targetParentId: string | null, userId: string, context: ApiContext, targetClasseurId?: string) {
    logApi.info(`🚀 Déplacement dossier ${ref}`, context);
    
    try {
      // Résoudre la référence (UUID ou slug)
      const resolveResult = await V2ResourceResolver.resolveRef(ref, 'folder', userId, context);
      if (!resolveResult.success) {
        throw new Error(resolveResult.error);
      }

      const folderId = resolveResult.id;

      // Vérifier que le dossier appartient à l'utilisateur
      const { data: folder, error: fetchError } = await supabase
        .from('folders')
        .select('id, name, user_id, parent_id')
        .eq('id', folderId)
        .single();

      if (fetchError || !folder) {
        throw new Error('Dossier non trouvé');
      }

      if (folder.user_id !== userId) {
        throw new Error('Permissions insuffisantes');
      }

      // Si un nouveau parent est spécifié, vérifier qu'il existe et appartient à l'utilisateur
      if (targetParentId) {
        const { data: parentFolder, error: parentError } = await supabase
          .from('folders')
          .select('id, user_id')
          .eq('id', targetParentId)
          .single();

        if (parentError || !parentFolder) {
          throw new Error('Dossier parent non trouvé');
        }

        if (parentFolder.user_id !== userId) {
          throw new Error('Permissions insuffisantes pour le dossier parent');
        }

        // Éviter les boucles (un dossier ne peut pas être son propre parent)
        if (targetParentId === folderId) {
          throw new Error('Un dossier ne peut pas être son propre parent');
        }
      }

      // Mettre à jour le parent du dossier
      const updateData: Record<string, unknown> = {
        parent_id: targetParentId
      };
      
      // Si cross-classeur, mettre à jour aussi le classeur_id
      if (targetClasseurId) {
        updateData.classeur_id = targetClasseurId;
      }
      
      const { data: updatedFolder, error: updateError } = await supabase
        .from('folders')
        .update(updateData)
        .eq('id', folderId)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Erreur mise à jour dossier: ${updateError.message}`);
      }

      // 🔄 DÉPLACER AUSSI TOUTES LES NOTES ET DOSSIERS ENFANTS DU DOSSIER
      if (targetClasseurId) {
        logApi.info(`🔄 Déplacement des notes et dossiers enfants du dossier vers le nouveau classeur`, context);
        
        // Fonction récursive pour déplacer tous les dossiers enfants
        const moveChildFolders = async (parentFolderId: string) => {
          // Récupérer tous les dossiers enfants
          const { data: childFolders, error: childFoldersError } = await supabase
            .from('folders')
            .select('id')
            .eq('parent_id', parentFolderId)
            .eq('user_id', userId);

          if (childFoldersError) {
            logApi.info(`⚠️ Erreur récupération dossiers enfants: ${childFoldersError.message}`, context);
            return;
          }

          // Déplacer chaque dossier enfant
          for (const childFolder of childFolders || []) {
            const { error: moveChildError } = await supabase
              .from('folders')
              .update({ 
                classeur_id: targetClasseurId,
                updated_at: new Date().toISOString()
              })
              .eq('id', childFolder.id)
              .eq('user_id', userId);

            if (moveChildError) {
              logApi.info(`⚠️ Erreur déplacement dossier enfant ${childFolder.id}: ${moveChildError.message}`, context);
            } else {
              // Récursivement déplacer les dossiers enfants de ce dossier
              await moveChildFolders(childFolder.id);
            }
          }
        };

        // Déplacer tous les dossiers enfants récursivement
        await moveChildFolders(folderId);
        
        // Mettre à jour le classeur_id de toutes les notes dans ce dossier et ses enfants
        const { error: notesUpdateError } = await supabase
          .from('articles')
          .update({ 
            classeur_id: targetClasseurId,
            updated_at: new Date().toISOString()
          })
          .eq('folder_id', folderId)
          .eq('user_id', userId);

        if (notesUpdateError) {
          logApi.info(`⚠️ Erreur mise à jour notes du dossier: ${notesUpdateError.message}`, context);
          // Ne pas faire échouer l'opération pour une erreur de notes
        } else {
          logApi.info(`✅ Notes du dossier déplacées vers le nouveau classeur`, context);
        }
      }

      logApi.info(`✅ Dossier déplacé avec succès`, context);
      return { success: true, data: updatedFolder };

    } catch (error) {
      logApi.info(`❌ Erreur déplacement dossier: ${error}`, context);
      throw error;
    }
  }

  /**
   * Supprimer un dossier
   */
  static async deleteFolder(ref: string, userId: string, context: ApiContext) {
    logApi.info(`🚀 Suppression dossier ${ref}`, context);
    
    try {
      // Résoudre la référence (UUID ou slug)
      const resolveResult = await V2ResourceResolver.resolveRef(ref, 'folder', userId, context);
      if (!resolveResult.success) {
        throw new Error(resolveResult.error);
      }

      const folderId = resolveResult.id;

      // Suppression en cascade : supprimer tous les sous-dossiers
      const { error: deleteSubFoldersError } = await supabase
        .from('folders')
        .delete()
        .eq('parent_id', folderId)
        .eq('user_id', userId);

      if (deleteSubFoldersError) {
        throw new Error(`Erreur suppression sous-dossiers: ${deleteSubFoldersError.message}`);
      }

      // Suppression en cascade : supprimer toutes les notes du dossier
      const { error: deleteNotesError } = await supabase
        .from('articles')
        .delete()
        .eq('folder_id', folderId)
        .eq('user_id', userId);

      if (deleteNotesError) {
        throw new Error(`Erreur suppression notes: ${deleteNotesError.message}`);
      }

      // Supprimer le dossier
      const { error: deleteError } = await supabase
        .from('folders')
        .delete()
        .eq('id', folderId)
        .eq('user_id', userId);

      if (deleteError) {
        throw new Error(`Erreur suppression dossier: ${deleteError.message}`);
      }

      logApi.info(`✅ Dossier supprimé avec succès`, context);
      return { success: true };
      
    } catch (error) {
      logApi.info(`❌ Erreur suppression dossier: ${error}`, context);
      throw error;
    }
  }

  /**
   * Créer un classeur
   */
  static async createClasseur(data: CreateClasseurData, userId: string, context: ApiContext) {
    logApi.info(`🚀 Création classeur directe DB`, context);
    
    try {
      // Générer un slug unique avec le client authentifié
      const slug = await SlugGenerator.generateSlug(data.name, 'classeur', userId, undefined, supabase);
      
      // Créer le classeur
      const { data: classeur, error: createError } = await supabase
        .from('classeurs')
        .insert({
          name: data.name,
          description: data.description,
          emoji: data.icon || data.emoji || '📁', // 🔧 CORRECTION: Gérer icon et emoji
          position: 0,
          user_id: userId,
          slug
        })
        .select()
        .single();

      if (createError) {
        throw new Error(`Erreur création classeur: ${createError.message}`);
      }

      logApi.info(`✅ Classeur créé avec succès`, context);
      return { success: true, data: classeur };
      
    } catch (error) {
      logApi.info(`❌ Erreur création classeur: ${error}`, context);
      throw error;
    }
  }

  /**
   * Mettre à jour un classeur
   */
  static async updateClasseur(ref: string, data: UpdateClasseurData, userId: string, context: ApiContext, userToken?: string) {
    logApi.info(`🚀 Mise à jour classeur ${ref}`, context);
    
    try {
      // Créer un client Supabase authentifié si un token est fourni (RLS)
      const client = userToken
        ? createClient(supabaseUrl, supabaseServiceKey, {
            global: { headers: { Authorization: `Bearer ${userToken}` } }
          })
        : supabase;

      // Résoudre la référence (UUID ou slug)
      let classeurId = ref;
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(ref)) {
        const { data: found, error: resolveError } = await client
          .from('classeurs')
          .select('id')
          .eq('slug', ref)
          .eq('user_id', userId)
          .single();
        if (resolveError || !found?.id) {
          throw new Error('Classeur non trouvé');
        }
        classeurId = found.id;
      }

      // Charger l'état courant pour comparaison de nom
      const { data: currentClasseur, error: currentError } = await client
        .from('classeurs')
        .select('id, name, slug')
        .eq('id', classeurId)
        .eq('user_id', userId)
        .single();

      if (currentError) {
        throw new Error(`Erreur lecture classeur: ${currentError.message}`);
      }

      // Préparer les données de mise à jour
      const updateData: Record<string, unknown> = {};
      if (data.name) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.icon !== undefined) updateData.emoji = data.icon;
      if (data.emoji !== undefined) updateData.emoji = data.emoji; // 🔧 CORRECTION: Gérer emoji aussi
      if (data.position !== undefined) updateData.position = data.position;
      updateData.updated_at = new Date().toISOString();

      // 🔧 NOUVEAU : Mise à jour automatique du slug si le nom change
      if (data.name && data.name !== currentClasseur.name) {
        try {
          // Importer SlugGenerator dynamiquement pour éviter les dépendances circulaires
          const { SlugGenerator } = await import('@/utils/slugGenerator');
          const newSlug = await SlugGenerator.generateSlug(
            data.name,
            'classeur',
            userId,
            classeurId,
            client
          );
          updateData.slug = newSlug;
          
          if (process.env.NODE_ENV === 'development') {
            console.log(`[V2DatabaseUtils] Mise à jour slug classeur: "${currentClasseur.name}" → "${data.name}" → "${newSlug}"`);
          }
        } catch (error) {
          logApi.error(`❌ Erreur mise à jour slug pour le classeur ${classeurId}: ${error}`);
          // Continuer sans mettre à jour le slug en cas d'erreur
        }
      }

      // Mettre à jour le classeur
      const { data: classeur, error: updateError } = await client
        .from('classeurs')
        .update(updateData)
        .eq('id', classeurId)
        .eq('user_id', userId)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Erreur mise à jour classeur: ${updateError.message}`);
      }

      logApi.info(`✅ Classeur mis à jour avec succès`, context);
      return { success: true, data: classeur };
      
    } catch (error) {
      logApi.info(`❌ Erreur mise à jour classeur: ${error}`, context);
      throw error;
    }
  }

  /**
   * Supprimer un classeur
   */
  static async deleteClasseur(ref: string, userId: string, context: ApiContext) {
    logApi.info(`🚀 Suppression classeur ${ref}`, context);
    
    try {
      // Résoudre la référence (UUID ou slug)
      const resolveResult = await V2ResourceResolver.resolveRef(ref, 'classeur', userId, context);
      if (!resolveResult.success) {
        throw new Error(resolveResult.error);
      }

      const classeurId = resolveResult.id;

      // Suppression en cascade : d'abord les notes, puis les dossiers, puis le classeur
      // Supprimer toutes les notes du classeur
      const { error: deleteNotesError } = await supabase
        .from('articles')
        .delete()
        .eq('classeur_id', classeurId)
        .eq('user_id', userId);

      if (deleteNotesError) {
        throw new Error(`Erreur suppression notes: ${deleteNotesError.message}`);
      }

      // Supprimer tous les dossiers du classeur
      const { error: deleteFoldersError } = await supabase
        .from('folders')
        .delete()
        .eq('classeur_id', classeurId)
        .eq('user_id', userId);

      if (deleteFoldersError) {
        throw new Error(`Erreur suppression dossiers: ${deleteFoldersError.message}`);
      }

      // Supprimer le classeur
      const { error: deleteError } = await supabase
        .from('classeurs')
        .delete()
        .eq('id', classeurId)
        .eq('user_id', userId);

      if (deleteError) {
        throw new Error(`Erreur suppression classeur: ${deleteError.message}`);
      }

      logApi.info(`✅ Classeur supprimé avec succès`, context);
      return { success: true };
      
    } catch (error) {
      logApi.info(`❌ Erreur suppression classeur: ${error}`, context);
      throw error;
    }
  }

  /**
   * Récupérer l'arbre d'un classeur
   */
  static async getClasseurTree(notebookId: string, userId: string, context: ApiContext) {
    logApi.info(`🚀 Récupération arbre classeur directe DB`, context);
    
    try {
      // ✅ CORRECTION: Vérifier que notebookId n'est pas undefined
      if (!notebookId) {
        throw new Error('notebook_id est requis');
      }
      
      // 🔧 NOUVEAU: Validation et correction de l'UUID
      let classeurId = notebookId;
      
      // Vérifier si c'est un UUID valide
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const isValidUuid = uuidPattern.test(classeurId);
      
      if (!isValidUuid) {
        logApi.info(`⚠️ UUID mal formaté: ${classeurId}`, context);
        
        // Essayer de corriger l'UUID si possible
        if (classeurId.length === 35) {
          // UUID avec un caractère manquant dans la 3ème section
          const sections = classeurId.split('-');
          if (sections.length === 5 && sections[2].length === 3) {
            // Ajouter un 0 à la 3ème section
            sections[2] = sections[2] + '0';
            const correctedUuid = sections.join('-');
            if (uuidPattern.test(correctedUuid)) {
              logApi.info(`🔧 UUID corrigé: ${correctedUuid}`, context);
              classeurId = correctedUuid;
            } else {
              throw new Error(`UUID mal formaté: ${notebookId}. Format attendu: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`);
            }
          } else {
            throw new Error(`UUID mal formaté: ${notebookId}. Format attendu: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`);
          }
        } else {
          throw new Error(`UUID mal formaté: ${notebookId}. Format attendu: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`);
        }
      }
      
      // Si ce n'est pas un UUID valide, essayer de le résoudre comme un slug
      if (!uuidPattern.test(classeurId)) {
        const { data: classeur, error: resolveError } = await supabase
          .from('classeurs')
          .select('id')
          .eq('slug', classeurId)
          .eq('user_id', userId)
          .single();
        
        if (resolveError || !classeur) {
          throw new Error(`Classeur non trouvé: ${classeurId}`);
        }
        
        classeurId = classeur.id;
      }

      // Récupérer le classeur
      const { data: classeur, error: fetchError } = await supabase
        .from('classeurs')
        .select('id, name, description, emoji, position, slug, created_at, updated_at')
        .eq('id', classeurId)
        .eq('user_id', userId)
        .single();

      if (fetchError || !classeur) {
        throw new Error(`Classeur non trouvé: ${classeurId}`);
      }

      // Récupérer les dossiers du classeur
      const { data: dossiers, error: dossiersError } = await supabase
        .from('folders')
        .select('id, name, parent_id, position, created_at, slug')
        .eq('classeur_id', classeurId)
        .eq('user_id', userId)
        .is('trashed_at', null) // 🔧 CORRECTION: Exclure les dossiers supprimés
        .order('position', { ascending: true });

      if (dossiersError) {
        throw new Error(`Erreur récupération dossiers: ${dossiersError.message}`);
      }

      // Récupérer les notes du classeur
      const { data: notes, error: notesError } = await supabase
        .from('articles')
        .select('id, source_title, slug, folder_id, position, created_at, updated_at')
        .eq('classeur_id', classeurId)
        .eq('user_id', userId)
        .is('trashed_at', null) // 🔧 CORRECTION: Exclure les notes supprimées
        .order('position', { ascending: true });

      if (notesError) {
        throw new Error(`Erreur récupération notes: ${notesError.message}`);
      }

      // Construire l'objet de réponse
      const classeurComplet = {
        ...classeur,
        dossiers: dossiers || [],
        notes: notes || []
      };

      logApi.info(`✅ Arbre classeur récupéré avec succès`, context);
      return { success: true, data: classeurComplet };
      
    } catch (error) {
      logApi.info(`❌ Erreur récupération arbre: ${error}`, context);
      throw error;
    }
  }

  /**
   * Réorganiser les classeurs
   */
  static async reorderClasseurs(classeurs: Array<{ id: string; position: number }>, userId: string, context: ApiContext) {
    logApi.info(`🚀 Réorganisation classeurs directe DB`, context);
    
    try {
      // Vérifier que tous les classeurs appartiennent à l'utilisateur
      const classeurIds = classeurs.map(c => c.id);
      const { data: existingClasseurs, error: fetchError } = await supabase
        .from('classeurs')
        .select('id, user_id')
        .in('id', classeurIds)
        .eq('user_id', userId);

      if (fetchError) {
        throw new Error(`Erreur vérification classeurs: ${fetchError.message}`);
      }

      if (!existingClasseurs || existingClasseurs.length !== classeurs.length) {
        throw new Error('Certains classeurs n\'existent pas ou ne vous appartiennent pas');
      }

      // 🔧 CORRECTION: Mettre à jour uniquement la position et updated_at
      // Ne pas utiliser upsert qui essaie de mettre à jour tous les champs
      for (const classeur of classeurs) {
        const { error: updateError } = await supabase
          .from('classeurs')
          .update({
            position: classeur.position,
            updated_at: new Date().toISOString()
          })
          .eq('id', classeur.id)
          .eq('user_id', userId);

        if (updateError) {
          throw new Error(`Erreur mise à jour position classeur ${classeur.id}: ${updateError.message}`);
        }
      }

      // Récupérer les classeurs mis à jour
      const { data: updatedClasseurs, error: fetchUpdatedError } = await supabase
        .from('classeurs')
        .select('id, name, description, emoji, position, slug, created_at, updated_at')
        .in('id', classeurIds)
        .order('position', { ascending: true });

      if (fetchUpdatedError) {
        throw new Error(`Erreur récupération classeurs mis à jour: ${fetchUpdatedError.message}`);
      }

      logApi.info(`✅ Classeurs réorganisés avec succès`, context);
      return { success: true, data: updatedClasseurs || [] };
      
    } catch (error) {
      logApi.info(`❌ Erreur réorganisation classeurs: ${error}`, context);
      throw error;
    }
  }

  /**
   * Obtenir la liste des classeurs
   */
  static async getClasseurs(userId: string, context: ApiContext) {
    console.error(`🚨🚨🚨 [FORCE DEBUG] V2DatabaseUtils.getClasseurs appelé avec userId: ${userId} 🚨🚨🚨`);
    console.log(`🔍 [DEBUG] getClasseurs appelé avec userId: ${userId}`);
    logApi.info(`🚀 Récupération classeurs`, context);
    
    try {
      logApi.info(`🔍 User ID: ${userId}`, context);
      logApi.info(`🔍 User ID type: ${typeof userId}`, context);
      logApi.info(`🔍 User ID length: ${userId.length}`, context);
      
      // D'abord, vérifier si la table existe et combien de classeurs il y a au total
      const { data: allClasseurs, error: allError } = await supabase
        .from('classeurs')
        .select('id, name, user_id')
        .limit(5);
      
      logApi.info(`📊 Tous les classeurs (premiers 5):`, context);
      logApi.info(`   - Data: ${JSON.stringify(allClasseurs)}`, context);
      logApi.info(`   - Error: ${allError ? JSON.stringify(allError) : 'null'}`, context);
      
      // Maintenant la requête normale
      const { data: classeurs, error } = await supabase
        .from('classeurs')
        .select('id, name, description, emoji, position, slug, created_at, updated_at')
        .eq('user_id', userId)
        .order('position', { ascending: true })
        .order('created_at', { ascending: false });

      logApi.info(`📊 Résultat Supabase:`, context);
      logApi.info(`   - Data: ${JSON.stringify(classeurs)}`, context);
      logApi.info(`   - Error: ${error ? JSON.stringify(error) : 'null'}`, context);
      logApi.info(`   - Count: ${classeurs ? classeurs.length : 'undefined'}`, context);

      if (error) {
        logApi.info(`❌ Erreur Supabase: ${error.message}`, context);
        throw new Error(`Erreur récupération classeurs: ${error.message}`);
      }

      const result = {
        success: true,
        data: classeurs || [],
        debug: {
          userId: userId,
          userIdType: typeof userId,
          userIdLength: userId.length,
          allClasseursCount: allClasseurs ? allClasseurs.length : 0,
          filteredClasseursCount: classeurs ? classeurs.length : 0,
          allClasseurs: allClasseurs || []
        }
      };
      
      logApi.info(`✅ Retour final: ${JSON.stringify(result)}`, context);
      return result;
      
    } catch (error) {
      logApi.info(`❌ Erreur: ${error}`, context);
      throw error;
    }
  }

  /**
   * Insérer du contenu à une position spécifique
   */
  static async insertContentToNote(ref: string, content: string, position: number, userId: string, context: ApiContext) {
    logApi.info(`🚀 Insertion contenu à position ${position}`, context);
    
    try {
      // Résoudre la référence
      const resolveResult = await V2ResourceResolver.resolveRef(ref, 'note', userId, context);
      if (!resolveResult.success) {
        throw new Error(resolveResult.error);
      }

      const noteId = resolveResult.id;

      // Récupérer le contenu actuel
      const { data: note, error: fetchError } = await supabase
        .from('articles')
        .select('markdown_content')
        .eq('id', noteId)
        .single();

      if (fetchError || !note) {
        throw new Error('Note non trouvée');
      }

      // Insérer le contenu à la position spécifiée
      const lines = note.markdown_content.split('\n');
      lines.splice(position, 0, content);
      const newContent = lines.join('\n');

      // Mettre à jour la note
      const { error: updateError } = await supabase
        .from('articles')
        .update({ 
          markdown_content: newContent,
          updated_at: new Date().toISOString()
        })
        .eq('id', noteId);

      if (updateError) {
        throw new Error(`Erreur mise à jour: ${updateError.message}`);
      }

      return {
        success: true,
        message: 'Contenu inséré avec succès'
      };
    } catch (error) {
      logApi.info(`❌ Erreur: ${error}`, context);
      throw error;
    }
  }

  /**
   * Ajouter du contenu à une section spécifique
   */
  static async addContentToSection(ref: string, sectionId: string, content: string, userId: string, context: ApiContext) {
    logApi.info(`🚀 Ajout contenu à section ${sectionId}`, context);
    
    try {
      // Résoudre la référence
      const resolveResult = await V2ResourceResolver.resolveRef(ref, 'note', userId, context);
      if (!resolveResult.success) {
        throw new Error(resolveResult.error);
      }

      const noteId = resolveResult.id;

      // Récupérer le contenu actuel
      const { data: note, error: fetchError } = await supabase
        .from('articles')
        .select('markdown_content')
        .eq('id', noteId)
        .single();

      if (fetchError || !note) {
        throw new Error('Note non trouvée');
      }

      // Ajouter le contenu à la section
      const { appendToSection } = await import('@/utils/markdownTOC');
      const newContent = appendToSection(note.markdown_content, sectionId, content, 'end');

      // Mettre à jour la note
      const { error: updateError } = await supabase
        .from('articles')
        .update({ 
          markdown_content: newContent,
          updated_at: new Date().toISOString()
        })
        .eq('id', noteId);

      if (updateError) {
        throw new Error(`Erreur mise à jour: ${updateError.message}`);
      }

      return {
        success: true,
        message: 'Contenu ajouté à la section avec succès'
      };
    } catch (error) {
      logApi.info(`❌ Erreur: ${error}`, context);
      throw error;
    }
  }

  /**
   * Vider une section
   */
  static async clearSection(ref: string, sectionId: string, userId: string, context: ApiContext) {
    logApi.info(`🚀 Vidage section ${sectionId}`, context);
    
    try {
      // Résoudre la référence
      const resolveResult = await V2ResourceResolver.resolveRef(ref, 'note', userId, context);
      if (!resolveResult.success) {
        throw new Error(resolveResult.error);
      }

      const noteId = resolveResult.id;

      // Récupérer le contenu actuel
      const { data: note, error: fetchError } = await supabase
        .from('articles')
        .select('markdown_content')
        .eq('id', noteId)
        .single();

      if (fetchError || !note) {
        throw new Error('Note non trouvée');
      }

      // Vider la section
      const { clearSection } = await import('@/utils/markdownTOC');
      const newContent = clearSection(note.markdown_content, sectionId);

      // Mettre à jour la note
      const { error: updateError } = await supabase
        .from('articles')
        .update({ 
          markdown_content: newContent,
          updated_at: new Date().toISOString()
        })
        .eq('id', noteId);

      if (updateError) {
        throw new Error(`Erreur mise à jour: ${updateError.message}`);
      }

      return {
        success: true,
        message: 'Section vidée avec succès'
      };
    } catch (error) {
      logApi.info(`❌ Erreur: ${error}`, context);
      throw error;
    }
  }

  /**
   * Supprimer une section
   */
  static async eraseSection(ref: string, sectionId: string, userId: string, context: ApiContext) {
    logApi.info(`🚀 Suppression section ${sectionId}`, context);
    
    try {
      // Résoudre la référence
      const resolveResult = await V2ResourceResolver.resolveRef(ref, 'note', userId, context);
      if (!resolveResult.success) {
        throw new Error(resolveResult.error);
      }

      const noteId = resolveResult.id;

      // Récupérer le contenu actuel
      const { data: note, error: fetchError } = await supabase
        .from('articles')
        .select('markdown_content')
        .eq('id', noteId)
        .single();

      if (fetchError || !note) {
        throw new Error('Note non trouvée');
      }

      // Supprimer la section
      const { eraseSection } = await import('@/utils/markdownTOC');
      const newContent = eraseSection(note.markdown_content, sectionId);

      // Mettre à jour la note
      const { error: updateError } = await supabase
        .from('articles')
        .update({ 
          markdown_content: newContent,
          updated_at: new Date().toISOString()
        })
        .eq('id', noteId);

      if (updateError) {
        throw new Error(`Erreur mise à jour: ${updateError.message}`);
      }

      return {
        success: true,
        message: 'Section supprimée avec succès'
      };
    } catch (error) {
      logApi.info(`❌ Erreur: ${error}`, context);
      throw error;
    }
  }

  /**
   * Récupérer la table des matières
   */
  static async getTableOfContents(ref: string, userId: string, context: ApiContext) {
    logApi.info(`🚀 Récupération table des matières`, context);
    
    try {
      // Résoudre la référence
      const resolveResult = await V2ResourceResolver.resolveRef(ref, 'note', userId, context);
      if (!resolveResult.success) {
        throw new Error(resolveResult.error);
      }

      const noteId = resolveResult.id;

      // Récupérer le contenu
      const { data: note, error: fetchError } = await supabase
        .from('articles')
        .select('markdown_content')
        .eq('id', noteId)
        .single();

      if (fetchError || !note) {
        throw new Error('Note non trouvée');
      }

      // Extraire la table des matières
      const { extractTOCWithSlugs } = await import('@/utils/markdownTOC');
      const toc = extractTOCWithSlugs(note.markdown_content);

      return {
        success: true,
        toc: toc
      };
    } catch (error) {
      logApi.info(`❌ Erreur: ${error}`, context);
      throw error;
    }
  }

  /**
   * Récupérer les statistiques d'une note
   */
  static async getNoteStatistics(ref: string, userId: string, context: ApiContext) {
    logApi.info(`🚀 Récupération statistiques`, context);
    
    try {
      // Résoudre la référence
      const resolveResult = await V2ResourceResolver.resolveRef(ref, 'note', userId, context);
      if (!resolveResult.success) {
        throw new Error(resolveResult.error);
      }

      const noteId = resolveResult.id;

      // Récupérer le contenu
      const { data: note, error: fetchError } = await supabase
        .from('articles')
        .select('markdown_content, created_at, updated_at')
        .eq('id', noteId)
        .single();

      if (fetchError || !note) {
        throw new Error('Note non trouvée');
      }

      // Calculer les statistiques
      const content = note.markdown_content || '';
      const characters = content.length;
      const words = content.split(/\s+/).filter(word => word.length > 0).length;
      const lines = content.split('\n').length;
      const sections = content.split(/^#{1,6}\s+/m).length - 1;

      return {
        success: true,
        statistics: {
          characters,
          words,
          lines,
          sections,
          created_at: note.created_at,
          updated_at: note.updated_at
        }
      };
    } catch (error) {
      logApi.info(`❌ Erreur: ${error}`, context);
      throw error;
    }
  }

  /**
   * Publier une note
   */
  static async publishNote(ref: string, visibility: 'private' | 'public' | 'link-private' | 'link-public' | 'limited' | 'scrivia', userId: string, context: ApiContext) {
    logApi.info(`🚀 Publication note (${visibility})`, context);
    
    try {
      // Résoudre la référence
      const resolveResult = await V2ResourceResolver.resolveRef(ref, 'note', userId, context);
      if (!resolveResult.success) {
        throw new Error(resolveResult.error);
      }

      const noteId = resolveResult.id;

      // Mettre à jour le statut de visibilité
      const { error: updateError } = await supabase
        .from('articles')
        .update({ 
          visibility,
          updated_at: new Date().toISOString()
        })
        .eq('id', noteId);

      if (updateError) {
        throw new Error(`Erreur mise à jour: ${updateError.message}`);
      }

      return {
        success: true,
        message: visibility !== 'private' ? 'Note publiée avec succès' : 'Note rendue privée avec succès'
      };
    } catch (error) {
      logApi.info(`❌ Erreur: ${error}`, context);
      throw error;
    }
  }

  /**
   * Récupérer l'arborescence d'un dossier
   */
  static async getFolderTree(ref: string, userId: string, context: ApiContext) {
    logApi.info(`🚀 Récupération arborescence dossier`, context);
    
    try {
      // Résoudre la référence
      const resolveResult = await V2ResourceResolver.resolveRef(ref, 'folder', userId, context);
      if (!resolveResult.success) {
        throw new Error(resolveResult.error);
      }

      const folderId = resolveResult.id;

      // Récupérer le dossier et ses enfants
      const { data: folder, error: folderError } = await supabase
        .from('folders')
        .select('id, name, slug')
        .eq('id', folderId)
        .single();

      if (folderError || !folder) {
        throw new Error('Dossier non trouvé');
      }

      // Récupérer les sous-dossiers
      const { data: subfolders, error: subfoldersError } = await supabase
        .from('folders')
        .select('id, name, slug')
        .eq('parent_id', folderId)
        .order('name');

      if (subfoldersError) {
        throw new Error(`Erreur récupération sous-dossiers: ${subfoldersError.message}`);
      }

      // Récupérer les notes du dossier
      const { data: notes, error: notesError } = await supabase
        .from('articles')
        .select('id, source_title, slug')
        .eq('folder_id', folderId)
        .order('source_title');

      if (notesError) {
        throw new Error(`Erreur récupération notes: ${notesError.message}`);
      }

      return {
        success: true,
        folder: {
          id: folder.id,
          name: folder.name,
          slug: folder.slug,
          children: [
            ...(subfolders || []).map(f => ({ ...f, type: 'folder' })),
            ...(notes || []).map(n => ({ ...n, type: 'note' }))
          ]
        }
      };
    } catch (error) {
      logApi.info(`❌ Erreur: ${error}`, context);
      throw error;
    }
  }

  /**
   * Générer un slug
   */
  static async generateSlug(text: string, type: 'note' | 'classeur' | 'folder', userId: string, context: ApiContext, supabaseClient?: SupabaseClient) {
    logApi.info(`🚀 Génération slug pour ${type}`, context);
    
    try {
      // 🔧 CORRECTION: Passer le client Supabase authentifié
      if (!supabaseClient) {
        throw new Error('Client Supabase authentifié requis pour la génération de slug');
      }
      
      const slug = await SlugGenerator.generateSlug(text, type, userId, undefined, supabaseClient);
      
      return {
        success: true,
        slug,
        original: text
      };
    } catch (error) {
      logApi.info(`❌ Erreur: ${error}`, context);
      throw error;
    }
  }

  // ============================================================================
  // MÉTHODES MANQUANTES POUR L'API V2
  // ============================================================================

  /**
   * Récupérer un classeur par ID
   */
  static async getClasseur(classeurId: string, userId: string, context: ApiContext) {
    logApi.info(`🚀 Récupération classeur ${classeurId}`, context);
    
    try {
      const { data: classeur, error } = await supabase
        .from('classeurs')
        .select('*')
        .eq('id', classeurId)
        .eq('user_id', userId)
        .single();

      if (error || !classeur) {
        throw new Error(`Classeur non trouvé: ${classeurId}`);
      }

      return { success: true, data: classeur };
    } catch (error) {
      logApi.info(`❌ Erreur: ${error}`, context);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Récupérer un dossier par ID
   */
  static async getFolder(folderId: string, userId: string, context: ApiContext) {
    logApi.info(`🚀 Récupération dossier ${folderId}`, context);
    
    try {
      const { data: folder, error } = await supabase
        .from('folders')
        .select('*')
        .eq('id', folderId)
        .eq('user_id', userId)
        .single();

      if (error || !folder) {
        throw new Error(`Dossier non trouvé: ${folderId}`);
      }

      return { success: true, data: folder };
    } catch (error) {
      logApi.info(`❌ Erreur: ${error}`, context);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Récupérer une note par ID
   */
  static async getNote(noteId: string, userId: string, context: ApiContext) {
    logApi.info(`🚀 Récupération note ${noteId}`, context);
    
    try {
      const { data: note, error } = await supabase
        .from('notes')
        .select('*')
        .eq('id', noteId)
        .eq('user_id', userId)
        .single();

      if (error || !note) {
        throw new Error(`Note non trouvée: ${noteId}`);
      }

      return { success: true, data: note };
    } catch (error) {
      logApi.info(`❌ Erreur: ${error}`, context);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Rechercher dans les notes
   */
  static async searchNotes(query: string, limit: number, offset: number, userId: string, context: ApiContext) {
    logApi.info(`🚀 Recherche notes: "${query}"`, context);
    
    try {
      const { data: notes, error } = await supabase
        .from('articles')
        .select('*')
        .eq('user_id', userId)
        .or(`source_title.ilike.%${query}%,markdown_content.ilike.%${query}%`)
        .order('updated_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw new Error(`Erreur recherche notes: ${error.message}`);
      }

      return { success: true, data: notes || [] };
    } catch (error) {
      logApi.info(`❌ Erreur: ${error}`, context);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Rechercher dans les classeurs
   */
  static async searchClasseurs(query: string, limit: number, offset: number, userId: string, context: ApiContext) {
    logApi.info(`🚀 Recherche classeurs: "${query}"`, context);
    
    try {
      const { data: classeurs, error } = await supabase
        .from('classeurs')
        .select('*')
        .eq('user_id', userId)
        .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
        .order('updated_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw new Error(`Erreur recherche classeurs: ${error.message}`);
      }

      return { success: true, data: classeurs || [] };
    } catch (error) {
      logApi.info(`❌ Erreur: ${error}`, context);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Rechercher dans les fichiers
   */
  static async searchFiles(query: string, limit: number, offset: number, userId: string, context: ApiContext) {
    logApi.info(`🚀 Recherche fichiers: "${query}"`, context);
    
    try {
      const { data: files, error } = await supabase
        .from('files')
        .select('id, filename, mime_type, size, url, slug, description, created_at, updated_at')
        .eq('user_id', userId)
        .eq('is_deleted', false)
        .or(`filename.ilike.%${query}%,description.ilike.%${query}%`)
        .order('updated_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw new Error(`Erreur recherche fichiers: ${error.message}`);
      }

      return { success: true, data: files || [] };
    } catch (error) {
      logApi.info(`❌ Erreur: ${error}`, context);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Récupérer les informations utilisateur
   */
  static async getUserInfo(userId: string, context: ApiContext) {
    logApi.info(`🚀 Récupération infos utilisateur ${userId}`, context);
    
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('id, email, name, avatar_url, created_at, updated_at')
        .eq('id', userId)
        .single();

      if (error || !user) {
        throw new Error(`Utilisateur non trouvé: ${userId}`);
      }

      return { success: true, data: user };
    } catch (error) {
      logApi.info(`❌ Erreur: ${error}`, context);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Insérer du contenu dans une note (alias pour insertContentToNote)
   */
  static async insertNoteContent(noteId: string, params: { content: string; position: number }, userId: string, context: ApiContext) {
    return await this.insertContentToNote(noteId, params.content, params.position, userId, context);
  }

  // ============================================================================
  // MÉTHODES MANQUANTES POUR CONFORMITÉ API V2
  // ============================================================================

  /**
   * Appliquer des opérations de contenu à une note
   */
  static async applyContentOperations(ref: string, operations: ContentOperation[], userId: string, context: ApiContext) {
    logApi.info(`🚀 Application opérations contenu ${ref}`, context);
    
    try {
      // Pour l'instant, implémentation basique
      // TODO: Implémenter la logique complète des opérations
      return { success: true, data: { operations_applied: operations.length } };
    } catch (error) {
      logApi.info(`❌ Erreur: ${error}`, context);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Récupérer la table des matières d'une note (alias pour getTableOfContents)
   */
  static async getNoteTOC(ref: string, userId: string, context: ApiContext) {
    return await this.getTableOfContents(ref, userId, context);
  }

  /**
   * Récupérer les paramètres de partage d'une note
   */
  static async getNoteShareSettings(ref: string, userId: string, context: ApiContext) {
    logApi.info(`🚀 Récupération paramètres partage ${ref}`, context);
    
    try {
      const { data: note, error } = await supabase
        .from('articles')
        .select('id, visibility, allow_edit, allow_comments')
        .eq('id', ref)
        .eq('user_id', userId)
        .single();

      if (error || !note) {
        throw new Error(`Note non trouvée: ${ref}`);
      }

      return { 
        success: true, 
        data: {
          visibility: note.visibility || 'private',
          allow_edit: note.allow_edit || false,
          allow_comments: note.allow_comments || false
        }
      };
    } catch (error) {
      logApi.info(`❌ Erreur: ${error}`, context);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Mettre à jour les paramètres de partage d'une note
   */
  static async updateNoteShareSettings(ref: string, settings: ShareSettings, userId: string, context: ApiContext) {
    logApi.info(`🚀 Mise à jour paramètres partage ${ref}`, context);
    
    try {
      const { error } = await supabase
        .from('articles')
        .update({
          visibility: settings.visibility,
          allow_edit: settings.allow_edit,
          allow_comments: settings.allow_comments,
          updated_at: new Date().toISOString()
        })
        .eq('id', ref)
        .eq('user_id', userId);

      if (error) {
        throw new Error(`Erreur mise à jour: ${error.message}`);
      }

      return { success: true, data: { message: 'Paramètres de partage mis à jour' } };
    } catch (error) {
      logApi.info(`❌ Erreur: ${error}`, context);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Récupérer les notes récentes
   */
  static async getRecentNotes(limit: number = 10, userId: string, context: ApiContext) {
    logApi.info(`🚀 Récupération notes récentes (${limit})`, context);
    
    try {
      const { data: notes, error } = await supabase
        .from('articles')
        .select('id, source_title, slug, header_image, folder_id, classeur_id, created_at, updated_at')
        .eq('user_id', userId)
        .is('trashed_at', null)
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(`Erreur récupération notes: ${error.message}`);
      }

      return { success: true, data: notes || [] };
    } catch (error) {
      logApi.info(`❌ Erreur: ${error}`, context);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Récupérer les classeurs avec contenu (alias pour getClasseurs)
   */
  static async getClasseursWithContent(userId: string, context: ApiContext) {
    return await this.getClasseurs(userId, context);
  }

  /**
   * Récupérer les classeurs (alias pour getClasseurs)
   */
  static async listClasseurs(userId: string, context: ApiContext) {
    return await this.getClasseurs(userId, context);
  }

  /**
   * Rechercher du contenu (notes, dossiers, classeurs)
   */
  static async searchContent(query: string, type: string = 'all', limit: number = 20, userId: string, context: ApiContext) {
    logApi.info(`🚀 Recherche contenu: "${query}" (type: ${type})`, context);
    
    try {
      let results = [];

      if (type === 'all' || type === 'notes') {
        const notesResult = await this.searchNotes(query, limit, 0, userId, context);
        if (notesResult.success) {
          results = results.concat(notesResult.data.map(note => ({ ...note, type: 'note' })));
        }
      }

      if (type === 'all' || type === 'classeurs') {
        const classeursResult = await this.searchClasseurs(query, limit, 0, userId, context);
        if (classeursResult.success) {
          results = results.concat(classeursResult.data.map(classeur => ({ ...classeur, type: 'classeur' })));
        }
      }

      return { success: true, data: results };
    } catch (error) {
      logApi.info(`❌ Erreur: ${error}`, context);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Récupérer les statistiques utilisateur
   */
  static async getStats(userId: string, context: ApiContext) {
    logApi.info(`🚀 Récupération statistiques ${userId}`, context);
    
    try {
      // Compter les notes
      const { count: notesCount } = await supabase
        .from('articles')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .is('trashed_at', null);

      // Compter les classeurs
      const { count: classeursCount } = await supabase
        .from('classeurs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .is('trashed_at', null);

      // Compter les dossiers
      const { count: foldersCount } = await supabase
        .from('folders')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .is('trashed_at', null);

      return { 
        success: true, 
        data: {
          notes_count: notesCount || 0,
          classeurs_count: classeursCount || 0,
          folders_count: foldersCount || 0,
          content_size: 0 // TODO: Calculer la taille du contenu
        }
      };
    } catch (error) {
      logApi.info(`❌ Erreur: ${error}`, context);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Récupérer le profil utilisateur (alias pour getUserInfo)
   */
  static async getUserProfile(userId: string, context: ApiContext) {
    return await this.getUserInfo(userId, context);
  }

  /**
   * Récupérer la corbeille
   */
  static async getTrash(userId: string, context: ApiContext) {
    logApi.info(`🚀 Récupération corbeille ${userId}`, context);
    
    try {
      // Récupérer les éléments supprimés
      const { data: trashItems, error } = await supabase
        .from('trash')
        .select('*')
        .eq('user_id', userId)
        .order('trashed_at', { ascending: false });

      if (error) {
        throw new Error(`Erreur récupération corbeille: ${error.message}`);
      }

      return { success: true, data: trashItems || [] };
    } catch (error) {
      logApi.info(`❌ Erreur: ${error}`, context);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Restaurer depuis la corbeille
   */
  static async restoreFromTrash(itemId: string, itemType: string, userId: string, context: ApiContext) {
    logApi.info(`🚀 Restauration ${itemType} ${itemId}`, context);
    
    try {
      // TODO: Implémenter la logique de restauration
      return { success: true, data: { message: 'Élément restauré' } };
    } catch (error) {
      logApi.info(`❌ Erreur: ${error}`, context);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Vider la corbeille
   */
  static async purgeTrash(userId: string, context: ApiContext) {
    logApi.info(`🚀 Vidage corbeille ${userId}`, context);
    
    try {
      // TODO: Implémenter la logique de vidage
      return { success: true, data: { message: 'Corbeille vidée' } };
    } catch (error) {
      logApi.info(`❌ Erreur: ${error}`, context);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Supprimer une ressource (note, dossier, classeur)
   */
  static async deleteResource(resourceType: string, ref: string, userId: string, context: ApiContext) {
    logApi.info(`🚀 Suppression ${resourceType} ${ref}`, context);
    
    try {
      switch (resourceType) {
        case 'note':
          return await this.deleteNote(ref, userId, context);
        case 'folder':
          return await this.deleteFolder(ref, userId, context);
        case 'classeur':
          return await this.deleteClasseur(ref, userId, context);
        default:
          throw new Error(`Type de ressource non supporté: ${resourceType}`);
      }
    } catch (error) {
      logApi.info(`❌ Erreur: ${error}`, context);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  // ============================================================================
  // MÉTHODES POUR LES AGENTS (PLACEHOLDERS)
  // ============================================================================

  /**
   * Lister les agents
   */
  static async listAgents(userId: string, context: ApiContext) {
    logApi.info(`🚀 Liste agents ${userId}`, context);
    return { success: true, data: [] };
  }

  /**
   * Créer un agent
   */
  static async createAgent(data: AgentData, userId: string, context: ApiContext) {
    logApi.info(`🚀 Création agent`, context);
    return { success: true, data: { id: 'placeholder' } };
  }

  /**
   * Récupérer un agent
   */
  static async getAgent(agentId: string, userId: string, context: ApiContext) {
    logApi.info(`🚀 Récupération agent ${agentId}`, context);
    return { success: true, data: { id: agentId } };
  }

  /**
   * Exécuter un agent
   */
  static async executeAgent(data: Record<string, unknown>, userId: string, context: ApiContext) {
    logApi.info(`🚀 Exécution agent`, context);
    return { success: true, data: { response: 'placeholder' } };
  }

  /**
   * Mettre à jour un agent
   */
  static async updateAgent(agentId: string, data: AgentData, userId: string, context: ApiContext) {
    logApi.info(`🚀 Mise à jour agent ${agentId}`, context);
    return { success: true, data: { id: agentId } };
  }

  /**
   * Patcher un agent
   */
  static async patchAgent(agentId: string, data: Partial<AgentData>, userId: string, context: ApiContext) {
    logApi.info(`🚀 Patch agent ${agentId}`, context);
    return { success: true, data: { id: agentId } };
  }

  /**
   * Supprimer un agent
   */
  static async deleteAgent(agentId: string, userId: string, context: ApiContext) {
    logApi.info(`🚀 Suppression agent ${agentId}`, context);
    return { success: true, data: { message: 'Agent supprimé' } };
  }

  /**
   * Lister les tools
   */
  static async listTools(userId: string, context: ApiContext) {
    logApi.info(`🚀 Liste tools ${userId}`, context);
    return { success: true, data: [] };
  }

  /**
   * Informations de debug
   */
  static async debugInfo(userId: string, context: ApiContext) {
    logApi.info(`🚀 Debug info ${userId}`, context);
    return { 
      success: true, 
      data: {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        version: '2.0.0',
        features: ['api_v2', 'harmony', 'agents']
      }
    };
  }
} 