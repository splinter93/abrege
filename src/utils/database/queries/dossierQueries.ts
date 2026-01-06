/**
 * Queries pour les dossiers (lecture uniquement)
 * Extrait de V2DatabaseUtils pour respecter limite 300 lignes
 */

import { createClient } from '@supabase/supabase-js';
import { logApi } from '@/utils/logger';
import { V2ResourceResolver } from '@/utils/v2ResourceResolver';
import type { ApiContext } from '@/utils/v2DatabaseUtils';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Récupérer un dossier par ID ou slug
 */
export async function getFolder(folderId: string, userId: string, context: ApiContext) {
  logApi.info(`🚀 Récupération dossier ${folderId}`, context);
  
  try {
    // Résoudre la référence (UUID ou slug)
    const resolveResult = await V2ResourceResolver.resolveRef(folderId, 'folder', userId, context);
    if (!resolveResult.success) {
      throw new Error(resolveResult.error);
    }

    const resolvedFolderId = resolveResult.id;

    // Récupérer le dossier
    const { data: folder, error } = await supabase
      .from('folders')
      .select('*')
      .eq('id', resolvedFolderId)
      .eq('user_id', userId)
      .single();

    if (error || !folder) {
      throw new Error(`Dossier non trouvé: ${folderId}`);
    }

    return { success: true, data: folder };
  } catch (error) {
    logApi.error(`❌ Erreur: ${error}`, context);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Récupérer l'arbre d'un dossier
 */
export async function getFolderTree(ref: string, userId: string, context: ApiContext) {
  logApi.info(`🚀 Récupération arbre dossier ${ref}`, context);
  
  try {
    // Résoudre la référence
    const resolveResult = await V2ResourceResolver.resolveRef(ref, 'folder', userId, context);
    if (!resolveResult.success) {
      throw new Error(resolveResult.error);
    }

    const folderId = resolveResult.id;

    // Récupérer le dossier
    const { data: folder, error: fetchError } = await supabase
      .from('folders')
      .select('id, name, parent_id, position, created_at, slug')
      .eq('id', folderId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !folder) {
      throw new Error('Dossier non trouvé');
    }

    // Récupérer les sous-dossiers
    const { data: subFolders, error: subFoldersError } = await supabase
      .from('folders')
      .select('id, name, parent_id, position, created_at, slug')
      .eq('parent_id', folderId)
      .eq('user_id', userId)
      .is('trashed_at', null)
      .order('position', { ascending: true });

    if (subFoldersError) {
      throw new Error(`Erreur récupération sous-dossiers: ${subFoldersError.message}`);
    }

    // Récupérer les notes du dossier
    const { data: notes, error: notesError } = await supabase
      .from('articles')
      .select('id, source_title, slug, position, created_at, updated_at')
      .eq('folder_id', folderId)
      .eq('user_id', userId)
      .is('trashed_at', null)
      .order('position', { ascending: true });

    if (notesError) {
      throw new Error(`Erreur récupération notes: ${notesError.message}`);
    }

    // Construire l'objet de réponse
    const folderTree = {
      ...folder,
      subFolders: subFolders || [],
      notes: notes || []
    };

    logApi.info(`✅ Arbre dossier récupéré avec succès`, context);
    return { success: true, data: folderTree };
    
  } catch (error) {
    logApi.error(`❌ Erreur récupération arbre: ${error}`, context);
    throw error;
  }
}



