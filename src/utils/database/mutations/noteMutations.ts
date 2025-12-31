/**
 * Mutations pour les notes (écriture uniquement)
 * Extrait de V2DatabaseUtils pour respecter limite 300 lignes
 * 
 * Conformité GUIDE-EXCELLENCE-CODE.md:
 * - Max 300 lignes par fichier
 * - 1 fichier = 1 responsabilité
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logApi } from '@/utils/logger';
import { V2ResourceResolver } from '@/utils/v2ResourceResolver';
import { SlugGenerator } from '@/utils/slugGenerator';
import { SlugAndUrlService } from '@/services/slugAndUrlService';
import { sanitizeMarkdownContent } from '@/utils/markdownSanitizer.server';
import { sanitizeNoteEmbedHtml } from '@/utils/sanitizeNoteEmbedHtml';
import type { ApiContext, CreateNoteData, UpdateNoteData } from '@/utils/v2DatabaseUtils';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Créer une note
 */
export async function createNote(data: CreateNoteData, userId: string, context: ApiContext) {
  logApi.info('🚀 Création note directe DB', context);
  
  try {
    // Résoudre le notebook_id (peut être un UUID ou un slug)
    let classeurId = data.notebook_id || data.notebook;
    
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
    const slug = await SlugGenerator.generateSlug(data.source_title, 'note', userId, undefined, supabase);
    
    // Sanitizer le markdown
    const safeMarkdown = sanitizeMarkdownContent(data.markdown_content || '');
    
    // Créer la note
    const { data: note, error: createError } = await supabase
      .from('articles')
      .insert({
        source_title: data.source_title,
        markdown_content: safeMarkdown,
        html_content: safeMarkdown,
        header_image: data.header_image,
        folder_id: data.folder_id,
        classeur_id: classeurId,
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
    logApi.error(`❌ Erreur création note: ${error}`, context);
    throw error;
  }
}

/**
 * Mettre à jour une note
 */
export async function updateNote(ref: string, data: UpdateNoteData, userId: string, context: ApiContext) {
  logApi.info(`🚀 Mise à jour note ${ref}`, context);
  
  try {
    // Résoudre la référence
    const resolveResult = await V2ResourceResolver.resolveRef(ref, 'note', userId, context);
    if (!resolveResult.success) {
      throw new Error(resolveResult.error);
    }

    const noteId = resolveResult.id;

    // Charger l'état courant
    const { data: currentNote, error: currentError } = await supabase
      .from('articles')
      .select('id, slug, public_url, wide_mode, a4_mode, slash_lang, font_family, folder_id, description, source_title, header_image, header_image_offset, header_image_blur, header_image_overlay, header_title_in_image')
      .eq('id', noteId)
      .eq('user_id', userId)
      .single();
    
    if (currentError) {
      throw new Error(`Erreur lecture note courante: ${currentError.message}`);
    }
    
    // Préparer les données de mise à jour
    const updateData: Record<string, unknown> = {
      wide_mode: currentNote.wide_mode,
      a4_mode: currentNote.a4_mode,
      slash_lang: currentNote.slash_lang,
      font_family: currentNote.font_family,
      folder_id: currentNote.folder_id,
      description: currentNote.description
    };
    
    // Préserver header_image et settings si non fournis
    if (data.header_image === undefined) updateData.header_image = currentNote.header_image;
    if (data.header_image_offset === undefined) updateData.header_image_offset = currentNote.header_image_offset;
    if (data.header_image_blur === undefined) updateData.header_image_blur = currentNote.header_image_blur;
    if (data.header_image_overlay === undefined) updateData.header_image_overlay = currentNote.header_image_overlay;
    if (data.header_title_in_image === undefined) updateData.header_title_in_image = currentNote.header_title_in_image;
    
    // Mettre à jour le titre et slug si nécessaire
    if (data.source_title !== undefined) {
      const normalizedTitle = String(data.source_title).trim();
      updateData.source_title = normalizedTitle;
      
      if (normalizedTitle && normalizedTitle !== currentNote.source_title) {
        try {
          const supabaseForSlug = supabase as unknown as Parameters<typeof SlugAndUrlService.updateNoteSlugAndUrl>[3];
          const currentNoteForSlug = {
            id: currentNote.id ?? '',
            source_title: currentNote.source_title ?? '',
            slug: currentNote.slug ?? '',
            public_url: currentNote.public_url ?? null
          };
          const { slug: newSlug, publicUrl } = await SlugAndUrlService.updateNoteSlugAndUrl(
            noteId,
            normalizedTitle,
            userId,
            supabaseForSlug,
            currentNoteForSlug
          );
          updateData.slug = newSlug;
          updateData.public_url = publicUrl;
        } catch (error) {
          logApi.error(`❌ Erreur mise à jour slug/URL: ${error}`);
        }
      }
    }
    
    // Sanitizer le contenu
    if (data.markdown_content !== undefined) {
      updateData.markdown_content = sanitizeMarkdownContent(data.markdown_content);
    }
    if (data.html_content !== undefined) {
      updateData.html_content = sanitizeNoteEmbedHtml(data.html_content);
    }
    
    // Mettre à jour les autres champs
    if (data.header_image !== undefined) updateData.header_image = data.header_image;
    if (data.header_image_offset !== undefined) {
      updateData.header_image_offset = Math.round(data.header_image_offset * 10) / 10;
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
export async function deleteNote(ref: string, userId: string, context: ApiContext) {
  logApi.info(`🚀 Suppression note ${ref}`, context);
  
  try {
    // Résoudre la référence
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

    logApi.info('✅ Note supprimée avec succès', context);
    return { success: true };
    
  } catch (error) {
    logApi.error(`❌ Erreur suppression note: ${error}`, context);
    throw error;
  }
}

/**
 * Déplacer une note
 */
export async function moveNote(ref: string, targetFolderId: string | null, userId: string, context: ApiContext, targetClasseurId?: string) {
  logApi.info(`🚀 Déplacement note ${ref}`, context);
  
  try {
    // Résoudre la référence
    const resolveResult = await V2ResourceResolver.resolveRef(ref, 'note', userId, context);
    if (!resolveResult.success) {
      throw new Error(resolveResult.error);
    }

    const noteId = resolveResult.id;

    // Vérifier le dossier de destination
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
    
    if (targetClasseurId) {
      updateData.classeur_id = targetClasseurId;
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
    logApi.error(`❌ Erreur déplacement note: ${error}`, context);
    throw error;
  }
}

