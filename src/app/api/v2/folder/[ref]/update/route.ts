import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logApi } from '@/utils/logger';
import { updateFolderV2Schema, validatePayload, createValidationErrorResponse } from '@/utils/v2ValidationSchemas';
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
    operation: 'v2_folder_update',
    component: 'API_V2',
    ref,
    clientType
  };

  logApi('v2_folder_update', `🚀 Début mise à jour dossier v2 ${ref}`, context);

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
  const resolveResult = await V2ResourceResolver.resolveRef(ref, 'folder', userId, context);
  if (!resolveResult.success) {
    return NextResponse.json(
      { error: resolveResult.error },
      { status: resolveResult.status }
    );
  }

  const folderId = resolveResult.id;

  try {
    const body = await request.json();

    // Validation Zod V2
    const validationResult = validatePayload(updateFolderV2Schema, body);
    if (!validationResult.success) {
      logApi('v2_folder_update', '❌ Validation échouée', context);
      return createValidationErrorResponse(validationResult);
    }

    const validatedData = validationResult.data;

    // Vérifier que le dossier existe
    const { data: existingFolder, error: fetchError } = await supabase
      .from('folders')
      .select('id, name, user_id')
      .eq('id', folderId)
      .single();

    if (fetchError || !existingFolder) {
      logApi('v2_folder_update', `❌ Dossier non trouvé: ${folderId}`, context);
      return NextResponse.json(
        { error: 'Dossier non trouvé' },
        { status: 404 }
      );
    }

    // Préparer les données de mise à jour
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (validatedData.name !== undefined) updateData.name = validatedData.name;
    if (validatedData.parent_id !== undefined) updateData.parent_id = validatedData.parent_id;

    // Mettre à jour le dossier
    const { error: updateError } = await supabase
      .from('folders')
      .update(updateData)
      .eq('id', folderId);

    if (updateError) {
      logApi('v2_folder_update', `❌ Erreur mise à jour: ${updateError.message}`, context);
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour' },
        { status: 500 }
      );
    }

    // Déclencher le polling côté client
    await clientPollingTrigger.triggerFoldersPolling('UPDATE');

    const apiTime = Date.now() - startTime;
    logApi('v2_folder_update', `✅ Dossier mis à jour en ${apiTime}ms`, context);

    return NextResponse.json({
      success: true,
      message: 'Dossier mis à jour avec succès',
      folderId
    });

  } catch (error) {
    logApi('v2_folder_update', `❌ Erreur serveur: ${error}`, context);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
} 