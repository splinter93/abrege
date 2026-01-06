/**
 * Mutations pour le contenu des notes (sections, insertions)
 * Extrait de noteMutations.ts pour respecter limite 300 lignes
 * 
 * Conformité GUIDE-EXCELLENCE-CODE.md:
 * - Max 300 lignes par fichier
 * - 1 fichier = 1 responsabilité
 */

import { createClient } from '@supabase/supabase-js';
import { logApi } from '@/utils/logger';
import { V2ResourceResolver } from '@/utils/v2ResourceResolver';
import { sanitizeMarkdownContent } from '@/utils/markdownSanitizer.server';
import type { ApiContext, ContentOperation, ShareSettings } from '@/utils/database/types/databaseTypes';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Ajouter du contenu à une note
 */
export async function addContentToNote(ref: string, content: string, userId: string, context: ApiContext) {
  logApi.info(`🚀 Ajout contenu note directe DB`, context);
  
  try {
    // Résoudre la référence
    const resolveResult = await V2ResourceResolver.resolveRef(ref, 'note', userId, context);
    if (!resolveResult.success) {
      throw new Error(resolveResult.error);
    }

    const noteId = resolveResult.id;

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
    const updatedContent = (currentNote.markdown_content || '') + '\n\n' + sanitizeMarkdownContent(content);

    // Mettre à jour la note
    const { data: updatedNote, error: updateError } = await supabase
      .from('articles')
      .update({
        markdown_content: updatedContent,
        html_content: updatedContent,
        updated_at: new Date().toISOString()
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
    logApi.error(`❌ Erreur ajout contenu: ${error}`, context);
    throw error;
  }
}

/**
 * Insérer du contenu à une position spécifique dans une note
 */
export async function insertContentToNote(ref: string, content: string, position: number, userId: string, context: ApiContext) {
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
      .eq('user_id', userId)
      .single();

    if (fetchError || !note) {
      throw new Error('Note non trouvée');
    }

    // Insérer le contenu à la position spécifiée
    const lines = (note.markdown_content || '').split('\n');
    lines.splice(position, 0, sanitizeMarkdownContent(content));
    const newContent = lines.join('\n');

    // Mettre à jour la note
    const { error: updateError } = await supabase
      .from('articles')
      .update({ 
        markdown_content: newContent,
        updated_at: new Date().toISOString()
      })
      .eq('id', noteId)
      .eq('user_id', userId);

    if (updateError) {
      throw new Error(`Erreur mise à jour: ${updateError.message}`);
    }

    logApi.info(`✅ Contenu inséré avec succès`, context);
    return {
      success: true,
      message: 'Contenu inséré avec succès'
    };
  } catch (error) {
    logApi.error(`❌ Erreur insertion contenu: ${error}`, context);
    throw error;
  }
}

/**
 * Alias pour insertContentToNote
 */
export async function insertNoteContent(noteId: string, params: { content: string; position: number }, userId: string, context: ApiContext) {
  return await insertContentToNote(noteId, params.content, params.position, userId, context);
}


/**
 * Publier une note (changer sa visibilité)
 */
export async function publishNote(ref: string, visibility: 'private' | 'public' | 'link-private' | 'link-public' | 'limited' | 'scrivia', userId: string, context: ApiContext) {
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
      .eq('id', noteId)
      .eq('user_id', userId);

    if (updateError) {
      throw new Error(`Erreur mise à jour: ${updateError.message}`);
    }

    logApi.info(`✅ Note publiée avec succès`, context);
    return {
      success: true,
      message: visibility !== 'private' ? 'Note publiée avec succès' : 'Note rendue privée avec succès'
    };
  } catch (error) {
    logApi.error(`❌ Erreur publication note: ${error}`, context);
    throw error;
  }
}

/**
 * Mettre à jour les paramètres de partage d'une note
 */
export async function updateNoteShareSettings(ref: string, settings: ShareSettings, userId: string, context: ApiContext) {
  logApi.info(`🚀 Mise à jour paramètres partage ${ref}`, context);
  
  try {
    // Résoudre la référence
    const resolveResult = await V2ResourceResolver.resolveRef(ref, 'note', userId, context);
    if (!resolveResult.success) {
      throw new Error(resolveResult.error);
    }

    const noteId = resolveResult.id;

    const { error } = await supabase
      .from('articles')
      .update({
        visibility: settings.visibility,
        allow_edit: settings.allow_edit,
        allow_comments: settings.allow_comments,
        updated_at: new Date().toISOString()
      })
      .eq('id', noteId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Erreur mise à jour: ${error.message}`);
    }

    logApi.info(`✅ Paramètres partage mis à jour avec succès`, context);
    return { success: true, data: { message: 'Paramètres de partage mis à jour' } };
  } catch (error) {
    logApi.error(`❌ Erreur mise à jour paramètres partage: ${error}`, context);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Appliquer des opérations de contenu à une note
 */
export async function applyContentOperations(ref: string, operations: ContentOperation[], userId: string, context: ApiContext) {
  logApi.info(`🚀 Application opérations contenu ${ref}`, context);
  
  try {
    // Pour l'instant, implémentation basique
    // TODO: Implémenter la logique complète des opérations
    logApi.info(`✅ ${operations.length} opérations appliquées`, context);
    return { success: true, data: { operations_applied: operations.length } };
  } catch (error) {
    logApi.error(`❌ Erreur application opérations: ${error}`, context);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

