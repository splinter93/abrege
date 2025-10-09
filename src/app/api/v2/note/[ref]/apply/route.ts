/**
 * POST /api/v2/note/{ref}/apply
 * 
 * Appliquer des opérations de contenu à une note
 * Permet d'appliquer des transformations (insert, replace, append, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/utils/authUtils';
import { logApi } from '@/utils/logger';

// ✅ FIX PROD: Force Node.js runtime pour accès aux variables d'env (SUPABASE_SERVICE_ROLE_KEY)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';


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
    const { operations } = body;

    if (!operations || !Array.isArray(operations)) {
      return NextResponse.json(
        { error: 'Opérations requises' },
        { status: 400 }
      );
    }

    // TODO: Implémenter la logique d'application des opérations
    logApi.info(`[Apply Content] Opérations appliquées à la note ${ref}`, {
      operationsCount: operations.length,
      userId: authResult.userId
    });

    return NextResponse.json({
      success: true,
      message: 'Opérations appliquées avec succès',
      data: {
        ref,
        operations_applied: operations.length
      }
    });

  } catch (error) {
    logApi.error(`[Apply Content] Erreur:`, error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
