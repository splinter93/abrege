import { createClient } from '@supabase/supabase-js';
import { logApi } from './logger';
import { V2ResourceResolver } from './v2ResourceResolver';
import { SlugGenerator } from './slugGenerator';
import { SlugAndUrlService } from '@/services/slugAndUrlService';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// IMPORTANT: L'API V2 est utilisée par l'Agent côté serveur sans JWT utilisateur.
// Pour éviter les erreurs RLS tout en garantissant la sécurité, on utilise la clé Service Role
// et on applique systématiquement des filtres user_id dans toutes les requêtes.
// Ne JAMAIS exposer cette clé côté client.
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Types pour les données
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
  notebook_id: string;
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
}

export interface UpdateClasseurData {
  name?: string;
  description?: string;
  icon?: string;
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
  static async createNote(data: CreateNoteData, userId: string, context: any) {
    logApi('v2_db_create_note', '🚀 Création note directe DB', context);
    
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

      // Générer un slug unique
      const slug = await SlugGenerator.generateSlug(data.source_title, 'note', userId);
      
      // Créer la note
      const { data: note, error: createError } = await supabase
        .from('articles')
        .insert({
          source_title: data.source_title,
          markdown_content: data.markdown_content || '',
          html_content: data.markdown_content || '', // Pour l'instant, on met le même contenu
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

      logApi('v2_db_create_note', '✅ Note créée avec succès', context);
      return { success: true, note };
      
    } catch (error) {
      logApi('v2_db_create_note', `❌ Erreur création note: ${error}`, context);
      throw error;
    }
  }

  /**
   * Mettre à jour une note
   */
  static async updateNote(ref: string, data: UpdateNoteData, userId: string, context: any) {
    logApi('v2_db_update_note', `🚀 Mise à jour note ${ref}`, context);
    
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
      const updateData: any = {};
      if (data.source_title !== undefined) {
        const normalizedTitle = String(data.source_title).trim();
        updateData.source_title = normalizedTitle;
        
        // TOUJOURS mettre à jour le slug quand le titre change (comme l'API V1)
        if (normalizedTitle) {
          try {
            const { slug: newSlug, publicUrl } = await SlugAndUrlService.updateNoteSlugAndUrl(
              noteId,
              normalizedTitle,
              userId,
              supabase
            );
            updateData.slug = newSlug;
            updateData.public_url = publicUrl;
            
            if (process.env.NODE_ENV === 'development') {
              console.log(`[V2DatabaseUtils] Mise à jour slug via SlugAndUrlService: "${current?.source_title}" → "${normalizedTitle}" → "${newSlug}"`);
            }
          } catch (error) {
            logApi('v2_db_update_note', `❌ Erreur mise à jour slug/URL pour la note ${noteId}: ${error}`, context);
            // Continuer sans mettre à jour le slug en cas d'erreur
          }
        }
      }
      if (data.markdown_content !== undefined) updateData.markdown_content = data.markdown_content;
      if (data.html_content !== undefined) updateData.html_content = data.html_content;
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

      logApi('v2_db_update_note', '✅ Note mise à jour avec succès', context);
      return { success: true, note };
      
    } catch (error) {
      logApi('v2_db_update_note', `❌ Erreur mise à jour note: ${error}`, context);
      throw error;
    }
  }

  /**
   * Supprimer une note
   */
  static async deleteNote(ref: string, userId: string, context: any) {
    logApi('v2_db_delete_note', `🚀 Suppression note ${ref}`, context);
    
    try {
      // Résoudre la référence (UUID ou slug)
      const resolveResult = await V2ResourceResolver.resolveRef(ref, 'note', userId, context);
      if (!resolveResult.success) {
        throw new Error(resolveResult.error);
      }

      const noteId = resolveResult.id;

      // Supprimer la note
      const { error: deleteError } = await supabase
        .from('articles')
        .delete()
        .eq('id', noteId)
        .eq('user_id', userId);

      if (deleteError) {
        throw new Error(`Erreur suppression note: ${deleteError.message}`);
      }

      logApi('v2_db_delete_note', '✅ Note supprimée avec succès', context);
      return { success: true };
      
    } catch (error) {
      logApi('v2_db_delete_note', `❌ Erreur suppression note: ${error}`, context);
      throw error;
    }
  }

