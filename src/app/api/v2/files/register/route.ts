import { NextRequest, NextResponse } from 'next/server';

import { logApi } from '@/utils/logger';
import { getAuthenticatedUser, createAuthenticatedSupabaseClient } from '@/utils/authUtils';

// 🔧 CORRECTIONS APPLIQUÉES:
// - Authentification simplifiée via getAuthenticatedUser uniquement
// - Suppression de la double vérification d'authentification
// - Client Supabase standard sans token manuel
// - Plus de 401 causés par des conflits d'authentification

export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const clientType = request.headers.get('X-Client-Type') || 'unknown';
  const context = {
    operation: 'v2_files_register',
    component: 'API_V2',
    clientType
  };

  logApi.info('🚀 Début enregistrement fichier v2', context);

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
  
  // 🔧 CORRECTION: Client Supabase standard, getAuthenticatedUser a déjà validé
  const supabase = createAuthenticatedSupabaseClient(authResult);

  try {
    const body = await request.json();
    const { filename, original_name, mime_type, size, classeur_id, folder_id } = body;

    // Validation des données
    if (!filename || !mime_type || !size) {
      return NextResponse.json(
        { error: 'Données manquantes: filename, mime_type et size sont requis' },
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Enregistrer le fichier dans la base
    const { data: file, error: insertError } = await supabase
      .from('files')
      .insert({
        filename,
        original_name: original_name || filename,
        mime_type,
        size,
        classeur_id,
        folder_id,
        user_id: userId
      })
      .select()
      .single();

    if (insertError) {
      logApi.error(`❌ Erreur enregistrement fichier: ${insertError.message}`, context);
      return NextResponse.json(
        { error: 'Erreur lors de l\'enregistrement du fichier' },
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const apiTime = Date.now() - startTime;
    logApi.info(`✅ Fichier enregistré en ${apiTime}ms`, context);

    return NextResponse.json({
      success: true,
      file
    }, { status: 201, headers: { "Content-Type": "application/json" } });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    logApi.error(`❌ Erreur inattendue: ${errorMessage}`, context);
    
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
} 