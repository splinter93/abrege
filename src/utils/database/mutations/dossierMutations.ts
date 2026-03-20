/**
 * Mutations pour les dossiers (écriture uniquement)
 * Extrait de V2DatabaseUtils pour respecter limite 300 lignes
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logApi } from '@/utils/logger';
import { V2ResourceResolver } from '@/utils/v2ResourceResolver';
import { SlugGenerator } from '@/utils/slugGenerator';
import { moveChildFoldersRecursive, validateFolderParent } from './dossierMutationsHelpers';
import type { ApiContext, CreateFolderData, UpdateFolderData } from '@/utils/v2DatabaseUtils';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Créer un dossier
 */
export async function createFolder(data: CreateFolderData, userId: string, context: ApiContext, supabaseClient?: SupabaseClient) {
  logApi.info(`🚀 Création dossier optimisée`, context);
  
  try {
    const client = supabaseClient || supabase;
    
    // Résolution conditionnelle du classeur_id
    let classeurId = data.classeur_id;
    
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
    
    // Slug simple basé sur le nom + timestamp
    const timestamp = Date.now().toString(36);
    const slug = `${data.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${timestamp}`;
    
    // Création directe
    const { data: folder, error: createError } = await client
      .from('folders')
      .insert({
        name: data.name,
        classeur_id: classeurId,
        parent_id: data.parent_id,
        user_id: userId,
        slug
      })
      .select()
      .single();

    if (createError) {
      if (createError.code === '23503') {
        throw new Error(`Classeur ou dossier parent non trouvé`);
      }
      throw new Error(`Erreur création dossier: ${createError.message}`);
    }

    logApi.info(`✅ Dossier créé optimisé`, context);
    return { success: true, data: folder };
    
  } catch (error) {
    logApi.error(`❌ Erreur création dossier: ${error}`, context);
    throw error;
  }
}

/**
 * Mettre à jour un dossier
 */
export async function updateFolder(ref: string, data: UpdateFolderData, userId: string, context: ApiContext) {
  logApi.info(`🚀 Mise à jour dossier ${ref}`, context);
  
  try {
    // Résoudre la référence
    const resolveResult = await V2ResourceResolver.resolveRef(ref, 'folder', userId, context);
    if (!resolveResult.success) {
      throw new Error(resolveResult.error);
    }

    const folderId = resolveResult.id;

    // Charger l'état courant
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

    // Guard : rien à mettre à jour
    if (Object.keys(updateData).length === 0) {
      return { success: true, data: currentFolder };
    }

    // Mise à jour automatique du slug si le nom change
    if (data.name && data.name !== currentFolder.name) {
      try {
        const newSlug = await SlugGenerator.generateSlug(
          data.name,
          'folder',
          userId,
          folderId,
          supabase
        );
        updateData.slug = newSlug;
      } catch (error) {
        logApi.error(`❌ Erreur mise à jour slug: ${error}`);
        // Fallback : slug avec timestamp garanti unique
        const fallbackSlug = `${data.name.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 100)}-${Date.now().toString(36)}`;
        updateData.slug = fallbackSlug;
      }
    }

    // Vérifier que le nouveau parent existe
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

    // Mettre à jour le dossier — en cas de race condition sur le slug (23505), fallback timestamp
    let { data: folder, error: updateError } = await supabase
      .from('folders')
      .update(updateData)
      .eq('id', folderId)
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError?.code === '23505' && updateData.slug) {
      // Race condition : slug pris entre la vérification et l'écriture → on force un slug unique
      const uniqueSlug = `${String(updateData.slug).slice(0, 100)}-${Date.now().toString(36)}`;
      logApi.info(`⚠️ Slug collision détectée, retry avec slug unique: ${uniqueSlug}`, context);
      const retryResult = await supabase
        .from('folders')
        .update({ ...updateData, slug: uniqueSlug })
        .eq('id', folderId)
        .eq('user_id', userId)
        .select()
        .single();
      folder = retryResult.data;
      updateError = retryResult.error;
    }

    if (updateError) {
      throw new Error(`Erreur mise à jour dossier: ${updateError.message}`);
    }

    logApi.info(`✅ Dossier mis à jour avec succès`, context);
    return { success: true, data: folder };
    
  } catch (error) {
    logApi.error(`❌ Erreur mise à jour dossier: ${error}`, context);
    throw error;
  }
}

/**
 * Déplacer un dossier
 */
export async function moveFolder(ref: string, targetParentId: string | null, userId: string, context: ApiContext, targetClasseurId?: string) {
  logApi.info(`🚀 Déplacement dossier ${ref}`, context);
  
  try {
    // Résoudre la référence
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

    // Vérifier le nouveau parent via helper
    await validateFolderParent(targetParentId, folderId, userId, supabase);

    // Mettre à jour le parent du dossier
    const updateData: Record<string, unknown> = {
      parent_id: targetParentId
    };
    
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

    // Déplacer aussi tous les dossiers enfants si cross-classeur
    if (targetClasseurId) {
      await moveChildFoldersRecursive(folderId, targetClasseurId, userId, supabase);
    }

    logApi.info(`✅ Dossier déplacé avec succès`, context);
    return { success: true, data: updatedFolder };
    
  } catch (error) {
    logApi.error(`❌ Erreur déplacement dossier: ${error}`, context);
    throw error;
  }
}

/**
 * Supprimer un dossier
 */
export async function deleteFolder(ref: string, userId: string, context: ApiContext) {
  logApi.info(`🚀 Suppression dossier ${ref}`, context);
  
  try {
    // Résoudre la référence
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
    logApi.error(`❌ Erreur suppression dossier: ${error}`, context);
    throw error;
  }
}



