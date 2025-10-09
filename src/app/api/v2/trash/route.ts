import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedUser, createAuthenticatedSupabaseClient, extractTokenFromRequest } from '@/utils/authUtils';
import { logApi } from '@/utils/logger';

// ✅ FIX PROD: Force Node.js runtime pour accès aux variables d'env (SUPABASE_SERVICE_ROLE_KEY)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';


const trashItemSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['note', 'folder', 'classeur']),
  name: z.string(),
  trashed_at: z.string(), // Plus flexible que .datetime()
  expires_at: z.string(), // Plus flexible que .datetime()
  original_path: z.string().optional(),
  size: z.number().optional()
});

const trashListResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    items: z.array(trashItemSchema),
    statistics: z.object({
      total: z.number(),
      notes: z.number(),
      folders: z.number(),
      classeurs: z.number()
    })
  })
});

/**
 * GET /api/v2/trash
 * Récupère tous les éléments de la corbeille de l'utilisateur
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const clientType = request.headers.get('X-Client-Type') || 'unknown';
  
  try {
    const context = {
      operation: 'v2_trash_list',
      component: 'API_V2',
      clientType
    };

    logApi.info('🚀 Début récupération corbeille v2', context);
    
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
    logApi.info(`✅ Utilisateur authentifié: ${userId} (type: ${authResult.authType})`, context);
  const userToken = extractTokenFromRequest(request);
    const supabase = createAuthenticatedSupabaseClient(authResult, userToken || undefined);

    // 📋 Récupérer les articles en corbeille
    const { data: articles, error: articlesError } = await supabase
      .from('articles')
      .select('id, source_title, trashed_at, classeur_id, folder_id')
      .eq('user_id', userId)
      .eq('is_in_trash', true)
      .order('trashed_at', { ascending: false });

    if (articlesError) {
      logApi.error('❌ Erreur récupération articles corbeille:', articlesError);
      logApi.error('❌ Détails erreur articles:', { 
        error: articlesError, 
        userId, 
        query: 'articles with is_in_trash = true' 
      });
      return NextResponse.json(
        { success: false, error: 'Failed to fetch articles from trash' },
        { status: 500 }
      );
    }

    // 📁 Récupérer les dossiers en corbeille
    const { data: folders, error: foldersError } = await supabase
      .from('folders')
      .select('id, name, trashed_at, classeur_id, parent_id')
      .eq('user_id', userId)
      .eq('is_in_trash', true)
      .order('trashed_at', { ascending: false });

    if (foldersError) {
      logApi.error('❌ Erreur récupération dossiers corbeille:', foldersError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch folders from trash' },
        { status: 500 }
      );
    }

    // 📚 Récupérer les classeurs en corbeille
    const { data: classeurs, error: classeursError } = await supabase
      .from('classeurs')
      .select('id, name, trashed_at')
      .eq('user_id', userId)
      .eq('is_in_trash', true)
      .order('trashed_at', { ascending: false });

    if (classeursError) {
      logApi.error('❌ Erreur récupération classeurs corbeille:', classeursError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch classeurs from trash' },
        { status: 500 }
      );
    }

    // 🔄 Transformer les données en format unifié
    const trashItems = [
      ...(articles || []).map(article => ({
        id: article.id,
        type: 'note' as const,
        name: article.source_title,
        trashed_at: article.trashed_at,
        expires_at: new Date(new Date(article.trashed_at).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        original_path: article.classeur_id ? `Classeur/${article.folder_id ? 'Dossier/' : ''}` : undefined
      })),
      ...(folders || []).map(folder => ({
        id: folder.id,
        type: 'folder' as const,
        name: folder.name,
        trashed_at: folder.trashed_at,
        expires_at: new Date(new Date(folder.trashed_at).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        original_path: folder.classeur_id ? 'Classeur/' : undefined
      })),
      ...(classeurs || []).map(classeur => ({
        id: classeur.id,
        type: 'classeur' as const,
        name: classeur.name,
        trashed_at: classeur.trashed_at,
        expires_at: new Date(new Date(classeur.trashed_at).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
      }))
    ];

    // 📊 Calculer les statistiques
    const statistics = {
      total: trashItems.length,
      notes: trashItems.filter(item => item.type === 'note').length,
      folders: trashItems.filter(item => item.type === 'folder').length,
      classeurs: trashItems.filter(item => item.type === 'classeur').length
    };

    const response = {
      success: true,
      data: {
        items: trashItems,
        statistics
      }
    };

    // ✅ Validation de la réponse
    const validationResult = trashListResponseSchema.safeParse(response);
    if (!validationResult.success) {
      logApi.error('❌ Validation réponse corbeille échouée:', validationResult.error);
      return NextResponse.json(
        { success: false, error: 'Invalid response format' },
        { status: 500 }
      );
    }

    const apiTime = Date.now() - startTime;
    logApi.info(`✅ Corbeille récupérée avec succès en ${apiTime}ms (${statistics.total} éléments)`, context);

    return NextResponse.json(response);

  } catch (error) {
    logApi.error('❌ Erreur récupération corbeille:', error);
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

/**
 * DELETE /api/v2/trash
 * Vide complètement la corbeille (suppression définitive)
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const clientType = request.headers.get('X-Client-Type') || 'unknown';
  
  try {
    const context = {
      operation: 'v2_trash_empty',
      component: 'API_V2',
      clientType
    };

    logApi.info('🚀 Début vidage corbeille v2', context);
    
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
  const userToken = extractTokenFromRequest(request);
    const supabase = createAuthenticatedSupabaseClient(authResult, userToken || undefined);

    // 🗑️ Supprimer définitivement tous les éléments en corbeille
    const { error: articlesError } = await supabase
      .from('articles')
      .delete()
      .eq('user_id', userId)
      .eq('is_in_trash', true);

    if (articlesError) {
      logApi.error('❌ Erreur suppression articles corbeille:', articlesError);
      return NextResponse.json(
        { success: false, error: 'Failed to delete articles from trash' },
        { status: 500 }
      );
    }

    const { error: foldersError } = await supabase
      .from('folders')
      .delete()
      .eq('user_id', userId)
      .eq('is_in_trash', true);

    if (foldersError) {
      logApi.error('❌ Erreur suppression dossiers corbeille:', foldersError);
      return NextResponse.json(
        { success: false, error: 'Failed to delete folders from trash' },
        { status: 500 }
      );
    }

    const { error: classeursError } = await supabase
      .from('classeurs')
      .delete()
      .eq('user_id', userId)
      .eq('is_in_trash', true);

    if (classeursError) {
      logApi.error('❌ Erreur suppression classeurs corbeille:', classeursError);
      return NextResponse.json(
        { success: false, error: 'Failed to delete classeurs from trash' },
        { status: 500 }
      );
    }

    const response = {
      success: true,
      message: 'Trash emptied successfully'
    };

    const apiTime = Date.now() - startTime;
    logApi.info(`✅ Corbeille vidée avec succès en ${apiTime}ms`, context);

    return NextResponse.json(response);

  } catch (error) {
    logApi.error('❌ Erreur vidage corbeille:', error);
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
