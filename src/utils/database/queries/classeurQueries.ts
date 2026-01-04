/**
 * Queries pour les classeurs (lecture uniquement)
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
 * Récupérer un classeur par ID ou slug
 */
export async function getClasseur(classeurId: string, userId: string, context: ApiContext) {
  logApi.info(`🚀 Récupération classeur ${classeurId}`, context);
  
  try {
    // Résoudre la référence (UUID ou slug)
    const resolveResult = await V2ResourceResolver.resolveRef(classeurId, 'classeur', userId, context);
    if (!resolveResult.success) {
      throw new Error(resolveResult.error);
    }

    const resolvedClasseurId = resolveResult.id;

    // Récupérer le classeur
    const { data: classeur, error } = await supabase
      .from('classeurs')
      .select('*')
      .eq('id', resolvedClasseurId)
      .eq('user_id', userId)
      .single();

    if (error || !classeur) {
      throw new Error(`Classeur non trouvé: ${classeurId}`);
    }

    return { success: true, data: classeur };
  } catch (error) {
    logApi.error(`❌ Erreur: ${error}`, context);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Récupérer la liste des classeurs
 */
export async function getClasseurs(userId: string, context: ApiContext) {
  logApi.info(`🚀 Récupération classeurs`, context);
  
  try {
    const { data: classeurs, error } = await supabase
      .from('classeurs')
      .select('id, name, description, emoji, position, slug, created_at, updated_at')
      .eq('user_id', userId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Erreur récupération classeurs: ${error.message}`);
    }

    return { success: true, data: classeurs || [] };
  } catch (error) {
    logApi.error(`❌ Erreur: ${error}`, context);
    throw error;
  }
}

/**
 * Alias pour getClasseurs
 */
export async function getClasseursWithContent(userId: string, context: ApiContext) {
  return await getClasseurs(userId, context);
}

/**
 * Alias pour getClasseurs
 */
export async function listClasseurs(userId: string, context: ApiContext) {
  return await getClasseurs(userId, context);
}

/**
 * Récupérer l'arbre d'un classeur (avec dossiers et notes)
 */
export async function getClasseurTree(notebookId: string, userId: string, context: ApiContext) {
  logApi.info(`🚀 Récupération arbre classeur directe DB`, context);
  
  try {
    if (!notebookId) {
      throw new Error('notebook_id est requis');
    }
    
    let classeurId = notebookId;
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    // Si ce n'est pas un UUID, essayer de le résoudre comme un slug
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
      .is('trashed_at', null)
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
      .is('trashed_at', null)
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
    logApi.error(`❌ Erreur récupération arbre: ${error}`, context);
    throw error;
  }
}


