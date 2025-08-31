import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedUser, createAuthenticatedSupabaseClient } from '@/utils/authUtils';
import { V2DatabaseUtils } from '@/utils/v2DatabaseUtils';
import { logApi } from '@/utils/logger';

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
  
  try {
    // Await les params dans Next.js 15
    const { resource, ref } = await params;
    
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

    // 🔧 Créer le client Supabase authentifié conforme aux autres endpoints V2
    const supabase = createAuthenticatedSupabaseClient(authResult);
    
    // Utiliser V2DatabaseUtils pour la suppression (méthodes statiques)
    let deleteResult;

    switch (resourceType) {
      case 'note':
        deleteResult = await V2DatabaseUtils.deleteNote(resourceId, userId, context);
        break;
      case 'classeur':
        deleteResult = await V2DatabaseUtils.deleteClasseur(resourceId, userId, context);
        break;
      case 'folder':
        deleteResult = await V2DatabaseUtils.deleteFolder(resourceId, userId, context);
        break;
      case 'file':
        // Vérifier si deleteFile existe
        if (typeof V2DatabaseUtils.deleteFile === 'function') {
          deleteResult = await V2DatabaseUtils.deleteFile(resourceId, userId, context);
        } else {
          return NextResponse.json(
            { success: false, error: 'File deletion not yet implemented' },
            { status: 501 }
          );
        }
        break;
      default:
        return NextResponse.json(
          { success: false, error: 'Unsupported resource type' },
          { status: 400 }
        );
    }

    if (!deleteResult.success) {
      logApi.info(`❌ Erreur suppression ${resourceType}: ${deleteResult.error}`, context);
      return NextResponse.json(
        { success: false, error: deleteResult.error || 'Failed to delete resource' },
        { status: 400 }
      );
    }

    // Réponse de succès
    const response = {
      success: true,
      message: `${resourceType} deleted successfully`,
      resource_type: resourceType,
      resource_id: resourceId
    };

    const apiTime = Date.now() - startTime;
    logApi.info(`✅ ${resourceType} supprimé avec succès en ${apiTime}ms`, context);

    return NextResponse.json(response);

  } catch (error) {
    // Dans le catch, on ne peut pas accéder aux params directement
    console.error(`[UNIFIED-DELETE] Error deleting resource:`, error);
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
  
  try {
    // Await les params dans Next.js 15
    const { resource, ref } = await params;
    
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
