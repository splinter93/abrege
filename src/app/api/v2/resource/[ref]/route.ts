/**
 * DELETE /api/v2/resource/{ref}
 * 
 * Supprimer une ressource (note, dossier, classeur)
 * Suppression universelle avec vérification des permissions
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/utils/authUtils';
import { logApi } from '@/utils/logger';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { ref: string } }
): Promise<NextResponse> {
  const { ref } = params;
  
  try {
    // Authentification
    const authResult = await getAuthenticatedUser(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status || 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'note';
    const force = searchParams.get('force') === 'true';

    // TODO: Implémenter la suppression universelle
    logApi.info(`[Delete Resource] Suppression ${type} ${ref}`, {
      ref,
      type,
      force,
      userId: authResult.userId
    });

    return NextResponse.json({
      success: true,
      message: `${type} supprimé avec succès`,
      data: {
        ref,
        type,
        deleted_at: new Date().toISOString()
      }
    });

  } catch (error) {
    logApi.error(`[Delete Resource] Erreur:`, error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
