import { NextRequest, NextResponse } from 'next/server';
import { logApi } from '@/utils/logger';
import { updateClasseurV2Schema, validatePayload, createValidationErrorResponse } from '@/utils/v2ValidationSchemas';
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
    operation: 'v2_classeur_update',
    component: 'API_V2',
    ref,
    clientType
  };

  logApi('v2_classeur_update', `🚀 Début mise à jour classeur v2 ${ref}`, context);

  // 🔐 Authentification
  const authResult = await getAuthenticatedUser(request);
  if (!authResult.success) {
    logApi('v2_classeur_update', `❌ Authentification échouée: ${authResult.error}`, context);
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status || 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const userId = authResult.userId!;

  try {
    const body = await request.json();

    // Récupérer le token d'authentification pour un client Supabase user-scoped
    const authHeader = request.headers.get('Authorization');
    const userToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;

    // Validation Zod V2
    const validationResult = validatePayload(updateClasseurV2Schema, body);
    if (!validationResult.success) {
      logApi('v2_classeur_update', '❌ Validation échouée', context);
      return createValidationErrorResponse(validationResult);
    }

    const validatedData = validationResult.data;

    // Utiliser V2DatabaseUtils pour l'accès direct à la base de données (avec userToken pour RLS)
    const result = await V2DatabaseUtils.updateClasseur(ref, validatedData, userId, context, userToken);

    const apiTime = Date.now() - startTime;
    logApi('v2_classeur_update', `✅ Classeur mis à jour en ${apiTime}ms`, context);

    return NextResponse.json({
      success: true,
      message: 'Classeur mis à jour avec succès',
      classeur: result.classeur
    });

  } catch (err: unknown) {
    const error = err as Error;
    logApi('v2_classeur_update', `❌ Erreur serveur: ${error}`, context);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
} 