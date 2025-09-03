import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedUser, createAuthenticatedSupabaseClient } from '@/utils/authUtils';
import { logApi } from '@/utils/logger';

const purgeResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.object({
    deleted_items: z.object({
      articles: z.number(),
      folders: z.number(),
      classeurs: z.number(),
      files: z.number(),
      total: z.number()
    })
  })
});

/**
 * POST /api/v2/trash/purge
 * Purge automatique des éléments en corbeille depuis plus de 30 jours
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const clientType = request.headers.get('X-Client-Type') || 'unknown';
  
  try {
    const context = {
      operation: 'v2_trash_purge',
      component: 'API_V2',
      clientType
    };

    logApi.info('🚀 Début purge automatique corbeille v2', context);
    
    // 🔐 Authentification
    const authResult = await getAuthenticatedUser(request);
    if (!authResult.success) {
      logApi.info(`❌ Authentification échouée: ${authResult.error}`, context);
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status || 401 }
      );
    }

    const userId = authResult.userId!;
    const supabase = createAuthenticatedSupabaseClient(authResult);

    // 📅 Calculer la date limite (30 jours)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoffDate = thirtyDaysAgo.toISOString();

    logApi.info(`🗑️ Purge des éléments antérieurs à: ${cutoffDate}`, context);

    // 🗑️ Supprimer les articles en corbeille depuis plus de 30 jours
    const { data: deletedArticles, error: articlesError } = await supabase
      .from('articles')
      .delete()
      .eq('user_id', userId)
      .eq('is_in_trash', true)
      .lt('trashed_at', cutoffDate)
      .select('id');

    if (articlesError) {
      logApi.error('❌ Erreur purge articles:', articlesError);
      return NextResponse.json(
        { success: false, error: 'Failed to purge articles' },
        { status: 500 }
      );
    }

    // 🗑️ Supprimer les dossiers en corbeille depuis plus de 30 jours
    const { data: deletedFolders, error: foldersError } = await supabase
      .from('folders')
      .delete()
      .eq('user_id', userId)
      .eq('is_in_trash', true)
      .lt('trashed_at', cutoffDate)
      .select('id');

    if (foldersError) {
      logApi.error('❌ Erreur purge dossiers:', foldersError);
      return NextResponse.json(
        { success: false, error: 'Failed to purge folders' },
        { status: 500 }
      );
    }

    // 🗑️ Supprimer les classeurs en corbeille depuis plus de 30 jours
    const { data: deletedClasseurs, error: classeursError } = await supabase
      .from('classeurs')
      .delete()
      .eq('user_id', userId)
      .eq('is_in_trash', true)
      .lt('trashed_at', cutoffDate)
      .select('id');

    if (classeursError) {
      logApi.error('❌ Erreur purge classeurs:', classeursError);
      return NextResponse.json(
        { success: false, error: 'Failed to purge classeurs' },
        { status: 500 }
      );
    }

    // 🗑️ Supprimer les fichiers en corbeille depuis plus de 30 jours
    const { data: deletedFiles, error: filesError } = await supabase
      .from('files')
      .delete()
      .eq('user_id', userId)
      .eq('is_deleted', true)
      .lt('deleted_at', cutoffDate)
      .select('id');

    if (filesError) {
      logApi.error('❌ Erreur purge fichiers:', filesError);
      return NextResponse.json(
        { success: false, error: 'Failed to purge files' },
        { status: 500 }
      );
    }

    // 📊 Calculer les statistiques
    const deletedItems = {
      articles: deletedArticles?.length || 0,
      folders: deletedFolders?.length || 0,
      classeurs: deletedClasseurs?.length || 0,
      files: deletedFiles?.length || 0,
      total: (deletedArticles?.length || 0) + 
             (deletedFolders?.length || 0) + 
             (deletedClasseurs?.length || 0) + 
             (deletedFiles?.length || 0)
    };

    const response = {
      success: true,
      message: `Purge completed successfully. ${deletedItems.total} items deleted.`,
      data: {
        deleted_items: deletedItems
      }
    };

    // ✅ Validation de la réponse
    const responseValidation = purgeResponseSchema.safeParse(response);
    if (!responseValidation.success) {
      logApi.error('❌ Validation réponse purge échouée:', responseValidation.error);
      return NextResponse.json(
        { success: false, error: 'Invalid response format' },
        { status: 500 }
      );
    }

    const apiTime = Date.now() - startTime;
    logApi.info(`✅ Purge terminée avec succès en ${apiTime}ms (${deletedItems.total} éléments supprimés)`, context);

    return NextResponse.json(response);

  } catch (error) {
    logApi.error('❌ Erreur purge corbeille:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
