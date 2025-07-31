import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logApi } from '@/utils/logger';
import { updateClasseurV2Schema, validatePayload, createValidationErrorResponse } from '@/utils/v2ValidationSchemas';
import { V2ResourceResolver } from '@/utils/v2ResourceResolver';
import { clientPollingTrigger } from '@/services/clientPollingTrigger';
import { getAuthenticatedUser, checkUserPermission } from '@/utils/authUtils';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

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

  logApi('v2_classeur_update', `🚀 Début mise à jour classeur v2 ${ref}`, context);

  // 🔐 Authentification
  const authResult = await getAuthenticatedUser(request);
  if (!authResult.success) {
    logApi('v2_classeur_update', `❌ Authentification échouée: ${authResult.error}`, context);
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

  // 🔐 Vérification des permissions
  const permissionResult = await checkUserPermission(classeurId, 'classeur', 'editor', userId, context);
  if (!permissionResult.success) {
    logApi('v2_classeur_update', `❌ Erreur vérification permissions: ${permissionResult.error}`, context);
    return NextResponse.json(
      { error: permissionResult.error },
      { status: permissionResult.status || 500 }
    );
  }
  if (!permissionResult.hasPermission) {
    logApi('v2_classeur_update', `❌ Permissions insuffisantes pour classeur ${classeurId}`, context);
    return NextResponse.json(
      { error: 'Permissions insuffisantes pour modifier ce classeur' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();

    // Validation Zod V2
    const validationResult = validatePayload(updateClasseurV2Schema, body);
    if (!validationResult.success) {
      logApi('v2_classeur_update', '❌ Validation échouée', context);
      return createValidationErrorResponse(validationResult);
    }

    const validatedData = validationResult.data;

    // Vérifier que le classeur existe
    const { data: existingClasseur, error: fetchError } = await supabase
      .from('classeurs')
      .select('id, user_id')
      .eq('id', classeurId)
      .single();

    if (fetchError || !existingClasseur) {
      logApi('v2_classeur_update', `❌ Classeur non trouvé: ${classeurId}`, context);
      return NextResponse.json(
        { error: 'Classeur non trouvé' },
        { status: 404 }
      );
    }

    // Préparer les données de mise à jour
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (validatedData.name !== undefined) {
      updateData.name = validatedData.name;
    }
    if (validatedData.description !== undefined) {
      updateData.description = validatedData.description;
    }
    if (validatedData.icon !== undefined) {
      updateData.icon = validatedData.icon;
    }
    if (validatedData.position !== undefined) {
      updateData.position = validatedData.position;
    }

    // Mettre à jour le classeur
    const { data: updatedClasseur, error: updateError } = await supabase
      .from('classeurs')
      .update(updateData)
      .eq('id', classeurId)
      .select()
      .single();

    if (updateError) {
      logApi('v2_classeur_update', `❌ Erreur mise à jour: ${updateError.message}`, context);
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour' },
        { status: 500 }
      );
    }

    // Déclencher le polling côté client
    clientPollingTrigger.triggerClasseursPolling('UPDATE');

    const apiTime = Date.now() - startTime;
    logApi('v2_classeur_update', `✅ Classeur mis à jour en ${apiTime}ms`, context);

    return NextResponse.json({
      success: true,
      message: 'Classeur mis à jour avec succès',
      classeur: updatedClasseur
    });

  } catch (error) {
    logApi('v2_classeur_update', `❌ Erreur serveur: ${error}`, context);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
} 