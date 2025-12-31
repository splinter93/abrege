/**
 * Queries pour les permissions et partage
 * Extrait de V2DatabaseUtils pour respecter limite 300 lignes
 * 
 * Conformité GUIDE-EXCELLENCE-CODE.md:
 * - Max 300 lignes par fichier
 * - 1 fichier = 1 responsabilité
 */

import { createClient } from '@supabase/supabase-js';
import { logApi } from '@/utils/logger';
import type { ApiContext, ShareSettings } from '@/utils/v2DatabaseUtils';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Récupérer les paramètres de partage d'une note
 */
export async function getNoteShareSettings(ref: string, userId: string, context: ApiContext) {
  logApi.info(`🚀 Récupération paramètres partage ${ref}`, context);
  
  try {
    const { data: note, error } = await supabase
      .from('articles')
      .select('id, visibility, allow_edit, allow_comments')
      .eq('id', ref)
      .eq('user_id', userId)
      .single();

    if (error || !note) {
      throw new Error(`Note non trouvée: ${ref}`);
    }

    return { 
      success: true, 
      data: {
        visibility: note.visibility || 'private',
        allow_edit: note.allow_edit || false,
        allow_comments: note.allow_comments || false
      }
    };
  } catch (error) {
    logApi.error(`❌ Erreur: ${error}`, context);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Mettre à jour les paramètres de partage d'une note
 */
export async function updateNoteShareSettings(ref: string, settings: ShareSettings, userId: string, context: ApiContext) {
  logApi.info(`🚀 Mise à jour paramètres partage ${ref}`, context);
  
  try {
    const { error } = await supabase
      .from('articles')
      .update({
        visibility: settings.visibility,
        allow_edit: settings.allow_edit,
        allow_comments: settings.allow_comments,
        updated_at: new Date().toISOString()
      })
      .eq('id', ref)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Erreur mise à jour: ${error.message}`);
    }

    return { success: true, data: { message: 'Paramètres de partage mis à jour' } };
  } catch (error) {
    logApi.error(`❌ Erreur: ${error}`, context);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

