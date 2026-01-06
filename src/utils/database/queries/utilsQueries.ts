/**
 * Queries utilitaires (lecture uniquement)
 * Extrait de V2DatabaseUtils pour respecter limite 300 lignes
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logApi } from '@/utils/logger';
import { SlugGenerator } from '@/utils/slugGenerator';
import type { ApiContext } from '@/utils/database/types/databaseTypes';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Générer un slug unique
 */
export async function generateSlug(text: string, type: 'note' | 'classeur' | 'folder', userId: string, context: ApiContext, supabaseClient?: SupabaseClient) {
  logApi.info(`🚀 Génération slug pour ${type}`, context);
  
  try {
    // Client Supabase authentifié requis
    if (!supabaseClient) {
      throw new Error('Client Supabase authentifié requis pour la génération de slug');
    }
    
    const slug = await SlugGenerator.generateSlug(text, type, userId, undefined, supabaseClient);
    
    logApi.info(`✅ Slug généré avec succès`, context);
    return {
      success: true,
      slug,
      original: text
    };
  } catch (error) {
    logApi.error(`❌ Erreur génération slug: ${error}`, context);
    throw error;
  }
}

/**
 * Lister les tools disponibles
 */
export async function listTools(userId: string, context: ApiContext) {
  logApi.info(`🚀 Liste tools ${userId}`, context);
  return { success: true, data: [] };
}

/**
 * Informations de debug
 */
export async function debugInfo(userId: string, context: ApiContext) {
  logApi.info(`🚀 Debug info ${userId}`, context);
  return { 
    success: true, 
    data: {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: '2.0.0',
      features: ['api_v2', 'harmony', 'agents']
    }
  };
}

