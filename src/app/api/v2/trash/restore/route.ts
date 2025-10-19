import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedUser, createAuthenticatedSupabaseClient, extractTokenFromRequest } from '@/utils/authUtils';
import { logApi } from '@/utils/logger';
import { createClient } from '@supabase/supabase-js';

// ✅ FIX PROD: Force Node.js runtime pour accès aux variables d'env (SUPABASE_SERVICE_ROLE_KEY)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';


const restoreRequestSchema = z.object({
  resource_type: z.enum(['note', 'folder', 'classeur', 'file']),
  resource_id: z.string().uuid()
});

const restoreResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  resource_type: z.string(),
  resource_id: z.string()
});

/**
 * POST /api/v2/trash/restore
 * Restaure un élément de la corbeille
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const clientType = request.headers.get('X-Client-Type') || 'unknown';
  
  try {
    const context = {
      operation: 'v2_trash_restore',
      component: 'API_V2',
      clientType
    };

    logApi.info('🚀 Début restauration corbeille v2', context);
    
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

    // 📋 Validation du body
    const body = await request.json();
    const validationResult = restoreRequestSchema.safeParse(body);
    
    if (!validationResult.success) {
      logApi.info(`❌ Validation body échouée: ${validationResult.error.message}`, context);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid request body',
          details: validationResult.error.message
        },
        { status: 400 }
      );
    }

    const { resource_type, resource_id } = validationResult.data;

    // 🔄 Restaurer l'élément selon son type
    let restoreResult;

    switch (resource_type) {
      case 'note':
        restoreResult = await restoreFromTrash(supabase, 'articles', resource_id, userId, context);
        break;
      case 'folder':
        restoreResult = await restoreFromTrash(supabase, 'folders', resource_id, userId, context);
        break;
      case 'classeur':
        restoreResult = await restoreFromTrash(supabase, 'classeurs', resource_id, userId, context);
        break;
      case 'file':
        restoreResult = await restoreFileFromTrash(supabase, resource_id, userId, context);
        break;
      default:
        return NextResponse.json(
          { success: false, error: 'Unsupported resource type' },
          { status: 400 }
        );
    }

    if (!restoreResult.success) {
      logApi.info(`❌ Erreur restauration ${resource_type}: ${restoreResult.error}`, context);
      return NextResponse.json(
        { success: false, error: restoreResult.error || 'Failed to restore resource' },
        { status: 400 }
      );
    }

    const response = {
      success: true,
      message: `${resource_type} restored successfully`,
      resource_type,
      resource_id
    };

    // ✅ Validation de la réponse
    const responseValidation = restoreResponseSchema.safeParse(response);
    if (!responseValidation.success) {
      logApi.error('❌ Validation réponse restauration échouée:', responseValidation.error);
      return NextResponse.json(
        { success: false, error: 'Invalid response format' },
        { status: 500 }
      );
    }

    const apiTime = Date.now() - startTime;
    logApi.info(`✅ ${resource_type} restauré avec succès en ${apiTime}ms`, context);

    return NextResponse.json(response);

  } catch (error) {
    logApi.error('❌ Erreur restauration corbeille:', error);
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
 * Fonction utilitaire pour restaurer un élément de la corbeille
 */
async function restoreFromTrash(
  supabase: ReturnType<typeof createClient>,
  tableName: string,
  resourceId: string,
  userId: string,
  context: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  try {
    // Vérifier que l'élément existe et est en corbeille
    const { data: item, error: fetchError } = await supabase
      .from(tableName)
      .select('id, is_in_trash')
      .eq('id', resourceId)
      .eq('user_id', userId)
      .eq('is_in_trash', true)
      .single();

    if (fetchError || !item) {
      logApi.error(`❌ Élément non trouvé en corbeille ${tableName}:`, fetchError);
      return { success: false, error: 'Item not found in trash' };
    }

    // Restaurer l'élément
    const { error } = await supabase
      .from(tableName)
      .update({
        is_in_trash: false,
        trashed_at: null
      })
      .eq('id', resourceId)
      .eq('user_id', userId);

    if (error) {
      logApi.error(`❌ Erreur restauration ${tableName}:`, error);
      return { success: false, error: `Failed to restore ${tableName}` };
    }

    return { success: true };
  } catch (error) {
    logApi.error(`❌ Erreur restoreFromTrash:`, error);
    return { success: false, error: 'Internal error during restore operation' };
  }
}

/**
 * Fonction pour restaurer un fichier de la corbeille
 */
async function restoreFileFromTrash(
  supabase: ReturnType<typeof createClient>,
  fileId: string,
  userId: string,
  context: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  try {
    // Vérifier que le fichier existe et est en corbeille
    const { data: file, error: fetchError } = await supabase
      .from('files')
      .select('id, is_deleted')
      .eq('id', fileId)
      .eq('user_id', userId)
      .eq('is_deleted', true)
      .single();

    if (fetchError || !file) {
      logApi.error('❌ Fichier non trouvé en corbeille:', fetchError);
      return { success: false, error: 'File not found in trash' };
    }

    // Restaurer le fichier
    const { error } = await supabase
      .from('files')
      .update({
        is_deleted: false,
        deleted_at: null
      })
      .eq('id', fileId)
      .eq('user_id', userId);

    if (error) {
      logApi.error('❌ Erreur restauration fichier:', error);
      return { success: false, error: 'Failed to restore file' };
    }

    return { success: true };
  } catch (error) {
    logApi.error('❌ Erreur restoreFileFromTrash:', error);
    return { success: false, error: 'Internal error during file restore operation' };
  }
}
