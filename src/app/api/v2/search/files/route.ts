/**
 * GET /api/v2/search/files
 * 
 * Recherche dans les fichiers et documents
 * Recherche avancée avec filtres et pagination
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/utils/authUtils';
import { logApi } from '@/utils/logger';

// ✅ FIX PROD: Force Node.js runtime pour accès aux variables d'env (SUPABASE_SERVICE_ROLE_KEY)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';


export async function GET(request: NextRequest): Promise<NextResponse> {
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
    const query = searchParams.get('q') || '';
    const type = searchParams.get('type') || 'all';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!query) {
      return NextResponse.json(
        { error: 'Paramètre de recherche requis' },
        { status: 400 }
      );
    }

    // TODO: Implémenter la recherche dans les fichiers
    logApi.info(`[Search Files] Recherche: "${query}"`, {
      type,
      page,
      limit,
      userId: authResult.userId
    });

    return NextResponse.json({
      success: true,
      data: {
        query,
        type,
        results: [],
        pagination: {
          page,
          limit,
          total: 0,
          pages: 0
        }
      }
    });

  } catch (error) {
    logApi.error(`[Search Files] Erreur:`, error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
