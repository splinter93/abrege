import { NextRequest, NextResponse } from 'next/server';
import { optimizedApi } from '@/services/optimizedApi';
import { logApi } from '@/utils/logger';
import { createNoteV2Schema, validatePayload, createValidationErrorResponse } from '@/utils/v2ValidationSchemas';
import { getAuthenticatedUser } from '@/utils/authUtils';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const clientType = request.headers.get('X-Client-Type') || 'unknown';
  const context = {
    operation: 'v2_note_create',
    component: 'API_V2',
    clientType
  };

  logApi('v2_note_create', '🚀 Début création note v2', context);

  // 🔐 Authentification
  const authResult = await getAuthenticatedUser(request);
  if (!authResult.success) {
    logApi('v2_note_create', `❌ Authentification échouée: ${authResult.error}`, context);
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status || 401 }
    );
  }

  const userId = authResult.userId!;

  try {
    const noteData = await request.json();

    // Validation Zod V2
    const validationResult = validatePayload(createNoteV2Schema, noteData);
    if (!validationResult.success) {
      logApi('v2_note_create', '❌ Validation échouée', context);
      return createValidationErrorResponse(validationResult);
    }

    const validatedData = validationResult.data;

    // Utiliser optimizedApi pour Zustand + Polling
    const result = await optimizedApi.createNote(validatedData);

    const apiTime = Date.now() - startTime;
    logApi('v2_note_create', `✅ Note v2 créée en ${apiTime}ms`, context);

    return NextResponse.json({
      success: true,
      note: result.note,
      message: 'Note créée avec succès'
    });

  } catch (error) {
    logApi('v2_note_create', `❌ Erreur création note v2: ${error}`, context);
    return NextResponse.json(
      { error: 'Erreur lors de la création de la note' },
      { status: 500 }
    );
  }
} 