import { NextRequest, NextResponse } from 'next/server';
import { logApi } from '@/utils/logger';
import { getAuthenticatedUser } from '@/utils/authUtils';
import { V2DatabaseUtils } from '@/utils/v2DatabaseUtils';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ ref: string }> }
): Promise<NextResponse> {
  const startTime = Date.now();
  const { ref } = await params;
  const clientType = request.headers.get('X-Client-Type') || 'unknown';
  const context = {
    operation: 'v2_note_delete',
    component: 'API_V2',
    ref,
    clientType
  };

  // ✅ DEBUG: Logs détaillés pour identifier le problème
  console.log('🚀 [DELETE ENDPOINT] Début suppression note:', {
    ref,
    clientType,
    url: request.url,
    method: request.method,
    headers: Object.fromEntries(request.headers.entries())
  });

  logApi.info(`🚀 Début suppression note v2 ${ref}`, context);

  // 🔐 Authentification
  console.log('🔐 [DELETE ENDPOINT] Vérification authentification...');
  const authResult = await getAuthenticatedUser(request);
  console.log('🔐 [DELETE ENDPOINT] Résultat authentification:', {
    success: authResult.success,
    userId: authResult.userId,
    error: authResult.error,
    status: authResult.status
  });
  
  if (!authResult.success) {
    const errorMsg = `❌ Authentification échouée: ${authResult.error}`;
    console.error(errorMsg, { authResult, context });
    logApi.error(errorMsg, context);
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status || 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const userId = authResult.userId!;
  console.log('✅ [DELETE ENDPOINT] Utilisateur authentifié:', userId);

  try {
    console.log('🔍 [DELETE ENDPOINT] Résolution référence via V2DatabaseUtils...');
    
    // ✅ Utiliser V2DatabaseUtils pour la suppression (gère automatiquement UUID et slug)
    const result = await V2DatabaseUtils.deleteNote(ref, userId, context);
    
    console.log('✅ [DELETE ENDPOINT] Résultat suppression:', result);

    const apiTime = Date.now() - startTime;
    logApi.info(`✅ Note supprimée en ${apiTime}ms`, context);

    // ✅ Pas de polling manuel (le realtime naturel s'en charge)
    logApi.info('✅ Suppression terminée, realtime naturel gère la synchronisation', context);

    const response = {
      success: true,
      message: 'Note supprimée avec succès',
      deletedNoteRef: ref
    };
    
    console.log('✅ [DELETE ENDPOINT] Réponse finale:', response);
    return NextResponse.json(response);

  } catch (err: unknown) {
    const error = err as Error;
    const errorMsg = `❌ Erreur serveur: ${error.message}`;
    
    console.error(errorMsg, {
      error,
      message: error.message,
      stack: error.stack,
      ref,
      userId,
      context
    });
    
    logApi.error(errorMsg, context);
    
    // ✅ Gestion d'erreur cohérente avec les autres endpoints
    return NextResponse.json(
      { error: error.message },
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
} 