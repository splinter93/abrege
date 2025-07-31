import { NextRequest, NextResponse } from 'next/server';
import { optimizedApi } from '@/services/optimizedApi';
import { logApi } from '@/utils/logger';
import { createClasseurV2Schema, validatePayload, createValidationErrorResponse } from '@/utils/v2ValidationSchemas';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const clientType = request.headers.get('X-Client-Type') || 'unknown';
  const context = { 
    operation: 'v2_classeur_create', 
    component: 'API_V2',
    clientType
  };

  logApi('v2_classeur_create', '🚀 Début création classeur v2', context);

  try {
    const classeurData = await request.json();

    // Validation Zod V2
    const validationResult = validatePayload(createClasseurV2Schema, classeurData);
    if (!validationResult.success) {
      logApi('v2_classeur_create', '❌ Validation échouée', context);
      return createValidationErrorResponse(validationResult);
    }

    const validatedData = validationResult.data;

    // Utiliser optimizedApi pour Zustand + Polling
    const result = await optimizedApi.createClasseur(validatedData);
    
    const apiTime = Date.now() - startTime;
    logApi('v2_classeur_create', `✅ Classeur v2 créé en ${apiTime}ms`, context);

    return NextResponse.json({
      success: true,
      classeur: result.classeur,
      message: 'Classeur créé avec succès'
    });

  } catch (error) {
    logApi('v2_classeur_create', `❌ Erreur création classeur v2: ${error}`, context);
    return NextResponse.json(
      { error: 'Erreur lors de la création du classeur' },
      { status: 500 }
    );
  }
} 