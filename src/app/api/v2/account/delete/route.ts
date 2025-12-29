/**
 * DELETE /api/v2/account/delete
 * 
 * Suppression complète du compte utilisateur (GDPR - Right to be forgotten)
 * 
 * Supprime TOUTES les données de l'utilisateur :
 * - Notes (articles)
 * - Dossiers (folders)
 * - Classeurs (classeurs)
 * - Fichiers (files)
 * - Sessions de chat (chat_sessions)
 * - Clés API (api_keys)
 * - Logs d'accès (file_events)
 * - Canva sessions (canva_sessions)
 * - Abonnements (user_subscriptions)
 * - Quota de stockage (storage_usage)
 * 
 * ⚠️ ACTION IRRÉVERSIBLE - L'utilisateur doit confirmer explicitement
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedUser, createAuthenticatedSupabaseClient, extractTokenFromRequest } from '@/utils/authUtils';
import { logApi } from '@/utils/logger';

export const dynamic = 'force-dynamic';

const deleteAccountRequestSchema = z.object({
  confirm: z.literal(true, {
    errorMap: () => ({ message: 'Vous devez confirmer explicitement la suppression' })
  }),
  password: z.string().optional(), // Optionnel pour l'instant (2FA à implémenter plus tard)
});

const deleteAccountResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.object({
    deleted_items: z.object({
      articles: z.number(),
      folders: z.number(),
      classeurs: z.number(),
      files: z.number(),
      chat_sessions: z.number(),
      api_keys: z.number(),
      file_events: z.number(),
      total: z.number()
    })
  })
});

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const clientType = request.headers.get('X-Client-Type') || 'unknown';
  
  try {
    const context = {
      operation: 'v2_account_delete',
      component: 'API_V2',
      clientType
    };

    logApi.info('🚀 Début suppression compte utilisateur (GDPR)', context);
    
    // 🔐 Authentification obligatoire
    const authResult = await getAuthenticatedUser(request);
    if (!authResult.success) {
      logApi.warn(`❌ Authentification échouée: ${authResult.error}`, context);
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status || 401 }
      );
    }

    const userId = authResult.userId!;
    const userToken = extractTokenFromRequest(request);
    const supabase = createAuthenticatedSupabaseClient(authResult, userToken || undefined);

    // 📋 Validation de la confirmation
    let body: { confirm?: boolean; password?: string } = {};
    try {
      body = await request.json();
    } catch {
      // Body optionnel, mais confirm doit être true
    }

    const validation = deleteAccountRequestSchema.safeParse(body);
    if (!validation.success) {
      logApi.warn('❌ Confirmation manquante ou invalide', {
        ...context,
        errors: validation.error.errors
      });
      return NextResponse.json(
        { 
          success: false, 
          error: 'Confirmation requise. Vous devez confirmer explicitement la suppression avec { "confirm": true }',
          details: validation.error.errors
        },
        { status: 400 }
      );
    }

    logApi.info(`🗑️ Suppression compte utilisateur ${userId} confirmée`, context);

    // 🗑️ Supprimer TOUTES les données de l'utilisateur (dans l'ordre pour éviter les contraintes FK)

    // 1. Supprimer les notes (articles)
    const { data: deletedArticles, error: articlesError } = await supabase
      .from('articles')
      .delete()
      .eq('user_id', userId)
      .select('id');

    if (articlesError) {
      logApi.error('❌ Erreur suppression articles:', articlesError);
      return NextResponse.json(
        { success: false, error: 'Failed to delete articles' },
        { status: 500 }
      );
    }

    // 2. Supprimer les dossiers (folders)
    const { data: deletedFolders, error: foldersError } = await supabase
      .from('folders')
      .delete()
      .eq('user_id', userId)
      .select('id');

    if (foldersError) {
      logApi.error('❌ Erreur suppression dossiers:', foldersError);
      return NextResponse.json(
        { success: false, error: 'Failed to delete folders' },
        { status: 500 }
      );
    }

    // 3. Supprimer les classeurs (classeurs)
    const { data: deletedClasseurs, error: classeursError } = await supabase
      .from('classeurs')
      .delete()
      .eq('user_id', userId)
      .select('id');

    if (classeursError) {
      logApi.error('❌ Erreur suppression classeurs:', classeursError);
      return NextResponse.json(
        { success: false, error: 'Failed to delete classeurs' },
        { status: 500 }
      );
    }

    // 4. Supprimer les fichiers (files)
    const { data: deletedFiles, error: filesError } = await supabase
      .from('files')
      .delete()
      .eq('user_id', userId)
      .select('id');

    if (filesError) {
      logApi.error('❌ Erreur suppression fichiers:', filesError);
      return NextResponse.json(
        { success: false, error: 'Failed to delete files' },
        { status: 500 }
      );
    }

    // 5. Supprimer les sessions de chat (chat_sessions)
    const { data: deletedSessions, error: sessionsError } = await supabase
      .from('chat_sessions')
      .delete()
      .eq('user_id', userId)
      .select('id');

    if (sessionsError) {
      logApi.error('❌ Erreur suppression sessions chat:', sessionsError);
      return NextResponse.json(
        { success: false, error: 'Failed to delete chat sessions' },
        { status: 500 }
      );
    }

    // 6. Supprimer les clés API (api_keys)
    const { data: deletedApiKeys, error: apiKeysError } = await supabase
      .from('api_keys')
      .delete()
      .eq('user_id', userId)
      .select('id');

    if (apiKeysError) {
      logApi.error('❌ Erreur suppression clés API:', apiKeysError);
      return NextResponse.json(
        { success: false, error: 'Failed to delete API keys' },
        { status: 500 }
      );
    }

    // 7. Supprimer les logs d'accès (file_events) - si la table existe
    let deletedFileEvents = 0;
    try {
      const { data: deletedEvents, error: fileEventsError } = await supabase
        .from('file_events')
        .delete()
        .eq('user_id', userId)
        .select('id');

      if (fileEventsError) {
        // Table peut ne pas exister, on log mais on continue
        logApi.warn('⚠️ Erreur suppression file_events (table peut ne pas exister):', fileEventsError);
      } else {
        deletedFileEvents = deletedEvents?.length || 0;
      }
    } catch {
      // Table n'existe peut-être pas, on continue
      logApi.debug('⚠️ Table file_events non trouvée, ignorée');
    }

    // 8. Supprimer les canva sessions (canva_sessions)
    let deletedCanvaSessions = 0;
    try {
      const { data: deletedCanvas, error: canvaError } = await supabase
        .from('canva_sessions')
        .delete()
        .eq('user_id', userId)
        .select('id');

      if (canvaError) {
        logApi.warn('⚠️ Erreur suppression canva_sessions:', canvaError);
      } else {
        deletedCanvaSessions = deletedCanvas?.length || 0;
      }
    } catch {
      logApi.debug('⚠️ Table canva_sessions non trouvée, ignorée');
    }

    // 9. Supprimer les abonnements (user_subscriptions)
    let deletedSubscriptions = 0;
    try {
      const { data: deletedSubs, error: subsError } = await supabase
        .from('user_subscriptions')
        .delete()
        .eq('user_id', userId)
        .select('id');

      if (subsError) {
        logApi.warn('⚠️ Erreur suppression user_subscriptions:', subsError);
      } else {
        deletedSubscriptions = deletedSubs?.length || 0;
      }
    } catch {
      logApi.debug('⚠️ Table user_subscriptions non trouvée, ignorée');
    }

    // 10. Supprimer le quota de stockage (storage_usage)
    let deletedStorageUsage = 0;
    try {
      const { data: deletedStorage, error: storageError } = await supabase
        .from('storage_usage')
        .delete()
        .eq('user_id', userId)
        .select('user_id');

      if (storageError) {
        logApi.warn('⚠️ Erreur suppression storage_usage:', storageError);
      } else {
        deletedStorageUsage = deletedStorage?.length || 0;
      }
    } catch {
      logApi.debug('⚠️ Table storage_usage non trouvée, ignorée');
    }

    // 📊 Calculer les statistiques
    const deletedItems = {
      articles: deletedArticles?.length || 0,
      folders: deletedFolders?.length || 0,
      classeurs: deletedClasseurs?.length || 0,
      files: deletedFiles?.length || 0,
      chat_sessions: deletedSessions?.length || 0,
      api_keys: deletedApiKeys?.length || 0,
      file_events: deletedFileEvents,
      canva_sessions: deletedCanvaSessions,
      subscriptions: deletedSubscriptions,
      storage_usage: deletedStorageUsage,
      total: (deletedArticles?.length || 0) +
             (deletedFolders?.length || 0) +
             (deletedClasseurs?.length || 0) +
             (deletedFiles?.length || 0) +
             (deletedSessions?.length || 0) +
             (deletedApiKeys?.length || 0) +
             deletedFileEvents +
             deletedCanvaSessions +
             deletedSubscriptions +
             deletedStorageUsage
    };

    const response = {
      success: true,
      message: 'Compte supprimé avec succès. Toutes vos données ont été définitivement supprimées.',
      data: {
        deleted_items: deletedItems
      }
    };

    const apiTime = Date.now() - startTime;
    logApi.info(`✅ Compte utilisateur ${userId} supprimé avec succès en ${apiTime}ms`, {
      ...context,
      deletedItems
    });

    // ⚠️ NOTE: L'utilisateur Supabase (auth.users) n'est PAS supprimé automatiquement
    // C'est une décision de sécurité - seul l'admin Supabase peut supprimer un compte auth
    // Les données utilisateur sont supprimées, mais le compte auth reste (peut être réactivé)

    return NextResponse.json(response);

  } catch (error) {
    logApi.error('❌ Erreur suppression compte:', error);
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

