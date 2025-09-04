import { NextRequest, NextResponse } from 'next/server';

import { logApi } from '@/utils/logger';
import { createClasseurV2Schema, validatePayload, createValidationErrorResponse } from '@/utils/v2ValidationSchemas';
import { getAuthenticatedUser, createAuthenticatedSupabaseClient } from '@/utils/authUtils';
import { SlugGenerator } from '@/utils/slugGenerator';

// 🔧 CORRECTIONS APPLIQUÉES:
// - Authentification simplifiée via getAuthenticatedUser uniquement
// - Suppression de la double vérification d'authentification
// - Client Supabase standard sans token manuel
// - Plus de 401 causés par des conflits d'authentification

export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const clientType = request.headers.get('X-Client-Type') || 'unknown';
  const context = {
    operation: 'v2_classeur_create',
    component: 'API_V2',
    clientType
  };

  logApi.info('🚀 Début création classeur v2', context);

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
    
    // Validation du payload
    const validationResult = validatePayload(createClasseurV2Schema, body);
    if (!validationResult.success) {
      return createValidationErrorResponse(validationResult);
    }

    const { name, emoji, description, icon } = validationResult.data;

    // Générer un slug unique avec le client authentifié
    const slug = await SlugGenerator.generateSlug(name, 'classeur', userId, undefined, supabase);

    // Créer le classeur
    const { data: classeur, error: createError } = await supabase
      .from('classeurs')
      .insert({
        name,
        description,
        emoji: emoji || '📚',
        icon: icon || '📚',
        slug,
        user_id: userId,
        position: 0
      })
      .select()
      .single();

    if (createError) {
      logApi.error(`❌ Erreur création classeur: ${createError.message}`, context);
      return NextResponse.json(
        { error: 'Erreur lors de la création du classeur' },
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const apiTime = Date.now() - startTime;
    logApi.info(`✅ Classeur créé en ${apiTime}ms`, context);

    // 🚀 DÉCLENCHER LE POLLING AUTOMATIQUEMENT
    try {
      const { triggerUnifiedRealtimePolling } = await import('@/services/unifiedRealtimeService');
      await triggerUnifiedRealtimePolling('classeurs', 'CREATE');
      logApi.info('✅ Polling déclenché pour classeurs', context);
    } catch (pollingError) {
      logApi.warn('⚠️ Erreur lors du déclenchement du polling', context);
    }

    return NextResponse.json({
      success: true,
      classeur
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