import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedUser, createAuthenticatedSupabaseClient, extractTokenFromRequest } from '@/utils/authUtils';
import { ApiContext } from '@/utils/v2DatabaseUtils';
import { logApi } from '@/utils/logger';
import { canPerformAction } from '@/utils/scopeValidation';
import { SupabaseClient } from '@supabase/supabase-js';

// ✅ FIX PROD: Force Node.js runtime pour accès aux variables d'env (SUPABASE_SERVICE_ROLE_KEY)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';


const resourceSchema = z.enum(['classeur', 'note', 'folder', 'file']);
const deleteResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  resource_type: z.string(),
  resource_id: z.string()
});

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ resource: string; ref: string }> }
) {
  const startTime = Date.now();
  const clientType = request.headers.get('X-Client-Type') || 'unknown';
  
  // Await les params dans Next.js 15
  const { resource, ref } = await params;
  
  try {
    
    const context = {
      operation: 'v2_unified_delete',
      component: 'API_V2',
      clientType,
      resource,
      ref
    };

    logApi.info(`🚀 Début suppression ${resource} v2`, context);
    
    // Validation du type de ressource
    const resourceValidation = resourceSchema.safeParse(resource);
    if (!resourceValidation.success) {
      logApi.info(`❌ Type de ressource invalide: ${resource}`, context);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid resource type. Must be one of: classeur, note, folder, file' 
        },
        { status: 400 }
      );
    }

    const resourceType = resourceValidation.data;
    const resourceId = ref;

    // 🔐 Authentification conforme aux autres endpoints V2
    const authResult = await getAuthenticatedUser(request);
    if (!authResult.success) {
      logApi.info(`❌ Authentification échouée: ${authResult.error}`, context);
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status || 401 }
      );
    }

    const userId = authResult.userId!;

    // 🔐 Vérification des permissions selon le type de ressource
    let requiredAction: 'notes:delete' | 'classeurs:delete' | 'dossiers:delete' | 'files:delete';
    switch (resourceType) {
      case 'note':
        requiredAction = 'notes:delete';
        break;
      case 'classeur':
        requiredAction = 'classeurs:delete';
        break;
      case 'folder':
        requiredAction = 'dossiers:delete';
        break;
      case 'file':
        requiredAction = 'files:delete';
        break;
      default:
        return NextResponse.json(
          { success: false, error: 'Unsupported resource type' },
          { status: 400 }
        );
    }

    // Vérifier les permissions
    if (!canPerformAction(authResult, requiredAction, context)) {
      logApi.warn(`❌ Permissions insuffisantes pour ${requiredAction}`, context);
      return NextResponse.json(
        { 
          success: false, 
          error: `Permissions insuffisantes. Scope requis: ${requiredAction}`,
          required_scope: requiredAction,
          available_scopes: authResult.scopes || []
        },
        { status: 403 }
      );
    }

    // 🔧 Créer le client Supabase authentifié conforme aux autres endpoints V2
  const userToken = extractTokenFromRequest(request);
    const supabase = createAuthenticatedSupabaseClient(authResult, userToken || undefined);
    
    // 🗑️ Mettre en corbeille au lieu de supprimer définitivement
    let trashResult;

    switch (resourceType) {
      case 'note':
        trashResult = await moveToTrash(supabase, 'articles', resourceId, userId, context);
        break;
      case 'classeur':
        // Pour les classeurs, mettre en corbeille en cascade
        trashResult = await moveClasseurToTrash(supabase, resourceId, userId, context);
        break;
      case 'folder':
        // Pour les dossiers, mettre en corbeille en cascade
        trashResult = await moveFolderToTrash(supabase, resourceId, userId, context);
        break;
      case 'file':
        // Les fichiers utilisent déjà is_deleted, on peut s'en inspirer
        trashResult = await moveToTrash(supabase, 'files', resourceId, userId, context);
        break;
      default:
        return NextResponse.json(
          { success: false, error: 'Unsupported resource type' },
          { status: 400 }
        );
    }

    if (!trashResult.success) {
      logApi.info(`❌ Erreur mise en corbeille ${resourceType}: ${trashResult.error}`, context);
      return NextResponse.json(
        { success: false, error: trashResult.error || 'Failed to move resource to trash' },
        { status: 400 }
      );
    }

    // Réponse de succès avec données mises à jour
    const response = {
      success: true,
      message: `${resourceType} moved to trash successfully`,
      resource_type: resourceType,
      resource_id: resourceId,
      data: {
        updated: true,
        action: 'moved_to_trash',
        timestamp: new Date().toISOString()
      }
    };

    const apiTime = Date.now() - startTime;
    logApi.info(`✅ ${resourceType} mis en corbeille avec succès en ${apiTime}ms`, context);

    return NextResponse.json(response);

  } catch (error) {
    // Dans le catch, on ne peut pas accéder aux params directement
    logApi.error('[UNIFIED-DELETE] Error deleting resource', error);
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

export async function HEAD(
  request: NextRequest,
  { params }: { params: Promise<{ resource: string; ref: string }> }
) {
  const clientType = request.headers.get('X-Client-Type') || 'unknown';
  
  // Await les params dans Next.js 15
  const { resource, ref } = await params;
  
  try {
    
    const context = {
      operation: 'v2_unified_delete_head',
      component: 'API_V2',
      clientType,
      resource,
      ref
    };

    // Validation du type de ressource
    const resourceValidation = resourceSchema.safeParse(resource);
    if (!resourceValidation.success) {
      logApi.info(`❌ Type de ressource invalide pour HEAD: ${resource}`, context);
      return new NextResponse(null, { 
        status: 400,
        headers: {
          'X-Error': 'Invalid resource type. Must be one of: classeur, note, folder, file'
        }
      });
    }

    const resourceType = resourceValidation.data;
    const resourceId = ref;

    return new NextResponse(null, {
      status: 200,
      headers: {
        'X-Endpoint': `/api/v2/delete/${resourceType}/${resourceId}`,
        'X-Method': 'DELETE',
        'X-Resource-Type': resourceType,
        'X-Resource-Id': resourceId,
        'X-Description': `Delete ${resourceType} with ID ${resourceId}`,
        'X-Response-Schema': JSON.stringify(deleteResponseSchema.shape)
      }
    });
    
  } catch (error) {
    logApi.error(`❌ Erreur HEAD ${resource}/${ref}:`, error);
    return new NextResponse(null, { 
      status: 500,
      headers: {
        'X-Error': 'Internal server error'
      }
    });
  }
}

/**
 * Fonction utilitaire pour mettre un élément en corbeille
 */
async function moveToTrash(
  supabase: SupabaseClient,
  tableName: string,
  resourceId: string,
  userId: string,
  context: ApiContext
): Promise<{ success: boolean; error?: string }> {
  try {
    const now = new Date().toISOString();
    
    // Pour les fichiers : utiliser le service role pour contourner la restriction RLS SELECT.
    // La politique SELECT exige is_deleted = false, ce qui est évalué comme WITH CHECK implicite
    // sur la nouvelle ligne après UPDATE. Cela provoque une erreur 42501 avec le client user-JWT.
    // L'ownership est garantie par le filtre .eq('user_id', userId).
    if (tableName === 'files') {
      const { createClient } = await import('@supabase/supabase-js');
      const serviceClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      const { error } = await serviceClient
        .from('files')
        .update({
          is_deleted: true,
          deleted_at: now
        })
        .eq('id', resourceId)
        .eq('user_id', userId);

      if (error) {
        logApi.error(`❌ Erreur mise en corbeille fichier:`, error);
        return { success: false, error: 'Failed to move file to trash' };
      }
    } else {
      // Pour les autres tables, utiliser is_in_trash et trashed_at
      const { error } = await supabase
        .from(tableName)
        .update({
          is_in_trash: true,
          trashed_at: now
        })
        .eq('id', resourceId)
        .eq('user_id', userId);

      if (error) {
        logApi.error(`❌ Erreur mise en corbeille ${tableName}:`, error);
        return { success: false, error: `Failed to move ${tableName} to trash` };
      }
    }

    return { success: true };
  } catch (error) {
    logApi.error(`❌ Erreur moveToTrash:`, error);
    return { success: false, error: 'Internal error during trash operation' };
  }
}

/**
 * Fonction pour mettre un classeur en corbeille avec tous ses enfants
 */
async function moveClasseurToTrash(
  supabase: SupabaseClient,
  classeurId: string,
  userId: string,
  context: ApiContext
): Promise<{ success: boolean; error?: string }> {
  try {
    const now = new Date().toISOString();

    // 1. Mettre le classeur en corbeille
    const { error: classeurError } = await supabase
      .from('classeurs')
      .update({
        is_in_trash: true,
        trashed_at: now
      })
      .eq('id', classeurId)
      .eq('user_id', userId);

    if (classeurError) {
      logApi.error('❌ Erreur mise en corbeille classeur:', classeurError);
      return { success: false, error: 'Failed to move classeur to trash' };
    }

    // 2. Mettre tous les dossiers du classeur en corbeille
    const { error: foldersError } = await supabase
      .from('folders')
      .update({
        is_in_trash: true,
        trashed_at: now
      })
      .eq('classeur_id', classeurId)
      .eq('user_id', userId);

    if (foldersError) {
      logApi.error('❌ Erreur mise en corbeille dossiers:', foldersError);
      return { success: false, error: 'Failed to move folders to trash' };
    }

    // 3. Mettre toutes les notes du classeur en corbeille
    const { error: articlesError } = await supabase
      .from('articles')
      .update({
        is_in_trash: true,
        trashed_at: now
      })
      .eq('classeur_id', classeurId)
      .eq('user_id', userId);

    if (articlesError) {
      logApi.error('❌ Erreur mise en corbeille articles:', articlesError);
      return { success: false, error: 'Failed to move articles to trash' };
    }

    return { success: true };
  } catch (error) {
    logApi.error('❌ Erreur moveClasseurToTrash:', error);
    return { success: false, error: 'Internal error during classeur trash operation' };
  }
}

/**
 * Fonction pour mettre un dossier en corbeille avec tous ses enfants (OPTIMISÉE)
 */
async function moveFolderToTrash(
  supabase: SupabaseClient,
  folderId: string,
  userId: string,
  context: ApiContext
): Promise<{ success: boolean; error?: string }> {
  try {
    const now = new Date().toISOString();

    // ⚡ OPTIMISATION: Transaction en une seule requête avec RPC
    const { error: rpcError } = await supabase.rpc('move_folder_to_trash', {
      p_folder_id: folderId,
      p_user_id: userId,
      p_trashed_at: now
    });

    if (rpcError) {
      logApi.error('❌ Erreur RPC move_folder_to_trash:', rpcError);
      return { success: false, error: 'Failed to move folder to trash' };
    }

    return { success: true };
  } catch (error) {
    logApi.error('❌ Erreur moveFolderToTrash:', error);
    return { success: false, error: 'Internal error during folder trash operation' };
  }
}
