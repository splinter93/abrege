import { NextRequest, NextResponse } from 'next/server';
import { optimizedApi } from '@/services/optimizedApi';
import { logApi } from '@/utils/logger';
import { createFolderV2Schema, validatePayload, createValidationErrorResponse } from '@/utils/v2ValidationSchemas';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const clientType = request.headers.get('X-Client-Type') || 'unknown';
  const context = { 
    operation: 'v2_folder_create', 
    component: 'API_V2',
    clientType
  };

  logApi('v2_folder_create', '🚀 Début création dossier v2', context);

  try {
    const folderData = await request.json();

    // Validation Zod V2
    const validationResult = validatePayload(createFolderV2Schema, folderData);
    if (!validationResult.success) {
      logApi('v2_folder_create', '❌ Validation échouée', context);
      return createValidationErrorResponse(validationResult);
    }

    const validatedData = validationResult.data;

    // Utiliser optimizedApi pour Zustand + Polling
    const result = await optimizedApi.createFolder(validatedData);
    
    const apiTime = Date.now() - startTime;
    logApi('v2_folder_create', `✅ Dossier v2 créé en ${apiTime}ms`, context);

    return NextResponse.json({
      success: true,
      folder: result.folder,
      message: 'Dossier créé avec succès'
    });

  } catch (error) {
    logApi('v2_folder_create', `❌ Erreur création dossier v2: ${error}`, context);
    return NextResponse.json(
      { error: 'Erreur lors de la création du dossier' },
      { status: 500 }
    );
  }
} 