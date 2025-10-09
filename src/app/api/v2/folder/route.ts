/**
 * POST /api/v2/folder
 * 
 * Créer un nouveau dossier
 * Création dans un classeur spécifique avec métadonnées
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/utils/authUtils';
import { logApi } from '@/utils/logger';

// ✅ FIX PROD: Force Node.js runtime pour accès aux variables d'env (SUPABASE_SERVICE_ROLE_KEY)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';


export async function POST(request: NextRequest): Promise<NextResponse> {
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
    const { name, classeur_id, parent_id, description } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Nom du dossier requis' },
        { status: 400 }
      );
    }

    if (!classeur_id) {
      return NextResponse.json(
        { error: 'ID du classeur requis' },
        { status: 400 }
      );
    }

    // TODO: Implémenter la création de dossier
    logApi.info(`[Create Folder] Création dossier "${name}"`, {
      name,
      classeur_id,
      parent_id,
      userId: authResult.userId
    });

    return NextResponse.json({
      success: true,
      data: {
        id: `folder-${Date.now()}`,
        name,
        classeur_id,
        parent_id,
        description,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    logApi.error(`[Create Folder] Erreur:`, error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
