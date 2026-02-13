import { NextRequest, NextResponse } from 'next/server';
import { logApi } from '@/utils/logger';
import { moveFolderV2Schema, validatePayload, createValidationErrorResponse } from '@/utils/v2ValidationSchemas';
import { getAuthenticatedUser } from '@/utils/authUtils';
import { V2DatabaseUtils } from '@/utils/v2DatabaseUtils';

// ✅ FIX PROD: Force Node.js runtime pour accès aux variables d'env (SUPABASE_SERVICE_ROLE_KEY)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';


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

  logApi.info(`🚀 Début déplacement dossier v2 ${ref}`, context);

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
    const validationResult = validatePayload(moveFolderV2Schema, body);
    if (!validationResult.success) {
      return createValidationErrorResponse(validationResult, context);
    }

    const validatedData = validationResult.data;

    // Utiliser V2DatabaseUtils pour l'accès direct à la base de données
    const targetClasseurId: string | undefined = validatedData.target_classeur_id ?? undefined;
    const targetFolderId: string | null = validatedData.target_folder_id ?? null;
    const result = await V2DatabaseUtils.moveFolder(ref, targetFolderId, userId, context, targetClasseurId);

    const apiTime = Date.now() - startTime;
    logApi.info(`✅ Dossier déplacé en ${apiTime}ms`, context);

    return NextResponse.json({
      success: true,
      message: 'Dossier déplacé avec succès',
      folder: result.data
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