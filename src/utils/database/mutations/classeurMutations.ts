/**
 * Mutations pour les classeurs (écriture uniquement)
 * Extrait de V2DatabaseUtils pour respecter limite 300 lignes
 */

import { createClient } from '@supabase/supabase-js';
import { logApi } from '@/utils/logger';
import { V2ResourceResolver } from '@/utils/v2ResourceResolver';
import { SlugGenerator } from '@/utils/slugGenerator';
import type { ApiContext, CreateClasseurData, UpdateClasseurData } from '@/utils/v2DatabaseUtils';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Créer un classeur
 */
export async function createClasseur(data: CreateClasseurData, userId: string, context: ApiContext) {
  logApi.info(`🚀 Création classeur directe DB`, context);
  
  try {
    // Générer un slug unique
    const slug = await SlugGenerator.generateSlug(data.name, 'classeur', userId, undefined, supabase);
    
    // Créer le classeur
    const { data: classeur, error: createError } = await supabase
      .from('classeurs')
      .insert({
        name: data.name,
        description: data.description,
        emoji: data.icon || data.emoji || '📁',
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
    logApi.error(`❌ Erreur création classeur: ${error}`, context);
    throw error;
  }
}

/**
 * Mettre à jour un classeur
 */
export async function updateClasseur(ref: string, data: UpdateClasseurData, userId: string, context: ApiContext, userToken?: string) {
  logApi.info(`🚀 Mise à jour classeur ${ref}`, context);
  
  try {
    // Créer un client Supabase authentifié si un token est fourni
    const client = userToken
      ? createClient(supabaseUrl, supabaseServiceKey, {
          global: { headers: { Authorization: `Bearer ${userToken}` } }
        })
      : supabase;

    // Résoudre la référence
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

    // Charger l'état courant
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
    if (data.emoji !== undefined) updateData.emoji = data.emoji;
    if (data.position !== undefined) updateData.position = data.position;
    
    // Mise à jour automatique du slug si le nom change
    if (data.name && data.name !== currentClasseur.name) {
      try {
        const newSlug = await SlugGenerator.generateSlug(
          data.name,
          'classeur',
          userId,
          classeurId,
          client
        );
        updateData.slug = newSlug;
      } catch (error) {
        logApi.error(`❌ Erreur mise à jour slug: ${error}`);
      }
    }

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

    logApi.info(`✅ Classeur mis à jour avec succès`, context);
    return { success: true, data: classeur };
    
  } catch (error) {
    logApi.error(`❌ Erreur mise à jour classeur: ${error}`, context);
    throw error;
  }
}

/**
 * Supprimer un classeur
 */
export async function deleteClasseur(ref: string, userId: string, context: ApiContext) {
  logApi.info(`🚀 Suppression classeur ${ref}`, context);
  
  try {
    // Résoudre la référence
    const resolveResult = await V2ResourceResolver.resolveRef(ref, 'classeur', userId, context);
    if (!resolveResult.success) {
      throw new Error(resolveResult.error);
    }

    const classeurId = resolveResult.id;

    // Suppression en cascade : d'abord les notes, puis les dossiers, puis le classeur
    const { error: deleteNotesError } = await supabase
      .from('articles')
      .delete()
      .eq('classeur_id', classeurId)
      .eq('user_id', userId);

    if (deleteNotesError) {
      throw new Error(`Erreur suppression notes: ${deleteNotesError.message}`);
    }

    const { error: deleteFoldersError } = await supabase
      .from('folders')
      .delete()
      .eq('classeur_id', classeurId)
      .eq('user_id', userId);

    if (deleteFoldersError) {
      throw new Error(`Erreur suppression dossiers: ${deleteFoldersError.message}`);
    }

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
    logApi.error(`❌ Erreur suppression classeur: ${error}`, context);
    throw error;
  }
}

/**
 * Réorganiser les classeurs
 */
export async function reorderClasseurs(classeurs: Array<{ id: string; position: number }>, userId: string, context: ApiContext) {
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

    // Mettre à jour la position de chaque classeur
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
    logApi.error(`❌ Erreur réorganisation classeurs: ${error}`, context);
    throw error;
  }
}


