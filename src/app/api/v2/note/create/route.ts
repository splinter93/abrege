import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logApi } from '@/utils/logger';
import { createNoteV2Schema, validatePayload, createValidationErrorResponse } from '@/utils/v2ValidationSchemas';
import { optimizedApi } from '@/services/optimizedApi';
import { getAuthenticatedUser } from '@/utils/authUtils';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(request: NextRequest): Promise<NextResponse> {
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
    const body = await request.json();

    // Validation Zod V2
    const validationResult = validatePayload(createNoteV2Schema, body);
    if (!validationResult.success) {
      logApi('v2_note_create', '❌ Validation échouée', context);
      return createValidationErrorResponse(validationResult);
    }

    const validatedData = validationResult.data;

    // Utiliser optimizedApi pour déclencher Zustand + polling
    const result = await optimizedApi.createNote({
      ...validatedData
    });

    if (!result.success) {
      logApi('v2_note_create', `❌ Erreur création: ${result.error}`, context);
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    const apiTime = Date.now() - startTime;
    logApi('v2_note_create', `✅ Note créée en ${apiTime}ms`, context);

    return NextResponse.json({
      success: true,
      message: 'Note créée avec succès',
      note: result.note
    });

  } catch (error) {
    logApi('v2_note_create', `❌ Erreur serveur: ${error}`, context);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
} 