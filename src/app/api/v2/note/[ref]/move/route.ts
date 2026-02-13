import { NextRequest, NextResponse } from 'next/server';
import { logApi } from '@/utils/logger';
import { moveNoteV2Schema, validatePayload, createValidationErrorResponse } from '@/utils/v2ValidationSchemas';
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
    operation: 'v2_note_move',
    component: 'API_V2',
    ref,
    clientType
  };

  logApi.info(`🚀 Début déplacement note v2 ${ref}`, context);

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

    // Validation Zod V2 pour le déplacement de dossier uniquement
    const validationResult = validatePayload(moveNoteV2Schema, body);
    if (!validationResult.success) {
      return createValidationErrorResponse(validationResult, context);
    }

    const validatedData = validationResult.data;

    // Utiliser V2DatabaseUtils pour l'accès direct à la base de données
    const result = await V2DatabaseUtils.moveNote(ref, validatedData.target_folder_id || null, userId, context, validatedData.target_notebook_id);

    const apiTime = Date.now() - startTime;
    logApi.info(`✅ Note déplacée en ${apiTime}ms`, context);

    return NextResponse.json({
      success: true,
      message: 'Note déplacée avec succès',
      note: result.data
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