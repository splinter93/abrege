import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAuthenticatedSupabaseClient } from '@/utils/authUtils';
import { V2DatabaseUtils } from '@/utils/v2DatabaseUtils';

// Schéma de validation pour le paramètre resource
const resourceSchema = z.enum(['classeur', 'note', 'folder', 'file']);

// Schéma de validation pour la réponse
const deleteResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  resource_type: z.string(),
  resource_id: z.string()
});

/**
 * DELETE /api/v2/{resource}/{ref}
 * Supprime une ressource (classeur, note, folder, file) par sa référence
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { resource: string; ref: string } }
) {
  try {
    // Validation du type de ressource
    const resourceType = resourceSchema.parse(params.resource);
    const resourceRef = params.ref;

    console.log(`[DELETE /api/v2/${resourceType}/${resourceRef}] 🗑️ Suppression de la ressource`);

    // Créer le client Supabase authentifié
    const supabase = await createAuthenticatedSupabaseClient(request);
    const dbUtils = new V2DatabaseUtils();

    // Récupérer l'utilisateur authentifié
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentification requise' },
        { status: 401 }
      );
    }

    let result: any;
    let message: string;

    // Supprimer selon le type de ressource
    switch (resourceType) {
      case 'note':
        result = await dbUtils.deleteNote(resourceRef, user.id);
        message = 'Note supprimée avec succès';
        break;

      case 'folder':
        result = await dbUtils.deleteFolder(resourceRef, user.id);
        message = 'Dossier supprimé avec succès';
        break;

      case 'classeur':
        result = await dbUtils.deleteClasseur(resourceRef, user.id);
        message = 'Classeur supprimé avec succès';
        break;

      case 'file':
        result = await dbUtils.deleteFile(resourceRef, user.id);
        message = 'Fichier supprimé avec succès';
        break;

      default:
        return NextResponse.json(
          { error: `Type de ressource non supporté: ${resourceType}` },
          { status: 400 }
        );
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Erreur lors de la suppression' },
        { status: result.status || 500 }
      );
    }

    // Réponse de succès
    const response = deleteResponseSchema.parse({
      success: true,
      message,
      resource_type: resourceType,
      resource_id: resourceRef
    });

    console.log(`[DELETE /api/v2/${resourceType}/${resourceRef}] ✅ Suppression réussie`);

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error(`[DELETE /api/v2/${params.resource}/${params.ref}] ❌ Erreur:`, error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Paramètres invalides', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

/**
 * HEAD /api/v2/{resource}/{ref}
 * Informations sur l'endpoint de suppression
 */
export async function HEAD(
  request: NextRequest,
  { params }: { params: { resource: string; ref: string } }
) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Allow': 'DELETE',
      'Content-Type': 'application/json',
      'X-Endpoint': `/api/v2/${params.resource}/${params.ref}`,
      'X-Description': 'Supprime une ressource (classeur, note, folder, file) par sa référence',
      'X-Parameters': JSON.stringify({
        resource: {
          type: 'string',
          enum: ['classeur', 'note', 'folder', 'file'],
          description: 'Type de ressource à supprimer'
        },
        ref: {
          type: 'string',
          description: 'Référence (ID ou slug) de la ressource'
        }
      }),
      'X-Responses': JSON.stringify({
        '200': 'Ressource supprimée avec succès',
        '400': 'Paramètres invalides ou type de ressource non supporté',
        '401': 'Authentification requise',
        '404': 'Ressource non trouvée',
        '500': 'Erreur interne du serveur'
      })
    }
  });
}
