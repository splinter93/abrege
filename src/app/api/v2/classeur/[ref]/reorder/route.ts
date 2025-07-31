import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logApi } from '@/utils/logger';
import { reorderClasseursV2Schema, validatePayload, createValidationErrorResponse } from '@/utils/v2ValidationSchemas';
import { V2ResourceResolver } from '@/utils/v2ResourceResolver';
import { clientPollingTrigger } from '@/services/clientPollingTrigger';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function PUT(
  request: NextRequest,
  { params }: { params: { ref: string } }
) {
  const startTime = Date.now();
  const ref = params.ref;
  const clientType = request.headers.get('X-Client-Type') || 'unknown';
  const context = {
    operation: 'v2_classeur_reorder',
    component: 'API_V2',
    ref,
    clientType
  };

  logApi('v2_classeur_reorder', `🚀 Début réorganisation classeurs v2`, context);

  // 🚧 Temp: Authentification non implémentée
  // TODO: Remplacer USER_ID par l'authentification Supabase
  const authResult = await getAuthenticatedUser(request);
  if (!authResult.success) {
    logApi(context.operation, `❌ Authentification échouée: ${authResult.error}`, context);
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status || 401 }
    );
  }

  const userId = authResult.userId!;

  // Résoudre la référence (UUID ou slug)
  const resolveResult = await V2ResourceResolver.resolveRef(ref, 'classeur', userId, context);
  if (!resolveResult.success) {
    return NextResponse.json(
      { error: resolveResult.error },
      { status: resolveResult.status }
    );
  }

  const classeurId = resolveResult.id;

  try {
    const body = await request.json();

    // Validation Zod V2
    const validationResult = validatePayload(reorderClasseursV2Schema, body);
    if (!validationResult.success) {
      logApi('v2_classeur_reorder', '❌ Validation échouée', context);
      return createValidationErrorResponse(validationResult);
    }

    const { classeurs } = validationResult.data;

    // Vérifier que tous les classeurs existent et appartiennent au même utilisateur
    const classeurIds = classeurs.map(c => c.id);
    const { data: existingClasseurs, error: fetchError } = await supabase
      .from('classeurs')
      .select('id, user_id')
      .in('id', classeurIds);

    if (fetchError) {
      logApi('v2_classeur_reorder', `❌ Erreur récupération classeurs: ${fetchError.message}`, context);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des classeurs' },
        { status: 500 }
      );
    }

    if (existingClasseurs.length !== classeurs.length) {
      logApi('v2_classeur_reorder', '❌ Certains classeurs n\'existent pas', context);
      return NextResponse.json(
        { error: 'Certains classeurs n\'existent pas' },
        { status: 404 }
      );
    }

    // Vérifier que tous les classeurs appartiennent au même utilisateur
    const userId = existingClasseurs[0].user_id;
    const allSameUser = existingClasseurs.every(c => c.user_id === userId);
    if (!allSameUser) {
      logApi('v2_classeur_reorder', '❌ Classeurs appartiennent à des utilisateurs différents', context);
      return NextResponse.json(
        { error: 'Impossible de réorganiser des classeurs de différents utilisateurs' },
        { status: 403 }
      );
    }

    // Mettre à jour les positions
    for (const classeur of classeurs) {
      const { error: updateError } = await supabase
        .from('classeurs')
        .update({ position: classeur.position })
        .eq('id', classeur.id);

      if (updateError) {
        logApi('v2_classeur_reorder', `❌ Erreur réorganisation: ${updateError.message}`, context);
        return NextResponse.json(
          { error: 'Erreur lors de la réorganisation' },
          { status: 500 }
        );
      }
    }

    // Déclencher le polling côté client
    await clientPollingTrigger.triggerClasseursPolling('UPDATE');

    const apiTime = Date.now() - startTime;
    logApi('v2_classeur_reorder', `✅ Classeurs réorganisés en ${apiTime}ms`, context);

    return NextResponse.json({
      success: true,
      message: 'Classeurs réorganisés avec succès',
      updatedCount: classeurs.length
    });

  } catch (error) {
    logApi('v2_classeur_reorder', `❌ Erreur serveur: ${error}`, context);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
} 