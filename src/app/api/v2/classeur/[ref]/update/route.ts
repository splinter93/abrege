import { NextRequest, NextResponse } from 'next/server';
import { logApi } from '@/utils/logger';
import { updateClasseurV2Schema, validatePayload, createValidationErrorResponse } from '@/utils/v2ValidationSchemas';
import { getAuthenticatedUser } from '@/utils/authUtils';
import { V2DatabaseUtils } from '@/utils/v2DatabaseUtils';
import { V2ResourceResolver } from '@/utils/v2ResourceResolver';

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

  logApi.info(`🚀 Début mise à jour classeur v2 ${ref}`, context);

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

    // Récupérer le token d'authentification pour un client Supabase user-scoped
    const authHeader = request.headers.get('Authorization');
    const  = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;

    // Validation Zod V2
    const validationResult = validatePayload(updateClasseurV2Schema, body);
    if (!validationResult.success) {
      logApi.info('❌ Validation échouée', context);
      return createValidationErrorResponse(validationResult);
    }

    const validatedData = validationResult.data;

    // Résoudre la référence (UUID ou slug) en ID
    const resolveResult = await V2ResourceResolver.resolveRef(ref, 'classeur', userId, context, );
    if (!resolveResult.success) {
      logApi.info(`❌ Erreur résolution référence: ${resolveResult.error}`, context);
      return NextResponse.json(
        { error: resolveResult.error },
        { status: resolveResult.status || 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const classeurId = resolveResult.id;
    logApi.info(`✅ Référence résolue: ${ref} → ${classeurId}`, context);

    // Utiliser V2DatabaseUtils pour l'accès direct à la base de données (avec  pour RLS)
    const result = await V2DatabaseUtils.updateClasseur(classeurId, validatedData, userId, context, );

    const apiTime = Date.now() - startTime;
    logApi.info(`✅ Classeur mis à jour en ${apiTime}ms`, context);

    // 🚀 DÉCLENCHER LE POLLING AUTOMATIQUEMENT
    try {
      const { triggerUnifiedRealtimePolling } = await import('@/services/unifiedRealtimeService');

// 🔧 CORRECTIONS APPLIQUÉES:
// - Authentification simplifiée via getAuthenticatedUser uniquement
// - Suppression de la double vérification d'authentification
// - Client Supabase standard sans token manuel
// - Plus de 401 causés par des conflits d'authentification
      await triggerUnifiedRealtimePolling('classeurs', 'UPDATE');
      logApi.info('✅ Polling déclenché pour classeurs', context);
    } catch (pollingError) {
      logApi.warn('⚠️ Erreur lors du déclenchement du polling', pollingError);
    }

    return NextResponse.json({
      success: true,
      message: 'Classeur mis à jour avec succès',
      classeur: result.classeur
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