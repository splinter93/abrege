import { NextRequest, NextResponse } from 'next/server';

import { logApi } from '@/utils/logger';
import { getAuthenticatedUser, extractTokenFromRequest } from '@/utils/authUtils';
import { updateClasseurV2Schema, validatePayload, createValidationErrorResponse } from '@/utils/v2ValidationSchemas';
import { V2DatabaseUtils } from '@/utils/v2DatabaseUtils';

// ✅ FIX PROD: Force Node.js runtime pour accès aux variables d'env (SUPABASE_SERVICE_ROLE_KEY)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';


// 🔧 FIX SLUG: Utilisation de V2DatabaseUtils.updateClasseur pour garantir la mise à jour automatique du slug
// lors du renommage d'un classeur. Cette correction assure la cohérence avec les endpoints note et folder.

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ ref: string }> }
): Promise<NextResponse> {
  const startTime = Date.now();
  const { ref } = await params;
  const clientType = request.headers.get('X-Client-Type') || 'unknown';
  const context = {
    operation: 'v2_classeur_update',
    component: 'API_V2',
    ref,
    clientType
  };

  logApi.info(`🚀 Début mise à jour classeur v2 ${ref}`, context);

  // 🔐 Authentification
  const authResult = await getAuthenticatedUser(request);
  if (!authResult.success) {
    logApi.info(`❌ Authentification échouée: ${authResult.error}`, context);
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status || 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const userId = authResult.userId!;
  const userToken = extractTokenFromRequest(request);

  try {
    const body = await request.json();
    
    // Validation du payload
    const validationResult = validatePayload(updateClasseurV2Schema, body);
    if (!validationResult.success) {
      return createValidationErrorResponse(validationResult, context);
    }

    // ✅ FIX SLUG: Utiliser V2DatabaseUtils.updateClasseur qui inclut la logique de mise à jour du slug
    const result = await V2DatabaseUtils.updateClasseur(
      ref, 
      validationResult.data, 
      userId, 
      context,
      userToken || undefined
    );

    const apiTime = Date.now() - startTime;
    logApi.info(`✅ Classeur mis à jour en ${apiTime}ms`, context);

    // 🎯 Le polling ciblé est maintenant géré côté client par V2UnifiedApi

    return NextResponse.json({
      success: true,
      classeur: result.data
    }, { headers: { "Content-Type": "application/json" } });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    logApi.error(`❌ Erreur inattendue: ${errorMessage}`, context);
    
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
} 