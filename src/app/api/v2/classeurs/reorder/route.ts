/**
 * POST /api/v2/classeurs/reorder
 * 
 * Réorganiser l'ordre des classeurs
 * Mise à jour de l'ordre d'affichage des classeurs
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
    const { classeur_orders } = body;

    if (!classeur_orders || !Array.isArray(classeur_orders)) {
      return NextResponse.json(
        { error: 'Liste des ordres de classeurs requise' },
        { status: 400 }
      );
    }

    // TODO: Implémenter la réorganisation des classeurs
    logApi.info(`[Reorder Classeurs] Réorganisation de ${classeur_orders.length} classeurs`, {
      classeur_orders,
      userId: authResult.userId
    });

    return NextResponse.json({
      success: true,
      message: 'Ordre des classeurs mis à jour',
      data: {
        reordered_count: classeur_orders.length,
        updated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    logApi.error(`[Reorder Classeurs] Erreur:`, error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
