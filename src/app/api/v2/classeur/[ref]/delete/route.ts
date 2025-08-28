import { NextRequest, NextResponse } from 'next/server';
import { logApi } from '@/utils/logger';
import { getAuthenticatedUser } from '@/utils/authUtils';
import { V2DatabaseUtils } from '@/utils/v2DatabaseUtils';
import { V2ResourceResolver } from '@/utils/v2ResourceResolver';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ ref: string }> }
): Promise<NextResponse> {
  const startTime = Date.now();
  const { ref } = await params;
  const clientType = request.headers.get('X-Client-Type') || 'unknown';
  const context = {
    operation: 'v2_classeur_delete',
    component: 'API_V2',
    ref,
    clientType
  };

  logApi.info(`🚀 Début suppression classeur v2 ${ref}`, context);

  // 🔐 Authentification simplifiée
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
    // Résoudre la référence (UUID ou slug) en ID
    const resolveResult = await V2ResourceResolver.resolveRef(ref, 'classeur', userId, context);
    if (!resolveResult.success) {
      logApi.info(`❌ Erreur résolution référence: ${resolveResult.error}`, context);
      return NextResponse.json(
        { error: resolveResult.error },
        { status: resolveResult.status || 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const classeurId = resolveResult.id;
    logApi.info(`✅ Référence résolue: ${ref} → ${classeurId}`, context);

    // Utiliser V2DatabaseUtils pour l'accès direct à la base de données
    const result = await V2DatabaseUtils.deleteClasseur(classeurId, userId, context);

    const apiTime = Date.now() - startTime;
    logApi.info(`✅ Classeur supprimé en ${apiTime}ms`, context);

    // 🚀 DÉCLENCHER LE POLLING AUTOMATIQUEMENT
    try {
      const { triggerUnifiedRealtimePolling } = await import('@/services/unifiedRealtimeService');
      await triggerUnifiedRealtimePolling('classeurs', 'DELETE');
      logApi.info('✅ Polling déclenché pour classeurs', context);
    } catch (pollingError) {
      logApi.warn('⚠️ Erreur lors du déclenchement du polling', pollingError);
    }

    return NextResponse.json({
      success: true,
      message: 'Classeur supprimé avec succès',
      deletedClasseurId: classeurId
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