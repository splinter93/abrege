/**
 * GET /api/v2/note/{ref}/toc
 * 
 * Récupérer la table des matières d'une note
 * Génération automatique basée sur les titres markdown
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/utils/authUtils';
import { logApi } from '@/utils/logger';

export async function GET(
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

    // TODO: Implémenter la génération de TOC
    logApi.info(`[Get TOC] Génération TOC pour la note ${ref}`, {
      ref,
      userId: authResult.userId
    });

    return NextResponse.json({
      success: true,
      data: {
        ref,
        toc: [
          {
            level: 1,
            title: "Introduction",
            id: "introduction",
            children: [
              {
                level: 2,
                title: "Prérequis",
                id: "prerequis"
              }
            ]
          },
          {
            level: 1,
            title: "Développement",
            id: "developpement"
          }
        ],
        generated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    logApi.error(`[Get TOC] Erreur:`, error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
