/**
 * Queries de recherche
 * Extrait de V2DatabaseUtils pour respecter limite 300 lignes
 */

import { createClient } from '@supabase/supabase-js';
import { logApi } from '@/utils/logger';
import type { ApiContext } from '@/utils/v2DatabaseUtils';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Rechercher dans les notes
 */
export async function searchNotes(query: string, limit: number, offset: number, userId: string, context: ApiContext) {
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
    logApi.error(`❌ Erreur: ${error}`, context);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Rechercher dans les classeurs
 */
export async function searchClasseurs(query: string, limit: number, offset: number, userId: string, context: ApiContext) {
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
    logApi.error(`❌ Erreur: ${error}`, context);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Rechercher dans les fichiers
 */
export async function searchFiles(query: string, limit: number, offset: number, userId: string, context: ApiContext) {
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
    logApi.error(`❌ Erreur: ${error}`, context);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Rechercher du contenu (notes, dossiers, classeurs)
 */
export async function searchContent(query: string, type: string = 'all', limit: number = 20, userId: string, context: ApiContext) {
  logApi.info(`🚀 Recherche contenu: "${query}" (type: ${type})`, context);
  
  try {
    const results: Array<Record<string, unknown> & { type: string }> = [];

    if (type === 'all' || type === 'notes') {
      const notesResult = await searchNotes(query, limit, 0, userId, context);
      if (notesResult.success) {
        (notesResult.data ?? []).forEach(note => results.push({ ...note, type: 'note' }));
      }
    }

    if (type === 'all' || type === 'classeurs') {
      const classeursResult = await searchClasseurs(query, limit, 0, userId, context);
      if (classeursResult.success) {
        (classeursResult.data ?? []).forEach(classeur => results.push({ ...classeur, type: 'classeur' }));
      }
    }

    return { success: true, data: results };
  } catch (error) {
    logApi.error(`❌ Erreur: ${error}`, context);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}


