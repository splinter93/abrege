/**
 * Queries pour les notes (lecture uniquement)
 * Extrait de V2DatabaseUtils pour respecter limite 300 lignes
 * 
 * Conformité GUIDE-EXCELLENCE-CODE.md:
 * - Max 300 lignes par fichier
 * - 1 fichier = 1 responsabilité
 */

import { createClient } from '@supabase/supabase-js';
import { logApi } from '@/utils/logger';
import { V2ResourceResolver } from '@/utils/v2ResourceResolver';
import type { ApiContext } from '@/utils/v2DatabaseUtils';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Récupérer une note par ID ou slug
 */
export async function getNote(noteId: string, userId: string, context: ApiContext) {
  logApi.info(`🚀 Récupération note ${noteId}`, context);
  
  try {
    // Résoudre la référence (UUID ou slug)
    const resolveResult = await V2ResourceResolver.resolveRef(noteId, 'note', userId, context);
    if (!resolveResult.success) {
      throw new Error(resolveResult.error);
    }

    const resolvedNoteId = resolveResult.id;

    // Récupérer la note
    const { data: note, error } = await supabase
      .from('articles')
      .select('*')
      .eq('id', resolvedNoteId)
      .eq('user_id', userId)
      .single();

    if (error || !note) {
      throw new Error(`Note non trouvée: ${noteId}`);
    }

    logApi.info(`✅ Note récupérée avec succès`, context);
    return { success: true, data: note };
    
  } catch (error) {
    logApi.error(`❌ Erreur récupération note: ${error}`, context);
    throw error;
  }
}

/**
 * Récupérer le contenu d'une note
 */
export async function getNoteContent(ref: string, userId: string, context: ApiContext) {
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
    logApi.error(`❌ Erreur récupération contenu: ${error}`, context);
    throw error;
  }
}

/**
 * Récupérer la table des matières d'une note
 */
export async function getTableOfContents(ref: string, userId: string, context: ApiContext) {
  logApi.info(`🚀 Récupération TOC note ${ref}`, context);
  
  try {
    // Résoudre la référence
    const resolveResult = await V2ResourceResolver.resolveRef(ref, 'note', userId, context);
    if (!resolveResult.success) {
      throw new Error(resolveResult.error);
    }

    const noteId = resolveResult.id;

    // Récupérer le contenu markdown
    const { data: note, error: fetchError } = await supabase
      .from('articles')
      .select('markdown_content')
      .eq('id', noteId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !note) {
      throw new Error(`Note non trouvée: ${noteId}`);
    }

    // Parser les headings depuis le markdown
    const headings: Array<{ id: string; level: number; text: string; path: string[] }> = [];
    const lines = note.markdown_content.split('\n');
    const path: string[] = [];

    for (const line of lines) {
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const text = headingMatch[2].trim();
        const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');

        // Ajuster le path selon le niveau
        path.splice(level - 1);
        path.push(id);

        headings.push({
          id,
          level,
          text,
          path: [...path]
        });
      }
    }

    logApi.info(`✅ TOC récupéré avec succès (${headings.length} headings)`, context);
    return { success: true, data: headings };
    
  } catch (error) {
    logApi.error(`❌ Erreur récupération TOC: ${error}`, context);
    throw error;
  }
}

/**
 * Alias pour getTableOfContents
 */
export async function getNoteTOC(ref: string, userId: string, context: ApiContext) {
  return await getTableOfContents(ref, userId, context);
}

/**
 * Récupérer les statistiques d'une note
 */
export async function getNoteStatistics(ref: string, userId: string, context: ApiContext) {
  logApi.info(`🚀 Récupération statistiques note ${ref}`, context);
  
  try {
    // Résoudre la référence
    const resolveResult = await V2ResourceResolver.resolveRef(ref, 'note', userId, context);
    if (!resolveResult.success) {
      throw new Error(resolveResult.error);
    }

    const noteId = resolveResult.id;

    // Récupérer la note
    const { data: note, error: fetchError } = await supabase
      .from('articles')
      .select('markdown_content, created_at, updated_at')
      .eq('id', noteId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !note) {
      throw new Error(`Note non trouvée: ${noteId}`);
    }

    // Calculer les statistiques
    const content = note.markdown_content || '';
    const wordCount = content.split(/\s+/).filter((w: string) => w.length > 0).length;
    const charCount = content.length;
    const lineCount = content.split('\n').length;

    const stats = {
      word_count: wordCount,
      char_count: charCount,
      line_count: lineCount,
      created_at: note.created_at,
      updated_at: note.updated_at
    };

    logApi.info(`✅ Statistiques récupérées avec succès`, context);
    return { success: true, data: stats };
    
  } catch (error) {
    logApi.error(`❌ Erreur récupération statistiques: ${error}`, context);
    throw error;
  }
}

/**
 * Récupérer les notes récentes
 */
export async function getRecentNotes(limit: number = 10, userId: string, context: ApiContext) {
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
    logApi.error(`❌ Erreur: ${error}`, context);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

