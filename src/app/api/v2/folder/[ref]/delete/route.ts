import { NextRequest, NextResponse } from 'next/server';

import { logApi } from '@/utils/logger';
import { V2ResourceResolver } from '@/utils/v2ResourceResolver';
import { getAuthenticatedUser, createAuthenticatedSupabaseClient } from '@/utils/authUtils';

// 🔧 CORRECTIONS APPLIQUÉES:
// - Authentification simplifiée via getAuthenticatedUser uniquement
// - Suppression de la double vérification d'authentification
// - Client Supabase standard sans token manuel
// - Plus de 401 causés par des conflits d'authentification

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ ref: string }> }
): Promise<NextResponse> {
  const startTime = Date.now();
  const { ref } = await params;
  const clientType = request.headers.get('X-Client-Type') || 'unknown';
  const context = {
    operation: 'v2_folder_delete',
    component: 'API_V2',
    ref,
    clientType
  };

  logApi.info(`🚀 Début suppression dossier v2 ${ref}`, context);

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
    // Résoudre la référence (UUID ou slug)
    const resolveResult = await V2ResourceResolver.resolveRef(ref, 'folder', userId, context);
    if (!resolveResult.success) {
      return NextResponse.json(
        { error: resolveResult.error },
        { status: resolveResult.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const folderId = resolveResult.id;

    // Vérifier que l'utilisateur est propriétaire du dossier
    const { data: folder, error: checkError } = await supabase
      .from('folders')
      .select('id, name')
      .eq('id', folderId)
      .eq('user_id', userId)
      .single();

    if (checkError || !folder) {
      logApi.info(`❌ Dossier non trouvé ou accès refusé: ${folderId}`, context);
      return NextResponse.json(
        { error: 'Dossier non trouvé ou accès refusé' },
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Supprimer le dossier (cascade automatique via RLS)
    const { error: deleteError } = await supabase
      .from('folders')
      .delete()
      .eq('id', folderId)
      .eq('user_id', userId);

    if (deleteError) {
      logApi.error(`❌ Erreur suppression dossier: ${deleteError.message}`, context);
      return NextResponse.json(
        { error: 'Erreur lors de la suppression du dossier' },
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const apiTime = Date.now() - startTime;
    logApi.info(`✅ Dossier supprimé en ${apiTime}ms`, context);

    // 🚀 DÉCLENCHER LE POLLING AUTOMATIQUEMENT
    try {
      const { triggerUnifiedRealtimePolling } = await import('@/services/unifiedRealtimeService');
      await triggerUnifiedRealtimePolling('folders', 'DELETE');
      logApi.info('✅ Polling déclenché pour folders', context);
    } catch (pollingError) {
      logApi.warn('⚠️ Erreur lors du déclenchement du polling', context);
    }

    return NextResponse.json({
      success: true,
      message: 'Dossier supprimé avec succès'
    }, { headers: { "Content-Type": "application/json" } });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    logApi.error(`❌ Erreur inattendue: ${errorMessage}`, context);
    
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
} 