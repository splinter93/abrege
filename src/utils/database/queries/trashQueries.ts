/**
 * Queries pour la corbeille (lecture uniquement)
 * Extrait de V2DatabaseUtils pour respecter limite 300 lignes
 */

import { createClient } from '@supabase/supabase-js';
import { logApi } from '@/utils/logger';
import type { ApiContext } from '@/utils/database/types/databaseTypes';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Récupérer les éléments de la corbeille
 */
export async function getTrash(userId: string, context: ApiContext) {
  logApi.info(`🚀 Récupération corbeille ${userId}`, context);
  
  try {
    // Récupérer les éléments supprimés
    const { data: trashItems, error } = await supabase
      .from('trash')
      .select('*')
      .eq('user_id', userId)
      .order('trashed_at', { ascending: false });

    if (error) {
      throw new Error(`Erreur récupération corbeille: ${error.message}`);
    }

    logApi.info(`✅ Corbeille récupérée avec succès`, context);
    return { success: true, data: trashItems || [] };
  } catch (error) {
    logApi.error(`❌ Erreur récupération corbeille: ${error}`, context);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