  /**
   * Récupérer le contenu d'une note
   */
  static async getNoteContent(ref: string, userId: string, context: any) {
    logApi('v2_db_get_note_content', '🚀 Récupération contenu note directe DB', context);
    
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

      logApi('v2_db_get_note_content', '✅ Contenu récupéré avec succès', context);
      return { success: true, note };
      
    } catch (error) {
      logApi('v2_db_get_note_content', `❌ Erreur récupération contenu: ${error}`, context);
      throw error;
    }
  }

  /**
   * Ajouter du contenu à une note
   */
  static async addContentToNote(ref: string, content: string, userId: string, context: any) {
    logApi('v2_db_add_content_to_note', '🚀 Ajout contenu note directe DB', context);
    
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

      logApi('v2_db_add_content_to_note', '✅ Contenu ajouté avec succès', context);
      return { success: true, note: updatedNote };
      
    } catch (error) {
      logApi('v2_db_add_content_to_note', `❌ Erreur ajout contenu: ${error}`, context);
      throw error;
    }
  }

  /**
   * Déplacer une note
   */
  static async moveNote(ref: string, targetFolderId: string | null, userId: string, context: any) {
    logApi('v2_db_move_note', `🚀 Déplacement note ${ref} vers folder ${targetFolderId}`, context);
    
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
      const { data: note, error: moveError } = await supabase
        .from('articles')
        .update({ 
          folder_id: targetFolderId,
          updated_at: new Date().toISOString()
        })
        .eq('id', noteId)
        .eq('user_id', userId)
        .select()
        .single();

      if (moveError) {
        throw new Error(`Erreur déplacement note: ${moveError.message}`);
      }

      logApi('v2_db_move_note', '✅ Note déplacée avec succès', context);
      return { success: true, note };
      
    } catch (error) {
      logApi('v2_db_move_note', `❌ Erreur déplacement note: ${error}`, context);
      throw error;
    }
  }

  /**
   * Créer un dossier
   */
  static async createFolder(data: CreateFolderData, userId: string, context: any) {
    logApi('v2_db_create_folder', '🚀 Création dossier directe DB', context);
    
    try {
      // Résoudre le notebook_id (peut être un UUID ou un slug)
      let classeurId = data.notebook_id;
      
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

      // Vérifier que le dossier parent existe et appartient à l'utilisateur
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

      // Générer un slug unique
      const slug = await SlugGenerator.generateSlug(data.name, 'folder', userId);
      
      // Créer le dossier
      const { data: folder, error: createError } = await supabase
        .from('folders')
        .insert({
          name: data.name,
          classeur_id: classeurId, // 🔧 CORRECTION TEMPORAIRE: Utiliser uniquement classeur_id
          parent_id: data.parent_id,
          user_id: userId,
          slug
        })
        .select()
        .single();

      if (createError) {
        throw new Error(`Erreur création dossier: ${createError.message}`);
      }

      logApi('v2_db_create_folder', '✅ Dossier créé avec succès', context);
      return { success: true, folder };
      
    } catch (error) {
      logApi('v2_db_create_folder', `❌ Erreur création dossier: ${error}`, context);
      throw error;
    }
  }

  /**
   * Mettre à jour un dossier
   */
  static async updateFolder(ref: string, data: UpdateFolderData, userId: string, context: any) {
    logApi('v2_db_update_folder', `🚀 Mise à jour dossier ${ref}`, context);
    
    try {
      // Résoudre la référence (UUID ou slug)
      const resolveResult = await V2ResourceResolver.resolveRef(ref, 'folder', userId, context);
      if (!resolveResult.success) {
        throw new Error(resolveResult.error);
      }

      const folderId = resolveResult.id;

      // Préparer les données de mise à jour
      const updateData: any = {};
      if (data.name) updateData.name = data.name;
      if (data.parent_id !== undefined) updateData.parent_id = data.parent_id;
      // Note: updated_at n'existe pas dans la table folders
      // Les mises à jour sont tracées via la logique métier

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

      logApi('v2_db_update_folder', '✅ Dossier mis à jour avec succès', context);
      return { success: true, folder };
      
    } catch (error) {
      logApi('v2_db_update_folder', `❌ Erreur mise à jour dossier: ${error}`, context);
      throw error;
    }
  }

  /**
   * Déplacer un dossier
   */
  static async moveFolder(ref: string, targetParentId: string | null, userId: string, context: any) {
    logApi('v2_db_move_folder', `🚀 Déplacement dossier ${ref}`, context);
    
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
      const { data: updatedFolder, error: updateError } = await supabase
        .from('folders')
        .update({
          parent_id: targetParentId
        })
        .eq('id', folderId)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Erreur mise à jour dossier: ${updateError.message}`);
      }

      logApi('v2_db_move_folder', '✅ Dossier déplacé avec succès', context);
      return { success: true, folder: updatedFolder };

    } catch (error) {
      logApi('v2_db_move_folder', `❌ Erreur déplacement dossier: ${error}`, context);
      throw error;
    }
  }

  /**
   * Supprimer un dossier
   */
  static async deleteFolder(ref: string, userId: string, context: any) {
    logApi('v2_db_delete_folder', `🚀 Suppression dossier ${ref}`, context);
    
    try {
      // Résoudre la référence (UUID ou slug)
      const resolveResult = await V2ResourceResolver.resolveRef(ref, 'folder', userId, context);
      if (!resolveResult.success) {
        throw new Error(resolveResult.error);
      }

      const folderId = resolveResult.id;

      // Vérifier qu'il n'y a pas de sous-dossiers
      const { data: subFolders, error: subFoldersError } = await supabase
        .from('folders')
        .select('id')
        .eq('parent_id', folderId)
        .eq('user_id', userId);

      if (subFoldersError) {
        throw new Error(`Erreur vérification sous-dossiers: ${subFoldersError.message}`);
      }

      if (subFolders && subFolders.length > 0) {
        throw new Error('Impossible de supprimer un dossier contenant des sous-dossiers');
      }

      // Vérifier qu'il n'y a pas de notes dans le dossier
      const { data: notes, error: notesError } = await supabase
        .from('articles')
        .select('id')
        .eq('folder_id', folderId)
        .eq('user_id', userId);

      if (notesError) {
        throw new Error(`Erreur vérification notes: ${notesError.message}`);
      }

      if (notes && notes.length > 0) {
        throw new Error('Impossible de supprimer un dossier contenant des notes');
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

      logApi('v2_db_delete_folder', '✅ Dossier supprimé avec succès', context);
      return { success: true };
      
    } catch (error) {
      logApi('v2_db_delete_folder', `❌ Erreur suppression dossier: ${error}`, context);
      throw error;
    }
  }

  /**
   * Créer un classeur
   */
  static async createClasseur(data: CreateClasseurData, userId: string, context: any) {
    logApi('v2_db_create_classeur', '🚀 Création classeur directe DB', context);
    
    try {
      // Générer un slug unique
      const slug = await SlugGenerator.generateSlug(data.name, 'classeur', userId);
      
      // Créer le classeur
      const { data: classeur, error: createError } = await supabase
        .from('classeurs')
        .insert({
          name: data.name,
          description: data.description,
          emoji: data.icon || '📁',
          position: 0,
          user_id: userId,
          slug
        })
        .select()
        .single();

      if (createError) {
        throw new Error(`Erreur création classeur: ${createError.message}`);
      }

      logApi('v2_db_create_classeur', '✅ Classeur créé avec succès', context);
      return { success: true, classeur };
      
    } catch (error) {
      logApi('v2_db_create_classeur', `❌ Erreur création classeur: ${error}`, context);
      throw error;
    }
  }

  /**
   * Mettre à jour un classeur
   */
  static async updateClasseur(ref: string, data: UpdateClasseurData, userId: string, context: any, userToken?: string) {
    logApi('v2_db_update_classeur', `🚀 Mise à jour classeur ${ref}`, context);
    
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

      // Préparer les données de mise à jour
      const updateData: any = {};
      if (data.name) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.icon !== undefined) updateData.emoji = data.icon;
      if (data.position !== undefined) updateData.position = data.position;
      updateData.updated_at = new Date().toISOString();

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

      logApi('v2_db_update_classeur', '✅ Classeur mis à jour avec succès', context);
      return { success: true, classeur };
      
    } catch (error) {
      logApi('v2_db_update_classeur', `❌ Erreur mise à jour classeur: ${error}`, context);
      throw error;
    }
  }

  /**
   * Supprimer un classeur
   */
  static async deleteClasseur(ref: string, userId: string, context: any) {
    logApi('v2_db_delete_classeur', `🚀 Suppression classeur ${ref}`, context);
    
    try {
      // Résoudre la référence (UUID ou slug)
      const resolveResult = await V2ResourceResolver.resolveRef(ref, 'classeur', userId, context);
      if (!resolveResult.success) {
        throw new Error(resolveResult.error);
      }

      const classeurId = resolveResult.id;

      // Vérifier qu'il n'y a pas de dossiers dans le classeur
      const { data: folders, error: foldersError } = await supabase
        .from('folders')
        .select('id')
        .eq('classeur_id', classeurId)
        .eq('user_id', userId);

      if (foldersError) {
        throw new Error(`Erreur vérification dossiers: ${foldersError.message}`);
      }

      if (folders && folders.length > 0) {
        throw new Error('Impossible de supprimer un classeur contenant des dossiers');
      }

      // Vérifier qu'il n'y a pas de notes dans le classeur
      const { data: notes, error: notesError } = await supabase
        .from('articles')
        .select('id')
        .eq('classeur_id', classeurId)
        .eq('user_id', userId);

      if (notesError) {
        throw new Error(`Erreur vérification notes: ${notesError.message}`);
      }

      if (notes && notes.length > 0) {
        throw new Error('Impossible de supprimer un classeur contenant des notes');
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

      logApi('v2_db_delete_classeur', '✅ Classeur supprimé avec succès', context);
      return { success: true };
      
    } catch (error) {
      logApi('v2_db_delete_classeur', `❌ Erreur suppression classeur: ${error}`, context);
      throw error;
    }
  }

  /**
   * Récupérer l'arbre d'un classeur
   */
  static async getClasseurTree(notebookId: string, userId: string, context: any) {
    logApi('v2_db_get_classeur_tree', '🚀 Récupération arbre classeur directe DB', context);
    
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
        logApi('v2_db_get_classeur_tree', `⚠️ UUID mal formaté: ${classeurId}`, context);
        
        // Essayer de corriger l'UUID si possible
        if (classeurId.length === 35) {
          // UUID avec un caractère manquant dans la 3ème section
          const sections = classeurId.split('-');
          if (sections.length === 5 && sections[2].length === 3) {
            // Ajouter un 0 à la 3ème section
            sections[2] = sections[2] + '0';
            const correctedUuid = sections.join('-');
            if (uuidPattern.test(correctedUuid)) {
              logApi('v2_db_get_classeur_tree', `🔧 UUID corrigé: ${correctedUuid}`, context);
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

      logApi('v2_db_get_classeur_tree', '✅ Arbre classeur récupéré avec succès', context);
      return { success: true, classeur: classeurComplet };
      
    } catch (error) {
      logApi('v2_db_get_classeur_tree', `❌ Erreur récupération arbre: ${error}`, context);
      throw error;
    }
  }

  /**
   * Réorganiser les classeurs
   */
  static async reorderClasseurs(classeurs: Array<{ id: string; position: number }>, userId: string, context: any) {
    logApi('v2_db_reorder_classeurs', '🚀 Réorganisation classeurs directe DB', context);
    
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

      logApi('v2_db_reorder_classeurs', '✅ Classeurs réorganisés avec succès', context);
      return { success: true, classeurs: updatedClasseurs || [] };
      
    } catch (error) {
      logApi('v2_db_reorder_classeurs', `❌ Erreur réorganisation classeurs: ${error}`, context);
      throw error;
    }
  }

  /**
   * Obtenir la liste des classeurs
   */
  static async getClasseurs(userId: string, context: any) {
    logApi('v2_db_get_classeurs', '🚀 Récupération classeurs', context);
    
    try {
      logApi('v2_db_get_classeurs', `🔍 User ID: ${userId}`, context);
      
      const { data: classeurs, error } = await supabase
        .from('classeurs')
        .select('id, name, description, emoji, position, slug, created_at, updated_at')
        .eq('user_id', userId)
        .order('position', { ascending: true })
        .order('created_at', { ascending: false });

      logApi('v2_db_get_classeurs', `📊 Résultat Supabase:`, context);
      logApi('v2_db_get_classeurs', `   - Data: ${JSON.stringify(classeurs)}`, context);
      logApi('v2_db_get_classeurs', `   - Error: ${error ? JSON.stringify(error) : 'null'}`, context);
      logApi('v2_db_get_classeurs', `   - Count: ${classeurs ? classeurs.length : 'undefined'}`, context);

      if (error) {
        logApi('v2_db_get_classeurs', `❌ Erreur Supabase: ${error.message}`, context);
        throw new Error(`Erreur récupération classeurs: ${error.message}`);
      }

      const result = {
        success: true,
        classeurs: classeurs || []
      };
      
      logApi('v2_db_get_classeurs', `✅ Retour final: ${JSON.stringify(result)}`, context);
      return result;
      
    } catch (error) {
      logApi('v2_db_get_classeurs', `❌ Erreur: ${error}`, context);
      throw error;
    }
  }

  /**
   * Insérer du contenu à une position spécifique
   */
  static async insertContentToNote(ref: string, content: string, position: number, userId: string, context: any) {
    logApi('v2_db_insert_content', `🚀 Insertion contenu à position ${position}`, context);
    
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
      logApi('v2_db_insert_content', `❌ Erreur: ${error}`, context);
      throw error;
    }
  }

  /**
   * Ajouter du contenu à une section spécifique
   */
  static async addContentToSection(ref: string, sectionId: string, content: string, userId: string, context: any) {
    logApi('v2_db_add_content_to_section', `🚀 Ajout contenu à section ${sectionId}`, context);
    
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
      logApi('v2_db_add_content_to_section', `❌ Erreur: ${error}`, context);
      throw error;
    }
  }

  /**
   * Vider une section
   */
  static async clearSection(ref: string, sectionId: string, userId: string, context: any) {
    logApi('v2_db_clear_section', `🚀 Vidage section ${sectionId}`, context);
    
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
      logApi('v2_db_clear_section', `❌ Erreur: ${error}`, context);
      throw error;
    }
  }

  /**
   * Supprimer une section
   */
  static async eraseSection(ref: string, sectionId: string, userId: string, context: any) {
    logApi('v2_db_erase_section', `🚀 Suppression section ${sectionId}`, context);
    
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
      logApi('v2_db_erase_section', `❌ Erreur: ${error}`, context);
      throw error;
    }
  }

  /**
   * Récupérer la table des matières
   */
  static async getTableOfContents(ref: string, userId: string, context: any) {
    logApi('v2_db_get_toc', '🚀 Récupération table des matières', context);
    
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
      logApi('v2_db_get_toc', `❌ Erreur: ${error}`, context);
      throw error;
    }
  }

  /**
   * Récupérer les statistiques d'une note
   */
  static async getNoteStatistics(ref: string, userId: string, context: any) {
    logApi('v2_db_get_statistics', '🚀 Récupération statistiques', context);
    
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
      logApi('v2_db_get_statistics', `❌ Erreur: ${error}`, context);
      throw error;
    }
  }

  /**
   * Publier une note
   */
  static async publishNote(ref: string, visibility: 'private' | 'public' | 'link-private' | 'link-public' | 'limited' | 'scrivia', userId: string, context: any) {
    logApi('v2_db_publish_note', `🚀 Publication note (${visibility})`, context);
    
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
      logApi('v2_db_publish_note', `❌ Erreur: ${error}`, context);
      throw error;
    }
  }

  /**
   * Récupérer l'arborescence d'un dossier
   */
  static async getFolderTree(ref: string, userId: string, context: any) {
    logApi('v2_db_get_folder_tree', '🚀 Récupération arborescence dossier', context);
    
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
      logApi('v2_db_get_folder_tree', `❌ Erreur: ${error}`, context);
      throw error;
    }
  }

  /**
   * Générer un slug
   */
  static async generateSlug(text: string, type: 'note' | 'classeur' | 'folder', userId: string, context: any) {
    logApi('v2_db_generate_slug', `🚀 Génération slug pour ${type}`, context);
    
    try {
      const slug = await SlugGenerator.generateSlug(text, type, userId);
      
      return {
        success: true,
        slug,
        original: text
      };
    } catch (error) {
      logApi('v2_db_generate_slug', `❌ Erreur: ${error}`, context);
      throw error;
    }
  }
} 