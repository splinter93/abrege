import { NextRequest, NextResponse } from 'next/server';
import { logApi } from '@/utils/logger';
import { createFolderV2Schema, validatePayload, createValidationErrorResponse } from '@/utils/v2ValidationSchemas';
import { getAuthenticatedUser } from '@/utils/authUtils';
import { V2DatabaseUtils } from '@/utils/v2DatabaseUtils';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const clientType = request.headers.get('X-Client-Type') || 'unknown';
  const context = {
    operation: 'v2_folder_create',
    component: 'API_V2',
    clientType
  };

  logApi.info('🚀 Début création dossier v2', context);

  // 🔐 Authentification
  const authResult = await getAuthenticatedUser(request);
  if (!authResult.success) {
    logApi.error(`❌ Authentification échouée: ${authResult.error}`, authResult);
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status || 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const userId = authResult.userId!;

  try {
    const body = await request.json();

    // Validation Zod V2
    const validationResult = validatePayload(createFolderV2Schema, body);
    if (!validationResult.success) {
      logApi.error('❌ Validation échouée', validationResult);
      return createValidationErrorResponse(validationResult);
    }

    const validatedData = validationResult.data;

    // Utiliser V2DatabaseUtils pour l'accès direct à la base de données
    const result = await V2DatabaseUtils.createFolder(validatedData, userId, context);

    const apiTime = Date.now() - startTime;
    logApi.info(`✅ Dossier créé en ${apiTime}ms`, context);

    return NextResponse.json({
      success: true,
      message: 'Dossier créé avec succès',
      folder: result.folder
    });

  } catch (err: unknown) {
    const error = err as Error;
    logApi.error(`❌ Erreur serveur: ${error}`, error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
} 