/**
 * Queries pour les utilisateurs (lecture uniquement)
 * Extrait de V2DatabaseUtils pour respecter limite 300 lignes
 */

import { createClient } from '@supabase/supabase-js';
import { logApi } from '@/utils/logger';
import type { ApiContext } from '@/utils/database/types/databaseTypes';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Récupérer les informations d'un utilisateur
 */
export async function getUserInfo(userId: string, context: ApiContext) {
  logApi.info(`🚀 Récupération infos utilisateur ${userId}`, context);
  
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name, avatar_url, created_at, updated_at')
      .eq('id', userId)
      .single();

    if (error || !user) {
      throw new Error(`Utilisateur non trouvé: ${userId}`);
    }

    logApi.info(`✅ Infos utilisateur récupérées avec succès`, context);
    return { success: true, data: user };
  } catch (error) {
    logApi.error(`❌ Erreur récupération infos utilisateur: ${error}`, context);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Récupérer le profil d'un utilisateur
 */
export async function getUserProfile(userId: string, context: ApiContext) {
  logApi.info(`🚀 Récupération profil utilisateur ${userId}`, context);
  
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name, avatar_url, created_at, updated_at')
      .eq('id', userId)
      .single();

    if (error || !user) {
      throw new Error(`Utilisateur non trouvé: ${userId}`);
    }

    logApi.info(`✅ Profil utilisateur récupéré avec succès`, context);
    return { success: true, data: user };
  } catch (error) {
    logApi.error(`❌ Erreur récupération profil: ${error}`, context);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Récupérer les statistiques d'un utilisateur
 */
export async function getStats(userId: string, context: ApiContext) {
  logApi.info(`🚀 Récupération statistiques utilisateur ${userId}`, context);
  
  try {
    // Compter les notes
    const { count: notesCount } = await supabase
      .from('articles')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('trashed_at', null);

    // Compter les classeurs
    const { count: classeursCount } = await supabase
      .from('classeurs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Compter les dossiers
    const { count: foldersCount } = await supabase
      .from('folders')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('trashed_at', null);

    const stats = {
      notes: notesCount || 0,
      classeurs: classeursCount || 0,
      folders: foldersCount || 0
    };

    logApi.info(`✅ Statistiques récupérées avec succès`, context);
    return { success: true, data: stats };
  } catch (error) {
    logApi.error(`❌ Erreur récupération statistiques: ${error}`, context);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

