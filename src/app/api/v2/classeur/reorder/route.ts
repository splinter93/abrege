import { NextRequest, NextResponse } from 'next/server';
import { logApi } from '@/utils/logger';
import { reorderClasseursV2Schema, validatePayload, createValidationErrorResponse } from '@/utils/v2ValidationSchemas';
import { getAuthenticatedUser } from '@/utils/authUtils';
import { V2DatabaseUtils } from '@/utils/v2DatabaseUtils';

export async function PUT(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const clientType = request.headers.get('X-Client-Type') || 'unknown';
  const context = {
    operation: 'v2_classeur_reorder',
    component: 'API_V2',
    clientType
  };

  logApi.info('🚀 Début réorganisation classeurs v2', context);

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

  try {
    const body = await request.json();

    // Validation Zod V2
    const validationResult = validatePayload(reorderClasseursV2Schema, body);
    if (!validationResult.success) {
      logApi.info('❌ Validation échouée', context);
      return createValidationErrorResponse(validationResult);
    }

    const validatedData = validationResult.data;

    // Utiliser V2DatabaseUtils pour l'accès direct à la base de données
    const result = await V2DatabaseUtils.reorderClasseurs(validatedData.classeurs, userId, context);

    const apiTime = Date.now() - startTime;
    logApi.info(`✅ Classeurs réorganisés en ${apiTime}ms`, context);

    return NextResponse.json({
      success: true,
      message: 'Classeurs réorganisés avec succès',
      classeurs: result.classeurs
    });

  } catch (err: unknown) {
    const error = err as Error;
    logApi.info(`❌ Erreur serveur: ${error}`, context);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
} 