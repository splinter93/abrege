import { NextRequest, NextResponse } from 'next/server';
import { logApi } from '@/utils/logger';
import { moveFolderV2Schema, validatePayload, createValidationErrorResponse } from '@/utils/v2ValidationSchemas';
import { getAuthenticatedUser } from '@/utils/authUtils';
import { V2DatabaseUtils } from '@/utils/v2DatabaseUtils';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ ref: string }> }
): Promise<NextResponse> {
  const startTime = Date.now();
  const { ref } = await params;
  const clientType = request.headers.get('X-Client-Type') || 'unknown';
  const context = {
    operation: 'v2_folder_move',
    component: 'API_V2',
    ref,
    clientType
  };

  logApi('v2_folder_move', `🚀 Début déplacement dossier v2 ${ref}`, context);

  // 🔐 Authentification
  const authResult = await getAuthenticatedUser(request);
  if (!authResult.success) {
    logApi('v2_folder_move', `❌ Authentification échouée: ${authResult.error}`, context);
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status || 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const userId = authResult.userId!;

  try {
    const body = await request.json();

    // Validation Zod V2
    const validationResult = validatePayload(moveFolderV2Schema, body);
    if (!validationResult.success) {
      logApi('v2_folder_move', '❌ Validation échouée', context);
      return createValidationErrorResponse(validationResult);
    }

    const validatedData = validationResult.data;

    // Utiliser V2DatabaseUtils pour l'accès direct à la base de données
    const result = await V2DatabaseUtils.moveFolder(ref, validatedData.parent_id, userId, context);

    const apiTime = Date.now() - startTime;
    logApi('v2_folder_move', `✅ Dossier déplacé en ${apiTime}ms`, context);

    return NextResponse.json({
      success: true,
      message: 'Dossier déplacé avec succès',
      folder: result.folder
    });

  } catch (err: unknown) {
    const error = err as Error;
    logApi('v2_folder_move', `❌ Erreur serveur: ${error}`, context);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
} 