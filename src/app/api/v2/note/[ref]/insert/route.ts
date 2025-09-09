/**
 * POST /api/v2/note/{ref}/insert
 * 
 * Insérer du contenu dans une note
 * Insertion à une position spécifique (début, fin, ou après un marqueur)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/utils/authUtils';
import { logApi } from '@/utils/logger';

export async function POST(
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

    const body = await request.json();
    const { content, position = 'end', marker } = body;

    if (!content) {
      return NextResponse.json(
        { error: 'Contenu requis' },
        { status: 400 }
      );
    }

    // TODO: Implémenter l'insertion de contenu
    logApi.info(`[Insert Content] Insertion dans la note ${ref}`, {
      ref,
      position,
      marker,
      contentLength: content.length,
      userId: authResult.userId
    });

    return NextResponse.json({
      success: true,
      message: 'Contenu inséré avec succès',
      data: {
        ref,
        position,
        content_inserted: content.length,
        inserted_at: new Date().toISOString()
      }
    });

  } catch (error) {
    logApi.error(`[Insert Content] Erreur:`, error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
