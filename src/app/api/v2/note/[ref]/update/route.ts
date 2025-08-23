import { NextRequest, NextResponse } from 'next/server';
import { logApi } from '@/utils/logger';
import { updateNoteV2Schema, validatePayload, createValidationErrorResponse } from '@/utils/v2ValidationSchemas';
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
    operation: 'v2_note_update',
    component: 'API_V2',
    ref,
    clientType
  };

  logApi.info(`🚀 Début mise à jour note v2 ${ref}`);

  // 🔐 Authentification
  const authResult = await getAuthenticatedUser(request);
  if (!authResult.success) {
    logApi.error(`❌ Authentification échouée: ${authResult.error}`);
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status || 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const userId = authResult.userId!;

  try {
    const body = await request.json();

    // Validation Zod V2
    const validationResult = validatePayload(updateNoteV2Schema, body);
    if (!validationResult.success) {
      logApi.error('❌ Validation échouée');
      return createValidationErrorResponse(validationResult);
    }

    const validatedData = validationResult.data;

    // Utiliser V2DatabaseUtils pour l'accès direct à la base de données
    const result = await V2DatabaseUtils.updateNote(ref, validatedData, userId, context);

    const apiTime = Date.now() - startTime;
    logApi.info(`✅ Note mise à jour en ${apiTime}ms`);

    // 🚀 DÉCLENCHER LE POLLING AUTOMATIQUEMENT
    try {
      const { triggerUnifiedRealtimePolling } = await import('@/services/unifiedRealtimeService');
      await triggerUnifiedRealtimePolling('notes', 'UPDATE');
      logApi.info('✅ Polling déclenché pour notes', context);
    } catch (pollingError) {
      logApi.warn('⚠️ Erreur lors du déclenchement du polling', pollingError);
    }

    return NextResponse.json({
      success: true,
      message: 'Note mise à jour avec succès',
      note: result.note
    });

  } catch (err: unknown) {
    const error = err as Error;
    logApi.error(`❌ Erreur serveur: ${error}`);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
} 