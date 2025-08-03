import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logApi } from '@/utils/logger';
import { updateFolderV2Schema, validatePayload, createValidationErrorResponse } from '@/utils/v2ValidationSchemas';
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
    operation: 'v2_folder_update',
    component: 'API_V2',
    ref,
    clientType
  };

  logApi('v2_folder_update', `🚀 Début mise à jour dossier v2 ${ref}`, context);

  // 🔐 Authentification
  const authResult = await getAuthenticatedUser(request);
  if (!authResult.success) {
    logApi('v2_folder_update', `❌ Authentification échouée: ${authResult.error}`, context);
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status || 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const userId = authResult.userId!;

  // Résoudre la référence (UUID ou slug)
  const resolveResult = await V2ResourceResolver.resolveRef(ref, 'folder', userId, context);
  if (!resolveResult.success) {
    return NextResponse.json(
      { error: resolveResult.error },
      { status: resolveResult.status, headers: { "Content-Type": "application/json" } }
    );
  }

  const folderId = resolveResult.id;

  // 🔐 Vérification des permissions
  const permissionResult = await checkUserPermission(folderId, 'folder', 'editor', userId, context);
  if (!permissionResult.success) {
    logApi('v2_folder_update', `❌ Erreur vérification permissions: ${permissionResult.error}`, context);
    return NextResponse.json(
      { error: permissionResult.error },
      { status: permissionResult.status || 500, headers: { "Content-Type": "application/json" } }
    );
  }
  if (!permissionResult.hasPermission) {
    logApi('v2_folder_update', `❌ Permissions insuffisantes pour dossier ${folderId}`, context);
    return NextResponse.json(
      { error: 'Permissions insuffisantes pour modifier ce dossier' },
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

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
      .select('id, user_id')
      .eq('id', folderId)
      .single();

    if (fetchError || !existingFolder) {
      logApi('v2_folder_update', `❌ Dossier non trouvé: ${folderId}`, context);
      return NextResponse.json(
        { error: 'Dossier non trouvé' },
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Préparer les données de mise à jour
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    };

    if (validatedData.name !== undefined) {
      updateData.name = validatedData.name;
    }
    // Note: description field not available in updateFolderV2Schema
    if (validatedData.parent_id !== undefined) {
      updateData.parent_id = validatedData.parent_id;
    }

    // Mettre à jour le dossier
    const { data: updatedFolder, error: updateError } = await supabase
      .from('folders')
      .update(updateData)
      .eq('id', folderId)
      .select()
      .single();

    if (updateError) {
      logApi('v2_folder_update', `❌ Erreur mise à jour: ${updateError.message}`, context);
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour' },
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Déclencher le polling côté client
    clientPollingTrigger.triggerFoldersPolling('UPDATE');

    const apiTime = Date.now() - startTime;
    logApi('v2_folder_update', `✅ Dossier mis à jour en ${apiTime}ms`, context);

    return NextResponse.json({
      success: true,
      message: 'Dossier mis à jour avec succès',
      folder: updatedFolder
    }, { headers: { "Content-Type": "application/json" } });

  } catch (err: unknown) {
    const error = err as Error;
    logApi('v2_folder_update', `❌ Erreur serveur: ${error}`, context);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
} 