/**
 * Mutations pour les sections de notes
 * Extrait de noteContentMutations.ts pour respecter limite 300 lignes
 * 
 * Conformité GUIDE-EXCELLENCE-CODE.md:
 * - Max 300 lignes par fichier
 * - 1 fichier = 1 responsabilité
 */

import { createClient } from '@supabase/supabase-js';
import { logApi } from '@/utils/logger';
import { V2ResourceResolver } from '@/utils/v2ResourceResolver';
import { sanitizeMarkdownContent } from '@/utils/markdownSanitizer.server';
import type { ApiContext, ShareSettings } from '@/utils/database/types/databaseTypes';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Ajouter du contenu à une section spécifique
 */
export async function addContentToSection(ref: string, sectionId: string, content: string, userId: string, context: ApiContext) {
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
      .eq('user_id', userId)
      .single();

    if (fetchError || !note) {
      throw new Error('Note non trouvée');
    }

    // Ajouter le contenu à la section
    const { appendToSection } = await import('@/utils/markdownTOC');
    const newContent = appendToSection(note.markdown_content || '', sectionId, sanitizeMarkdownContent(content), 'end');

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

    logApi.info(`✅ Contenu ajouté à la section avec succès`, context);
    return {
      success: true,
      message: 'Contenu ajouté à la section avec succès'
    };
  } catch (error) {
    logApi.error(`❌ Erreur ajout contenu section: ${error}`, context);
    throw error;
  }
}

/**
 * Vider une section
 */
export async function clearSection(ref: string, sectionId: string, userId: string, context: ApiContext) {
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
      .eq('user_id', userId)
      .single();

    if (fetchError || !note) {
      throw new Error('Note non trouvée');
    }

    // Vider la section
    const { clearSection } = await import('@/utils/markdownTOC');
    const newContent = clearSection(note.markdown_content || '', sectionId);

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

    logApi.info(`✅ Section vidée avec succès`, context);
    return {
      success: true,
      message: 'Section vidée avec succès'
    };
  } catch (error) {
    logApi.error(`❌ Erreur vidage section: ${error}`, context);
    throw error;
  }
}

/**
 * Supprimer une section
 */
export async function eraseSection(ref: string, sectionId: string, userId: string, context: ApiContext) {
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
      .eq('user_id', userId)
      .single();

    if (fetchError || !note) {
      throw new Error('Note non trouvée');
    }

    // Supprimer la section
    const { eraseSection } = await import('@/utils/markdownTOC');
    const newContent = eraseSection(note.markdown_content || '', sectionId);

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

    logApi.info(`✅ Section supprimée avec succès`, context);
    return {
      success: true,
      message: 'Section supprimée avec succès'
    };
  } catch (error) {
    logApi.error(`❌ Erreur suppression section: ${error}`, context);
    throw error;
  }
}

