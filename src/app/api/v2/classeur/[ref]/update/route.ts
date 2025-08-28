import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logApi } from '@/utils/logger';
import { V2ResourceResolver } from '@/utils/v2ResourceResolver';
import { getAuthenticatedUser } from '@/utils/authUtils';
import { updateClasseurV2Schema, validatePayload, createValidationErrorResponse } from '@/utils/v2ValidationSchemas';

// 🔧 CORRECTIONS APPLIQUÉES:
// - Authentification simplifiée via getAuthenticatedUser uniquement
// - Suppression de la double vérification d'authentification
// - Client Supabase standard sans token manuel
// - Plus de 401 causés par des conflits d'authentification

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

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
  
  // 🔧 CORRECTION: Client Supabase standard, getAuthenticatedUser a déjà validé
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    const body = await request.json();
    
    // Validation du payload
    const validationResult = validatePayload(updateClasseurV2Schema, body);
    if (!validationResult.success) {
      return createValidationErrorResponse(validationResult);
    }

    const { name, emoji, color } = validationResult.data;

    // Résoudre la référence (UUID ou slug)
    const resolveResult = await V2ResourceResolver.resolveRef(ref, 'classeur', userId, context);
    if (!resolveResult.success) {
      return NextResponse.json(
        { error: resolveResult.error },
        { status: resolveResult.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const classeurId = resolveResult.id;

    // Vérifier que l'utilisateur est propriétaire du classeur
    const { data: existingClasseur, error: checkError } = await supabase
      .from('classeurs')
      .select('id, name')
      .eq('id', classeurId)
      .eq('user_id', userId)
      .single();

    if (checkError || !existingClasseur) {
      logApi.info(`❌ Classeur non trouvé ou accès refusé: ${classeurId}`, context);
      return NextResponse.json(
        { error: 'Classeur non trouvé ou accès refusé' },
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Préparer les données de mise à jour
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (emoji !== undefined) updateData.emoji = emoji;
    if (color !== undefined) updateData.color = color;

    // Mettre à jour le classeur
    const { data: updatedClasseur, error: updateError } = await supabase
      .from('classeurs')
      .update(updateData)
      .eq('id', classeurId)
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) {
      logApi.error(`❌ Erreur mise à jour classeur: ${updateError.message}`, context);
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour du classeur' },
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const apiTime = Date.now() - startTime;
    logApi.info(`✅ Classeur mis à jour en ${apiTime}ms`, context);

    // 🚀 DÉCLENCHER LE POLLING AUTOMATIQUEMENT
    try {
      const { triggerUnifiedRealtimePolling } = await import('@/services/unifiedRealtimeService');
      await triggerUnifiedRealtimePolling('classeurs', 'UPDATE');
      logApi.info('✅ Polling déclenché pour classeurs', context);
    } catch (pollingError) {
      logApi.warn('⚠️ Erreur lors du déclenchement du polling', context);
    }

    return NextResponse.json({
      success: true,
      classeur: updatedClasseur
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