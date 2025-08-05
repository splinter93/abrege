import { NextRequest, NextResponse } from 'next/server';
import { logApi } from '@/utils/logger';
import { updateFolderV2Schema, validatePayload, createValidationErrorResponse } from '@/utils/v2ValidationSchemas';
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
    operation: 'v2_folder_update',
    component: 'API_V2',
    ref,
    clientType
  };

  logApi('v2_folder_update', `🚀 Début mise à jour dossier v2 ${ref}`, context);

  // 🔐 Authentification
  const authResult = await getAuthenticatedUser(request);
  if (!authResult.success) {
    logApi('v2_folder_update', `❌ Authentification échouée: ${authResult.error}`, context);
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status || 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const userId = authResult.userId!;

  try {
    const body = await request.json();

    // Validation Zod V2
    const validationResult = validatePayload(updateFolderV2Schema, body);
    if (!validationResult.success) {
      logApi('v2_folder_update', '❌ Validation échouée', context);
      return createValidationErrorResponse(validationResult);
    }

    const validatedData = validationResult.data;

    // Utiliser V2DatabaseUtils pour l'accès direct à la base de données
    const result = await V2DatabaseUtils.updateFolder(ref, validatedData, userId, context);

    const apiTime = Date.now() - startTime;
    logApi('v2_folder_update', `✅ Dossier mis à jour en ${apiTime}ms`, context);

    return NextResponse.json({
      success: true,
      message: 'Dossier mis à jour avec succès',
      folder: result.folder
    });

  } catch (err: unknown) {
    const error = err as Error;
    logApi('v2_folder_update', `❌ Erreur serveur: ${error}`, context);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
} 